const assert=require('node:assert/strict'),{run,ids,sandbox,errors}=require('./game-harness.cjs');
run('window.__rand=Math.random');
const create=(club,league='superlig',mode='manager')=>run(`fullReset();document.getElementById('leagueCareerMode').value='${mode}';document.getElementById('managerName').value='Akif';document.getElementById('leagueSelect').value='${league}';fillLeagueTeams();document.getElementById('leagueTeamSelect').value='${club}';createLeagueSeason()`);
const finish=(blue,red)=>run(`setPiece=null;goalPause=0;score.blue=${blue};score.red=${red};endMatch()`);

// Cup draw: every club of both divisions, top-flight byes, rounds spread before the last league week.
create('superlig_fenerbahce');
const cup=run('leagueSeason.cup');assert.equal(cup.name,'Türkiye Kupası');
assert.equal(cup.byes.length+cup.rounds[0].length*2,run('cupClubs(leagueSeason).length'));
assert.equal(cup.weeks.length,6);assert(cup.weeks.every((w,i)=>w<34&&(!i||w>=cup.weeks[i-1])));
assert(run("leagueSeason.cup.byes.includes('superlig_fenerbahce')"));assert(run('validLeagueSeason(leagueSeason)'));
assert(run('validLeagueSeason(unpackLeagueSeason(JSON.parse(JSON.stringify(packLeagueSeason(leagueSeason)))))'));
assert(run('!validLeagueSeason({...leagueSeason,cup:{...leagueSeason.cup,winner:"premier_chelsea"}})'));

// Play until the first own cup tie: league round does not advance, draws go to extra time.
run('leagueSeason.manager.balance=1000000');let guard=0;
while(!run('!!leagueMatchContext?.cup')&&guard++<40){run('playNextLeagueMatch()');if(!run('!!leagueMatchContext?.cup'))finish(1,0);}
assert(run('leagueMatchContext.cup'));const leagueRound=run('leagueSeason.round'),cupRound=run('leagueSeason.cup.round');
assert.match(ids.leagueMatchBar.textContent,/Türkiye Kupası/);
run('setPiece=null;goalPause=0;elapsed=REGULATION_SECONDS;score.blue=1;score.red=1;updateGame(1/60)');assert(run('extraTimeStarted'));assert.equal(run('state'),'playing');
const balance=run('leagueSeason.manager.balance');finish(2,1);
assert.equal(run('leagueSeason.round'),leagueRound);assert.equal(run('leagueSeason.cup.round'),cupRound+1);assert(run('leagueSeason.manager.balance')>balance);
assert(run(`leagueSeason.cup.rounds[${cupRound}].every(m=>m.winner)`));assert(run('validLeagueSeason(leagueSeason)'));

// Season to the end: the cup is decided and the next season draws a new cup.
guard=0;while(run('leagueHasNextMatch()')&&guard++<80){run('playNextLeagueMatch()');finish(3,0);}
assert(run('leagueSeason.cup.winner'));assert.equal(run('leagueSeason.cup.winner'),'superlig_fenerbahce');
run('leagueSeason.manager.injuries={};leagueSeason.manager.suspensions={};advanceLeagueSeason()');assert.equal(run('leagueSeason.cup.round'),0);assert.equal(run('leagueSeason.cup.winner'),null);assert(run('validLeagueSeason(leagueSeason)'));

// Legacy saves without a cup get one scheduled from the current week.
run('delete leagueSeason.cup;leagueSeason.round=0;renderLeague()');assert(run('leagueSeason.cup&&leagueSeason.cup.weeks[0]>=0'));

// Injuries and suspensions remove players from the match squad until served; morale moves with results.
create('superlig_galatasaray');
run('Math.random=()=>0.001');run('playNextLeagueMatch()');run('Math.random=window.__rand');
run(`window.redId=blue[4].roster.id;stats.cards.push({team:'blue',player:blue[4].roster.name,id:redId,time:'01:00',type:'red',second:false})`);
const beforeMorale=run('managerMorale(leagueSeason.manager,leagueSeason.manager.players[0])');
run('Math.random=()=>0.001');finish(2,0);run('Math.random=window.__rand');
const m=run('leagueSeason.manager');
assert(Object.keys(m.injuries).length>0);assert.equal(m.suspensions[run('redId')],2);
assert(run('managerMorale(leagueSeason.manager,leagueSeason.manager.players[0])')>=beforeMorale);
assert(run('!managerMatchSquad().some(p=>p.id===redId||leagueSeason.manager.injuries[p.id])'));
assert(run("managerMatchSquad().length>=11&&managerMatchSquad().some(p=>p.positions.includes('GK'))"));
run('playNextLeagueMatch()');assert(run('!slots.blue.some(p=>p.roster.id===redId)'));
run('Math.random=()=>0.99');finish(0,1);run('playNextLeagueMatch()');finish(0,1);run('Math.random=window.__rand');
assert.equal(run('leagueSeason.manager.suspensions[redId]'),undefined);
run('Object.assign(leagueSeason.manager.morale,Object.fromEntries(leagueSeason.manager.players.map(p=>[p.id,90])));leagueSeason.manager.injuries={};leagueSeason.manager.revision++');
assert(run('managerMatchSquad().every(p=>p.overall===Math.min(99,leagueSeason.manager.players.find(x=>x.id===p.id).overall+2))'));
assert(run('leagueSeason.manager.players.every(p=>p.overall<=99)'));
assert(run('validLeagueSeason(leagueSeason)'));

// Board: warning, sacking, job offers and a new club in the same season.
run("leagueSeason.manager.trust=25;leagueSeason.manager.warned=false;managerBoardReview()");assert(run('leagueSeason.manager.warned'));
run('leagueSeason.manager.trust=13;Math.random=()=>0.99;playNextLeagueMatch()');finish(0,3);run('Math.random=window.__rand');
assert(run('leagueSeason.manager.sacked'));assert(run('leagueSeason.manager.offers.length>0'));assert(ids.leagueNextBtn.disabled);assert(!run('managerCanManage()'));
run('playNextLeagueMatch()');assert.notEqual(run('state'),'playing');
const oldIds=run('leagueSeason.manager.players.map(p=>p.id).sort().join()'),offer=run('leagueSeason.manager.offers[0].club'),round=run('leagueSeason.round');
assert(run(`acceptManagerJob('${offer}')`));
assert.equal(run('leagueSeason.club'),offer);assert.equal(run('leagueSeason.round'),round);assert(!run('leagueSeason.manager.sacked'));assert.equal(run('leagueSeason.manager.trust'),60);
assert.equal(run("managerRoster('superlig_galatasaray').map(p=>p.id).sort().join()"),oldIds);
assert(run(`leagueSeason.manager.players.every(p=>managerBaseRoster('${offer}').some(c=>c.id===p.id))`));
assert(run('validLeagueSeason(leagueSeason)'));
assert(run('validLeagueSeason(unpackLeagueSeason(JSON.parse(JSON.stringify(packLeagueSeason(leagueSeason)))))'));
run('playNextLeagueMatch()');assert.equal(run('teamChoice.blue'),offer);assert.equal(run('state'),'playing');
assert(!run(`acceptManagerJob('superlig_galatasaray')`));

// Plain league career also has the cup, without manager-only systems.
create('superlig_besiktas','superlig','league');assert(run('leagueSeason.cup&&!leagueSeason.manager'));
assert.deepEqual(errors,[]);
console.log('PASS domestic cup draw/byes/schedule, extra time, prizes, winner and next-season draw; legacy cup; injuries, red-card bans, morale effect; board warning, sacking, job offers and club switch; plain career cup');
