import logging
import time

import pymssql
import requests

import db

API_URL = "https://data.wa.gov/resource/f6w7-q2d2.json"
PAGE_SIZE = 50000

SOURCE_TO_COLUMN = {
    "vin_1_10": "vin_1_10",
    "county": "county",
    "city": "city",
    "state": "state",
    "postal_code": "postal_code",
    "model_year": "model_year",
    "make": "make",
    "model": "model",
    "electric_vehicle_type": "ev_type",
    "cafv_eligibility": "cafv_eligibility",
    "electric_range": "electric_range",
    "base_msrp": "base_msrp",
    "legislative_district": "legislative_district",
    "dol_vehicle_id": "dol_vehicle_id",
    "electric_utility": "electric_utility",
    "census_tract": "census_tract",
}

STAGING_COLUMNS = list(SOURCE_TO_COLUMN.values())
_INSERT_SQL = (
    "INSERT INTO dbo.staging ("
    + ", ".join(STAGING_COLUMNS)
    + ") VALUES ("
    + ", ".join(["%s"] * len(STAGING_COLUMNS))
    + ")"
)


def _fetch_records():
    records = []
    offset = 0
    while True:
        response = requests.get(
            API_URL,
            params={"$limit": PAGE_SIZE, "$offset": offset},
            timeout=120,
        )
        response.raise_for_status()
        batch = response.json()
        if not batch:
            break
        records.extend(batch)
        offset += len(batch)
        if len(batch) < PAGE_SIZE:
            break
    return records


def _etl(conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM dbo.fact_ev_registration")
    cursor.execute("DELETE FROM dbo.dim_vehicle")
    cursor.execute("DELETE FROM dbo.dim_location")
    cursor.execute("DELETE FROM dbo.dim_utility")
    cursor.execute("DELETE FROM dbo.dim_model_year")

    cursor.execute(
        "INSERT INTO dbo.dim_model_year (model_year) "
        "SELECT DISTINCT TRY_CAST(model_year AS SMALLINT) "
        "FROM dbo.staging WHERE TRY_CAST(model_year AS SMALLINT) IS NOT NULL"
    )
    cursor.execute(
        "INSERT INTO dbo.dim_utility (electric_utility) "
        "SELECT DISTINCT ISNULL(electric_utility, N'Unknown') FROM dbo.staging"
    )
    cursor.execute(
        "INSERT INTO dbo.dim_location (county, city, state, postal_code, census_tract) "
        "SELECT DISTINCT county, city, state, postal_code, census_tract FROM dbo.staging"
    )
    cursor.execute(
        "INSERT INTO dbo.dim_vehicle (vin_1_10, make, model, model_year, ev_type, cafv_eligibility) "
        "SELECT DISTINCT vin_1_10, make, model, TRY_CAST(model_year AS SMALLINT), ev_type, cafv_eligibility "
        "FROM dbo.staging"
    )
    cursor.execute(
        "INSERT INTO dbo.fact_ev_registration "
        "(vehicle_key, location_key, utility_key, model_year_key, electric_range, base_msrp, legislative_district, dol_vehicle_id) "
        "SELECT v.vehicle_key, l.location_key, u.utility_key, y.model_year_key, "
        "TRY_CAST(s.electric_range AS INT), TRY_CAST(s.base_msrp AS INT), "
        "TRY_CAST(s.legislative_district AS INT), s.dol_vehicle_id "
        "FROM dbo.staging s "
        "JOIN dbo.dim_vehicle v ON s.vin_1_10 = v.vin_1_10 "
        "JOIN dbo.dim_location l ON ISNULL(s.county, N'') = ISNULL(l.county, N'') "
        "AND ISNULL(s.city, N'') = ISNULL(l.city, N'') "
        "AND ISNULL(s.state, N'') = ISNULL(l.state, N'') "
        "AND ISNULL(s.postal_code, N'') = ISNULL(l.postal_code, N'') "
        "JOIN dbo.dim_model_year y ON TRY_CAST(s.model_year AS SMALLINT) = y.model_year "
        "JOIN dbo.dim_utility u ON ISNULL(s.electric_utility, N'Unknown') = u.electric_utility"
    )


def ingest():
    start = time.perf_counter()
    records = _fetch_records()
    logging.info("Fetched %d records", len(records))

    conn = db.get_connection(readonly=False)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.staging")
        chunk = 1000
        for i in range(0, len(records), chunk):
            batch = records[i : i + chunk]
            rows = [tuple(r.get(k) for k in SOURCE_TO_COLUMN) for r in batch]
            cursor.executemany(_INSERT_SQL, rows)
        conn.commit()

        _etl(conn)
        conn.commit()
    finally:
        conn.close()

    logging.info("Ingestion complete in %.1fs", time.perf_counter() - start)
