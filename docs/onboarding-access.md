# Onboarding and organization access

`create_organization` is the only browser-facing organization creation path.
It derives the owner from `auth.uid()` and creates the organization, profile
membership, admin role and free subscription in one transaction. A per-user
transaction lock makes duplicate submissions/retries idempotent. It can repair
an owner’s partial setup from the previous browser flow, but never promotes an
ordinary member. Existing subscription plans are preserved.

Browser profile updates cannot change identity or organization membership.
Organization settings remain editable under the existing owner policy; ownership
cannot be reassigned through the browser. Membership provisioning beyond initial
onboarding remains a trusted server operation; this change does not add invitations.

Every Edge Function validates the supplied access token with Supabase Auth and
loads membership through a user-scoped client. Weight synthesis uses that client
instead of the service role. Linked assessments/sessions are checked before AI
calls. Executive report generation requires an organization admin. News refresh
only processes the caller's organization. Service-role-only maintenance RPCs are
not callable by normal users, and weight activation verifies organization/admin
access inside the database function.

## Validation

- `npm ci`
- `npm test`: frontend and Edge Function tests plus a PostgreSQL/RLS regression
  test using PGlite. The SQL test applies the checked-in migrations with minimal
  Supabase Auth/Storage stubs and excludes the platform extension/publication
  statements. It tests retries, partial-state recovery, rollback, profile
  reassignment, role escalation and cross-organization reads/writes/RPCs.
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`

These checks do not exercise deployed Supabase Auth, network services, scheduling,
or AI providers. The SQL tests use an isolated database and never production data.

## Release order

1. Apply `20261006150000_onboarding_org_access.sql` to a staging Supabase project.
2. Deploy all eleven Edge Functions, including their shared authorization module.
3. Deploy the frontend that calls the new onboarding RPC.
4. Verify signup/onboarding and retry behavior with fresh accounts, then verify
   that users from two organizations cannot access each other's records or
   invoke weight synthesis/activation against each other's sessions.

Coordinate the migration/frontend rollout: the old multi-request onboarding
flow will be denied once the migration removes direct browser write privileges.
Apply the same release order to production after staging checks. No migration or
Edge Function deployment is performed merely by this code change.

The repository declares no news scheduler. If an external scheduler currently
calls `fetch-regional-news` anonymously or with a service-role token, it will now
be rejected. Do not restore unauthenticated all-organization refresh; provision
a separately authenticated server job before restoring scheduled refreshes.

Keep private credentials in deployment secrets. The already tracked `.env`
contains public client configuration and is unchanged; new `.env*` files are
ignored, with `.env.example` available for value-free documentation.
