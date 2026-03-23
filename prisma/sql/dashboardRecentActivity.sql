-- @param {String} $1:sessionId
-- Returns the 10 most recent audit log entries for the dashboard activity feed
SELECT
  "action",
  "entityType",
  "userEmail",
  "createdAt"
FROM "AuditLog"
WHERE "sessionId" IS NOT DISTINCT FROM $1
ORDER BY "createdAt" DESC
LIMIT 10
