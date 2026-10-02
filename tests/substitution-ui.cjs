const assert=require('node:assert/strict'),{run,ids,errors}=require('./game-harness.cjs');
for(const size of [5,11]){
 run(`matchSize=${size};el.blueTeamSelect.value='turkiye';el.redTeamSelect.value='norway';fullReset();startGame();togglePause();renderSubstitutions()`);
 assert.equal(ids.subPitch.children.length,size);
 for(const button of ids.subPitch.children){assert(Number.parseFloat(button.style.left)>=12&&Number.parseFloat(button.style.left)<=88);assert(Number.parseFloat(button.style.top)>=7.9&&Number.parseFloat(button.style.top)<=92);assert(button['aria-label'].includes('Enerji'));}
 const index=run('blue.findIndex(p=>p.position===\'ST\')');ids.subPitch.children[index].trigger('click');
 assert.equal(ids.subOutSelect.value,String(index));assert(ids.subPitch.children[index].classList.contains('selected'));
 const expected=run('benchCandidates(blue[Number(document.getElementById("subOutSelect").value)]).find(c=>c.eligible&&c.penalty<=17)?.card.id');
 assert.equal(ids.subInSelect.value,expected);assert.match(ids.subRecommendation.textContent,/Önerilen:/);
 assert.equal(ids.subBench.children.length,run('rosterFor(teamChoice.blue).length-blue.length'));
 for(const card of ids.subBench.children){const positionText=card.children[1].textContent;assert(positionText.includes('Puan'));assert(!run(`blue.some(p=>p.roster.id===${JSON.stringify(card.dataset.playerId)})`));}
 const outgoing=run(`blue[${index}].roster.id`),chosen=ids.subBench.children.find(b=>!b.disabled&&b.dataset.playerId!==expected);
 chosen.trigger('click');assert.equal(ids.subInSelect.value,chosen.dataset.playerId);assert(ids.subBench.children.find(b=>b.dataset.playerId===chosen.dataset.playerId).classList.contains('selected'));
 ids.subConfirmBtn.trigger('click');assert.equal(run(`blue[${index}].roster.id`),chosen.dataset.playerId);
 const outCard=ids.subBench.children.find(b=>b.dataset.playerId===outgoing);assert.equal(outCard.disabled,size===11);
 ids.subPitch.children[0].trigger('click');
 for(const card of ids.subBench.children){const gk=run(`rosterFor(teamChoice.blue).find(p=>p.id===${JSON.stringify(card.dataset.playerId)}).positions.includes('GK')`);if(!gk)assert(card.disabled);}
 run('net.active=true;net.side="blue";net.pauseBy="red";renderSubstitutions()');assert(ids.subPitch.children.every(b=>b.disabled));assert(ids.subBench.children.every(b=>b.disabled));assert(ids.subConfirmBtn.disabled);
 run('net.pauseBy="blue";renderSubstitutions()');assert(ids.subPitch.children.every(b=>!b.disabled));run('net.active=false');
}
assert.deepEqual(errors,[]);console.log('PASS pitch slot cards, full bench positions/ratings, position-aware recommended backup, card selection/actual substitution, keeper/reentry rules and online pause ownership');
