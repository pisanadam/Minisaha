const assert=require('node:assert/strict'),{run,ids,errors}=require('./game-harness.cjs');
for(const size of [5,11]){
 run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'premier_liverpool',size:${size}});setPiece=null;ball.owner=null;ball.kicker=null;ball.pickupDelay=0;ball.shotTeam='red';ball.shotOnTarget=true;ball.saveCounted=false;ball.x=blue[0].x+1;ball.y=blue[0].y;ball.z=0;ball.vx=-400;ball.vy=0;resolveKeeperContact(blue[0],keeperContact(blue[0]));updateDribble(1/60);updateHud()`);
 assert(run('ball.owner===blue[0]&&ball.held&&ball.z===12'));assert.equal(ids.keeperPassBar.style.display,'block');assert.match(ids.keeperPassHint.textContent,/Sahadaki oyuncuya/);
 run("MINISAHA_ENGINE.input('blue',{x:1,y:1,shoot:true});MINISAHA_ENGINE.step(1/60);MINISAHA_ENGINE.input('blue',{x:1,y:1,shoot:false});MINISAHA_ENGINE.step(1/60)");assert(run('ball.owner===blue[0]'));assert.equal(run('stats.blue.shots'),0);assert(run('blue[0].vx>0&&blue[0].vy>0')); 
 run("MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:false,target:-1});MINISAHA_ENGINE.step(1/60)");assert(run('ball.owner===blue[0]'));
 run("MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:false,target:2,power:{pass:.4}});MINISAHA_ENGINE.step(1/60)");assert(run('ball.owner===null&&passAssist.target===blue[2]'));assert.equal(run('stats.blue.passes'),1);assert(run('ball.z>12&&ball.vz>0&&!ball.held&&passAssist.handThrow'));
 for(const side of ['blue','red']){
  run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:${size}});setPiece=null;gainPossession(${side}[0]);MINISAHA_ENGINE.input('${side}',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('${side}',{x:0,y:0,pass:false,target:1,power:{pass:.6}});MINISAHA_ENGINE.step(1/60)`);assert(run(`passAssist.target===${side}[1]&&ball.z>12&&ball.vz>0&&passAssist.handThrow`));
 }
}
// The high throw lands at the chosen position on both sides, with tap/hold power.
for(const side of ['blue','red'])for(const distance of [120,500])for(const power of [0,1]){
 const landed=run(`(()=>{
 MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:11});setPiece=null;goalPause=0;
 const keeper=${side}[0],receiver=${side}[1],dir=keeper.team==='blue'?1:-1;
 keeper.x=keeper.team==='blue'?FIELD.l+35:FIELD.r-35;keeper.y=FIELD.cy;
 receiver.x=keeper.x+dir*${distance};receiver.y=FIELD.cy;
 gainPossession(keeper);throwKeeperBall(keeper,receiver,${power});
 const tx=receiver.x,ty=receiver.y;for(const p of players){p.x=-1000;p.y=-1000;}
 let peak=ball.z,steps=0;while(ball.z>0&&steps++<300){updateBallStep(1/120);peak=Math.max(peak,ball.z);}
 return {error:dist(ball.x,ball.y,tx,ty),peak,steps};})()`);
 assert(landed.peak>35);assert(landed.steps<300);assert(landed.error<12,JSON.stringify(landed));
}
// The same recipient picker also works in local single player.
run("onlineServer=false;net.active=false;fullReset();startGame();setPiece=null;gainPossession(blue[0]);blue[0].cooldown=0;");
const coords=run('({clientX:blue[2].x/W*136,clientY:blue[2].y/H*136})');
for(const f of ids.game.events.pointerdown)f({...coords,preventDefault(){}});
assert(run('keeperPassTarget===blue[2]'));assert.match(ids.keeperPassHint.textContent,/seçildi/);
run('handleActions({x:0,y:0,passRelease:{power:.5,player:blue[0],defending:false}},1/60)');assert(run('passAssist.target===blue[2]'));assert.deepEqual(errors,[]);
console.log('PASS both keeper catches/held ball, no dribble or shot, explicit recipient required, exact selected pass in 5/11 and local play');
