#!/usr/bin/env python3
"""Fetch the public official EA FC27 launch database without account credentials.
The generic drop-api endpoint may return an earlier edition: never use it blindly.
EA's public page supplies an edition-checked paginated Next.js endpoint.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import date
import argparse,hashlib,json,re,time,urllib.request,tempfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workers',type=int,default=4)
args=parser.parse_args()
if not 1<=args.workers<=8:parser.error('workers must be between 1 and 8')
source='https://www.ea.com/games/ea-sports-fc/ratings'
html=urllib.request.urlopen(source,timeout=30).read().decode()
match=re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',html,re.S)
if not match:raise RuntimeError('EA public page data is unavailable; no data changed')
page=json.loads(match[1]);initial=page['props']['pageProps']
if initial['theme']!='fc-27':raise RuntimeError('The EA page is not FC27; no data changed')
build=page['buildId'];url='https://www.ea.com/_next/data/'+build+'/en/games/ea-sports-fc/ratings.json'
cache=Path(tempfile.gettempdir())/'minisaha-fc27'/build/date.today().isoformat();cache.mkdir(parents=True,exist_ok=True)
(cache/'1.json').write_text(json.dumps(initial['ratingDetails']))
keys=['pac','sho','pas','def','dri','phy','strength','jumping','finishing','gkDiving','gkHandling','gkKicking','gkPositioning','gkReflexes','acceleration','sprintSpeed','dribbling','standingTackle','shortPassing','shotPower','longShots']
total=initial['ratingDetails']['totalItems'];pages=(total+99)//100
if len(initial['ratingDetails']['items'])!=100:raise RuntimeError('Unexpected EA pagination')
print('Verified FC27 edition; public players:',total,flush=True)
def fetch(page_number):
 file=cache/(str(page_number)+'.json')
 if file.exists():return page_number
 for attempt in range(3):
  try:
   request=url+'?page='+str(page_number)+'&franchiseSlug=ea-sports-fc'
   data=json.loads(urllib.request.urlopen(request,timeout=30).read())['pageProps']
   if data['theme']!='fc-27' or data['ratingDetails']['totalItems']!=total:raise RuntimeError('Edition/total changed during fetch')
   out=data['ratingDetails'];expected=100 if page_number<pages else total-(pages-1)*100
   if len(out['items'])!=expected:raise RuntimeError('Incomplete page')
   file.write_text(json.dumps(out));return page_number
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
with ThreadPoolExecutor(max_workers=args.workers) as executor:
 for n,future in enumerate(as_completed([executor.submit(fetch,p) for p in range(2,pages+1)]),2):
  future.result()
  if n%10==0 or n==pages:print('Downloaded',n,'/',pages,flush=True)
players=[];teams={};nations={};seen=set()
for pagenum in range(1,pages+1):
 for p in json.loads((cache/(str(pagenum)+'.json')).read_text())['items']:
  if p['id'] in seen:raise RuntimeError('Duplicate page/player identity; no output changed')
  seen.add(p['id']);team=p['team'];nation=p['nationality']
  teams[str(team['id'])]={'name':team['label'],'league':p.get('leagueName'),'gender':p['gender']['id']};nations[str(nation['id'])]=nation['label']
  if p['gender']['id']!=0:continue
  name=p.get('commonName') or ' '.join(x for x in [p.get('firstName'),p.get('lastName')] if x)
  month,day,year=map(int,p['birthdate'].split(' ')[0].split('/'));dob=f'{year:04}-{month:02}-{day:02}'
  positions=[p['position']['shortLabel']]+[x['shortLabel'] for x in (p.get('alternatePositions') or [])]
  stats=[p['stats'].get(k,{}).get('value') for k in keys]
  players.append([p['id'],name,dob,nation['id'],team['id'],positions,p['overallRating'],stats])
if len(seen)!=total:raise RuntimeError('Incomplete database; no output changed')
packed=''.join(json.dumps(p,ensure_ascii=False,separators=(',',':'))+'\n' for p in sorted(players))
metadata={'edition':'FC27','retrievedAt':date.today().isoformat(),'source':source,'endpoint':url,'buildId':build,'publicTotal':total,'menPlayers':len(players),'fields':['eaId','name','dateOfBirth','nationId','teamId','positions','overall','stats'],'stats':keys,'teams':teams,'nations':nations,'scope':'Official EA FC27 launch base player ratings, not career live-form updates or Icons.'}
for name,text in [('fc27-players.ndjson',packed),('fc27-source.json.meta',json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')]:
 file=root/'roster-source'/name;pending=file.with_suffix(file.suffix+'.tmp');pending.write_text(text);pending.replace(file)
print('Saved official FC27 male players:',len(players),'public identities checked:',total,flush=True)
