import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from './test-database.mjs';
test('AI audit isolation, active-run exclusivity and stale weighting rejection',async()=>{
 const db=await createTestDatabase();
 try{
  const users=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
  for(const id of users)await db.query('INSERT INTO auth.users VALUES($1,$2)',[id,id+'@example.test']);
  const as=async(id,role='authenticated')=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('SET ROLE '+role);};
  const orgs=[];for(const id of users){await as(id);orgs.push((await db.query("SELECT * FROM create_organization('Org','healthcare','Canada')")).rows[0].id);}
  await as(null,'service_role');
  const insert=()=>db.query("INSERT INTO ai_tool_runs(org_id,created_by,kind,model,method_version) VALUES($1,$2,'climate-analysis','test','hira-evidence-v2') RETURNING id",[orgs[0],users[0]]);
  const id=(await insert()).rows[0].id;await assert.rejects(insert(),/unique/);
  await assert.rejects(db.query("UPDATE ai_tool_runs SET status='completed' WHERE id=$1",[id]),/check constraint/);
  await db.query("UPDATE ai_tool_runs SET status='completed',output='{}',completed_at=now() WHERE id=$1",[id]);
  await as(users[0]);assert.equal((await db.query('SELECT * FROM ai_tool_runs')).rows.length,1);
  await assert.rejects(insert(),/permission denied/);
  await assert.rejects(db.query("UPDATE ai_tool_runs SET output='{}'"),/permission denied/);
  await as(users[1]);assert.equal((await db.query('SELECT * FROM ai_tool_runs')).rows.length,0);
  await as(users[0]);
  const session=(await db.query('SELECT create_weighting_session() AS id')).rows[0].id;
  const weights={Fatalities:10,Injuries:10,Displacement:10,Psychosocial_Impact:10,Support_System_Impact:10,Property_Damage:10,Infrastructure_Impact:10,Environmental_Damage:10,Economic_Impact:10,Reputational_Impact:10};
  await db.query(`INSERT INTO weighting_ai_synthesis(session_id,input_revision,sources_used,source_weights,recommended_weights,weight_changes,justification_report_executive,justification_report_detailed,justification_report_technical,consistency_checks,all_checks_passed,ai_model_used)
    VALUES($1,0,'{}','{}',$2,'{}','Draft','Draft','Math','{"method_version":"hira-evidence-v2"}',true,'test')`,[session,weights]);
  await db.query('UPDATE weighting_sessions SET layer5_completed=true WHERE id=$1',[session]);
  await db.query(`INSERT INTO weighting_mission_analysis(session_id,mission_statement,analysis_result,consequence_relevance) VALUES($1,'Protect people','{}','{}')`,[session]);
  assert.equal((await db.query('SELECT layer5_completed FROM weighting_sessions WHERE id=$1',[session])).rows[0].layer5_completed,false);
  await assert.rejects(db.query('UPDATE weighting_sessions SET layer5_completed=true WHERE id=$1',[session]),/Evidence changed/);
  await assert.rejects(db.query('UPDATE weighting_ai_synthesis SET all_checks_passed=true WHERE session_id=$1',[session]),/Evidence changed/);
  await db.query('UPDATE weighting_ai_synthesis SET input_revision=1,all_checks_passed=true WHERE session_id=$1',[session]);
  await db.query('UPDATE weighting_sessions SET layer5_completed=true WHERE id=$1',[session]);
  await db.query("UPDATE weighting_sessions SET status='approved' WHERE id=$1",[session]);
  await assert.rejects(db.query("UPDATE weighting_mission_analysis SET mission_statement='Changed' WHERE session_id=$1",[session]),/approved evidence/);
 }finally{await db.close();}
});
