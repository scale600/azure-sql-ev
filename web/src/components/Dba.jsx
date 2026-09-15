const SECTIONS = [
  {
    title: "1. 인프라 & DB 구축",
    lead:
      "Azure SQL Database 무료 오퍼(serverless)에 스타 스키마를 구축했다. 무료 오퍼의 use_free_limit 플래그는 azurerm 프로바이더가 노출하지 않으므로 azapi_resource로 프로비저닝한다.",
    rows: [
      ["SQL Server", "sql-ev-37851cd1.database.windows.net — West US 3"],
      ["Database", "EVPopulationDB — serverless · General Purpose · auto-pause"],
      ["Compute", "100,000 vCore-s/월 무료 (현재 사용률 ~3%)"],
      ["Storage", "32 GB 무료 (데이터 + 로그 + 백업 포함)"],
      ["방화벽", "AllowAllWindowsAzureIps + 개발 클라이언트 IP 2건"],
    ],
    code: `# free offer는 azurerm이 아닌 azapi_resource로만 제어 가능
resource "azapi_resource" "sql_db" {
  type = "Microsoft.Sql/servers/databases@2025-02-01-preview"
  name = "EVPopulationDB"
  body = {
    location = "westus3"
    sku = { name = "GP_S_Gen5", tier = "GeneralPurpose" }
    properties = {
      useFreeLimit       = true
      freeLimitExhaustionBehavior = "AutoPause"
      maxSizeBytes       = 34359738368   # 32 GB
      zoneRedundant      = false
    }
  }
  lifecycle { ignore_changes = [body.properties.maxSizeBytes] }
}`,
  },
  {
    title: "2. 스키마 설계 (스타 스키마)",
    lead:
      "원시 Socrata 레코드는 전부 NVARCHAR로 staging에 적재해 TRY_CAST 실패를 격리하고, 이후 차원·팩트 테이블에 정형화한다. 차원 키는 IDENTITY 대리 키 + 자연 키 조인으로 구성한다.",
    rows: [
      ["staging", "294,193행 — 원시 컬럼 전부 NVARCHAR (TRY_CAST 안전망)"],
      ["dim_vehicle", "18,068행 — make / model / ev_type / cafv_eligibility"],
      ["dim_location", "1,520행 — county / city / state / postal_code"],
      ["dim_utility", "78행 — 전력 유틸리티 회사"],
      ["dim_model_year", "23행 — 연식 (model_year)"],
      ["fact_ev_registration", "294,193행 — 등록 1건당 1행 + 4개 외래 키"],
    ],
    note:
      "census_tract는 dim_location에서 의도적으로 제외했다. 팩트 조인 시 census_tract가 중복 매칭되어 팩트 행이 증폭되는 문제를 방지하기 위함이다.",
    code: `CREATE TABLE dbo.fact_ev_registration (
  registration_key BIGINT IDENTITY(1,1) PRIMARY KEY,
  vehicle_key     INT  NOT NULL REFERENCES dim_vehicle(vehicle_key),
  location_key    INT  NOT NULL REFERENCES dim_location(location_key),
  utility_key     INT  NOT NULL REFERENCES dim_utility(utility_key),
  model_year_key  INT  NOT NULL REFERENCES dim_model_year(model_year_key),
  electric_range  INT      NULL,
  base_msrp       INT      NULL,
  registration_count INT   NOT NULL DEFAULT 1
);`,
  },
  {
    title: "3. 인덱스 & 성능",
    lead:
      "294K행 규모는 인덱스 없이도 수 초 내 처리되지만, 분석 쿼리(차원 조인)의 데모 목적으로 외래 키 인덱스와 커버링 인덱스를 구성했다.",
    rows: [
      ["클러스터드 PK", "모든 테이블에 IDENTITY 대리 키 클러스터드 인덱스"],
      ["FK 인덱스", "fact의 4개 외래 키 컬럼에 비클러스터드 인덱스"],
      ["커버링 인덱스", "dim_vehicle(make, ev_type) INCLUDE (model)"],
      ["실측", "Top 10 make 쿼리 ~150ms (콜드)/ ~40ms (웜)"],
    ],
    code: `CREATE INDEX IX_fact_vehicle  ON fact_ev_registration(vehicle_key);
CREATE INDEX IX_fact_location ON fact_ev_registration(location_key);
CREATE INDEX IX_fact_utility  ON fact_ev_registration(utility_key);
CREATE INDEX IX_fact_year     ON fact_ev_registration(model_year_key);
CREATE INDEX IX_vehicle_make  ON dim_vehicle(make, ev_type) INCLUDE (model);`,
  },
  {
    title: "4. 보안 (최소 권한)",
    lead:
      "계정을 용도별로 분리했다. ingestion은 쓰기 권한이 있는 evadmin, 쿼리 API는 읽기 전용 ev_readonly를 사용한다. 로그인은 반드시 master에서 생성해야 한다.",
    rows: [
      ["evadmin", "db_owner — ingestion/ETL 전용 (클라이언트에 노출 안 됨)"],
      ["ev_readonly", "db_datareader + DENY INSERT/UPDATE/DELETE/EXEC"],
      ["쿼리 가드", "SELECT/WITH allowlist + DDL/DML 키워드 blocklist"],
      ["연결", "Encrypt=yes · 30s timeout · 1,000행 응답 상한"],
    ],
    note:
      "CREATE LOGIN을 사용자 DB에서 실행하면 40515(master.sys.sql_logins 크로스-DB 참조 불가)·5001(CREATE LOGIN은 master에서)이 발생한다. 반드시 master 컨텍스트에서 LOGIN을 만든 뒤 사용자 DB에서 USER를 매핑한다.",
    code: `-- master 컨텍스트
CREATE LOGIN ev_readonly
  WITH PASSWORD = '<strong-password>', CHECK_POLICY = ON;

-- 사용자 DB 컨텍스트
CREATE USER ev_readonly FOR LOGIN ev_readonly;
ALTER ROLE db_datareader ADD MEMBER ev_readonly;
DENY INSERT, UPDATE, DELETE, EXEC TO ev_readonly;`,
  },
  {
    title: "5. 데이터 적재 & ETL",
    lead:
      "Socrata SODA API에서 $limit/$offset 페이지네이션으로 전체를 읽어 staging에 대량 적재하고, 자연 키 조인으로 차원을 채운 뒤 팩트를 생성한다.",
    rows: [
      ["소스", "data.wa.gov Electric Vehicle Population Data (Socrata)"],
      ["페이지네이션", "$limit=$offset (SODA API 표준)"],
      ["필드 매핑", "zip_code→postal_code · cafv_type→cafv_eligibility · _2020_census_tract→census_tract"],
      ["측정", "fetch ~40s + insert ~49s + ETL ~43s ≈ 132s"],
      ["무결성", "staging 행 수 == fact 행 수 (294,193, 중복 없음)"],
    ],
    note:
      "데이터셋에는 base_msrp 컬럼이 없다. 원본 스키마와 다른 필드명(zip_code→postal_code 등)이 실제 SODA 응답과 일치하도록 매핑을 보정했다.",
    code: `INSERT INTO dim_vehicle (vin_prefix, make, model, model_year, ev_type, cafv_eligibility)
SELECT DISTINCT
  LEFT(VIN, 10), make, model,
  TRY_CAST(model_year AS INT),
  ev_type, cafv_type
FROM staging
WHERE VIN IS NOT NULL;`,
  },
  {
    title: "6. 운용 (Operations)",
    lead:
      "무료 오퍼는 유휴 시 DB가 자동 일시중지(auto-pause)되어 재개에 30~60초가 걸린다. 애플리케이션 레이어에서 이를 흡수한다.",
    rows: [
      ["auto-pause", "유휴 시 자동 일시중지 → 첫 쿼리에서 40613 반환"],
      ["재연결", "3회 재시도 · 15s 간격 · login_timeout=60"],
      ["모니터링", "vCore-s/스토리지 사용량은 포털에서 무료 한도 대비 확인"],
      ["백업", "free offer의 32GB 내 자동 백업(7일) 포함"],
    ],
    code: `# db.py — 일시중지 재개를 흡수하는 연결 재시도
def get_connection(readonly=True):
    for attempt in range(3):
        try:
            return pymssql.connect(
                server=SQL_SERVER, user=user, password=pwd,
                database=SQL_DB, login_timeout=60, timeout=30)
        except pymssql.OperationalError as e:
            if "not currently available" in str(e) and attempt < 2:
                time.sleep(15)   # 40613: auto-pause 재개 대기
                continue
            raise`,
  },
  {
    title: "7. IaC & 배포 (Terraform + CI/CD)",
    lead:
      "전 리소스를 Terraform으로 관리하고, GitHub Actions(OIDC, 시크릿 없음)로 배포한다. 함수 앱의 app_settings는 반드시 Terraform에서 관리해야 한다.",
    rows: [
      ["원격 상태", "Azure Storage (stev37851cd1/tfstate)"],
      ["OIDC", "GitHub App(0a875070) 연동 — 서비스 주체 시크릿 없음"],
      ["app_settings", "SQL_* 접속 정보는 TF에 정의 (az CLI 설정값은 apply 시 유실됨)"],
      ["CORS", "커스텀 도메인 + 로컬호스트만 허용"],
    ],
    note:
      "az CLI로 함수 앱 app_settings를 설정해도, 이후 Terraform apply가 함수 앱을 관리하면 설정이 초기화된다. 반드시 terraform/main.tf의 app_settings 블록에 SQL 접속 정보를 포함시켰다.",
  },
  {
    title: "8. 장애 대응 (에러 코드별)",
    rows: [
      ["40613", "DB가 auto-pause 재개 중 → 재시도(15s)로 흡수"],
      ["40515", "master.sys.sql_logins 크로스-DB 참조 불가 → LOGIN은 master에서"],
      ["5001", "CREATE LOGIN 위치 오류 → master 컨텍스트로 이동"],
      ["Login timeout", "pymssql은 login_timeout 키워드 (Connection Timeout 아님)"],
      ["방화벽 차단", "Azure 서비스 허용 + 개발 IP를 방화벽 규칙에 추가"],
    ],
  },
];

export default function Dba({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>DBA 가이드 — DB 구축 · 관리 · 운용</h2>
        <p className="about-lede">
          azure-sql-ev의 데이터베이스를 DBA 관점에서 정리한 운영 가이드다.
          무료 오퍼(serverless) 위에 스타 스키마를 구축하고, 최소 권한 계정과
          auto-pause 대응까지 프로덕션 수준의 패턴을 담았다.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="about-section">
            <h3>{section.title}</h3>
            {section.lead && <p className="about-copy">{section.lead}</p>}
            {section.rows && (
              <dl>
                {section.rows.map(([k, v]) => (
                  <div className="about-row" key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {section.code && <pre className="dba-code">{section.code}</pre>}
            {section.note && <div className="dba-note">{section.note}</div>}
          </section>
        ))}
      </div>
    </div>
  );
}
