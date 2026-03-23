-- @param {String} $1:sessionId
-- Returns total counts for persons, teams, departments, and users in a single query
SELECT
  (SELECT COUNT(*)::int FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM $1) AS "totalPersons",
  (SELECT COUNT(*)::int FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM $1) AS "totalTeams",
  (SELECT COUNT(*)::int FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM $1) AS "totalDepartments",
  (SELECT COUNT(*)::int FROM "User") AS "totalUsers"
