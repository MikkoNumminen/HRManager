-- Move audit logs to MongoDB (polyglot persistence)
-- Audit log data should be migrated to MongoDB before running this migration.
DROP TABLE IF EXISTS "AuditLog";
