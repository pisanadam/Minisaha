"""Build best-XI national talent pools from reviewed club citizenship snapshots.
This is a game squad, not a real matchday call-up list. Club ownership stays intact.
"""
from pathlib import Path
from collections import Counter
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
national=json.loads((root/'roster-source/national.json').read_text())
cards={}
for asset in sorted((root/'public/assets').glob('rosters-*.js')):
    if asset.name.startswith('rosters-strength-'):continue
    text=asset.read_text();start=text.index('{},')+3
    data,_=json.JSONDecoder().raw_decode(text[start:]);cards.update(data)
country={}
registered={}
for key,team in national.items():
    citizenship=Counter(p.get('citizenship') for p in team['players'] if p.get('citizenship')).most_common(1)[0][0]
    country[citizenship]=key
    for p in team['players']:registered[p['id']]=key
candidates={key:{} for key in national}
for source in (root/'roster-source').glob('*.json'):
    if source.stem in ['manifest','national','national-additions']:continue
    for club,team in json.loads(source.read_text()).items():
        if club not in cards:continue
        club_cards={p['id']:p for p in cards[club]['players']}
        for p in team['players']:
            key=registered.get(p['id']) or country.get(p.get('citizenship'))
            card=club_cards.get(p['id'])
            if key and card:
                prev=candidates[key].get(card['id'])
                if not prev or card['overall']>prev['overall']:candidates[key][card['id']]=card
supplement_path=root/'roster-source/national-additions.json'
supplement=json.loads(supplement_path.read_text()).get('teams',{}) if supplement_path.exists() else {}
for key,team in supplement.items():
    for p in team['players']:
        found=next((card for squad in cards.values() for card in squad['players'] if card['name']==p['name']),None)
        if found:p=found
        candidates[key][p['id']]=p
out={};extras={};added=0
for key in national:
    base=cards[key];players=list(base['players']);ids={p['id'] for p in players}
    cutoff=sorted((p['overall'] for p in players),reverse=True)[10]-3
    extra=sorted((p for p in candidates[key].values() if p['id'] not in ids and (p['overall']>=cutoff or p['id'] in supplement.get(key,{}).get('includeExistingIds',[]) or any(p['name']==x['name'] for x in supplement.get(key,{}).get('players',[])))),key=lambda p:(-p['overall'],p['id']))[:max(0,60-len(players))]
    extras[key]=extra;added+=len(extra);out[key]={**base,'selection':'best-game-pool','players':players+extra}
text='// Game national squads: reviewed citizenship plus club attributes, not matchday call-ups.\nfor(const [key,extra] of Object.entries('+json.dumps(extras,ensure_ascii=False,separators=(',',':'))+')){const squad=window.MINISAHA_ROSTERS[key];squad.players=squad.players.concat(extra);squad.selection="best-game-pool";}\n'
name='rosters-strength-'+hashlib.sha256(text.encode()).hexdigest()[:10]+'.js'
for old in (root/'public/assets').glob('rosters-strength-*.js'):old.unlink()
(root/'public/assets'/name).write_text(text)
p=root/'public/index.html';html=re.sub(r'<script src="assets/rosters-strength-[a-f0-9]+\.js"></script>\n','',p.read_text());needle='<script src="assets/rosters-lower-2adeb447c0.js"></script>';html=html.replace(needle,needle+'\n<script src="assets/'+name+'"></script>');p.write_text(html)
p=root/'roster-source/manifest.json';manifest=json.loads(p.read_text());manifest['nationalGamePool']={'asset':name,'countries':len(out),'addedPlayers':added,'source':'Reviewed club citizenship, existing national registration and FC26/estimated club attributes; game selection, not official call-ups.'};p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(name,'countries',len(out),'added',added,'game total',sum(len(t['players']) for t in cards.values())+added)
