-- ============================================================
-- 03-etl-dimensions.sql
-- Full reload of dimensions from staging (latest snapshot only).
-- Runs after the ingestion function populates `staging`.
-- ============================================================

-- Clear fact first (FK constraints forbid TRUNCATE on referenced dims).
DELETE FROM dbo.fact_ev_registration;
DELETE FROM dbo.dim_vehicle;
DELETE FROM dbo.dim_location;
DELETE FROM dbo.dim_utility;
DELETE FROM dbo.dim_model_year;

-- dim_model_year (valid years only).
INSERT INTO dbo.dim_model_year (model_year)
SELECT DISTINCT TRY_CAST(model_year AS SMALLINT)
FROM dbo.staging
WHERE TRY_CAST(model_year AS SMALLINT) IS NOT NULL;

-- dim_utility (NULL mapped to 'Unknown' so fact can always join).
INSERT INTO dbo.dim_utility (electric_utility)
SELECT DISTINCT ISNULL(electric_utility, N'Unknown')
FROM dbo.staging;

-- dim_location (distinct county/city/state/postal; NULLs coalesced to '').
INSERT INTO dbo.dim_location (county, city, state, postal_code)
SELECT DISTINCT
    ISNULL(county, N''),
    ISNULL(city, N''),
    ISNULL(state, N''),
    ISNULL(postal_code, N'')
FROM dbo.staging;

-- dim_vehicle (unique by VIN prefix; TRY_CAST hardens malformed years).
INSERT INTO dbo.dim_vehicle (vin_1_10, make, model, model_year, ev_type, cafv_eligibility)
SELECT DISTINCT
    vin_1_10,
    make,
    model,
    TRY_CAST(model_year AS SMALLINT),
    ev_type,
    cafv_eligibility
FROM dbo.staging
WHERE vin_1_10 IS NOT NULL;
