const assert=require('node:assert/strict'),{run,sandbox,errors}=require('./game-harness.cjs');
let seed=1;const random=Object.create(Math);random.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};sandbox.Math=random;
run("el.blueTeamSelect.value='norway';el.redTeamSelect.value='turkiye';fullReset();startGame();setPiece=null;simulationMode='watch'");
const comparison=run(`(()=>{
 const haaland=rosterFor('norway').find(p=>p.name.includes('Haaland')),baris=rosterFor('turkiye').find(p=>p.name.includes('Barış Alper'));
 const h={role:'fw',position:'ST',roster:haaland},b={role:'fw',position:'LW',roster:baris};
 return {h:playerSimulationSkills(h),b:playerSimulationSkills(b),hs:profile(h).shot,bs:profile(b).shot};})()`);
assert(comparison.hs>comparison.bs*1.5,'Haaland finishing should give a substantial shot advantage');
assert(comparison.b.pace>comparison.h.pace,'Baris should retain his higher pace rather than lose every skill to overall');
function shotSpread(name){
 seed=3197;
 return run(`(()=>{
 const p=blue.find(p=>p.role==='fw');p.roster=rosterFor('${name==='Haaland'?'norway':'turkiye'}').find(p=>p.name.includes('${name}'));p.position='ST';p.x=FIELD.r-320;p.y=GOAL.cy;p.vx=p.vy=0;
 let total=0;for(let i=0;i<256;i++){ball.kicker=null;p.cooldown=0;gainPossession(p);ball.x=p.x;ball.y=p.y;shootBall(p,.7,1,.5,aiParams('blue'));const y=ball.y+(FIELD.r+15-ball.x)*ball.vy/ball.vx;total+=Math.abs(y-(GOAL.cy+.5*(GOAL.bot-GOAL.top)*.5));}
 return total/256;})()`);
}
const hError=shotSpread('Haaland'),bError=shotSpread('Barış Alper');assert(hError<bError*.8,`shot error ${hError} vs ${bError}`);
// Replacements affect the current lineup immediately, with no stale strength cache.
run("fullReset();startGame();simulationMode='watch';setPiece=null;window.beforeStrength=simulationTeamStrength('blue').attack;window.striker=blue.find(p=>p.position==='ST');striker.roster={...striker.roster,overall:50,finishing:45,shot:45,positions:['ST']}");
assert(run("simulationTeamStrength('blue').attack<beforeStrength-10"));
// Same squad, same coaching level and no catch-up boost or side-based handicap.
run("el.blueTeamSelect.value='premier_manchestercity';el.redTeamSelect.value='premier_manchestercity';fullReset();startGame();simulationMode='watch';red.forEach((p,i)=>{p.roster=blue[i].roster;p.overall=blue[i].overall});score.blue=0;score.red=5");
assert.equal(run("JSON.stringify(aiParams('blue'))"),run("JSON.stringify(aiParams('red'))"));
run('el.diff.value="rookie";window.easySimulation=JSON.stringify(aiParams("blue"));el.diff.value="legend"');assert(run('easySimulation===JSON.stringify(aiParams("blue"))'));
run("simulationMode='manual';window.player=blue.find(p=>p.role==='fw')");assert(run('profile(player)===POSITIONS[player.position]'));
run("MINISAHA_ENGINE.boot({blue:'norway',red:'turkiye',size:5});simulationMode='watch'");assert.equal(run('ratingSimulation()'),false);
assert.deepEqual(errors,[]);console.log(`PASS real Haaland/Baris finishing and pace, seeded shot accuracy (${hError.toFixed(2)} vs ${bError.toFixed(2)}), active substitutions, equal coaching/no catch-up, manual and online isolation`);
