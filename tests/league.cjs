const assert=require('node:assert/strict'),{run,ids,sandbox,errors,timers}=require('./game-harness.cjs');
assert.equal(run('Object.keys(LEAGUES).length'),12);
for(const key of run('Object.keys(LEAGUES)')){
 const audit=run(`(()=>{const teams=leagueTeams('${key}'),weeks=makeLeagueFixtures(teams),pairs=new Map();let valid=true;for(const week of weeks){const playing=new Set();for(const m of week){valid&&=m.home!==m.away&&!playing.has(m.home)&&!playing.has(m.away);playing.add(m.home);playing.add(m.away);pairs.set(m.home+'|'+m.away,(pairs.get(m.home+'|'+m.away)||0)+1);}valid&&=playing.size===teams.length;}return {n:teams.length,rounds:weeks.length,pairs:pairs.size,valid,once:[...pairs.values()].every(n=>n===1)}})()`);
 assert([18,20,22,24].includes(audit.n));assert.equal(audit.rounds,(audit.n-1)*2);assert.equal(audit.pairs,audit.n*(audit.n-1));assert(audit.valid&&audit.once);
}
ids.leagueSelect.value='superlig';ids.leagueSelect.trigger('change');ids.leagueTeamSelect.value='superlig_fenerbahce';ids.leagueCreateBtn.trigger('click');assert(run('validLeagueSeason(leagueSeason)'));assert.equal(ids.leagueFixtureList.children.length,34);
ids.leagueNextBtn.trigger('click');assert.equal(run('matchSize'),11);assert.equal(run('teamChoice.blue'),'superlig_fenerbahce');assert(run('leagueMatchContext&&state==="playing"'));
run('setPiece=null;goalPause=0;elapsed=REGULATION_SECONDS;score.blue=1;score.red=1;updateGame(1/60)');assert.equal(run('state'),'ended');assert.equal(run('extraTimeStarted'),false);assert.equal(run('penaltyResult'),null);assert.equal(run('leagueSeason.round'),1);assert.equal(run('leagueTable().find(r=>r.key===leagueSeason.club).points'),1);
const afterFirst=run('JSON.stringify(leagueSeason)');run('endMatch()');assert.equal(run('JSON.stringify(leagueSeason)'),afterFirst);
const saved=JSON.parse(sandbox.localStorage.getItem('miniSaha.league.v1'));assert.equal(saved.round,1);run('leagueSeason=null;initLeague()');assert.equal(run('leagueSeason.round'),1);
// Abandoning or restarting an unfinished fixture never awards points twice.
run('playNextLeagueMatch();fullReset()');assert.equal(run('leagueSeason.round'),1);assert.equal(run('leagueMatchContext'),null);run('playNextLeagueMatch();window.pendingContext=JSON.stringify(leagueMatchContext)');ids.restartBtn.trigger('click');assert.equal(run('JSON.stringify(leagueMatchContext)'),run('pendingContext'));assert.equal(run('leagueSeason.round'),1);
// Finish every week and verify both home/away score mapping, standings and champion.
while(run('leagueSeason.round<leagueSeason.fixtures.length')){
 if(run('state')!=='playing')run('playNextLeagueMatch()');
 const week=run('leagueSeason.round'),home=run('leagueMatchContext.home');run('score.blue=2;score.red=0;endMatch()');
 assert.equal(run('leagueSeason.round'),week+1);assert(run(`leagueSeason.fixtures[${week}].every(m=>m.homeGoals!==null&&m.awayGoals!==null)`));
 const own=run(`leagueSeason.fixtures[${week}].find(m=>m.home===leagueSeason.club||m.away===leagueSeason.club)`);assert.equal(home?own.homeGoals:own.awayGoals,2);assert.equal(home?own.awayGoals:own.homeGoals,0);
}
assert(run('leagueTable().every(r=>r.played===34&&r.played===r.wins+r.draws+r.losses&&r.gd===r.for-r.against)'));assert.equal(run('leagueTable().find(r=>r.key===leagueSeason.club).points'),100);assert.match(ids.leagueEndInfo.textContent,/Sezon tamamlandı/);assert.equal(ids.playAgain.textContent,'Sezon tablosu ↗');assert(ids.leagueNextBtn.disabled);assert(run('validLeagueSeason(leagueSeason)'));assert.equal(run('leagueTable().reduce((n,r)=>n+r.for,0)'),run('leagueTable().reduce((n,r)=>n+r.against,0)'));
assert(run('(()=>{const s=JSON.parse(JSON.stringify(leagueSeason));s.fixtures[0][0].away=s.fixtures[0][0].home;return !validLeagueSeason(s)})()'));
const rates=run("({strong:leagueGoalRates('premier_manchestercity','superlig_genclerbirligi'),reverse:leagueGoalRates('superlig_genclerbirligi','premier_manchestercity')})");assert(rates.strong.home>rates.strong.away);assert(rates.reverse.away>rates.reverse.home);
run('fullReset();leagueSeason=null');assert.equal(run('leagueMatchContext'),null);
// Fast simulation also records exactly one league week and skips extra time.
run("state='ready';document.getElementById('leagueSelect').value='premier';fillLeagueTeams();document.getElementById('leagueTeamSelect').value='premier_manchestercity';createLeagueSeason();playNextLeagueMatch();setPiece=null;goalPause=0;elapsed=REGULATION_SECONDS-.1;score.blue=2;score.red=2;togglePause();simulateToEnd()");
let drained=0;while(timers.length&&drained++<20000)timers.shift()();assert(drained<20000);assert.equal(run('leagueSeason.round'),1);assert.equal(run('extraTimeStarted'),false);assert.equal(run('state'),'ended');assert.equal(run('fastSimulation'),false);assert.equal(run('leagueSeason.fixtures.length'),38);
run('fullReset();leagueSeason=null');
// Existing knockout rules remain available for friendly matches.
run('startGame();setPiece=null;goalPause=0;elapsed=REGULATION_SECONDS;score.blue=1;score.red=1;updateGame(1/60)');assert(run('extraTimeStarted'));
assert.deepEqual(errors,[]);console.log('PASS twelve 2026-27 leagues, balanced complete double round robin, played/simulated draw rules, 34-week saved season, reload/restart/abandon safety, home/away scoring, every team standings/champion, rating-aware other fixtures and friendly isolation');
