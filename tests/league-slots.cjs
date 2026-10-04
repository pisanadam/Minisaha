const assert=require('node:assert/strict'),{run,ids,sandbox,errors}=require('./game-harness.cjs');
run("document.getElementById('leagueSelect').value='premier';fillLeagueTeams();createLeagueSeason()");const legacy=run('JSON.stringify(leagueSeason)');
// Old one-career data migrates without changing any fixture or result.
const get=sandbox.localStorage.getItem;sandbox.localStorage.getItem=k=>k==='miniSaha.league.slots.v1'?null:k==='miniSaha.league.v1'?legacy:get(k);run('readLeagueSlots()');assert.equal(run('JSON.stringify(leagueSeason)'),legacy);assert.equal(run('leagueSlots.filter(Boolean).length'),1);sandbox.localStorage.getItem=get;
for(let i=1;i<30;i++)run("fullReset();document.getElementById('leagueSelect').value='premier';fillLeagueTeams();createLeagueSeason()");assert.equal(run('leagueSlots.filter(Boolean).length'),30);assert.equal(ids.leagueSlotSelect.children.length,30);
const originalIds=run('leagueSlots.map(s=>s.season.id).join("|")');assert.equal(run('new Set(leagueSlots.map(s=>s.season.id)).size'),30);
// Save a completed week in one slot, retaining the independent 29 careers.
run('playNextLeagueMatch();score.blue=2;score.red=1;endMatch()');assert.equal(run('leagueSeason.round'),1);assert(run('leagueSlots.slice(0,29).every(s=>s.season.round===0)'));const active=run('activeLeagueSlot');
run('leagueSeason=null;readLeagueSlots()');assert.equal(run('activeLeagueSlot'),active);assert.equal(run('leagueSeason.round'),1);assert.equal(run('leagueSlots.map(s=>s.season.id).join("|")'),originalIds);
ids.leagueSlotSelect.value='0';ids.leagueSlotLoad.trigger('click');assert.equal(run('activeLeagueSlot'),0);assert.equal(run('leagueSeason.round'),0);assert.equal(run('state'),'ready');assert.equal(run('leagueMatchContext'),null);
// All 30 full seasons stay compact enough for a normal localStorage quota.
run(`for(let i=0;i<30;i++){activeLeagueSlot=i;leagueSeason=unpackLeagueSeason(leagueSlots[i].season);for(const d of [leagueSeason,leagueSeason.partner]){for(const week of d.fixtures)for(const m of week){m.homeGoals=1;m.awayGoals=0;}d.round=d.fixtures.length;}finishLeagueSeason();saveLeague();}`);
const stored=sandbox.localStorage.getItem('miniSaha.league.slots.v1');assert(stored.length<1000000);run('readLeagueSlots()');assert(run('leagueSlots.every(s=>validLeagueSeason(unpackLeagueSeason(s.season)))'));assert(run('leagueSlots.every(s=>!s.season.fixtures&&!s.season.partner.fixtures)'));
// Full-slot overwrite is cancellable and leaves every stored season intact.
const before=sandbox.localStorage.getItem('miniSaha.league.slots.v1');sandbox.confirm=()=>false;run('fullReset();createLeagueSeason()');assert.equal(sandbox.localStorage.getItem('miniSaha.league.slots.v1'),before);sandbox.confirm=()=>true;
ids.leagueSlotSelect.value='4';ids.leagueSlotDelete.trigger('click');assert.equal(run('leagueSlots[4]'),null);assert.equal(run('leagueSlots.filter(Boolean).length'),29);run('createLeagueSeason()');assert.equal(run('activeLeagueSlot'),4);assert.equal(run('leagueSlots.filter(Boolean).length'),30);
// Failed storage writes retain the previous saved slot rather than replacing it.
const write=sandbox.localStorage.setItem;sandbox.localStorage.setItem=()=>{throw Error('quota')};const old=run('JSON.stringify(leagueSlots[activeLeagueSlot])');run('leagueSeason.round=0;saveLeague()');assert(run('leagueSaveFailed'));assert.equal(run('JSON.stringify(leagueSlots[activeLeagueSlot])'),old);sandbox.localStorage.setItem=write;
assert.deepEqual(errors,[]);console.log('PASS legacy migration, 30 independent careers, compact full-season storage, week/reload/load isolation, overwrite cancellation, delete/reuse and failed-write preservation');
