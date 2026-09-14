# Data Model (Star Schema)

Washington EV registration data modeled as a star schema: one raw `staging` table, four dimensions, and one fact table.

```
              dim_vehicle ──────┐
              dim_location ─────┤
              dim_utility ──────┼──▶ fact_ev_registration ◀── dim_model_year
                                │
        staging (raw, NVARCHAR) ┘
```

## Row counts (current snapshot)

| Table | Type | Rows |
| :--- | :--- | ---: |
| `staging` | Staging | 294,193 |
| `dim_vehicle` | Dimension | 18,068 |
| `dim_location` | Dimension | 1,520 |
| `dim_utility` | Dimension | 78 |
| `dim_model_year` | Dimension | 23 |
| `fact_ev_registration` | Fact | 294,193 |

## Tables

### `staging` — raw Socrata records (all `NVARCHAR`)

Raw API rows are stored as `NVARCHAR` so malformed values never break the load; `TRY_CAST` handles conversion downstream. Source field → column mapping:

| Column | Socrata field |
| :--- | :--- |
| `vin_1_10` | `vin_1_10` |
| `county`, `city`, `state` | `county`, `city`, `state` |
| `postal_code` | `zip_code` |
| `model_year`, `make`, `model` | `model_year`, `make`, `model` |
| `ev_type` | `ev_type` |
| `cafv_eligibility` | `cafv_type` |
| `electric_range` | `electric_range` |
| `legislative_district`, `dol_vehicle_id` | `legislative_district`, `dol_vehicle_id` |
| `electric_utility` | `electric_utility` |
| `census_tract` | `_2020_census_tract` |

### `dim_vehicle` — unique vehicle identity by VIN prefix

| Column | Type |
| :--- | :--- |
| `vehicle_key` | `int` IDENTITY PK |
| `vin_1_10` | `nvarchar(10)` |
| `make` | `nvarchar(50)` |
| `model` | `nvarchar(100)` |
| `model_year` | `smallint` |
| `ev_type` | `nvarchar(50)` |
| `cafv_eligibility` | `nvarchar(100)` |

### `dim_location` — county / city / state / postal

| Column | Type |
| :--- | :--- |
| `location_key` | `int` IDENTITY PK |
| `county` | `nvarchar(50)` |
| `city` | `nvarchar(50)` |
| `state` | `nvarchar(2)` |
| `postal_code` | `nvarchar(10)` |

> `census_tract` is kept only in `staging`; including it in the location dimension made the fact join ambiguous (a zip can span multiple census tracts), so it was removed to keep the grain at county/city/state/postal.

### `dim_utility` — electric utility companies

| Column | Type |
| :--- | :--- |
| `utility_key` | `int` IDENTITY PK |
| `electric_utility` | `nvarchar(200)` |

### `dim_model_year` — conformed model-year dimension

| Column | Type |
| :--- | :--- |
| `model_year_key` | `int` IDENTITY PK |
| `model_year` | `smallint` |

### `fact_ev_registration` — one row per registration

| Column | Type |
| :--- | :--- |
| `registration_key` | `int` IDENTITY PK |
| `vehicle_key` | `int` FK → `dim_vehicle` |
| `location_key` | `int` FK → `dim_location` |
| `utility_key` | `int` FK → `dim_utility` |
| `model_year_key` | `int` FK → `dim_model_year` |
| `electric_range` | `int` |
| `legislative_district` | `int` |
| `dol_vehicle_id` | `nvarchar(50)` |

## Indexes

| Table | Index | Columns | Purpose |
| :--- | :--- | :--- | :--- |
| `dim_vehicle` | `IX_dim_vehicle_vin` (unique) | `vin_1_10` | ETL lookup |
| `dim_vehicle` | `IX_dim_vehicle_make` | `make, model_year` | analytics |
| `dim_vehicle` | `IX_dim_vehicle_year` | `model_year` | analytics |
| `dim_location` | `IX_dim_location_nk` (unique) | `county, city, state, postal_code` | ETL lookup |
| `dim_location` | `IX_dim_location_county` | `county` | analytics |
| `dim_model_year` | `IX_dim_model_year_val` (unique) | `model_year` | ETL lookup |
| `dim_utility` | `IX_dim_utility_name` (unique) | `electric_utility` | ETL lookup |
| `fact_ev_registration` | `IX_fact_vehicle` | `vehicle_key` | join |
| `fact_ev_registration` | `IX_fact_location` | `location_key` | join |
| `fact_ev_registration` | `IX_fact_model_year` | `model_year_key` | join |
| `fact_ev_registration` | `IX_fact_utility` | `utility_key` | join |

## ETL

The ingestion function runs the full reload (latest snapshot only):

1. `DELETE` staging → bulk-insert fresh Socrata rows (NULLs coalesced to `''` / `'Unknown'`).
2. Load dimensions with `SELECT DISTINCT …` (invalid `model_year` dropped via `TRY_CAST`).
3. Load the fact table by joining `staging` to the four dimensions on their natural keys (sargable, index-backed).
