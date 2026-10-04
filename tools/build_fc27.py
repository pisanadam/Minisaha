#!/usr/bin/env python3
"""Compile verified EA FC27 base squads/attributes; preserve explicit fallback provenance.
Run fetch_fc27.py first. Rebuild legends after this compiler.
"""
from pathlib import Path
from collections import defaultdict,Counter
import json,re,unicodedata,subprocess,hashlib
root=Path(__file__).resolve().parents[1]
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower().replace('ı','i')).encode('ascii','ignore').decode())
meta=json.loads((root/'roster-source/fc27-source.json.meta').read_text());assert meta['edition']=='FC27'
rows=[json.loads(line) for line in (root/'roster-source/fc27-players.ndjson').read_text().splitlines()];assert len(rows)==meta['menPlayers'] and len({p[0] for p in rows})==len(rows)
html=(root/'public/index.html').read_text();catalog=json.loads(re.search(r'const COUNTRY_TEAMS = (\[[\s\S]*?\n\]);',html)[1])
js="""const fs=require('fs'),vm=require('vm');const s={window:{}};vm.createContext(s);for(const n of fs.readdirSync('public/assets').filter(n=>n.startsWith('rosters-')&&!n.startsWith('rosters-zzlegends-')&&!n.startsWith('rosters-fc27-')).sort((a,b)=>Number(a.startsWith('rosters-strength-'))-Number(b.startsWith('rosters-strength-'))||a.localeCompare(b)))vm.runInContext(fs.readFileSync('public/assets/'+n,'utf8'),s);process.stdout.write(JSON.stringify({cards:s.window.MINISAHA_ROSTERS,lower:s.window.MINISAHA_LOWER_TEAMS||[]}));"""
base=json.loads(subprocess.check_output(['node','-e',js],cwd=root));old=base['cards'];catalog+=base['lower'];team_meta={p['key']:p for p in catalog}
registered={};club_names={}
for f in sorted((root/'roster-source').glob('*.json')):
 if f.stem in ['manifest','national-additions']:continue
 for k,t in json.loads(f.read_text()).items():
  if not isinstance(t,dict) or 'players' not in t:continue
  registered[k]=t['players'];club_names[k]=t.get('sourceName',team_meta.get(k,{}).get('name',''))
prior_ids=defaultdict(Counter);old_by_id={};source_by_id={}
for team in old.values():
 for p in team['players']:
  old_by_id[p['id']]=p
  if p.get('ratingId'):prior_ids[int(p['ratingId'])][p['id']]+=1
for squad in registered.values():
 for p in squad:source_by_id[p['id']]=p
bydob=defaultdict(list);byname=defaultdict(list);by_ea={r[0]:r for r in rows}
for r in rows:bydob[r[2]].append(r);byname[norm(r[1])].append(r)
def match_source(p):
 if p.get('ratingId') in by_ea:return by_ea[p['ratingId']]
 source=source_by_id.get(p['id'],{});dob=(source.get('dateOfBirth') or '')[:10]
 names={norm(source.get(k) or '') for k in ['displayName','fullName','shortName','lastName']}|{norm(p.get('name',''))};names.discard('')
 if not dob:
  exact=byname.get(norm(p.get('name','')),[])
  return exact[0] if len(exact)==1 and len(p.get('name','').split())>=2 else None
 candidates=[r for r in bydob[dob] if any(n==norm(r[1]) or len(n)>4 and (n in norm(r[1]) or norm(r[1]) in n) for n in names)]
 return candidates[0] if len(candidates)==1 else None
for p in old_by_id.values():
 r=match_source(p)
 if r:prior_ids[r[0]][p['id']]+=1
stable_ids={};claimed_ids=set()
# Old snapshots can reuse one registration ID for namesakes with different birthdays.
# Every official EA identity must retain a different gameplay ID.
for ea,candidates in sorted(prior_ids.items(),key=lambda pair:(-pair[1].most_common(1)[0][1],pair[0])):
 for id,_ in candidates.most_common():
  if id not in claimed_ids:stable_ids[ea]=id;claimed_ids.add(id);break
