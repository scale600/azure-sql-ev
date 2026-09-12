-- ============================================================
-- 02-create-indexes.sql
-- Non-clustered indexes for dimension lookups and fact joins.
-- ============================================================

-- dim_vehicle: filter by make, then make + year.
DROP INDEX IF EXISTS IX_dim_vehicle_make ON dbo.dim_vehicle;
DROP INDEX IF EXISTS IX_dim_vehicle_year ON dbo.dim_vehicle;
CREATE INDEX IX_dim_vehicle_make ON dbo.dim_vehicle (make, model_year);
CREATE INDEX IX_dim_vehicle_year ON dbo.dim_vehicle (model_year);

-- dim_location: filter by county.
DROP INDEX IF EXISTS IX_dim_location_county ON dbo.dim_location;
CREATE INDEX IX_dim_location_county ON dbo.dim_location (county);

-- fact_ev_registration: support star-schema joins on each FK.
DROP INDEX IF EXISTS IX_fact_vehicle ON dbo.fact_ev_registration;
DROP INDEX IF EXISTS IX_fact_location ON dbo.fact_ev_registration;
DROP INDEX IF EXISTS IX_fact_model_year ON dbo.fact_ev_registration;
DROP INDEX IF EXISTS IX_fact_utility ON dbo.fact_ev_registration;
CREATE INDEX IX_fact_vehicle    ON dbo.fact_ev_registration (vehicle_key);
CREATE INDEX IX_fact_location   ON dbo.fact_ev_registration (location_key);
CREATE INDEX IX_fact_model_year ON dbo.fact_ev_registration (model_year_key);
CREATE INDEX IX_fact_utility    ON dbo.fact_ev_registration (utility_key);
