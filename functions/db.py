import os
import re

import pymssql

BLOCKED_KEYWORDS = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "EXEC",
    "MERGE",
    "GRANT",
    "REVOKE",
)

_BLOCKED_RE = re.compile(r"\b(" + "|".join(BLOCKED_KEYWORDS) + r")\b", re.IGNORECASE)
_SELECT_RE = re.compile(r"^\s*(SELECT|WITH)\b", re.IGNORECASE)


def get_connection(readonly=True):
    user = os.environ["SQL_READONLY_USER"] if readonly else os.environ["SQL_ADMIN_USER"]
    password = os.environ["SQL_READONLY_PWD"] if readonly else os.environ["SQL_ADMIN_PWD"]
    return pymssql.connect(
        server=os.environ["SQL_SERVER"],
        user=user,
        password=password,
        database=os.environ["SQL_DB"],
        port=1433,
        login_timeout=30,
        timeout=30,
        charset="utf8",
    )


def validate_query(query):
    if not query or not query.strip():
        return "Query is empty."
    if not _SELECT_RE.match(query):
        return "Only SELECT or WITH queries are allowed."
    match = _BLOCKED_RE.search(query)
    if match:
        return f"Blocked keyword: {match.group(0).upper()}."
    return None


def _json_safe(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


def execute_query(query, readonly=True):
    conn = get_connection(readonly=readonly)
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [d[0] for d in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(1001)
        truncated = len(rows) > 1000
        data = [[_json_safe(v) for v in row] for row in rows[:1000]]
        return {
            "columns": columns,
            "rows": data,
            "rowCount": len(data),
            "truncated": truncated,
        }
    finally:
        conn.close()