position_map={'CAM':'AM','CDM':'DM','CF':'AM','LWB':'LB','RWB':'RB'}
metric_map={'pace':'pac','shot':'sho','pass':'pas','tackle':'def','dribble':'dri','physical':'phy','strength':'strength','jumping':'jumping','finishing':'finishing','gkDiving':'gkDiving','gkHandling':'gkHandling','gkKicking':'gkKicking','gkPositioning':'gkPositioning','gkReflexes':'gkReflexes'}
all_cards={};by_club=defaultdict(list);by_nation=defaultdict(list)
for r in rows:
 ea,name,dob,nation,club,pos,ovr,values=r;stats=dict(zip(meta['stats'],values));positions=list(dict.fromkeys(position_map.get(p,p) for p in pos))
 assert positions and 40<=ovr<=99,(name,ovr)
 assert all(p in ['GK','CB','LB','RB','DM','CM','AM','LM','RM','LW','RW','ST'] for p in positions),positions
 id=stable_ids.get(ea,'ea-'+str(ea));prior=old_by_id.get(id,{})
 p={'id':id,'name':name,'position':positions[0],'positions':positions,'jersey':prior.get('jersey',''),'overall':ovr,'ratingSource':'FC27','ratingId':ea,'nationalityId':nation,'fc27TeamId':club,'dateOfBirth':dob}
 for k,v in metric_map.items():
  value=stats.get(v);assert isinstance(value,(int,float)) and 0<=value<=99,(name,v,value);p[k]=value
 # EA face stats have goalkeeper meanings; do not treat diving as running speed or handling as shooting.
 if positions[0]=='GK':
  p.update(pace=stats['def'],shot=stats['finishing'],finishing=stats['finishing'],tackle=stats['standingTackle'],dribble=stats['dribbling'],physical=stats['strength'],attributeModel='GK gameplay conversion; EA GK attributes retained',**{'pass':stats['gkKicking']})
 all_cards[ea]=p;by_club[club].append(p);by_nation[nation].append(p)
# Identity matches propose club IDs; names must independently agree, or be explicitly reviewed.
club_aliases={'manchesterunited':'manutd','manchestercity':'manchestercity','bayernmunich':'fcbayernmunchen','borussiamonchengladbach':'mgladbach','eintrachtfrankfurt':'frankfurt','bayerleverkusen':'leverkusen','intermilan':'lombardialfc','acmilan':'milanfc','napoli':'napolifc','lazio':'latium','asroma':'roma','hellasverona':'hellasverona','athleticclub':'athleticclub','realbetis':'realbetis','fcschalke04':'fcschalke04','fenerbahce':'fenerbahce','genclerbirligi':'genclerbirligi'}
def club_norm(s):
 s=norm(s);return re.sub(r'^(?:fc|ac|as|sc)|(?:fc|cf|sc|afc)$','',s)
club_index=defaultdict(list);exact_club_index=defaultdict(list)
for id,t in meta['teams'].items():
 if t['gender']==0:
  club_index[club_norm(t['name'])].append(int(id));exact_club_index[norm(t['name'])].append(int(id))
mappings={};unmapped=[]
for key in old:
 if '_' not in key:continue
 names=[team_meta[key]['name'],club_names.get(key,'')]
 targets={club_norm(n) for n in names if n}
 targets|={club_norm(club_aliases[norm(n)]) for n in names if norm(n) in club_aliases}
 exact_targets={norm(n) for n in names if n}|{norm(club_aliases[norm(n)]) for n in names if norm(n) in club_aliases}
 exact_ids={id for n in exact_targets for id in exact_club_index.get(n,[])}
 ids=exact_ids if len(exact_ids)==1 else {id for n in targets for id in club_index.get(n,[])}
 votes=Counter(r[4] for p in old[key]['players'] if (r:=match_source(p)))
 if len(ids)==1:mappings[key]=ids.pop()
 else:unmapped.append({'key':key,'name':names,'votes':votes.most_common(3)})
# Reviewed map is explicit and source-controlled; never guess an ambiguous club or player.
review_path=root/'roster-source/fc27-club-map.tsv'
if review_path.exists():
 for line in review_path.read_text().splitlines():
  if not line or line.startswith('#'):continue
  key,id=line.split('|');assert key in team_meta and id in meta['teams'];mappings[key]=int(id)
club_alias_keys={id:[k for k,v in mappings.items() if v==id] for id in set(mappings.values()) if list(mappings.values()).count(id)>1}
# Existing division catalogs may alias the same real club; exact-name aliases share EA IDs.
output={};report={};national=json.loads((root/'roster-source/national.json').read_text())
nation_labels={norm(v):int(k) for k,v in meta['nations'].items()}
nation_aliases={'turkiye':'turkey','netherlands':'holland','southkorea':'korearepublic','ivorycoast':'cotedivoire','usa':'unitedstates','iran':'iran','saudiarabia':'saudiarabia','capeverde':'capeverdeislands','curacao':'curacao'}
for key,team in old.items():
 if key in national:
  citizenship=Counter(p.get('citizenship') for p in national[key]['players'] if p.get('citizenship')).most_common(1)[0][0]
  token=norm(citizenship);nation=nation_labels.get(token) or nation_labels.get(nation_aliases.get(token,''))
  if nation is None:raise ValueError('Unknown national identity '+key+' '+citizenship)
  official=by_nation[nation]
  selected=[all_cards[r[0]] if (r:=match_source(p)) else p for p in team['players']]
  # Keep existing registered names, then add the strongest available FC27 players.
  leaders=sorted(official,key=lambda p:(-p['overall'],p['id']))[:60]
  selected+=leaders
  names=set();squad=[]
  for p in selected:
   token=norm(p['name'])
   if token in names:continue
   names.add(token);squad.append(p)
  scope='FC27 nationality game pool, not official call-ups'
 elif key in mappings and len(by_club[mappings[key]])>=11 and any(p['position']=='GK' for p in by_club[mappings[key]]):
  squad=sorted(by_club[mappings[key]],key=lambda p:(p['position']!='GK',-p['overall'],p['id']));scope='Official EA FC27 launch base club squad'
 else:
  squad=[all_cards[r[0]] if (r:=match_source(p)) else p for p in team['players']];scope='Registered 2026-27 fallback roster; FC27 attributes where matched'
 unique={p['id']:p for p in squad};squad=list(unique.values())
 assert len(squad)>=11 and any(p['position']=='GK' for p in squad),key
 output[key]={'season':'FC27 / 2026–27','updated':'04.10.2026','selection':scope,'players':squad}
 report[key]={'players':len(squad),'FC27':sum(p['ratingSource']=='FC27' for p in squad),'scope':scope,'eaTeamId':mappings.get(key)}
