- OBSERVABILITY: `ssh -L 3301:localhost:3301 user@server`
- VENDURE: `ssh -L 3000:localhost:3000 user@server`

# Reset vendure superadmin password

```bash
psql -U vendure -d vendure


SELECT
  a.id           AS admin_id,
  u.id           AS user_id,
  u.identifier   AS login_identifier,
  a."emailAddress"
FROM public.administrator a
JOIN public."user" u ON a."userId" = u.id
ORDER BY a.id;

BEGIN;
DELETE FROM public.session WHERE "userId" = 1;
DELETE FROM public.authentication_method WHERE "userId" = 1;
DELETE FROM public.user_roles_role WHERE "userId" = 1;
DELETE FROM public.history_entry WHERE "administratorId" = 1;
DELETE FROM public.administrator WHERE id = 1;
DELETE FROM public."user" WHERE id = 1;
COMMIT;
`
```
