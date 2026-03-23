-- @param {String} $1:sessionId
-- Returns team names with their member counts, ordered alphabetically
SELECT
  t."teamName",
  COUNT(tm.id)::int AS "memberCount"
FROM "Team" t
LEFT JOIN "TeamMember" tm
  ON tm."teamId" = t."teamId"
  AND tm."deletedAt" IS NULL
  AND tm."sessionId" IS NOT DISTINCT FROM $1
WHERE t."deletedAt" IS NULL
  AND t."sessionId" IS NOT DISTINCT FROM $1
GROUP BY t."teamId", t."teamName"
ORDER BY t."teamName" ASC
