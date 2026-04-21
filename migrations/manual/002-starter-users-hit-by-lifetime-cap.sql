-- For manual outreach — do NOT auto-email.
--
-- Context: until this commit, the quote-quota gate in
-- server/routers/quotesRouter.ts compared LIFETIME quote count against the
-- Starter cap of 20. Any Starter user with >= 20 quotes was hard-capped from
-- creating new quotes regardless of when those quotes were created. This
-- query identifies the affected accounts so Mike can reach out personally
-- (apologize, confirm the fix is live, and offer a credit / free month).

SELECT u.id,
       u.email,
       u.name,
       COUNT(q.*) AS total_quotes
  FROM users u
  JOIN businesses b ON b.owner_user_id = u.id
  JOIN quotes q     ON q.business_id  = b.id
 WHERE u.subscription_tier = 'starter'
 GROUP BY u.id, u.email, u.name
HAVING COUNT(q.*) >= 20
 ORDER BY total_quotes DESC;
