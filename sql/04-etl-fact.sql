-- ============================================================
-- 04-etl-fact.sql
-- Load fact_ev_registration by joining staging to the dimensions.
-- Runs after 03-etl-dimensions.sql.
-- ============================================================

INSERT INTO dbo.fact_ev_registration (
    vehicle_key,
    location_key,
    utility_key,
    model_year_key,
    electric_range,
    legislative_district,
    dol_vehicle_id
)
SELECT
    v.vehicle_key,
    l.location_key,
    u.utility_key,
    y.model_year_key,
    TRY_CAST(s.electric_range AS INT),
    TRY_CAST(s.legislative_district AS INT),
    s.dol_vehicle_id
FROM dbo.staging s
JOIN dbo.dim_vehicle v
    ON s.vin_1_10 = v.vin_1_10
JOIN dbo.dim_location l
    ON ISNULL(s.county, N'')      = l.county
   AND ISNULL(s.city, N'')        = l.city
   AND ISNULL(s.state, N'')       = l.state
   AND ISNULL(s.postal_code, N'') = l.postal_code
JOIN dbo.dim_model_year y
    ON TRY_CAST(s.model_year AS SMALLINT) = y.model_year
JOIN dbo.dim_utility u
    ON ISNULL(s.electric_utility, N'Unknown') = u.electric_utility;
