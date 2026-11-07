/* Three-dimensional roadbook controller. The original itinerary stays the single source of truth. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),G=RoadbookGeo,panel=$('routeGlobe'),stage=$('globeStage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const routeCache=new Map();let selected=false,inView=true,engine=null,loading=false,playing=false,advancing=false,route=null,routeData=null,day=0,progress=0,dayPath=[],dayLengths=[],place=null,terrainJob=0,terrainAbort=null,loadJob=0,worldPromise=null,terrainMode=false,globeFailed=false;
 const title=key=>key==='xinjiang'?'北疆雪原':'东北雪境';
 const active=()=>({route:typeof current==='string'?current:'xinjiang',day:typeof selectedDay==='number'?selectedDay:0});
 const status=text=>{$('globeStatus').textContent=text;};
 const timeout=(promise,ms=18000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('网络请求超时')),ms);promise.then(x=>{clearTimeout(timer);resolve(x);},e=>{clearTimeout(timer);reject(e);});});
 function pause(){playing=false;$('globePlay').textContent='播放十五天';$('globePlay').setAttribute('aria-pressed','false');$('globeQuickPlay').textContent='播放';$('globeQuickPlay').setAttribute('aria-pressed','false');engine?.animate(false);}
 function cancelTerrain(){terrainJob++;terrainAbort?.abort();terrainAbort=null;$('globeTerrain').disabled=false;}
 function overview(){cancelTerrain();terrainMode=false;engine?.overview();$('globeTerrainLoading').hidden=true;$('globeViewLabel').textContent='全程定位';$('globeLegendLabel').textContent='当天参考范围 / 暖色光点为播放位置';if(routeData){const n=DATA[route].days[day];$('globeHUD').textContent='D'+String(day+1).padStart(2,'0')+' · '+n[0];}$('globeTerrainStatus').textContent='';status('全程道路参考 · 拖动旋转，点击目的地拉近查看');}
 function setVisible(value){selected=value;panel.closest('.grid')?.classList.toggle('map-grid-3d',value);$('viewMap').setAttribute('aria-pressed',String(!value));$('viewGlobe').setAttribute('aria-pressed',String(value));$('routeCanvas').hidden=value;panel.hidden=!value;
  for(const node of [document.querySelector('.map-tools'),$('mapStatus'),$('mapTileStatus')])if(node)node.hidden=value;
  if(value){if(!engine&&!loading)init();else{engine?.setVisible(inView);if(place&&!terrainMode&&!$('globeTerrainLoading').hidden)showTerrain({scroll:false});}}else{pause();cancelTerrain();engine?.setVisible(false);window.dispatchEvent(new Event('resize'));}
 }
 async function importThree(){let error;for(const url of ['./vendor/three/three.module.min.js','https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js','https://unpkg.com/three@0.180.0/build/three.module.js']){try{return await timeout(import(url),15000);}catch(e){error=e;}}throw error;}
 async function init(){
  if(loading||engine)return;loading=true;globeFailed=false;$('globeRetry').hidden=true;status('首次载入三维引擎与地理轮廓…');
  const placeholder=document.createElement('div');placeholder.className='atlas-loader';const logo=document.createElement('strong');logo.textContent='N / E';const copy=document.createElement('span');copy.textContent='把旅程放回地理之中';placeholder.append(logo,copy);stage.replaceChildren(placeholder);
  try{
   const [T,module]=await Promise.all([importThree(),import('./route-engine.mjs?v=4')]);
   engine=module.createEngine(T,stage,{onPick:focusKey,onFatal:fail,onOverview:overview,reduced});engine.setVisible(selected&&inView&&$('tripMode').hidden);
   if(!worldPromise)worldPromise=timeout(fetch('./data/world.json?v=1').then(r=>{if(!r.ok)throw Error('地理轮廓未载入');return r.json();})).catch(e=>{worldPromise=null;throw e;});
   worldPromise.then(data=>engine?.setWorld(data)).catch(()=>{$('globeRetry').hidden=false;});
   loading=false;await loadRoute(active().route);
  }catch(e){loading=false;fail();}
 }
 function fail(){globeFailed=true;pause();cancelTerrain();engine?.dispose();engine=null;loading=false;status('三维组件未能载入，请重试或切回二维地图。原路书与清单不受影响。');$('globeRetry').hidden=false;$('globePlay').disabled=true;$('globeQuickPlay').disabled=true;}
 async function loadRoute(key){
  const job=++loadJob;route=key;routeData=null;pause();cancelTerrain();terrainMode=false;place=null;$('globePlace').hidden=true;$('globeTerrainStatus').textContent='';$('globeViewLabel').textContent='全程视角';$('globeTitle').textContent=key==='xinjiang'?'北疆 · 走进阿尔泰山谷':'东北 · 走进长白山地';$('globePlay').disabled=true;$('globeQuickPlay').disabled=true;renderDestinations();status('正在读取公路参考线路…');
  try{
   if(!routeCache.has(key))routeCache.set(key,timeout(fetch(`./routes/${key}.geojson?v=1`).then(r=>{if(!r.ok)throw Error('route');return r.json();})).catch(e=>{routeCache.delete(key);throw e;}));
   const data=await routeCache.get(key);if(job!==loadJob)return;
   if(!data.features?.some(f=>f.geometry?.type==='LineString'&&f.geometry.coordinates.length>1))throw Error('Invalid route');
   routeData=data;engine?.setRoute(data);day=active().day;paintDay();$('globePlay').disabled=false;$('globeQuickPlay').disabled=false;status('全程道路参考 · 点击目的地拉近，或按十五天计划播放');if(selected){const opening=RoutePlaces[key].find(p=>p.key===(key==='xinjiang'?'hemu':'changbai'));if(opening)focus(opening,{scroll:false});}
  }catch(e){if(job===loadJob){status('公路线路暂时未载入，请重新加载。没有用直线替代道路。');$('globeRetry').hidden=false;}}
 }
 function renderDestinations(){const container=$('globeDestinations');container.replaceChildren();for(const p of RoutePlaces[route]){const b=document.createElement('button');b.type='button';b.textContent=p.name+' ↗';b.dataset.place=p.key;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>focus(p));container.append(b);}}
 function focusKey(key){const known=RoutePlaces[route].find(p=>p.key===key);if(known){focus(known);return;}const feature=routeData?.features.find(f=>f.geometry.type==='Point'&&f.properties.key===key);if(feature)focus({key,name:feature.properties.name,center:feature.geometry.coordinates,extent:.45,tag:'沿途停靠点',text:'此处为公路参考点。运输日的实际停靠与住宿位置需按当天进度决定。',days:[]});}
 function focus(p,{scroll=true}={}){pause();cancelTerrain();terrainMode=false;place=p;engine?.focus(p);$('globeViewLabel').textContent=p.name+' / 地球视角';$('globePlace').hidden=false;$('globePlace').classList.toggle('no-photo',!p.photo);$('globePlaceName').textContent=p.name;$('globePlaceTag').textContent=p.tag;$('globePlaceText').textContent=p.text;$('globeTerrainStatus').textContent='';
  const img=$('globePlaceImage');if(p.photo){img.src=p.photo;img.alt=p.name+' · '+p.season;const credit=$('globePhotoCredit');credit.replaceChildren(document.createTextNode(p.season+' · '+p.credit+' · '));for(const [text,url] of [['原图',p.source],['许可',p.license]]){const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener';credit.append(a,document.createTextNode(' '));}}else{img.removeAttribute('src');$('globePhotoCredit').replaceChildren();}
  $('globePlaceDays').textContent=p.days.length?'计划 D'+p.days.map(d=>String(d+1).padStart(2,'0')).join(' / D'):'实际停靠以当日行程为准';
  for(const b of $('globeDestinations').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.place===p.key));status('正在走进 '+p.name+' 的真实地形');showTerrain({scroll});
 }
 async function showTerrain({scroll=true}={}){
  if(!place||!engine)return;pause();cancelTerrain();const target=place,job=terrainJob,controller=new AbortController();terrainAbort=controller;$('globeTerrain').disabled=true;
  $('globeTerrainLoading').hidden=false;$('globeTerrainRetry').hidden=true;$('globeTerrainLoadingTitle').textContent=target.name+' · '+target.tag;$('globeTerrainLoadingText').textContent='正在读取真实高程，稍后将切换为可旋转的山地沙盘。';
  $('globeTerrainLoading').style.backgroundImage=target.photo?`linear-gradient(90deg,rgba(20,22,22,.82),rgba(20,22,22,.3)),url('${target.photo}')`:'none';
  $('globeHUD').textContent=target.name+' · 真实高程预览';$('globeLegendLabel').textContent='真实高程 / 每 200 m 等高线';
  const timer=setTimeout(()=>controller.abort(),25000);$('globeTerrainStatus').textContent='正在读取真实高程瓦片…';
  try{const {loadTerrain}=await import('./route-terrain.mjs?v=2');const data=await loadTerrain(target,{signal:controller.signal,onProgress:(a,b)=>{if(job===terrainJob)$('globeTerrainStatus').textContent=`已读取 ${a} / ${b} 块真实高程瓦片…`;}});
   if(job!==terrainJob||!selected||!engine)return;engine.terrain(data);terrainMode=true;$('globeTerrainLoading').hidden=true;$('globeViewLabel').textContent=target.name+' / 真实地形';
   $('globeTerrainStatus').textContent=`真实高程约 ${Math.round(data.min)}–${Math.round(data.max)} m · 范围约 ${Math.round(data.widthKm)} × ${Math.round(data.heightKm)} km · 垂直夸张 1.8×。高程设色，不代表实时积雪。`;
   status('真实地形已载入 · 拖动查看山谷起伏，双指或按钮缩放');if(scroll)stage.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
  }catch(e){if(job===terrainJob){$('globeTerrainRetry').hidden=false;$('globeTerrainLoadingText').textContent='真实高程暂时未能载入。可重试，或先看全程定位。背景是该地点的实景照片，并非三维效果。';$('globeTerrainStatus').textContent='高程未能载入：请重试。没有使用模拟山体替代。';}}
  finally{clearTimeout(timer);if(job===terrainJob){terrainAbort=null;$('globeTerrain').disabled=false;}}
 }
 function paintDay(){
  const n=DATA[route].days[day],plan=TripModel.plans[route][day];$('globeHUD').textContent='D'+String(day+1).padStart(2,'0')+' · '+n[0]+' / '+n[2];$('globeDayTitle').textContent=n[0];$('globeDayNumber').textContent='DAY '+String(day+1).padStart(2,'0')+' / 15';$('globeDayType').textContent=n[2];$('globeDayKm').textContent=n[1]+' · 计划估算';$('globeDaySleep').textContent='落脚：'+plan[5];$('globeDayRisk').textContent='关注：'+n[4];$('globeNext').textContent=day<14?'下一天：'+DATA[route].days[day+1][0]:'抵达金华 · 完成本轮旅程';
  const segment=G.daily(routeData,plan);dayPath=segment.coordinates;dayLengths=G.lengths(dayPath);progress=0;$('globeProgress').value=0;engine?.setDay(dayPath,0);
  $('globeDayNote').textContent=segment.stationary?'停留 / 休整日：标记停留在目的地，不虚构城区或景区内移动轨迹。':segment.uncertain?'运输范围示意：途经城市已确定，具体停靠点待定。高亮为参考道路范围，不是当天完整行驶记录。':'高亮对应计划起终点之间的预生成参考道路；返程沿参考道路反向示意，并非独立核验的冬季返程导航。';
  for(const b of $('globeDays').querySelectorAll('button'))b.setAttribute('aria-current',String(Number(b.dataset.day)===day));$('globePrevious').disabled=day===0;$('globeNextDay').disabled=day===14;
 }
 function select(index,automated=false){index=Math.max(0,Math.min(14,index));if(!automated){pause();if(terrainMode||terrainAbort)overview();}advancing=automated;try{selectDay(index);}finally{advancing=false;}}
 function sync(){const a=active();if(a.route!==route){if(engine)loadRoute(a.route);return;}if(a.day!==day&&routeData){if(!advancing){pause();if(terrainMode||terrainAbort)overview();}day=a.day;paintDay();}}
 function tick(dt){if(!playing||!routeData)return;const result=G.advance(day,progress,dt,Number($('globeSpeed').value),dayPath.length<2);
  if(result.day!==day){select(result.day,true);return;}
  progress=result.progress;if(result.ended){pause();status('十五天播放完成，已回到金华。');}
  $('globeProgress').value=Math.round(progress*1000);engine?.move(dayPath,dayLengths,progress);
 }
 function play(){if(!engine||!routeData)return;if(playing){pause();return;}if(terrainMode||terrainAbort)overview();if(day===14&&progress>=1)select(0);playing=true;$('globePlay').textContent='暂停播放';$('globePlay').setAttribute('aria-pressed','true');$('globeQuickPlay').textContent='暂停';$('globeQuickPlay').setAttribute('aria-pressed','true');engine.animate(true,tick);stage.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});}
 for(let i=0;i<15;i++){const b=document.createElement('button');b.type='button';b.textContent='D'+String(i+1).padStart(2,'0');b.dataset.day=i;b.setAttribute('aria-label','查看第'+(i+1)+'天');b.addEventListener('click',()=>select(i));$('globeDays').append(b);}
 $('viewMap').addEventListener('click',()=>setVisible(false));$('viewGlobe').addEventListener('click',()=>setVisible(true));$('globePlay').addEventListener('click',play);$('globeQuickPlay').addEventListener('click',play);
 $('globePrevious').addEventListener('click',()=>select(day-1));$('globeNextDay').addEventListener('click',()=>select(day+1));$('globeReset').addEventListener('click',overview);
 $('globeZoomIn').addEventListener('click',()=>engine?.dolly(1.15));$('globeZoomOut').addEventListener('click',()=>engine?.dolly(1/1.15));$('globeTerrain').addEventListener('click',()=>showTerrain());$('globeTerrainRetry').addEventListener('click',()=>showTerrain());$('globeTerrainFallback').addEventListener('click',overview);$('globeReturn').addEventListener('click',overview);
 $('globeProgress').addEventListener('input',()=>{pause();progress=Number($('globeProgress').value)/1000;engine?.move(dayPath,dayLengths,progress);});
 $('globeOpenDay').addEventListener('click',()=>{pause();select(day);setTrip(true);});
 $('globeRetry').addEventListener('click',()=>{pause();engine?.dispose();engine=null;loading=false;init();});
 $('globeFullscreen').hidden=!panel.requestFullscreen;$('globeFullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await panel.requestFullscreen();}catch{status('当前浏览器未允许全屏，可以继续使用内嵌视图。');}});
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;engine?.setVisible(selected&&inView&&$('tripMode').hidden);}).observe(panel);
 document.addEventListener('visibilitychange',()=>engine?.setVisible(selected&&inView&&$('tripMode').hidden&&!document.hidden));window.addEventListener('pagehide',()=>{pause();cancelTerrain();engine?.setVisible(false);});window.addEventListener('pageshow',()=>engine?.setVisible(selected&&inView&&$('tripMode').hidden));
 // Existing route switches, 15-day rows and Trip Mode all call these same functions.
 const original=renderRoute;renderRoute=function(){original();sync();};
 const originalTrip=setTrip;setTrip=function(open){if(open){pause();engine?.setVisible(false);}originalTrip(open);if(!open)engine?.setVisible(selected&&inView&&$('tripMode').hidden);};
 if(reduced)$('globeMotionNote').textContent='已遵循减少动态效果偏好：镜头直接定位，不自动播放。';
})();
