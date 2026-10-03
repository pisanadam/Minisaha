const assert=require('node:assert/strict'),{run,sandbox,errors}=require('./game-harness.cjs');
const originalRandom=sandbox.Math.random;let seed=1;sandbox.Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let ticks=0;
try{
 for(const size of [5,11])for(const scenario of [1,2,3]){
  seed=scenario;run(`MINISAHA_ENGINE.boot({blue:'superlig_fenerbahce',red:'premier_manchestercity',size:${size}})`);
  for(let i=0;i<2400;i++){
   run(`for(const side of ['blue','red']){const turn=${i},k=turn%150;MINISAHA_ENGINE.input(side,{x:Math.sin(turn*.13),y:Math.cos(turn*.07),pass:k<12,shoot:k>=30&&k<60,cross:k>=90&&k<100,through:k>=110&&k<120,target:1+Math.floor(turn/150)%(${size}-1),power:{pass:.5,shoot:.7,cross:.6,through:.4}});}MINISAHA_ENGINE.step(1/60)`);ticks++;
   if(i%60===0)assert(run('players.every(p=>[p.x,p.y,p.vx,p.vy,p.stamina].every(Number.isFinite)&&p.stamina>=0&&p.stamina<=1)&&[ball.x,ball.y,ball.vx,ball.vy,ball.z].every(Number.isFinite)&&score.blue>=0&&score.red>=0&&(!ball.owner||players.includes(ball.owner))&&new Set(blue.map(p=>p.roster.id)).size===blue.length&&new Set(red.map(p=>p.roster.id)).size===red.length'));
  }
  const snap=run('MINISAHA_ENGINE.snapshot()');assert(snap.elapsed>0);assert.equal(snap.players.length,size*2);for(const side of ["blue","red"])assert(Number.isInteger(snap.stats[side].shots)&&snap.stats[side].onTarget<=snap.stats[side].shots);
 }
}finally{sandbox.Math.random=originalRandom;}
assert.deepEqual(errors,[]);console.log('PASS '+ticks+' seeded authoritative frames: movement, simultaneous action transitions, restarts, finite physics, roster ownership and bounded stamina in 5/11');
