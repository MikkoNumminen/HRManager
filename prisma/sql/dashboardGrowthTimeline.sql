-- @param {String} $1:sessionId
-- Returns cumulative growth timeline with running totals per date using window functions
WITH daily AS (
  SELECT date, SUM(p)::int AS p, SUM(t)::int AS t, SUM(d)::int AS d
  FROM (
    SELECT "createdAt"::date AS date, 1 AS p, 0 AS t, 0 AS d
    FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM $1
    UNION ALL
    SELECT "createdAt"::date AS date, 0 AS p, 1 AS t, 0 AS d
    FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM $1
    UNION ALL
    SELECT "createdAt"::date AS date, 0 AS p, 0 AS t, 1 AS d
    FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM $1
  ) combined
  GROUP BY date
)
SELECT
  date::text AS "date",
  SUM(p) OVER (ORDER BY date)::int AS "persons",
  SUM(t) OVER (ORDER BY date)::int AS "teams",
  SUM(d) OVER (ORDER BY date)::int AS "departments"
FROM daily
ORDER BY date ASC
