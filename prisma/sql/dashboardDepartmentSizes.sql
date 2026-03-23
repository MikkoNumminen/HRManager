-- @param {String} $1:sessionId
-- Returns department names with their team counts, ordered alphabetically
SELECT
  d."name" AS "departmentName",
  COUNT(t."teamId")::int AS "teamCount"
FROM "Department" d
LEFT JOIN "Team" t
  ON t."departmentId" = d.id
  AND t."deletedAt" IS NULL
  AND t."sessionId" IS NOT DISTINCT FROM $1
WHERE d."deletedAt" IS NULL
  AND d."sessionId" IS NOT DISTINCT FROM $1
GROUP BY d.id, d."name"
ORDER BY d."name" ASC
