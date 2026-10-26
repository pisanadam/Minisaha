const assert=require('node:assert/strict'),{run,ids,sandbox,errors}=require('./game-harness.cjs');
// Browser profile credentials are created once and reused.
const first=run('JSON.stringify(onlineProfileCredentials())'),second=run('JSON.stringify(onlineProfileCredentials())');
assert.equal(first,second);assert.match(JSON.parse(first).id,/^[0-9a-f]{32}$/);assert.match(JSON.parse(first).secret,/^[0-9a-f]{64}$/);
// A finished online match keeps the session for a rematch instead of leaving.
run("net.active=true;net.token='t';net.side='blue';net.mode='random';startOnlineMatch({match:'m1',side:'blue',size:5,blue:'turkiye',red:'premier_liverpool',names:['A','B'],ranked:true})");
assert.equal(ids.quickChat.hidden,false);assert.match(ids.onlineStatus.textContent,/Dereceli/);
run("window.sent=[];onlineCommand=(type,data)=>{sent.push({type,...data});return Promise.resolve(true);}");
run("receiveOnline({type:'result',ranked:true,rating:{before:1000,after:1016,delta:16},profile:{name:'A',rating:1016,rank:1,wins:1,draws:0,losses:0,goalsFor:3,goalsAgainst:1}})");
assert.match(ids.onlineResultInfo.textContent,/1000 → 1016 \(\+16\)/);assert.match(ids.onlineProfileInfo.textContent,/Derece 1016/);
run("state='ended';net.phase='post';receiveOnline({type:'post',remaining:30})");assert.equal(ids.playAgain.textContent,'Rövanş iste ↗');
ids.playAgain.trigger('click');assert.equal(run('sent.at(-1).type'),'rematch');assert.equal(ids.playAgain.textContent,'Rakip bekleniyor…');assert.equal(ids.playAgain.disabled,true);
run("receiveOnline({type:'rematch',state:'declined'})");assert.equal(ids.playAgain.textContent,'Rövanş yok');assert.match(ids.onlineResultInfo.textContent,/Rakip ayrıldı/);
run("net.rematch='';receiveOnline({type:'rematch',state:'requested',by:'B'})");assert.equal(ids.playAgain.textContent,'Rövanşı kabul et ↗');assert.equal(ids.playAgain.disabled,false);
// Quick chat shows only fixed lines.
run("receiveOnline({type:'chat',id:7,name:'B',mine:false})");assert.equal(ids.chatToast.textContent,'B: GG 🤝');
run("receiveOnline({type:'chat',id:42,name:'B'})");assert.equal(ids.chatToast.textContent,'B: GG 🤝');
ids.chatToggle.trigger('click');assert.equal(ids.chatMenu.hidden,false);ids.chatMenu.children[0].trigger('click');assert.equal(run('JSON.stringify(sent.at(-1))'),JSON.stringify({type:'chat',id:0}));assert.equal(ids.chatMenu.hidden,true);
// Post window expiry keeps the result screen but leaves the session.
run("receiveOnline({type:'left',reason:'post'})");assert.equal(run('net.active'),false);assert.equal(ids.playAgain.textContent,'Yeni maç ↗');assert.equal(ids.quickChat.hidden,true);
ids.playAgain.trigger('click');assert.equal(run('state'),'ready');assert.equal(ids.mainViewOnline.hidden,false);
assert.deepEqual(errors,[]);
console.log('PASS browser profile credentials, ranked result text, post-match rematch states, quick chat whitelist and post-window expiry');