# One shared player table minimizes download/parse cost across club and national squads.
shared={};squads={}
for key,team in output.items():
 for p in team['players']:shared[p['ratingSource']+':'+p['id']+':'+str(p.get('ratingId',''))]=p
 squads[key]={k:v for k,v in team.items() if k!='players'}|{'ids':[p['ratingSource']+':'+p['id']+':'+str(p.get('ratingId','')) for p in team['players']]}
data=json.dumps({'cards':shared,'squads':squads,'lower':base['lower']},ensure_ascii=False,separators=(',',':'))
text='// Official EA FC27 base data; see roster-source/fc27-source.json.meta.\nwindow.MINISAHA_ROSTERS ||= {};\nwindow.MINISAHA_INIT_FC27=()=>{const data='+data+';window.MINISAHA_LOWER_TEAMS=data.lower;for(const [key,squad] of Object.entries(data.squads)){const {ids,...info}=squad;window.MINISAHA_ROSTERS[key]={...info,players:ids.map(id=>data.cards[id])};}};\n'
asset='rosters-fc27-'+hashlib.sha256(text.encode()).hexdigest()[:10]+'.js'
for old_asset in (root/'public/assets').glob('rosters-fc27-*.js'):old_asset.unlink()
(root/'public/assets'/asset).write_text(text)
# Browser loads the compiled FC27 table; legacy assets remain compiler inputs only.
html=re.sub(r'<script src="assets/rosters-(?!zzlegends-)[^"]+\.js"></script>\n','',html)
needle=re.search(r'<script src="assets/rosters-zzlegends-[a-f0-9]+\.js"></script>',html)[0];html=html.replace(needle,'<script src="assets/'+asset+'"></script>\n'+needle)
(root/'public/index.html').write_text(html)
manifest_path=root/'roster-source/manifest.json';manifest=json.loads(manifest_path.read_text());manifest['fc27']={'asset':asset,'source':meta['source'],'retrievedAt':meta['retrievedAt'],'sourceSHA256':hashlib.sha256((root/'roster-source/fc27-players.ndjson').read_bytes()).hexdigest(),'sourcePlayers':len(rows),'teams':report,'totalPlayers':sum(p['players'] for p in report.values()),'FC27':sum(p['FC27'] for p in report.values()),'officialClubSquads':sum(p['scope']=='Official EA FC27 launch base club squad' for p in report.values()),'fallbacks':'Unlicensed/incomplete clubs retain registered 2026-27 rosters. Old FC26 and estimated ratings remain labelled; they are never relabelled FC27.'}
if 'legacyRatings' not in manifest:
 manifest['legacyRatings']={k:manifest.get(k) for k in ['ratingSource','ratingSourceSHA256','ratingEdition','counts']}
manifest['date']=meta['retrievedAt'];manifest['rosterSeason']='FC27 / 2026–27 game pools'
manifest['ratingSource']=meta['source'];manifest['ratingSourceSHA256']=manifest['fc27']['sourceSHA256']
manifest['ratingEdition']='Official EA FC27 launch base ratings; older FC26/estimated fallbacks remain explicitly labelled'
counts=Counter(p['ratingSource'] for t in output.values() for p in t['players'])
manifest['counts']={'teams':len(output),'players':sum(counts.values()),**counts}
manifest['fc27']['clubAliases']={str(k):v for k,v in club_alias_keys.items()}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'roster-source/fc27-unmapped.json.report').write_text(json.dumps([u for u in unmapped if u['key'] not in mappings],ensure_ascii=False,indent=2)+'\n')
print(asset,'teams',len(output),'players',manifest['fc27']['totalPlayers'],'FC27',manifest['fc27']['FC27'],'official club squads',manifest['fc27']['officialClubSquads'],'unmapped',len([u for u in unmapped if u['key'] not in mappings]))
