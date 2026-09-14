import json
import time

import azure.functions as func

import db


def _response(payload, status=200):
    return func.HttpResponse(
        json.dumps(payload, default=str),
        status_code=status,
        mimetype="application/json",
    )


def _error(message, status):
    return _response({"error": message}, status)


def handle_query(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
    except ValueError:
        return _error("Invalid JSON body.", 400)

    query = body.get("query") if isinstance(body, dict) else None
    if not isinstance(query, str):
        return _error('Missing string field "query".', 400)

    validation_error = db.validate_query(query)
    if validation_error:
        return _error(validation_error, 403)

    start = time.perf_counter()
    try:
        result = db.execute_query(query, readonly=True)
    except Exception as exc:
        return _error(f"Query failed: {exc}", 500)

    result["elapsedMs"] = int((time.perf_counter() - start) * 1000)
    return _response(result)


def handle_schema(req: func.HttpRequest) -> func.HttpResponse:
    query = (
        "SELECT t.name AS table_name, c.name AS column_name, ty.name AS data_type "
        "FROM sys.tables t "
        "JOIN sys.columns c ON c.object_id = t.object_id "
        "JOIN sys.types ty ON ty.user_type_id = c.user_type_id "
        "WHERE t.is_ms_shipped = 0 "
        "ORDER BY t.name, c.column_id"
    )
    try:
        result = db.execute_query(query, readonly=True)
    except Exception as exc:
        return _error(f"Schema lookup failed: {exc}", 500)

    tables = {}
    for table, column, data_type in result["rows"]:
        tables.setdefault(table, []).append({"name": column, "type": data_type})
    return _response(
        {"tables": [{"name": n, "columns": cols} for n, cols in tables.items()]}
    )
