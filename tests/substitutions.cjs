const assert=require('node:assert/strict'),{run,ids,errors}=require('./game-harness.cjs');
for(const size of [5,11]){
 run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'premier_liverpool',size:${size}});setPiece=null;state='paused';window.outId=blue[1].roster.id;window.inId=rosterFor(teamChoice.blue).find(c=>!blue.some(p=>p.roster.id===c.id)&&!c.positions.includes('GK')).id;window.oldScore=JSON.stringify(score);window.oldTime=elapsed;`);
 assert(run("MINISAHA_ENGINE.substitute('blue',1,inId).ok"));assert(run('blue[1].roster.id===inId'));assert.equal(run('blue[1].stamina'),1);assert.equal(run('JSON.stringify(score)'),run('oldScore'));assert.equal(run('elapsed'),run('oldTime'));
 run('resetKickoff()');assert(run('blue[1].roster.id===inId'));assert.equal(run('substitutionLog.length'),1);
 run('state="playing"');assert.equal(run("MINISAHA_ENGINE.substitute('blue',1,outId).ok"),false);run('state="paused"');
 const back=run("MINISAHA_ENGINE.substitute('blue',1,outId).ok");assert.equal(back,size===5);
 assert.equal(run("MINISAHA_ENGINE.substitute('blue',0,inId).ok"),false);
 if(size===11){for(let n=0;n<4;n++){run("window.next=rosterFor(teamChoice.blue).find(c=>!blue.some(p=>p.roster.id===c.id)&&!usedSubs.blue.has(c.id)&&!c.positions.includes('GK')).id");assert(run("MINISAHA_ENGINE.substitute('blue',1,next).ok"));}run("window.next=rosterFor(teamChoice.blue).find(c=>!blue.some(p=>p.roster.id===c.id)&&!usedSubs.blue.has(c.id)&&!c.positions.includes('GK')).id");assert.equal(run("MINISAHA_ENGINE.substitute('blue',1,next).ok"),false);}
 run('fullReset()');assert.equal(run('substitutionLog.length'),0);
}
assert.equal(run('Object.values(COMMENTARY_LINES).flat().length'),3000);assert.equal(run('new Set(Object.values(COMMENTARY_LINES).flat()).size'),3000);
assert.match(run("commentaryText('Oyuncu değişikliği. {out} çıkıyor, {incoming} giriyor.',{out:'Kylian Mbappé',incoming:'Harry Kane'})"),/Kylian Mbappé çıkıyor, Harry Kane giriyor/);
assert.equal(run("speechCommentaryText('Kevin De Bruyne ve Harry Kane')"),'Kevin Dö Bröyne ve Heri Keyn');
assert(run("commentaryDelivery('goal').level>commentaryDelivery('miss').level"));assert.equal(run("commentaryDelivery('goal').emotion"),'excited');assert.equal(run("commentaryDelivery('miss').emotion"),'disappointed');assert.equal(run("commentaryDelivery('substitution').emotion"),'clear');assert.deepEqual(errors,[]);
console.log('PASS bench replacements, positions, reentry/5-sub limits, fresh stamina, score/time and kickoff persistence; 3000 unique lines, spoken in/out names and contextual emotion');
