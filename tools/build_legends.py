#!/usr/bin/env python3
"""Compile curated historical peak cards into separate all-time game squads.
Ratings and attributes are original gameplay estimates, never official EA values.
Run after build_national_pool.py. Current season squads are not overwritten.
"""
from pathlib import Path
from collections import defaultdict
import hashlib,json,re,subprocess,unicodedata
root=Path(__file__).resolve().parents[1]
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower().replace('ı','i')).encode('ascii','ignore').decode())
html=(root/'public/index.html').read_text()
catalog=json.loads(re.search(r'const COUNTRY_TEAMS = (\[[\s\S]*?\n\]);',html)[1])
# Read the same base cards as the server, including the national strength overlay.
js="""const fs=require('fs'),vm=require('vm');const s={window:{}};vm.createContext(s);for(const n of fs.readdirSync('public/assets').filter(n=>n.startsWith('rosters-')&&!n.startsWith('rosters-zzlegends-')).sort((a,b)=>Number(a.startsWith('rosters-strength-'))-Number(b.startsWith('rosters-strength-'))||a.localeCompare(b)))vm.runInContext(fs.readFileSync('public/assets/'+n,'utf8'),s);process.stdout.write(JSON.stringify({cards:s.window.MINISAHA_ROSTERS,lower:s.window.MINISAHA_LOWER_TEAMS||[]}));"""
base=json.loads(subprocess.check_output(['node','-e',js],cwd=root));cards=base['cards'];catalog+=base['lower'];meta={t['key']:t for t in catalog}
valid={'GK','CB','LB','RB','DM','CM','AM','LM','RM','LW','RW','ST'}
legends=[];seen=set();groups=defaultdict(list);unknown=set()
for file,retired in [('legends.tsv',True),('legends-active.tsv',False)]:
    for row in (root/'roster-source'/file).read_text().splitlines():
        if not row or row.startswith('#'):continue
        name,nation,positions,overall,clubs=row.split('|');positions=positions.split(',');overall=int(overall)
        assert norm(name) not in seen,name
        assert set(positions)<=valid and len(positions)==len(set(positions)) and 40<=overall<=99,row
        seen.add(norm(name));pos=positions[0]
        card={'id':'legend-'+hashlib.sha256(norm(name).encode()).hexdigest()[:12],'name':name,'position':pos,'positions':positions,'jersey':'','overall':overall,'ratingSource':'estimate','legend':True,'era':'peak','retired':retired,'nation':nation}
        defense=pos in ['CB','LB','RB','DM'];forward=pos in ['ST','LW','RW'];keeper=pos=='GK'
        metrics={'pace':overall-8 if pos in ['CB','DM','CM','AM'] else overall-2,'shot':overall if forward else overall-23 if defense else overall-8,'pass':overall if pos in ['CM','AM','DM'] else overall-10,'tackle':overall if defense else overall-32,'dribble':overall if pos in ['AM','LW','RW'] else overall-12,'physical':overall-5,'strength':overall-5,'jumping':overall-6,'finishing':overall if forward else overall-24}
        if keeper:metrics.update({'pace':overall-30,'shot':25,'finishing':25,'pass':overall-18,'tackle':30,'dribble':40})
        card.update({k:max(20,min(99,v)) for k,v in metrics.items()});legends.append(card);groups[nation].append(card)
        for club in filter(None,clubs.split(',')):
            if club in meta:groups[club].append(card)
            else:unknown.add(club)
# Missing national teams obtain current cards only via explicit citizenship snapshots.
extra_nations={'italy':('İtalya','ITA','🇮🇹','Italy'),'croatia':('Hırvatistan','CRO','🇭🇷','Croatia'),'wales':('Galler','WAL','🏴','Wales'),'czech':('Çekya','CZE','🇨🇿','Czechia'),'ireland':('İrlanda','IRL','🇮🇪','Ireland'),'denmark':('Danimarka','DEN','🇩🇰','Denmark'),'ukraine':('Ukrayna','UKR','🇺🇦','Ukraine'),'romania':('Romanya','ROU','🇷🇴','Romania'),'serbia':('Sırbistan','SRB','🇷🇸','Serbia'),'georgia':('Gürcistan','GEO','🇬🇪','Georgia'),'finland':('Finlandiya','FIN','🇫🇮','Finland'),'northernireland':('Kuzey İrlanda','NIR','🏴','Northern Ireland'),'russia':('Rusya','RUS','🇷🇺','Russia'),'hungary':('Macaristan','HUN','🇭🇺','Hungary'),'bulgaria':('Bulgaristan','BUL','🇧🇬','Bulgaria'),'poland':('Polonya','POL','🇵🇱','Poland'),'slovenia':('Slovenya','SVN','🇸🇮','Slovenia'),'slovakia':('Slovakya','SVK','🇸🇰','Slovakia')}
countrykey={v[3]:k for k,v in extra_nations.items()};countrykey.update({'Czech Republic':'czech','Republic of Ireland':'ireland','Russian Federation':'russia'})
current=defaultdict(dict)
for source in sorted((root/'roster-source').glob('*.json')):
    if source.stem in ['manifest','national','national-additions']:continue
    for teamkey,team in json.loads(source.read_text()).items():
        lookup={p['id']:p for p in cards.get(teamkey,{}).get('players',[])}
        for p in team.get('players',[]):
            key=countrykey.get(p.get('citizenship'));card=lookup.get(p['id'])
            if key and card and (card['id'] not in current[key] or card['overall']>current[key][card['id']]['overall']):current[key][card['id']]=card
