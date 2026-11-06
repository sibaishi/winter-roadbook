/* Optional, click-to-load Three.js view. Existing Leaflet navigation remains independent. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), panel=$('routeGlobe'), stage=$('globeStage'), status=$('globeStatus');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let selected=false, sceneState=null, loading=false, failed=false, playing=false, visible=true, alive=true, frame=0, routeJob=0, progress=0, last=0;
 let routeKey='xinjiang',routeData=null,threePromise=null;
 const cache=new Map();
 function timeout(promise){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout')),20000);promise.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
 const engineURL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
 const currentRoute=()=>document.querySelector('.route-switch [data-route].active')?.dataset.route||'xinjiang';
 const title=key=>key==='xinjiang'?'北疆雪原':'东北雪境';
 const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;};
 function choose(globe){
  selected=globe;
  $('viewMap').setAttribute('aria-pressed',String(!globe));$('viewGlobe').setAttribute('aria-pressed',String(globe));
  $('routeCanvas').hidden=globe;panel.hidden=!globe;
  for(const el of [document.querySelector('.map-tools'),$('mapStatus'),$('mapTileStatus')])if(el)el.hidden=globe;
  if(globe){if(failed){status.textContent='三维组件未能载入，请重试或切回二维地图。';}else init();requestFrame();}
  else {stop();window.dispatchEvent(new Event('resize'));}
 }
 function reportError(){failed=true;loading=false;playing=false;stop();$('globePlay').textContent='播放路线';$('globeRetry').hidden=false;status.textContent='三维视图暂时无法加载，可能是网络或浏览器不支持。二维地图仍可正常使用。';}
 function disposeRoute(){
  if(!sceneState)return;
  const {group,labels}=sceneState;
  for(const child of [...group.children]){group.remove(child);child.geometry?.dispose();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose());else child.material?.dispose();}
  labels.replaceChildren();sceneState.markers=[];sceneState.path=[];
 }
 function destroy(){
  stop();if(!sceneState)return;disposeRoute();sceneState.renderer.dispose();sceneState.renderer.domElement.remove();sceneState.labels.remove();sceneState.resize.disconnect();
  sceneState.sphere.geometry.dispose();sceneState.sphere.material.dispose();
  for(const child of sceneState.grid.children){child.geometry.dispose();child.material.dispose();}
  sceneState=null;
 }
 function point(T,lng,lat,r=3.53){const a=lat*Math.PI/180,b=lng*Math.PI/180;return new T.Vector3(r*Math.cos(a)*Math.sin(b),r*Math.sin(a),r*Math.cos(a)*Math.cos(b));}
 function repaint(){
  if(!sceneState)return;const s=sceneState,night=document.documentElement.dataset.theme==='night';
  s.renderer.setClearColor(night?0x343636:0xe6e5df,1);s.sphere.material.color.setHex(night?0x262c2d:0xc8ceca);
  for(const l of s.grid.children)l.material.color.setHex(night?0x495455:0xa4aeaa);
  s.routeColor=night?0xf0d5a1:0x665339;
  for(const child of s.group.children)if(child.userData.route)child.material.color.setHex(s.routeColor);
  requestFrame();
 }
 function resetCamera(){
  if(!sceneState)return;
  const s=sceneState;s.yaw=0;s.pitch=0;s.zoom=1;
  const coords=routeData?.features.find(f=>f.geometry.type==='LineString')?.geometry.coordinates||[[100,40]];
  const lons=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);
  s.center=point(s.T,(Math.min(...lons)+Math.max(...lons))/2,(Math.min(...lats)+Math.max(...lats))/2,1).normalize();
  requestFrame();
 }
 async function loadRoute(){
  const job=++routeJob,key=currentRoute();routeKey=key;playing=false;progress=0;$('globePlay').textContent='播放路线';$('globePlay').disabled=true;
  $('globeTitle').textContent=title(key)+' / 三维路线';status.textContent='正在读取公路线路…';
  try{
   if(!cache.has(key))cache.set(key,timeout(fetch(`./routes/${key}.geojson?v=1`)).then(r=>{if(!r.ok)throw Error('route');return r.json();}).catch(e=>{cache.delete(key);throw e;}));
   const data=await cache.get(key);if(job!==routeJob||!alive)return;
   if(!data.features?.some(f=>f.geometry.type==='LineString'&&f.geometry.coordinates.length>1))throw Error('geometry');
   routeData=data;if(sceneState)buildRoute();
  }catch(e){if(job===routeJob)reportError();}
 }
 function buildRoute(){
  if(!sceneState||!routeData)return;disposeRoute();const s=sceneState,T=s.T;
  const coords=routeData.features.find(f=>f.geometry.type==='LineString').geometry.coordinates;
  // Keep the road geometry; sampling limits GPU work without inventing straight waypoint connections.
  const stride=Math.max(1,Math.ceil(coords.length/1800));const sampled=coords.filter((_,i)=>i%stride===0);if(sampled.at(-1)!==coords.at(-1))sampled.push(coords.at(-1));
  const path=sampled.map(c=>point(T,c[0],c[1]));s.path=path;s.lengths=[0];
  for(let i=1;i<path.length;i++)s.lengths.push(s.lengths[i-1]+path[i].distanceTo(path[i-1]));
  const geometry=new T.BufferGeometry().setFromPoints(path),material=new T.LineBasicMaterial({color:s.routeColor});
  const line=new T.Line(geometry,material);line.userData.route=true;s.group.add(line);
  const points=routeData.features.filter(f=>f.geometry.type==='Point');
  points.forEach((f,i)=>{
   const c=f.geometry.coordinates,p=point(T,c[0],c[1],3.55),dot=new T.Mesh(new T.SphereGeometry(.035,10,8),new T.MeshBasicMaterial({color:s.routeColor}));dot.position.copy(p);dot.userData.route=true;s.group.add(dot);
   const key=f.properties.key,label=document.createElement('span');
   const names={jinhua:'金华',lanzhou:'兰州',wuwei:'武威',hami:'哈密',urumqi:'乌鲁木齐',kuitun:'奎屯',sayram:'赛里木湖',karamay:'克拉玛依',burqin:'布尔津',altay:'阿勒泰',hemu:'禾木',kanas:'喀纳斯',jinan:'济南',shenyang:'沈阳',jilin:'吉林市',changbai:'长白山',yanji:'延吉',mudanjiang:'牡丹江',harbin:'哈尔滨'};
   label.textContent=names[key]||f.properties.name||'途经点';s.labels.append(label);s.markers.push({p,label,priority:i===0||i===points.length-1});
  });
  s.traveler=new T.Mesh(new T.SphereGeometry(.065,12,10),new T.MeshBasicMaterial({color:0xe98748}));s.group.add(s.traveler);s.traveler.position.copy(path[0]);
  resetCamera();$('globePlay').disabled=false;$('globeRetry').hidden=true;status.textContent=title(routeKey)+' · 拖动旋转，滚轮或按钮缩放';requestFrame();
 }
 function requestFrame(){if(selected&&sceneState&&visible&&!document.hidden&&!failed&&!frame)frame=requestAnimationFrame(render);}
 function render(now){
  frame=0;if(!sceneState||!selected||!visible||document.hidden||failed)return;
  const s=sceneState,T=s.T;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const center=s.center.clone().applyAxisAngle(new T.Vector3(0,1,0),s.yaw);const right=new T.Vector3().crossVectors(center,new T.Vector3(0,1,0)).normalize();center.applyAxisAngle(right,s.pitch);
  s.camera.position.copy(center.multiplyScalar(10/s.zoom));s.camera.lookAt(0,0,0);s.camera.updateMatrixWorld();
  if(playing&&s.path.length>1){progress=(progress+dt/35)%1;const target=progress*s.lengths.at(-1);let i=1;while(i<s.lengths.length-1&&s.lengths[i]<target)i++;const length=s.lengths[i]-s.lengths[i-1];s.traveler.position.lerpVectors(s.path[i-1],s.path[i],length?(target-s.lengths[i-1])/length:0);}
  s.renderer.render(s.scene,s.camera);
  const used=[];for(const {p,label,priority} of [...s.markers].sort((a,b)=>Number(b.priority)-Number(a.priority))){
   const v=p.clone().project(s.camera),x=(v.x+1)*s.width/2,y=(1-v.y)*s.height/2-10;
   const front=p.dot(s.camera.position)>3.55*3.55;
   const collision=used.some(q=>Math.abs(q.x-x)<75&&Math.abs(q.y-y)<25);
   const show=front&&v.z<1&&x>35&&x<s.width-35&&y>25&&y<s.height&&!collision;
   label.hidden=!show;if(show){label.style.left=x+'px';label.style.top=y+'px';used.push({x,y});}
  }
  if(playing)requestFrame();else last=0;
 }
 async function init(){
  if(sceneState||loading||failed)return;loading=true;status.textContent='首次载入三维组件…';
  try{
   if(!threePromise)threePromise=timeout(import(engineURL)).catch(e=>{threePromise=null;throw e;});
   const T=await threePromise;if(!alive)return;
   const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,60),sphere=new T.Mesh(new T.SphereGeometry(3.5,64,40),new T.MeshStandardMaterial({roughness:.92,metalness:0}));scene.add(sphere);
   scene.add(new T.AmbientLight(0xffffff,2));const light=new T.DirectionalLight(0xffffff,2.2);light.position.set(2,6,8);scene.add(light);
   const grid=new T.Group();scene.add(grid);const addGrid=pts=>grid.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({transparent:true,opacity:.35})));
   for(let lat=-60;lat<=75;lat+=15)addGrid(Array.from({length:145},(_,i)=>point(T,i*2.5,lat,3.505)));
   for(let lng=0;lng<360;lng+=15)addGrid(Array.from({length:73},(_,i)=>point(T,lng,-90+i*2.5,3.505)));
   const group=new T.Group();scene.add(group);const labels=document.createElement('div');labels.className='globe-labels';labels.setAttribute('aria-hidden','true');
   stage.replaceChildren(renderer.domElement,labels);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','三维路线地球。方向键旋转，加减键缩放，R重置。');
   const resize=new ResizeObserver(()=>{if(!sceneState)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;sceneState.width=w;sceneState.height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestFrame();});
   sceneState={T,renderer,scene,camera,sphere,grid,group,labels,resize,markers:[],path:[],center:point(T,100,40,1),yaw:0,pitch:0,zoom:1,width:1,height:1};resize.observe(stage);
   renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();reportError();});
   let drag=null;const canvas=renderer.domElement;
   canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
   canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;sceneState.yaw-=(e.clientX-drag.x)*.006;sceneState.pitch=Math.max(-.8,Math.min(.8,sceneState.pitch+(e.clientY-drag.y)*.006));drag.x=e.clientX;drag.y=e.clientY;requestFrame();});
   const end=()=>{drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
   canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.1:1/1.1);},{passive:false});
   canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','r','R'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')sceneState.yaw-=.12;if(e.key==='ArrowRight')sceneState.yaw+=.12;if(e.key==='ArrowUp')sceneState.pitch=Math.max(-.8,sceneState.pitch-.12);if(e.key==='ArrowDown')sceneState.pitch=Math.min(.8,sceneState.pitch+.12);if(['+','='].includes(e.key))zoom(1.1);if(e.key==='-')zoom(1/1.1);if(['r','R'].includes(e.key))resetCamera();requestFrame();});
   loading=false;repaint();await loadRoute();
  }catch(e){destroy();reportError();}
 }
 function zoom(factor){if(sceneState){sceneState.zoom=Math.max(.7,Math.min(1.75,sceneState.zoom*factor));requestFrame();}}
 $('viewMap').addEventListener('click',()=>choose(false));$('viewGlobe').addEventListener('click',()=>choose(true));
 $('globeZoomIn').addEventListener('click',()=>zoom(1.15));$('globeZoomOut').addEventListener('click',()=>zoom(1/1.15));$('globeReset').addEventListener('click',()=>{progress=0;if(sceneState?.traveler&&sceneState.path.length)sceneState.traveler.position.copy(sceneState.path[0]);resetCamera();});
 $('globePlay').addEventListener('click',()=>{playing=!playing;$('globePlay').textContent=playing?'暂停播放':'播放路线';requestFrame();});
 $('globeRetry').addEventListener('click',()=>{failed=false;destroy();init();});
 new MutationObserver(repaint).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 new MutationObserver(()=>{const key=currentRoute();if(key!==routeKey){routeKey=key;if(selected||sceneState)loadRoute();}}).observe(document.querySelector('.route-switch'),{subtree:true,attributes:true,attributeFilter:['class']});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestFrame();else stop();});observer.observe(panel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else requestFrame();});
 window.addEventListener('pagehide',()=>{stop();});window.addEventListener('pageshow',()=>requestFrame());
 if(reduced)$('globeMotionHint').textContent='已遵循减少动态效果设置，不会自动播放。';
})();
