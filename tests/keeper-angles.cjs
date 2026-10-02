const assert=require('node:assert/strict'),{run,errors}=require('./game-harness.cjs');
function trial(side,size,distance,origin,target,speed=720){return run(`(()=>{
 MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:${size}});setPiece=null;goalPause=0;
 const g=${side}[0],dir=g.team==='blue'?1:-1;g.roster={overall:85};g.x=g.team==='blue'?FIELD.l+29:FIELD.r-29;g.y=GOAL.cy;g.aimY=GOAL.cy;g.vx=0;g.vy=0;g.diveTime=0;g.diveCooldown=0;g.trackingShot=false;
 for(const p of players)if(p.role!=='gk'){p.x=FIELD.cx;p.y=FIELD.t+10;p.vx=0;p.vy=0;}
 const attacker=players.find(p=>p.role!=='gk');attacker.x=g.x+dir*${distance};attacker.y=GOAL.cy+(${origin});ball.owner=attacker;ball.x=attacker.x;ball.y=attacker.y;
 for(let j=0;j<90;j++){updateKeepers(1/60);updatePlayers(1/60);}
 const positionedY=g.y;ball.owner=null;ball.held=false;ball.kicker=attacker;ball.kickerCleared=false;ball.pickupDelay=0;ball.x=attacker.x;ball.y=attacker.y;
 const n=norm(-dir*(${distance}+29),${target}-(${origin}));ball.vx=n.x*${speed};ball.vy=n.y*${speed};ball.z=0;ball.vz=0;ball.lastTouch=otherTeam(g.team);ball.shotTeam=otherTeam(g.team);ball.shotOnTarget=true;ball.saveCounted=false;
 for(let i=0;i<120&&!stats[g.team].saves&&!goalPause&&!setPiece;i++){updateKeepers(1/60);updatePlayers(1/60);updateBallFree(1/60);}
 return {saved:stats[g.team].saves,goal:score[otherTeam(g.team)],positionedY};})()`);}
for(const size of [5,11])for(const side of ['blue','red']){
 for(const distance of [150,260,420])for(const origin of [-160,160])for(const target of [-55,0,55]){
  const outcome=trial(side,size,distance,origin,target);assert.equal(outcome.saved,1,JSON.stringify({side,size,distance,origin,target,outcome}));assert.equal(outcome.goal,0);
 }
 // Close-range shots outside physical reach are still goals, not guaranteed saves.
 const close=trial(side,size,35,0,55,860);assert.equal(close.saved,0);assert.equal(close.goal,1);
}
// Earlier reading uses drag-adjusted time; shots outside the posts do not trigger a dive.
run("MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:11});setPiece=null;ball.owner=null;ball.x=blue[0].x+300;ball.y=GOAL.cy;ball.vx=-600;ball.vy=0;ball.z=0");assert(run('incomingKeeperBall(blue[0]).time>.5'));run('ball.y=GOAL.bot+80');assert.equal(run('incomingKeeperBall(blue[0])'),null);
assert.deepEqual(errors,[]);console.log('PASS 72 moving wing/near/far-post shots on both sides in 5/11, angle positioning, drag timing and physically unreachable close-range goals');