supplements={};targets=[]
for key in groups:
    if key not in meta:
        if key not in extra_nations:continue
        name,short,flag,_=extra_nations[key];meta[key]={'key':key,'name':name,'short':short,'flag':flag,'logoType':'flag'}
        supplements[key]=sorted(current[key].values(),key=lambda p:(-p['overall'],p['id']))[:60]
    pool=cards.get(key,{}).get('players',[])+supplements.get(key,[])+groups[key]
    identities={norm(p['name']) for p in pool}
    if len(identities)<11 or not any(p['position']=='GK' for p in pool):continue
    targets.append({**meta[key],'key':'alltime_'+key,'name':meta[key]['name']+' · Tüm zamanlar','group':'🏆 Tüm zamanlar · '+('Kulüpler' if '_' in key else 'Milli takımlar'),'baseKey':key})
targets.sort(key=lambda t:(t['group'],t['name']))
world={'key':'alltime_world','name':'Dünya Efsaneleri','short':'LEG','flag':'🌟','logoType':'generic','group':'🏆 Tüm zamanlar · Dünya','baseKey':None};targets.insert(0,world)
# Strength overlays must run first. This asset runs last in browser and server.
payload=json.dumps({'legends':legends,'groups':{key:[p['id'] for p in squad] for key,squad in groups.items()},'supplements':supplements,'teams':targets},ensure_ascii=False,separators=(',',':'))
text='''// Generated by tools/build_legends.py. Historical peak ratings are gameplay estimates.
window.MINISAHA_INIT_ALLTIME=()=>{const data=PAYLOAD;
const norm=s=>s.toLowerCase().replace(/ı/g,'i').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const legendById=new Map(data.legends.map(p=>[p.id,p]));
window.MINISAHA_LEGEND_CATALOG=data.legends;
window.MINISAHA_ALLTIME_TEAMS=data.teams;
for(const team of data.teams){
 const base=team.baseKey?(window.MINISAHA_ROSTERS[team.baseKey]?.players||data.supplements[team.baseKey]||[]):[];
 const historic=team.baseKey?(data.groups[team.baseKey]||[]).map(id=>legendById.get(id)):data.legends;
 const retiredNames=new Set(historic.map(p=>norm(p.name)));
 const pool=[...base.filter(p=>!retiredNames.has(norm(p.name))),...historic];
 const names=new Set(),ids=new Set();const players=pool.filter(p=>{const name=norm(p.name);if(names.has(name)||ids.has(p.id))return false;names.add(name);ids.add(p.id);return true;});
 if(players.length<11||!players.some(p=>p.position==='GK'))throw new Error('Eksik tüm zamanlar kadrosu: '+team.key);
 window.MINISAHA_ROSTERS[team.key]={season:'Tüm zamanlar',selection:'all-time-game-pool',updated:'03.10.2026',players};
}
};
'''.replace('PAYLOAD',payload)
asset='rosters-zzlegends-'+hashlib.sha256(text.encode()).hexdigest()[:10]+'.js'
for old in (root/'public/assets').glob('rosters-zzlegends-*.js'):old.unlink()
(root/'public/assets'/asset).write_text(text)
html=re.sub(r'<script src="assets/rosters-zzlegends-[a-f0-9]+\.js"></script>\n','',html)
needle=re.search(r'<script src="assets/rosters-strength-[a-f0-9]+\.js"></script>',html)[0];html=html.replace(needle,needle+'\n<script src="assets/'+asset+'"></script>');(root/'public/index.html').write_text(html)
manifest_path=root/'roster-source/manifest.json';manifest=json.loads(manifest_path.read_text());manifest['allTimeGamePool']={'asset':asset,'historicalPlayers':len(legends),'retiredPlayers':sum(p['retired'] for p in legends),'teams':len(targets),'ratings':'Original estimated peak gameplay ratings; not official EA/FC27 ratings. Existing current-season teams remain separate.','unavailableHistoricalClubs':sorted(unknown)};manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(asset,'historical players',len(legends),'retired',sum(p['retired'] for p in legends),'all-time teams',len(targets),'unavailable clubs',sorted(unknown))
