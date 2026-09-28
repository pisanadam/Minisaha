const assert=require('assert'),fs=require('fs');
const {run,ids,sandbox,errors,timers}=require('./game-harness.cjs');
function test(name,f){f();console.log('PASS',name)}
let seed=1234567;const random=Object.create(Math);random.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};sandbox.Math=random;
function drain(){let n=0;while(timers.length&&n++<20000)timers.shift()();assert(n<20000,'simulation did not finish');}
test('162 squads complete, unique, GK available, no generated fallback',()=>{
 assert.equal(run('COUNTRY_TEAMS.length'),162);
 assert.equal(run('COUNTRY_TEAMS.reduce((n,t)=>n+rosterFor(t.key).length,0)'),4641);
 assert(run('COUNTRY_TEAMS.every(t=>{const r=rosterFor(t.key);return r.length>=11&&new Set(r.map(p=>p.id)).size===r.length&&r.some(p=>p.position===\'GK\')&&r.every(p=>p.name.length>2&&p.overall>=40&&p.overall<=99)})'));
 assert.equal(run('typeof loadFC26Rosters'),'undefined');
});
test('every team in all 11v11 formations and 5v5 has unique correct-team players and exactly one keeper',()=>{
 for(const t of run('COUNTRY_TEAMS.map(t=>t.key)'))for(const f of ['433','4231','442','5']){
  run(`teamChoice.blue='${t}';matchSize=${f==='5'?5:11};formation='${f==='5'?'433':f}';setupTeams();`);
  assert(run('new Set(blue.map(p=>p.roster.id)).size===matchSize'),t+' '+f);
  assert(run('blue[0].roster.position===\'GK\'&&blue.slice(1).every(p=>p.roster.position!==\'GK\')'),t+' '+f);
  assert(run('blue.every(p=>rosterFor(teamChoice.blue).includes(p.roster))'),t+' '+f);
  const before=run('blue.map(p=>p.roster.id).join()');run('renderSquad()');assert.equal(run('blue.map(p=>p.roster.id).join()'),before);
 }
});
test('Genclerbirligi uses the 28-player registered squad and corrected Turkish names',()=>{
 const names=Array.from(run("rosterFor('superlig_genclerbirligi').map(p=>p.name)"));assert.equal(names.length,28);
 for(const n of ['İrfan Can Eğribayat','Salih Uçan','Seyfi Toprak Kıskanç','Sékou Koïta','Dimitrios Goutas'])assert(names.some(x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'')===n.normalize('NFD').replace(/[\u0300-\u036f]/g,'')),n);
 for(const n of ['Muslera','Mertens','Osimhen','Hakan Çalhanoğlu','Peter Etebo'])assert(!names.some(x=>x.includes(n)),n);
});
test('team change, kickoff and goal names never restore old club names',()=>{
 run("matchSize=11;formation='433';el.blueTeamSelect.value='premier_liverpool';el.redTeamSelect.value='premier_chelsea';fullReset();startGame();fullReset();el.blueTeamSelect.value='superlig_genclerbirligi';applyTeamNames();setupTeams();startGame();resetKickoff('blue')");
 assert(run("blue.every(p=>rosterFor('superlig_genclerbirligi').includes(p.roster))"));
 run("setPiece=null;ball.lastPlayer=blue.find(p=>p.role==='fw');ball.lastTouch='blue';scoreGoal('blue')");
 assert(run("rosterFor('superlig_genclerbirligi').some(p=>p.name===stats.goals[0].player)"));
});
test('pause freezes game and opens simulation options; watch mode handles blue kickoff',()=>{
 run('fullReset();startGame();togglePause()');assert.equal(ids.pauseMenu.style.display,'flex');
 const before=run('elapsed');run('updateGame(.5)');assert.equal(run('elapsed'),before);
 run('watchSimulation();for(let i=0;i<180;i++)updateGame(1/60)');assert.equal(run('simulationMode'),'watch');assert(run('elapsed>0'));assert.equal(ids.simReturn.style.display,'block');
 run('togglePause();resumeManualControl()');assert.equal(run('simulationMode'),'manual');assert.equal(run('state'),'playing');assert.equal(ids.pauseMenu.style.display,'none');
});
test('automated blue carrier progresses, passes or shoots without controller input',()=>{
 run("fullReset();startGame();togglePause();watchSimulation();setPiece=null;goalPause=0;selected=blue.find(p=>p.role==='fw');ball.owner=selected;selected.x=FIELD.r-180;selected.y=FIELD.cy;selected.holdTime=1;players.filter(p=>p.team==='red'&&p.role!=='gk').forEach(p=>{p.x=FIELD.cx;p.y=FIELD.t+40});ball.x=selected.x;ball.y=selected.y;window.startX=selected.x;for(let i=0;i<180;i++)updateGame(1/60)");
 assert(run('stats.blue.shots>0||stats.blue.passes>0||selected.x>startX'));
});
test('instant simulation preserves score/goals and completes 5v5 and 11v11 with stats/history',()=>{
 for(const size of [5,11]){
  run(`matchSize=${size};fullReset();startGame();setPiece=null;elapsed=REGULATION_SECONDS-3;score.blue=3;score.red=1;stats.goals=[{team:'blue',time:'00:10',player:blue[1].roster.name}];togglePause();simulateToEnd()`);drain();
  assert.equal(run('state'),'ended');assert(run('score.blue>=3&&score.red>=1'));assert.equal(run('stats.goals[0].time'),'00:10');assert.equal(run('fastSimulation'),false);assert(run('historySaved'));assert.equal(ids.endScreen.style.display,'flex');assert.equal(ids.simProgress.style.display,'none');
 }
});
test('draw at full time simulates extra time and penalty shootout when necessary',()=>{
 run('fullReset();startGame();setPiece=null;elapsed=REGULATION_SECONDS;score.blue=0;score.red=0;togglePause();simulateToEnd()');drain();assert.equal(run('state'),'ended');assert(run('extraTimeStarted'));assert(run('score.blue!==score.red||penaltyResult?.winner'));
 run('fullReset();startGame();startPenaltyShootout();penalty.blue=1;penalty.blueKicks=1;penalty.stage="save";togglePause();simulateToEnd()');drain();assert.equal(run('state'),'ended');assert(run('penaltyResult&&penalty.blue>=1&&penalty.redKicks>0'));
});
test('reset cancels pending simulation jobs safely',()=>{run('fullReset();startGame();togglePause();simulateToEnd();fullReset()');drain();assert.equal(run('state'),'ready');assert.equal(run('score.blue'),0);assert.equal(run('simulationMode'),'manual');});
test('all simulation and roster paths free of runtime errors',()=>assert.deepEqual(errors,[]));
