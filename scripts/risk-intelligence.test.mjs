import { createTestDatabase } from './test-database.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('research provenance is immutable to clients and scoped to the organization', async () => {
  const db = await createTestDatabase();
  try {
    const users = [1, 2].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
    for (const id of users) await db.query('INSERT INTO auth.users VALUES ($1,$2)', [id, `${id}@example.test`]);
    const as = async (id, role = 'authenticated') => {
      await db.exec('RESET ROLE');
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id || '']);
      await db.exec(`SET ROLE ${role}`);
    };
    const orgs = [];
    for (const id of users) {
      await as(id);
      orgs.push((await db.query("SELECT * FROM create_organization('Test','healthcare','Canada')")).rows[0].id);
    }
    const insert = (org, user) => db.query("INSERT INTO risk_intelligence_runs(org_id,created_by,kind,request,context_snapshot,model,method_version) VALUES($1,$2,'report','{}','{}','test','test') RETURNING id", [org, user]);
    await as(null, 'service_role');
    const run = (await insert(orgs[0], users[0])).rows[0].id;
    await assert.rejects(insert(orgs[0], users[0]), /unique/);
    await assert.rejects(db.query("UPDATE risk_intelligence_runs SET status='completed' WHERE id=$1", [run]), /check constraint/);
    await db.query("UPDATE risk_intelligence_runs SET status='completed',output='{}',completed_at=now() WHERE id=$1", [run]);
    await as(users[0]);
    assert.equal((await db.query('SELECT id FROM risk_intelligence_runs')).rows.length, 1);
    await assert.rejects(insert(orgs[0], users[0]), /permission denied/);
    await assert.rejects(db.query("UPDATE risk_intelligence_runs SET output='{}' WHERE id=$1", [run]), /permission denied/);
    await assert.rejects(db.query('DELETE FROM risk_intelligence_runs WHERE id=$1', [run]), /permission denied/);
    await as(users[1]);
    assert.equal((await db.query('SELECT id FROM risk_intelligence_runs WHERE id=$1', [run])).rows.length, 0);
    await as(null, 'anon');
    await assert.rejects(db.query('SELECT id FROM risk_intelligence_runs'), /permission denied/);
  } finally { await db.close(); }
});
