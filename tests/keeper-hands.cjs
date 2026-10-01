const assert=require('node:assert/strict'),{run,ids,errors}=require('./game-harness.cjs');
for(const size of [5,11]){
 run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'premier_liverpool',size:${size}});setPiece=null;ball.owner=null;ball.kicker=null;ball.pickupDelay=0;ball.shotTeam='red';ball.shotOnTarget=true;ball.saveCounted=false;ball.x=blue[0].x+1;ball.y=blue[0].y;ball.z=0;ball.vx=-400;ball.vy=0;resolveKeeperContact(blue[0],keeperContact(blue[0]));updateDribble(1/60);updateHud()`);
 assert(run('ball.owner===blue[0]&&ball.held&&ball.z===12'));assert.equal(ids.keeperPassBar.style.display,'block');assert.equal(ids.keeperPassSelect.children.length,size);
 run("MINISAHA_ENGINE.input('blue',{x:1,y:1,shoot:true});MINISAHA_ENGINE.step(1/60);MINISAHA_ENGINE.input('blue',{x:1,y:1,shoot:false});MINISAHA_ENGINE.step(1/60)");assert(run('ball.owner===blue[0]'));assert.equal(run('stats.blue.shots'),0);assert.equal(run('blue[0].vx'),0);
 run("MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:false,target:-1});MINISAHA_ENGINE.step(1/60)");assert(run('ball.owner===blue[0]'));
 run("MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('blue',{x:0,y:0,pass:false,target:2,power:{pass:.4}});MINISAHA_ENGINE.step(1/60)");assert(run('ball.owner===null&&passAssist.target===blue[2]'));assert.equal(run('stats.blue.passes'),1);assert.equal(run('ball.z'),0);
 for(const side of ['blue','red']){
  run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:${size}});setPiece=null;gainPossession(${side}[0]);MINISAHA_ENGINE.input('${side}',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('${side}',{x:0,y:0,pass:false,target:1,power:{pass:.6}});MINISAHA_ENGINE.step(1/60)`);assert(run(`passAssist.target===${side}[1]`));
 }
}
// The same recipient picker also works in local single player.
run("onlineServer=false;net.active=false;fullReset();startGame();setPiece=null;gainPossession(blue[0]);keeperPassTarget=blue[2];blue[0].cooldown=0;handleActions({x:0,y:0,passRelease:{power:.5,player:blue[0],defending:false}},1/60)");assert(run('passAssist.target===blue[2]'));assert.deepEqual(errors,[]);
console.log('PASS both keeper catches/held ball, no dribble or shot, explicit recipient required, exact selected pass in 5/11 and local play');
