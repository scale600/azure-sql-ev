-- ============================================================
-- 01-create-tables.sql
-- Star schema: staging (raw) + 4 dimensions + 1 fact table.
-- Idempotent: drops and recreates on each run.
-- ============================================================

-- Drop in reverse-dependency order (fact references dimensions).
DROP TABLE IF EXISTS dbo.fact_ev_registration;
DROP TABLE IF EXISTS dbo.dim_vehicle;
DROP TABLE IF EXISTS dbo.dim_location;
DROP TABLE IF EXISTS dbo.dim_utility;
DROP TABLE IF EXISTS dbo.dim_model_year;
DROP TABLE IF EXISTS dbo.staging;

-- ------------------------------------------------------------
-- staging: raw Socrata records. All NVARCHAR so malformed
-- values never break the load; TRY_CAST handles conversion.
-- ------------------------------------------------------------
CREATE TABLE dbo.staging (
    vin_1_10             NVARCHAR(10)  NULL,
    county               NVARCHAR(50)  NULL,
    city                 NVARCHAR(50)  NULL,
    state                NVARCHAR(2)   NULL,
    postal_code          NVARCHAR(10)  NULL,
    model_year           NVARCHAR(10)  NULL,
    make                 NVARCHAR(50)  NULL,
    model                NVARCHAR(100) NULL,
    ev_type              NVARCHAR(50)  NULL,
    cafv_eligibility     NVARCHAR(100) NULL,
    electric_range       NVARCHAR(10)  NULL,
    base_msrp            NVARCHAR(20)  NULL,
    legislative_district NVARCHAR(10)  NULL,
    dol_vehicle_id       NVARCHAR(50)  NULL,
    electric_utility     NVARCHAR(200) NULL,
    census_tract         NVARCHAR(50)  NULL
);

-- ------------------------------------------------------------
-- dim_vehicle: unique vehicle identity by VIN prefix.
-- ------------------------------------------------------------
CREATE TABLE dbo.dim_vehicle (
    vehicle_key      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vin_1_10         NVARCHAR(10)  NULL,
    make             NVARCHAR(50)  NULL,
    model            NVARCHAR(100) NULL,
    model_year       SMALLINT      NULL,
    ev_type          NVARCHAR(50)  NULL,
    cafv_eligibility NVARCHAR(100) NULL
);

-- ------------------------------------------------------------
-- dim_location: county / city / state / postal / census tract.
-- ------------------------------------------------------------
CREATE TABLE dbo.dim_location (
    location_key INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    county       NVARCHAR(50) NULL,
    city         NVARCHAR(50) NULL,
    state        NVARCHAR(2)  NULL,
    postal_code  NVARCHAR(10) NULL,
    census_tract NVARCHAR(50) NULL
);

-- ------------------------------------------------------------
-- dim_utility: electric utility companies.
-- ------------------------------------------------------------
CREATE TABLE dbo.dim_utility (
    utility_key      INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    electric_utility NVARCHAR(200) NULL
);

-- ------------------------------------------------------------
-- dim_model_year: conformed model-year dimension.
-- ------------------------------------------------------------
CREATE TABLE dbo.dim_model_year (
    model_year_key INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    model_year     SMALLINT NULL
);

-- ------------------------------------------------------------
-- fact_ev_registration: one row per registration.
-- ------------------------------------------------------------
CREATE TABLE dbo.fact_ev_registration (
    registration_key     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    vehicle_key          INT           NOT NULL,
    location_key         INT           NOT NULL,
    utility_key          INT           NOT NULL,
    model_year_key       INT           NOT NULL,
    electric_range       INT           NULL,
    base_msrp            INT           NULL,
    legislative_district INT           NULL,
    dol_vehicle_id       NVARCHAR(50)  NULL,
    CONSTRAINT FK_fact_vehicle    FOREIGN KEY (vehicle_key)    REFERENCES dbo.dim_vehicle (vehicle_key),
    CONSTRAINT FK_fact_location   FOREIGN KEY (location_key)   REFERENCES dbo.dim_location (location_key),
    CONSTRAINT FK_fact_utility    FOREIGN KEY (utility_key)    REFERENCES dbo.dim_utility (utility_key),
    CONSTRAINT FK_fact_model_year FOREIGN KEY (model_year_key) REFERENCES dbo.dim_model_year (model_year_key)
);
