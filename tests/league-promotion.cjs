const assert=require('node:assert/strict'),{run,ids,sandbox,errors}=require('./game-harness.cjs');
for(const upper of run('Object.keys(LEAGUE_PAIRS)')){
 run(`state='ready';leagueSeason=null;document.getElementById('leagueSelect').value='${upper}';fillLeagueTeams();document.getElementById('leagueTeamSelect').value=leagueTeams('${upper}')[0];createLeagueSeason()`);
 const club=run('leagueSeason.club'),countrySet=run('[...leagueSeason.teams,...leagueSeason.partner.teams].sort().join("|")');
 // The player loses all fixtures, guaranteeing a bottom-two finish and relegation.
 run(`for(const week of leagueSeason.fixtures){for(const m of week){m.homeGoals=m.home===leagueSeason.club?0:m.away===leagueSeason.club?5:1;m.awayGoals=m.away===leagueSeason.club?0:m.home===leagueSeason.club?5:1;}leagueSeason.round++;advancePartnerLeague();}finishLeagueSeason();saveLeague();renderLeague()`);
 assert(run('validLeagueSeason(leagueSeason)'));assert.equal(run('leagueSeason.partner.round'),run('leagueSeason.partner.fixtures.length'));
 assert(run('leagueSeason.transition.relegated.includes(leagueSeason.club)'));assert(run('leagueSeason.transition.promoted.length===leagueSeason.transition.relegated.length'));
 const transition=run('JSON.stringify(leagueSeason.transition)');run('finishLeagueSeason()');assert.equal(run('JSON.stringify(leagueSeason.transition)'),transition);
 ids.leagueTableDivision.value=run('leagueSeason.partner.league');ids.leagueTableDivision.trigger('change');assert.equal(ids.leagueStandings.children[1].children.length,run('leagueSeason.partner.teams.length'));
 assert.equal(ids.leagueAdvanceBtn.style.display,'inline-block');assert.match(ids.leagueMovementInfo.textContent,/alt lige düştü/);
 run('leagueSeason=null;initLeague()');assert.equal(run('JSON.stringify(leagueSeason.transition)'),transition);
 ids.leagueAdvanceBtn.trigger('click');assert.equal(run('leagueSeason.club'),club);assert.equal(run('leagueSeason.league'),run(`LEAGUE_PAIRS['${upper}']`));assert.equal(run('leagueSeason.season'),'2027–28');assert.equal(run('leagueSeason.round'),0);assert(run('validLeagueSeason(leagueSeason)'));assert.equal(run('[...leagueSeason.teams,...leagueSeason.partner.teams].sort().join("|")'),countrySet);
 // A relegated club retains its roster, plays lower-tier fixtures and can promote again.
 run('playNextLeagueMatch();score.blue=3;score.red=0;endMatch()');assert.equal(run('leagueSeason.round'),1);assert(run('validLeagueSeason(leagueSeason)'));assert.equal(run('teamChoice.blue'),club);
 run('fullReset();for(const week of leagueSeason.fixtures){for(const m of week){m.homeGoals=m.home===leagueSeason.club?5:m.away===leagueSeason.club?0:1;m.awayGoals=m.away===leagueSeason.club?5:m.home===leagueSeason.club?0:1;}}leagueSeason.round=leagueSeason.fixtures.length;advancePartnerLeague();finishLeagueSeason();saveLeague()');assert(run('leagueSeason.transition.promoted.includes(leagueSeason.club)'));run('advanceLeagueSeason()');assert.equal(run('leagueSeason.league'),upper);assert.equal(run('leagueSeason.season'),'2028–29');assert(run('validLeagueSeason(leagueSeason)'));
 for(const tab of ['Table','Fixtures','Squad','Overview']){ids['leagueTab'+tab].trigger('click');assert.equal(ids['leagueView'+tab].hidden,false);}
 assert(run('(()=>{const s=JSON.parse(JSON.stringify(leagueSeason));s.partner.teams[0]=s.teams[0];return !validLeagueSeason(s)})()'));
}
assert.deepEqual(errors,[]);console.log('PASS all six paired careers: promotion, relegation, saved stable playoffs, both tables, next-year fixtures, club retention, relegation-to-promotion, hub tabs, invalid saves');
