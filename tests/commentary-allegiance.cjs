const assert=require('node:assert/strict'),{run,ids,sandbox,errors}=require('./game-harness.cjs');
for(const side of ['blue','red']){
 ids.commentaryAllegianceSelect.value=side;ids.commentaryAllegianceSelect.trigger('change');
 assert.equal(run('effectiveCommentaryAllegiance()'),side);
 assert.equal(JSON.parse(sandbox.localStorage.getItem('miniSaha.settings.v2')).commentaryAllegiance,side);
 assert.match(run(`biasedCommentaryLine('goal',{team:'${side}'},'Normal gol')`),/bizim takım/);
 const other=side==='blue'?'red':'blue';
 assert.match(run(`biasedCommentaryLine('goal',{team:'${other}'},'Normal gol')`),/Rakip takım/);
 assert(run(`commentaryDelivery('goal',{team:'${side}'}).level>commentaryDelivery('goal',{team:'${other}'}).level`));
 assert.equal(run(`commentaryDelivery('miss',{team:'${other}'}).emotion`),'relieved');
 run('net.active=true;onlineButtons()');
 assert.equal(ids.commentaryAllegianceSelect.disabled,true);assert.equal(ids.commentaryAllegianceSelect.value,'neutral');
 assert.equal(run('effectiveCommentaryAllegiance()'),'neutral');
 assert.equal(run("biasedCommentaryLine('goal',{team:'blue'},'Normal gol')"),'Normal gol');
 assert.equal(run("JSON.stringify(commentaryDelivery('goal',{team:'blue'}))"),run("JSON.stringify(commentaryDelivery('goal',{team:'red'}))"));
 ids.commentaryAllegianceSelect.value=other;ids.commentaryAllegianceSelect.trigger('change');
 assert.equal(ids.commentaryAllegianceSelect.value,'neutral');assert.equal(run('commentaryAllegiance'),side);
 run('net.active=false;onlineButtons()');assert.equal(ids.commentaryAllegianceSelect.value,side);assert.equal(ids.commentaryAllegianceSelect.disabled,false);
}
assert(run('Object.values(SUPPORTER_COMMENTARY).flat().every(line=>bundledCommentaryParts(line,{team:"blue"},"attack").every(key=>MINISAHA_ENGINE.speechCatalog().has(key)))'));
assert.equal(run('new Set(Object.values(COMMENTARY_LINES).flat()).size'),3000);
run("MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:5});commentaryAllegiance='red'");assert.equal(run('effectiveCommentaryAllegiance()'),'neutral');
assert.deepEqual(errors,[]);console.log('PASS saved allegiance, supporter wording/emotion, forced neutral multiplayer/server, restored local choice and speech catalog');
