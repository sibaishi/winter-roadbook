const PLACES={
 jinhua:{name:'金华',lat:29.079,lng:119.647},lanzhou:{name:'兰州',lat:36.061,lng:103.834},wuwei:{name:'武威',lat:37.928,lng:102.638},hami:{name:'哈密',lat:42.819,lng:93.515},urumqi:{name:'乌鲁木齐',lat:43.826,lng:87.617},kuitun:{name:'奎屯',lat:44.426,lng:84.903},sayram:{name:'赛里木湖',lat:44.597,lng:81.163},karamay:{name:'克拉玛依',lat:45.580,lng:84.889},burqin:{name:'布尔津',lat:47.704,lng:86.861},altay:{name:'阿勒泰',lat:47.848,lng:88.139},hemu:{name:'禾木村',lat:48.567,lng:87.426},kanas:{name:'喀纳斯',lat:48.716,lng:87.031},jinan:{name:'济南',lat:36.651,lng:117.120},shenyang:{name:'沈阳',lat:41.806,lng:123.432},jilin:{name:'吉林市',lat:43.838,lng:126.550},changbai:{name:'长白山 · 二道白河',lat:42.424,lng:128.116},yanji:{name:'延吉',lat:42.904,lng:129.506},mudanjiang:{name:'牡丹江',lat:44.551,lng:129.633},harbin:{name:'哈尔滨',lat:45.803,lng:126.535}
};
const LIVE_ROUTES={xinjiang:['jinhua','lanzhou','wuwei','hami','urumqi','kuitun','sayram','karamay','burqin','altay','hemu','kanas'],northeast:['jinhua','jinan','shenyang','jilin','changbai','yanji','mudanjiang','harbin']};
const PHOTO_DATA={xinjiang:[
 {title:'禾木 · 雪中的木屋',note:'冬季实景。景区车辆准入以出发当天公告为准。',url:'./photos/hemu.jpg',source:'https://commons.wikimedia.org/wiki/File:Hemu_Village_in_the_snow.jpg',author:'Leeinm',license:'CC BY-SA 4.0',licenseURL:'https://creativecommons.org/licenses/by-sa/4.0/'},
 {title:'赛里木湖 · 湖山地貌',note:'夏季实景，用于了解湖山格局；不代表冬季冰面状态。',url:'./photos/sayram.jpg',source:'https://commons.wikimedia.org/wiki/File:Sayram_Lake_scenery.jpg',author:'Fumikas Sagisavas',license:'CC0',licenseURL:'https://creativecommons.org/publicdomain/zero/1.0/'}
],northeast:[
 {title:'吉林 · 雾凇',note:'冬季实景。雾凇形成随温度、湿度与风力变化。',url:'./photos/jilin.jpg',source:'https://commons.wikimedia.org/wiki/File:%E5%90%89%E6%9E%97%E9%9B%BE%E5%87%87.jpg',author:'阳之下光',license:'CC BY 3.0',licenseURL:'https://creativecommons.org/licenses/by/3.0/'},
 {title:'长白山 · 冬季山脊',note:'冬季山脊实景。天池能否开放或可见，以当日天气与景区安排为准。',url:'./photos/changbai.jpg',source:'https://commons.wikimedia.org/wiki/File:Heven_Lake_ChangBai_Mountain.jpg',author:'YuZhiChong',license:'CC BY-SA 4.0',licenseURL:'https://creativecommons.org/licenses/by-sa/4.0/'},
 {title:'哈尔滨 · 冰雪夜景',note:'2026年冰雪节实景。2027年布景与开放安排尚待发布。',url:'./photos/harbin.jpg',source:'https://commons.wikimedia.org/wiki/File:Harbin_Ice_%26_Snow_Festival_2026.jpg',author:'Garosio33',license:'CC0',licenseURL:'https://creativecommons.org/publicdomain/zero/1.0/'}
]};
const ROAD_SOURCES={xinjiang:[{title:'新疆交通运输厅',url:'https://jtyst.xinjiang.gov.cn/',desc:'查路况信息与春节出行指南；“新疆路网”微信公众号提供实时路况。'},{title:'高德路线与实时路况',url:'https://www.amap.com/',desc:'查看拥堵、路线建议和沿途补给。官方封路公告优先。'},{title:'交通咨询与救援',url:'tel:12328',desc:'12328交通运输服务热线；新疆高速救援12122。非紧急情况先向服务区或运营方确认。'}],northeast:[{title:'吉林省官方路况动态',url:'https://jtyst.jl.gov.cn/glj/cxfw_7623/zxlkdt/',desc:'查看公路公告；微信“吉行高速”小程序查询高速实时路况。'},{title:'黑龙江省路况信息',url:'https://jt.hlj.gov.cn/jt/c105225/list.shtml',desc:'查看省交通运输厅道路通行与管制信息。'},{title:'高德路线与实时路况',url:'https://www.amap.com/',desc:'查看当日高速、城市路况和驾车路线；景区准入另行核验。'}]};
let realMap=null,mapLayer=null,mapBounds=null,weatherController=null,liveRoute=null;const weatherCache=new Map();
// OSM coordinates are WGS84; Gaode URI requires GCJ02 coordinates inside mainland China.
function gcj(p){const x=p.lng-105,y=p.lat-35,pi=Math.PI;let a=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));a+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;a+=(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3;a+=(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;let b=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));b+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;b+=(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3;b+=(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;const rad=p.lat/180*pi,magic=1-.00669342162296594323*Math.sin(rad)**2,sqrt=Math.sqrt(magic);return {lat:p.lat+a*180/((6378245*(1-.00669342162296594323))/(magic*sqrt)*pi),lng:p.lng+b*180/(6378245/sqrt*Math.cos(rad)*pi)};}
function amap(p,navigate=false){const c=gcj(p);return navigate?`https://uri.amap.com/navigation?to=${c.lng.toFixed(6)},${c.lat.toFixed(6)},${encodeURIComponent(p.name)}&mode=car&src=winter-expedition&callnative=1`:`https://uri.amap.com/marker?position=${c.lng.toFixed(6)},${c.lat.toFixed(6)}&name=${encodeURIComponent(p.name)}&src=winter-expedition&coordinate=gaode&callnative=0`;}
let mapJob=0;
const staticRoutes=new Map();
async function drawMap(){
 const routeKey=current,job=++mapJob,keys=LIVE_ROUTES[routeKey];
 $('#amapRoute').href=amap(PLACES[keys[keys.length-1]]);
 if(!window.L){$('#mapStatus').textContent='地图组件加载失败，可使用高德地图链接。';return;}
 if(!realMap){
  realMap=L.map('routeCanvas',{scrollWheelZoom:false}).setView([40,106],4);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(realMap);
  const tileStatus=document.createElement('div');tileStatus.id='mapTileStatus';tileStatus.className='mini';tileStatus.setAttribute('role','status');$('#mapStatus').after(tileStatus);
  tiles.on('tileerror',()=>{tileStatus.textContent='部分地图底图未加载，公路线路仍可单独查看。';});
  tiles.on('load',()=>{tileStatus.textContent='';});
  mapLayer=L.layerGroup().addTo(realMap);
 }
 mapLayer.clearLayers();
 mapBounds=L.latLngBounds(keys.map(k=>[PLACES[k].lat,PLACES[k].lng]));
 realMap.fitBounds(mapBounds,{padding:[30,30]});
 $('#mapStatus').textContent='正在载入预生成公路路线…';
 try{
  if(!staticRoutes.has(routeKey)){
   staticRoutes.set(routeKey,fetch(`./routes/${routeKey}.geojson?v=1`).then(response=>{if(!response.ok)throw Error('route file');return response.json();}).catch(error=>{staticRoutes.delete(routeKey);throw error;}));
  }
  const data=await staticRoutes.get(routeKey);
  if(job!==mapJob)return;
  if(data.type!=='FeatureCollection'||!data.features?.some(f=>f.geometry?.type==='LineString'))throw Error('invalid geometry');
  const lines=L.geoJSON(data,{filter:f=>f.geometry.type==='LineString',style:{color:'#49634f',weight:4,opacity:.95,lineCap:'round',lineJoin:'round'}}).addTo(mapLayer);
  // A pale casing keeps the path legible against both light and dark map areas.
  const casing=L.geoJSON(data,{filter:f=>f.geometry.type==='LineString',style:{color:'#f0efeb',weight:7,opacity:.85,interactive:false}}).addTo(mapLayer);casing.bringToBack();
  data.features.filter(f=>f.geometry?.type==='Point').forEach(feature=>{
   const point=feature.geometry.coordinates,key=feature.properties.key,p=PLACES[key];if(!p)return;
   L.circleMarker([point[1],point[0]],{radius:5,color:'#fff',weight:2,fillColor:'#49634f',fillOpacity:1}).bindPopup(`<strong>${p.name}</strong><p>规划公路参考点${key==='sayram'?' · 湖区附近道路':''}</p><a href="${amap(p,true)}" target="_blank" rel="noopener">高德驾车导航</a>`).addTo(mapLayer);
  });
  mapBounds=lines.getBounds();realMap.fitBounds(mapBounds,{padding:[30,30]});
  $('#mapStatus').textContent='已载入预生成公路路线 · 主要途经线路，非实时导航';
 }catch(error){
  if(job!==mapJob)return;
  $('#mapStatus').textContent='公路路线文件加载失败。请刷新重试，或使用高德地图；未以直线替代。';
 }
}
$('#fitMap').onclick=()=>{if(realMap&&mapBounds)realMap.fitBounds(mapBounds,{padding:[30,30]});};
function weatherText(code){if(code===0)return'晴';if(code<=3)return'多云 / 阴';if(code===45||code===48)return'雾';if(code>=71&&code<=77||code===85||code===86)return'降雪';if(code>=95)return'雷暴';if(code>=51&&code<=67||code>=80&&code<=82)return'降雨';return'天气变化';}
function number(v,unit=''){return Number.isFinite(v)?`${Math.round(v*10)/10}${unit}`:'暂无数据';}
function paintWeather(data,p,queriedAt){const c=data.current,d=data.daily;if(!c||!d||!Array.isArray(d.time))throw new Error('Invalid weather response');$('#currentWeather').innerHTML=`<div class="weather-main"><div class="weather-place">${p.name}<span>${weatherText(c.weather_code)}</span></div><div class="temperature">${number(c.temperature_2m)}<span>°C</span></div><div class="weather-feels">体感 ${number(c.apparent_temperature,'°C')}</div></div><div class="weather-wind"><div><span>风速</span><strong>${number(c.wind_speed_10m)}<small>m/s</small></strong></div><div><span>阵风</span><strong>${number(c.wind_gusts_10m)}<small>m/s</small></strong></div></div>`;$('#forecast').innerHTML=d.time.map((t,i)=>`<article><strong>${t.slice(5)}</strong><p>${number(d.temperature_2m_min[i])} ~ ${number(d.temperature_2m_max[i])}°C</p><p>降雪 ${number(d.snowfall_sum[i],' cm')}<br>阵风 ${number(d.wind_gusts_10m_max[i],' m/s')}</p><div class="mini">日出 ${d.sunrise[i]?.slice(11,16)||'—'}<br>日落 ${d.sunset[i]?.slice(11,16)||'—'}</div></article>`).join('');$('#weatherStatus').textContent=`数据 ${c.time.slice(5).replace('T',' ')} · 更新 ${new Date(queriedAt).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,hour:'2-digit',minute:'2-digit'})} · 北京时间`;$('#weatherStatus').title=`数据有效时间 ${c.time} / 查询时间 ${new Date(queriedAt).toISOString()}`;}
async function loadWeather(force=false){const key=$('#weatherPlace').value,p=PLACES[key];$('#weatherStatus').classList.remove('error-note');$('#pointNavigation').href=amap(p,true);if(weatherController)weatherController.abort();weatherController=null;const cached=weatherCache.get(key);if(!force&&cached&&Date.now()-cached.time<600000){paintWeather(cached.data,p,cached.time);return;}const controller=new AbortController();weatherController=controller;const timer=setTimeout(()=>controller.abort(),15000);$('#refreshWeather').disabled=true;$('#weatherStatus').textContent=`正在查询 ${p.name} 的天气…`;$('#currentWeather').innerHTML='';$('#forecast').innerHTML='';try{const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:p.lat,longitude:p.lng,current:'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m',daily:'temperature_2m_max,temperature_2m_min,snowfall_sum,wind_gusts_10m_max,sunrise,sunset',forecast_days:'7',wind_speed_unit:'ms',timezone:'Asia/Shanghai'});const res=await fetch(u,{signal:controller.signal});if(!res.ok)throw new Error('Weather unavailable');const data=await res.json();if(weatherController!==controller)return;const time=Date.now();paintWeather(data,p,time);weatherCache.set(key,{data,time});}catch(e){if(weatherController!==controller)return;$('#weatherStatus').textContent='天气查询未成功，请刷新重试。当前没有可用天气数据，勿据此判断道路安全。';$('#weatherStatus').classList.add('error-note');}finally{clearTimeout(timer);if(weatherController===controller){$('#refreshWeather').disabled=false;weatherController=null;}}}
$('#refreshWeather').onclick=()=>{$('#weatherStatus').classList.remove('error-note');loadWeather(true);};$('#weatherPlace').onchange=()=>loadWeather();
function renderPhotos(){const photos=PHOTO_DATA[current];$('.hero').style.setProperty('--hero-photo',`url('${current==='xinjiang'?'./photos/hemu.jpg':'./photos/changbai.jpg'}')`);$('.hero').style.backgroundImage=`linear-gradient(180deg,rgba(3,7,11,.35),rgba(3,7,11,.90)),url('${current==='xinjiang'?'./photos/hemu.jpg':'./photos/changbai.jpg'}')`;$('#heroPhotoCredit').innerHTML=`<a href='${current==='xinjiang'?PHOTO_DATA.xinjiang[0].source:PHOTO_DATA.northeast[1].source}' target='_blank' rel='noopener'>封面实景：${current==='xinjiang'?'Leeinm · 禾木':'YuZhiChong · 长白山'} / CC BY-SA 4.0 · 等比裁切</a>`;renderDestinationPhotos();}
const DEST_PHOTOS={xinjiang:[1,0,0],northeast:[0,1,2]};
function renderDestinationPhotos(){const d=DATA[current];$('#destinations').innerHTML=d.dest.map((x,i)=>{const p=PHOTO_DATA[current][DEST_PHOTOS[current][i]];let label=current==='xinjiang'?(i===0?'赛里木湖 · 夏季实景':i===1?'阿勒泰地区 · 禾木实景':'禾木村 · 冬季实景'):(i===0?'吉林雾凇 · 冬季实景':i===1?'长白山山脊 · 冬季实景':'哈尔滨冰雪节 · 2026年实景');return `<article class="destination-photo"><div class="destination-image"><img src="${p.url}" alt="${label}" loading="lazy" width="960" height="640" style="object-position:${current==='xinjiang'&&i===1?'center top':'center'}"><div class="destination-caption"><div class="kicker">${x[1]}</div><h3>${x[0]}</h3></div></div><div class="destination-body"><p>${x[2]}</p><div class="destination-season">${label}</div><details class="destination-credit"><summary>摄影与授权</summary><p>${p.author} · <a href="${p.source}" target="_blank" rel="noopener">原图</a> · <a href="${p.licenseURL}" target="_blank" rel="noopener">${p.license}</a> · 等比裁切。拍摄状态不代表2027出发当天。</p></details></div></article>`;}).join('');}

