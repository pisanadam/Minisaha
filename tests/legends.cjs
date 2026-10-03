const assert=require('node:assert/strict'),{run,ids,errors}=require('./game-harness.cjs');
assert.equal(run('MINISAHA_LEGEND_CATALOG.length'),387);
assert.equal(run('MINISAHA_LEGEND_CATALOG.filter(p=>p.retired).length'),349);
assert.equal(run('MINISAHA_ALLTIME_TEAMS.length'),114);
const current=run("JSON.stringify(rosterFor('turkiye'))");
assert(run("!rosterFor('turkiye').some(p=>p.legend)"));
assert(run('MINISAHA_ALLTIME_TEAMS.every(t=>{const r=rosterFor(t.key),names=r.map(p=>p.name.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,""));return r.length>=11&&r.some(p=>p.position==="GK")&&new Set(names).size===r.length&&new Set(r.map(p=>p.id)).size===r.length})'));
assert(run('MINISAHA_LEGEND_CATALOG.every(p=>p.ratingSource==="estimate"&&p.era==="peak"&&["pace","shot","pass","tackle","dribble","physical","strength","jumping","finishing"].every(k=>Number.isFinite(p[k])&&p[k]>=20&&p[k]<=99))'));
for(const [team,names] of [['turkiye',['Lefter Küçükandonyadis','Metin Oktay','Rüştü Reçber','Sergen Yalçın','Hakan Çalhanoğlu','Barış Alper Yılmaz']],['brazil',['Pelé','Ronaldinho','Ronaldo Nazário','Neymar']],['italy',['Paolo Maldini','Franco Baresi','Gianluigi Buffon']],['superlig_fenerbahce',['Alex de Souza','Lefter Küçükandonyadis']],['superlig_galatasaray',['Gheorghe Hagi','Metin Oktay']],['laliga_barcelona',['Lionel Messi','Johan Cruyff','Ronaldinho']],['laliga_realmadrid',['Cristiano Ronaldo','Zinedine Zidane','Ferenc Puskás']]])for(const name of names)assert(run(`rosterFor('alltime_${team}').some(p=>p.name===${JSON.stringify(name)})`),team+' '+name);
assert.equal(run("rosterFor('alltime_argentina').filter(p=>p.name==='Lionel Messi').length"),1);
assert.equal(run("rosterFor('alltime_argentina').find(p=>p.name==='Lionel Messi').overall"),99);
for(const size of [5,11]){
 run(`matchSize=${size};el.blueTeamSelect.value='turkiye';el.redTeamSelect.value='brazil';fullReset()`);ids.legendsLineupBtn.trigger('click');
 assert(run("teamChoice.blue==='alltime_turkiye'&&teamChoice.red==='alltime_brazil'"));
 assert.equal(run('blue.length'),size);assert.equal(run('red.length'),size);
 assert.equal(run('blue.map(p=>p.roster.id).join()'),run(`strongestLineup('alltime_turkiye',${size}).cards.map(p=>p.id).join()`));
 const lineup=run('blue.map(p=>p.roster.id).join()');run('startGame();resetKickoff("red")');assert.equal(run('blue.map(p=>p.roster.id).join()'),lineup);
 run('togglePause();renderSubstitutions()');assert(run('benchCandidates(blue[1]).length>0'));
}
assert.equal(run("JSON.stringify(rosterFor('turkiye'))"),current);
const createEngine=require('../server/engine.cjs'),engine=createEngine();
assert(engine.teams().includes('alltime_turkiye'));assert(engine.teams().includes('alltime_world'));assert(engine.teams().includes('bundesliga2_herthaberlin'));
assert(engine.speechCatalog().has('Pelé'));assert(engine.speechCatalog().has('Lefter Küçükandonyadis'));
engine.boot({blue:'alltime_turkiye',red:'alltime_laliga_realmadrid',size:11});assert.equal(engine.lineups().blue.length,11);assert(engine.lineups().blue.some(p=>p.name==='Rüştü Reçber'));
for(let i=0;i<120;i++)engine.step(1/60);const snapshot=engine.snapshot();assert(snapshot.players.every(p=>p.slice(0,4).every(Number.isFinite)));assert(snapshot.lineupIds.some(id=>id.startsWith('legend-')));
run("fullReset();document.getElementById('leagueCareerMode').value='manager';document.getElementById('leagueSelect').value='superlig';fillLeagueTeams();createLeagueSeason()");assert(run('!leagueSeason.manager.players.some(p=>p.legend)'));assert(run('!Array.from(document.getElementById("managerMarketClub").options).some(o=>o.value.startsWith("alltime_"))'));
assert.deepEqual(errors,[]);console.log('PASS 387 historical cards, 349 retired legends, 114 separate all-time teams, peak estimates, duplicate removal, best XI/5, kickoff/bench persistence, server/voice catalog and seasonal career isolation');
