# Security

This template is a single-team workspace. All members share its brands. Use a separate deployment and database per mutually untrusted team.

Never commit runtime secrets, OAuth tokens, customer records, database exports, or deployment metadata. Keep `.env.local`, `.vercel`, and `research` ignored. Public Supabase publishable keys do not replace RLS; never substitute a service-role key.

Membership is provisioned by an administrator. The application has no public signup or member self-enrollment policy. Worker RPCs accept a secret verified against a stored digest; do not remove this guard because a function is callable by the anon role.

Report a vulnerability through GitHub private vulnerability reporting if enabled. Do not include exploit credentials, tokens, or private customer records in public issues. This repository is an independently installable template; each operator is responsible for access, backups, dependency updates, usage costs, and its own data processing requirements.
