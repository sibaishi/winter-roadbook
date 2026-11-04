"""Generate static WGS84 display geometry from public OSRM/OSM routing.
Run manually when changing stops; browsers never call the routing service.
"""
import json, subprocess, re
from pathlib import Path
from datetime import datetime, timezone
root=Path(__file__).resolve().parent.parent
source=(root/'expedition.js').read_text()
places={m[0]:{'name':m[1],'lat':float(m[2]),'lng':float(m[3])} for m in re.findall(r"(\w+):\{name:'([^']+)',lat:([\d.]+),lng:([\d.]+)\}",source)}
# Original Sayram coordinate is on the lake; use the nearest mapped driveable road.
places['sayram'].update(lng=81.121238,lat=44.512291)
routes={'xinjiang':['jinhua','lanzhou','wuwei','hami','urumqi','kuitun','sayram','karamay','burqin','altay','hemu','kanas'],'northeast':['jinhua','jinan','shenyang','jilin','changbai','yanji','mudanjiang','harbin']}
for name,keys in routes.items():
 coords=';'.join(f'{places[k]["lng"]},{places[k]["lat"]}' for k in keys)
 url=f'https://routing.openstreetmap.de/routed-car/route/v1/driving/{coords}?overview=full&geometries=geojson&steps=false'
 result=subprocess.run(['curl','-fLsS','--max-time','90',url],check=True,capture_output=True)
 data=json.loads(result.stdout)
 if data.get('code')!='Ok' or not data.get('routes'):raise RuntimeError(f'{name}: {data.get("code")}')
 route=data['routes'][0];line=route['geometry']['coordinates']
 if len(line)<100 or any(not(72<=p[0]<=136 and 18<=p[1]<=55) for p in line):raise RuntimeError('Unexpected geometry')
 snap=[round(w['distance'],1) for w in data['waypoints']]
 if max(snap)>5000:raise RuntimeError(f'Waypoint too far from road: {snap}')
 features=[{'type':'Feature','properties':{'kind':'driving','distanceMeters':round(route['distance']),'durationSeconds':round(route['duration'])},'geometry':route['geometry']}]
 for key,point in zip(keys,data['waypoints']):
  features.append({'type':'Feature','properties':{'kind':'stop','key':key,'name':places[key]['name'],'snapDistanceMeters':round(point['distance'],1)},'geometry':{'type':'Point','coordinates':point['location']}})
 out={'type':'FeatureCollection','metadata':{'source':'OSRM / OpenStreetMap','service':'https://routing.openstreetmap.de/','attribution':'© OpenStreetMap contributors, ODbL','generatedAt':datetime.now(timezone.utc).isoformat(),'scope':'Main waypoints in itinerary order; not the full 15-day driven track or live navigation.','legDistancesMeters':[round(x['distance']) for x in route['legs']]},'features':features}
 path=root/'routes'/f'{name}.geojson';path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
 print(name,'points',len(line),'km',round(route['distance']/1000),'max snap m',max(snap),'bytes',path.stat().st_size)
