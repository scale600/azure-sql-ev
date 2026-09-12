-- ============================================================
-- 06-readonly-user.sql
-- Least-privilege login + user for the query API.
--
-- Azure SQL DB requires the login and user in different databases:
--   Part 1 (LOGIN) runs in `master`.
--   Part 2 (USER)  runs in `EVPopulationDB`.
-- ============================================================

-- ---- Part 1: server-level login (run in master) ----
IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'ev_readonly')
BEGIN
    CREATE LOGIN ev_readonly WITH PASSWORD = '<strong-password>';
END;

-- ---- Part 2: database user (run in EVPopulationDB) ----
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'ev_readonly')
BEGIN
    CREATE USER ev_readonly FOR LOGIN ev_readonly;
END;

-- Grant read via the built-in data reader role.
IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members rm
    JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
    JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
    WHERE r.name = 'db_datareader' AND m.name = 'ev_readonly'
)
BEGIN
    ALTER ROLE db_datareader ADD MEMBER ev_readonly;
END;

-- Defense-in-depth: explicitly deny writes and execution.
DENY INSERT, UPDATE, DELETE, EXEC TO ev_readonly;
