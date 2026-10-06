# Weighting approval and assessment snapshots

Task 2 builds on the onboarding/access migration in PR #1. Apply migrations in filename order, deploy `calculate-consequence-weights`, and release this frontend together in staging before production. The migration revokes direct weight writes; older frontend approval/manual-save code must not remain in use after rollout.

Approval loads the saved synthesis, checks that the reviewed recommendations have not changed, derives organization and approver from the authenticated user, and activates the version in one database transaction. Organization row locks serialize version allocation and replacement. Retrying an already approved session returns its original version without reactivating it. Manual weights use the same transactional replacement rules and archive any active AI version.

Percentages support two decimals and zero; all ten AI categories must total 100. AI output is normalized using largest remainders to exactly 100.00. Category names are mapped explicitly (canonical synthesis names and existing human AHP labels), never by row order or category number. Before rollout verify the actual `consequences` catalog contains each supported category exactly once. Unknown or duplicate labels stop approval without changing active weights.

New assessments capture current organization weights in a database trigger. Reopening and saving an existing assessment uses its saved weights; nonempty snapshots cannot be replaced. Legacy records without saved weights are left untouched and the edit screen explains that their original weights cannot be recovered automatically. Do not backfill these with today's weights.

Validation: Vitest covers recommendation validation/normalization, approval UI, and reopening/scoring old assessments. `node --test scripts/*.test.mjs` runs all migrations in PGlite and exercises approval, decimal/zero mapping, retries, version replacement, injected-failure rollback, org isolation, manual setup, and immutable assessment snapshots. These are local tests, not verification of a deployed Supabase project or live AI provider.