function roadStorage(){try{return JSON.parse(localStorage.getItem('road-verified-'+current)||'null');}catch{return null;}}
function renderRoadCheck(){const time=roadStorage();$('#roadChecked').checked=Boolean(time&&Date.now()-time<86400000);$('#roadCheckedTime').textContent=time?`你上次核验：${new Date(time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})} · 超过24小时请重新核验。`:'尚未记录核验时间。此记录不代表系统确认畅通。';}
$('#roadChecked').onchange=()=>{try{if($('#roadChecked').checked)localStorage.setItem('road-verified-'+current,JSON.stringify(Date.now()));else localStorage.removeItem('road-verified-'+current);}catch{}renderRoadCheck();};
function renderLive(){if(liveRoute===current)return;liveRoute=current;drawMap();$('#weatherPlace').innerHTML=LIVE_ROUTES[current].map(k=>`<option value="${k}">${PLACES[k].name}</option>`).join('');$('#weatherPlace').value=current==='xinjiang'?'altay':'jilin';$('#roadSources').innerHTML=ROAD_SOURCES[current].map(x=>`<article><div class="source-copy"><strong>${x.title}</strong><p>${x.desc}</p></div><a class="link-button" href="${x.url}" target="_blank" rel="noopener">${x.url.startsWith('tel:')?'拨打':'查询'}</a></article>`).join('');renderRoadCheck();renderPhotos();loadWeather();}
const originalRenderRoute=renderRoute;renderRoute=function(){originalRenderRoute();renderDestinationPhotos();renderLive();};renderLive();
