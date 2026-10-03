const assert=require('node:assert/strict'),{run,ids,sandbox,windowEvents,errors}=require('./game-harness.cjs');
// League forecasts must use the career roster even after returning to the menu.
run("document.getElementById('leagueCareerMode').value='manager';document.getElementById('leagueSelect').value='superlig';fillLeagueTeams();createLeagueSeason();fullReset()");
const before=run('leagueRosterStrength(leagueSeason.club).attack');run("for(const p of leagueSeason.manager.players){p.overall=99;p.finishing=99;p.pass=99;p.tackle=99;}leagueSeason.manager.revision++");assert(run('leagueRosterStrength(leagueSeason.club).attack')>before);assert.equal(run('managerRosterScope'),false);assert(run('rosterFor(leagueSeason.club).some(p=>p.overall<99)'));run('managerRosterScope=true;leagueRosterStrength(leagueSeason.club)');assert(run('managerRosterScope'));
run("for(let i=0;i<350;i++){leagueSeason.manager.revision++;lineupFor(leagueSeason.club,FORMATIONS['433']);}");assert(run('lineupCache.size<=256'));
// Scout staffing must not inflate balanced player-development training.
run("leagueSeason.manager.staff={attack:1,defense:0,passing:0,scout:3};leagueSeason.manager.focus='balanced';leagueSeason.manager.development={};managerAfterWeek()");assert(run('leagueSeason.manager.players.every(p=>leagueSeason.manager.development[p.id]===10)'));
// Touch-selected restart targets execute on both sides and in both match sizes.
for(const size of [5,11])for(const side of ['blue','red'])for(const kind of ['corner','throw']){
 run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:${size}});setPiece=null;beginSetPiece('${kind}','${side}',FIELD.l,FIELD.t);window.receiverIndex=${side}.findIndex(p=>p!==setPiece.taker&&p.role!=='gk');MINISAHA_ENGINE.input('${side}',{x:0,y:0,target:receiverIndex,pass:true});MINISAHA_ENGINE.input('${side}',{x:0,y:0,target:receiverIndex,pass:false,power:{pass:.5}});MINISAHA_ENGINE.step(1/60)`);
 assert(run(`passAssist.target===${side}[receiverIndex]`));assert.equal(run(`stats.${side}.passes`),1);
}
// Repeated snapshots retain the local touch choice, but a new restart clears it.
run("MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:5});net.side='blue';window.snap=MINISAHA_ENGINE.snapshot();applyOnlineState(snap);setPiece.target=blue[2];applyOnlineState(snap)");assert(run('setPiece.target===blue[2]'));run('snap.restart.id++;applyOnlineState(snap)');assert(!run('setPiece.target'));
// Cancel controls atomically: no accidental shot on focus loss or stale batch.
run("MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:5});setPiece=null;gainPossession(blue[3]);blue[3].cooldown=0;MINISAHA_ENGINE.input('blue',{x:0,y:0,shoot:true});MINISAHA_ENGINE.step(1/60)");assert(run('onlineHumans.blue.charge'));run("MINISAHA_ENGINE.input('blue',{x:0,y:0,shoot:false,cancel:true});MINISAHA_ENGINE.step(1/60)");assert.equal(run('stats.blue.shots'),0);assert(!run('onlineHumans.blue.charge'));assert.equal(run('onlineHumans.blue.pending.length'),0);
run("for(let i=0;i<40;i++)MINISAHA_ENGINE.input('blue',{x:1,y:0,shoot:true});MINISAHA_ENGINE.input('blue',{x:0,y:0,shoot:false});");assert.equal(run('onlineHumans.blue.pending.length'),24);assert.equal(run('onlineHumans.blue.pending.at(-1).shoot'),false);
// Browser blur must send neutral cancellation, never pause the shared match.
const packets=[];sandbox.captureAudit=p=>packets.push(JSON.parse(p));sandbox.fetch=async()=>({ok:true,json:async()=>({})});run("onlineServer=false;net.active=true;net.phase='playing';net.token='token';net.queue=[];net.socket={readyState:1,bufferedAmount:0,send:captureAudit,close(){}};net.lastSnapshot=100;state='playing'");for(const f of windowEvents.blur)f();assert.equal(run('state'),'playing');assert.equal(run('net.focused'),false);assert(packets.some(p=>p.inputs?.[0]?.cancel));for(const f of windowEvents.focus)f();assert.equal(run('net.focused'),true);
// A blocked WebSocket is subject to the same queue limit as the HTTP fallback.
run("net.socket.bufferedAmount=40000;net.queue=Array.from({length:24},()=>({x:0,y:0}));net.previous='different';onlineClientFrame(110)");assert.equal(run('net.active'),false);assert.match(ids.onlineStatus.textContent,/çok yavaş/);assert.equal(run('net.queue.length'),0);
// Single-player focus loss still pauses safely.
run('fullReset();startGame()');for(const f of windowEvents.blur)f();assert.equal(run('state'),'paused');assert.deepEqual(errors,[]);
console.log('PASS career simulation scope, bounded lineup cache, exact online restart targets, snapshot target retention, input cancellation/overflow, browser focus safety and WebSocket backpressure limit');
