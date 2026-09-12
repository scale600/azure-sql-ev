-- ============================================================
-- 05-sample-queries.sql
-- Curated examples surfaced in the dashboard.
-- ============================================================

-- ---- Raw staging queries (NVARCHAR, demonstrates TRY_CAST) ----

-- Top 10 EV makes.
SELECT TOP 10 make, COUNT(*) AS registrations
FROM dbo.staging
GROUP BY make
ORDER BY registrations DESC;

-- Yearly registration trend.
SELECT model_year, COUNT(*) AS registrations
FROM dbo.staging
GROUP BY model_year
ORDER BY model_year;

-- Average electric range by model year.
SELECT model_year, AVG(TRY_CAST(electric_range AS FLOAT)) AS avg_range
FROM dbo.staging
WHERE electric_range IS NOT NULL
GROUP BY model_year
ORDER BY model_year;

-- BEV vs PHEV split.
SELECT ev_type, COUNT(*) AS count
FROM dbo.staging
GROUP BY ev_type;

-- Top counties by BEV count.
SELECT TOP 10 county, COUNT(*) AS bev_count
FROM dbo.staging
WHERE ev_type LIKE '%BEV%'
GROUP BY county
ORDER BY bev_count DESC;

-- ---- Star-schema queries (fact + dimensions) ----

-- Top 10 EV makes (fact + dim_vehicle).
SELECT TOP 10 v.make, COUNT(*) AS registrations
FROM dbo.fact_ev_registration f
JOIN dbo.dim_vehicle v ON f.vehicle_key = v.vehicle_key
GROUP BY v.make
ORDER BY registrations DESC;

-- Registrations by county and model year (fact + dim_location + dim_model_year).
SELECT l.county, y.model_year, COUNT(*) AS registrations
FROM dbo.fact_ev_registration f
JOIN dbo.dim_location l ON f.location_key = l.location_key
JOIN dbo.dim_model_year y ON f.model_year_key = y.model_year_key
GROUP BY l.county, y.model_year
ORDER BY l.county, y.model_year;

-- BEV vs PHEV split (fact + dim_vehicle).
SELECT v.ev_type, COUNT(*) AS count
FROM dbo.fact_ev_registration f
JOIN dbo.dim_vehicle v ON f.vehicle_key = v.vehicle_key
GROUP BY v.ev_type;

-- Average electric range by model year (fact + dim_model_year).
SELECT y.model_year, AVG(f.electric_range) AS avg_range
FROM dbo.fact_ev_registration f
JOIN dbo.dim_model_year y ON f.model_year_key = y.model_year_key
WHERE f.electric_range IS NOT NULL
GROUP BY y.model_year
ORDER BY y.model_year;
