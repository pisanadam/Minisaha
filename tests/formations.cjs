const assert=require('node:assert/strict'),{run,ids,sandbox,errors}=require('./game-harness.cjs');
assert.equal(run('formationKeys(5).length'),6);assert.equal(run('formationKeys(11).length'),11);
assert(run(`Object.entries(FORMATIONS).every(([key,shape])=>shape.length===1+FORMATION_LABELS[key].split('–').reduce((n,x)=>n+Number(x),0)&&shape.filter(s=>s[0]==='GK').length===1&&shape.every(([pos,x,y])=>POSITIONS[pos]&&x>FIELD.l&&x<FIELD.cx&&y>FIELD.t&&y<FIELD.b))`));
for(const size of [5,11])for(const key of run(`formationKeys(${size})`)){
 run(`matchSize=${size};fullReset();syncFormationSelect()`);
 assert.equal(ids.formationSelect.disabled,false);assert.equal(ids.formationSelect.children.length,size===5?6:11);
 ids.formationSelect.value=key;ids.formationSelect.trigger('change');
 assert.equal(run('activeFormationKey()'),key);assert.equal(ids.formationSelect.value,key);
 assert.equal(JSON.parse(sandbox.localStorage.getItem('miniSaha.settings.v2'))[size===5?'formation5':'formation'],key);
 run('startGame();setPiece=null;resetKickoff("red")');
 assert(run(`blue.length===${size}&&red.length===${size}&&blue.every((p,i)=>p.position===FORMATIONS['${key}'][i][0]&&p.homeX===FORMATIONS['${key}'][i][1]&&p.homeY===FORMATIONS['${key}'][i][2])`));
 assert(run('blue.every((p,i)=>red[i].position===p.position&&red[i].homeX===W-p.homeX&&red[i].homeY===H-p.homeY)'));
 run('togglePause();watchSimulation();for(let i=0;i<240;i++)updateGame(1/60);render()');assert(run('elapsed>0'));
}
run("matchSize=5;formation5='5_22';matchSize=11;formation='352';fullReset();matchSize=5;fullReset()");assert.equal(ids.formationSelect.value,'5_22');run('matchSize=11;fullReset()');assert.equal(ids.formationSelect.value,'352');
ids.formationSelect.value='5_22';ids.formationSelect.trigger('change');assert.equal(run('formation'),'352');
run('net.active=true;onlineButtons()');assert.equal(ids.formationSelect.disabled,true);run('net.active=false;onlineButtons()');assert.equal(ids.formationSelect.disabled,false);
// Mid-match formation changes preserve the active players and physical state.
for(const size of [5,11]){
 run(`matchSize=${size};fullReset();startGame();setPiece=null;gainPossession(blue[2]);selected=blue[2];score.blue=2;score.red=1;elapsed=41;blue.forEach((p,i)=>p.stamina=.5+i*.02);togglePause();window.savedPlayers=blue.slice();window.savedIds=blue.map(p=>p.roster.id).sort().join();window.savedStamina=new Map(blue.map(p=>[p.roster.id,p.stamina]));window.savedOwner=ball.owner;window.savedSelected=selected;window.opponentShape=formationForTeam('red');window.subsBefore=substitutionLog.length`);
 for(const key of run(`formationKeys(${size})`)){
  ids.pauseFormationSelect.value=key;ids.pauseFormationApply.trigger('click');
  assert.equal(run("formationForTeam('blue')"),key);assert(run("formationForTeam('red')===opponentShape"));
  assert(run('blue.map(p=>p.roster.id).sort().join()===savedIds&&blue.every(p=>savedPlayers.includes(p)&&p.stamina===savedStamina.get(p.roster.id))'));
  assert(run('ball.owner===savedOwner&&selected===savedSelected&&score.blue===2&&score.red===1&&elapsed===41&&substitutionLog.length===subsBefore'));
  assert(run(`blue.every((p,i)=>p.position===FORMATIONS['${key}'][i][0])`));
  assert.equal(run('state'),'paused');
 }
 run('resetKickoff("blue")');assert(run('blue.map(p=>p.roster.id).sort().join()===savedIds'));assert(run("formationForTeam('red')===opponentShape"));
 assert.equal(run(`changeFormation('blue','${size===5?'433':'5'}').ok`),false);
 run('state="playing"');assert.equal(run(`changeFormation('blue','${size===5?'5':'433'}').ok`),false);
}
// Authoritative online matches and clients both continue to use a matching default.
run("formation5='5_31';MINISAHA_ENGINE.boot({blue:'turkiye',red:'norway',size:5})");assert.equal(run('activeFormationKey()'),'5');assert(run('blue.map(p=>p.position).join()===FORMATIONS["5"].map(s=>s[0]).join()'));
// The red-side viewer sees the changed formation on their own (blue) side.
run("MINISAHA_ENGINE.pause(true);MINISAHA_ENGINE.formation('red','5_22');window.serverFrame=MINISAHA_ENGINE.snapshot();serverFrame.pause={by:'red',remaining:45};onlineServer=false;net.active=true;net.side='red';net.phase='playing';net.pauseBy='red';matchSize=5;formation5='5';teamFormationKeys={};teamChoice.blue='norway';teamChoice.red='turkiye';setupTeams();applyOnlineState(serverFrame)");
assert.equal(run("formationForTeam('blue')"),'5_22');assert.equal(run("formationForTeam('red')"),'5');assert.equal(ids.pauseFormationSelect.value,'5_22');assert.equal(ids.pauseFormationApply.disabled,false);
assert(run('blue.map(p=>p.position).join()===FORMATIONS["5_22"].map(s=>s[0]).join()'));
assert.deepEqual(errors,[]);console.log('PASS 6 futsal/11 full-size shapes, valid pitch slots, actual menu selections, persistence, mirrored teams, kickoff and live simulation for every formation');
