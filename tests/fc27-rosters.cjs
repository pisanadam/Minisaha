const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {run,ids,errors}=require('./game-harness.cjs'),root=path.join(__dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'roster-source/fc27-source.json.meta'))),raw=fs.readFileSync(path.join(root,'roster-source/fc27-players.ndjson'));
const players=raw.toString().trim().split('\n').map(JSON.parse),byId=new Map(players.map(p=>[p[0],p])),manifest=JSON.parse(fs.readFileSync(path.join(root,'roster-source/manifest.json'))).fc27;
assert.equal(source.edition,'FC27');assert.equal(source.publicTotal,19789);assert.equal(players.length,17849);assert.equal(byId.size,17849);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.sourceSHA256);
for(const [id,overall] of [[231747,91],[239085,91]])assert.equal(byId.get(id)[6],overall);
assert.equal(manifest.officialClubSquads,215);
for(const team of run('COUNTRY_TEAMS.filter(t=>!t.key.startsWith("alltime_")).map(t=>t.key)')){
 const cards=run(`rosterFor(${JSON.stringify(team)})`),seen=new Set();
 for(const card of cards){const token=card.name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');assert(!seen.has(token),'duplicate '+team+' '+card.name);seen.add(token);
  if(card.ratingSource!=='FC27')continue;
  const p=byId.get(card.ratingId);assert(p,card.name);assert.equal(card.overall,p[6]);assert.equal(card.name,p[1]);assert.equal(card.fc27TeamId,p[4]);assert.equal(card.nationalityId,p[3]);
  assert.deepEqual(Array.from(card.positions),p[5].map(pos=>({CAM:'AM',CDM:'DM',CF:'AM',LWB:'LB',RWB:'RB'}[pos]||pos)));
  if(card.position!=='GK')for(const [key,index] of [['pace',0],['shot',1],['pass',2],['tackle',3],['dribble',4],['physical',5],['strength',6],['jumping',7],['finishing',8]])assert.equal(card[key],p[7][index],card.name+' '+key);
 }
 const detail=manifest.teams[team];assert.equal(cards.length,detail.players);
 if(detail.scope==='Official EA FC27 launch base club squad')assert(cards.every(p=>p.ratingSource==='FC27'&&p.fc27TeamId===detail.eaTeamId));
}
assert(run("rosterFor('laliga_realmadrid').some(p=>p.name==='Kylian Mbappé'&&p.overall===91)"));
assert(run("rosterFor('premier_manchestercity').some(p=>p.name==='Erling Haaland'&&p.overall===91)"));
assert(run("rosterFor('superlig_fenerbahce').every(p=>p.ratingSource==='FC27')"));
assert(run("rosterFor('superlig_genclerbirligi').every(p=>p.ratingSource==='FC27')"));
assert(run("rosterFor('tff1_74').some(p=>p.ratingSource!=='FC27')"));
run("matchSize=11;el.blueTeamSelect.value='laliga_realmadrid';el.redTeamSelect.value='superlig_fenerbahce';fullReset();applyStrongestLineups();startGame();togglePause();renderSubstitutions()");
assert.match(ids.squadSummary.textContent,/FC27/);assert(run('blue.every(p=>p.roster.ratingSource==="FC27")'));assert(run('benchCandidates(blue[1]).every(c=>c.card.ratingSource==="FC27")'));
assert(run("rosterFor('alltime_laliga_realmadrid').some(p=>p.name==='Zinedine Zidane'&&p.ratingSource==='estimate')"));
const engine=require('../server/engine.cjs')();engine.boot({blue:'superlig_fenerbahce',red:'laliga_realmadrid',size:11});assert(engine.lineups().red.some(p=>p.name==='Kylian Mbappé'&&p.overall===91));assert(engine.speechCatalog().has('Kylian Mbappé'));
assert(run("new Set(COUNTRY_TEAMS.filter(t=>!t.key.startsWith('alltime_')).flatMap(t=>rosterFor(t.key)).filter(p=>p.ratingId===210324||p.ratingId===244083).map(p=>p.id)).size===2"));
assert(run("rosterFor('alltime_brazil').filter(p=>p.name.includes('Neymar')).length===1"));
assert(run("rosterFor('alltime_brazil').filter(p=>p.name.includes('Alisson')).length===1"));
assert(run("rosterFor('alltime_premier_tottenham').filter(p=>p.name==='Son Heung-min'||p.name==='Heung Min Son').length===1"));
assert.deepEqual(errors,[]);console.log('PASS official FC27 edition/count/SHA, 215 club memberships, exact EA IDs/positions/attributes, preserved fallback provenance, national deduplication, real bench/game/online engine and legend separation');
