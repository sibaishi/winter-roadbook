/* Rendering only. Navigation, itinerary and DEM loading live in separate modules. */
const G=globalThis.RoadbookGeo;
export function createEngine(T,stage,{onPick,onFatal,reduced=false}={}){
 let disposed=false,visible=true,frame=0,last=0,flight=null,mode='globe',yaw=0,pitch=0,zoom=1,night=false,landData=null;
 let baseCenter=new T.Vector3(...G.vector(103,40,1)),routeData=null,terrainData=null,terrainBase=0,terrainScale=1;
 let travelerCoord=null,dayCoords=[],allCoords=[],tick=null,animating=false;
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.setSize(1,1);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.03,120),root=new T.Group();scene.add(root);
 const ambient=new T.AmbientLight(0xffffff,2);scene.add(ambient);const sun=new T.DirectionalLight(0xffffff,2.2);sun.position.set(-4,8,10);scene.add(sun);
 const sphere=new T.Mesh(new T.SphereGeometry(3.5,128,80),new T.MeshStandardMaterial({roughness:.93,metalness:0}));root.add(sphere);
 const allGroup=new T.Group(),dayGroup=new T.Group(),markerGroup=new T.Group(),terrainGroup=new T.Group();root.add(allGroup,dayGroup,markerGroup,terrainGroup);
 const traveler=new T.Mesh(new T.SphereGeometry(.04,16,12),new T.MeshBasicMaterial({color:0xef9b5a}));root.add(traveler);traveler.visible=false;
 const halo=new T.Mesh(new T.RingGeometry(.06,.085,32),new T.MeshBasicMaterial({color:0xef9b5a,side:T.DoubleSide,transparent:true,opacity:.8}));root.add(halo);halo.visible=false;
 const labels=document.createElement('div');labels.className='atlas-labels';stage.replaceChildren(renderer.domElement,labels);const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','三维路书：拖动旋转，双指或按钮缩放；方向键旋转，R回到全程。');
 let width=1,height=1,markers=[];
 const resize=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;if(w&&h){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();}});resize.observe(stage);
 function clear(group){for(const o of [...group.children]){group.remove(o);o.traverse(x=>{x.geometry?.dispose();if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];for(const m of ms){m.map?.dispose();m.dispose();}}});}}
 function vector(c,r=3.525){return new T.Vector3(...G.vector(c[0],c[1],r));}
 function terrainPoint(c,lift=.035){const b=terrainData.bounds,x=(c[0]-b.west)/(b.east-b.west),z=(b.north-c[1])/(b.north-b.south);const h=G.bilinear(terrainData.heights,terrainData.size,x*(terrainData.size-1),z*(terrainData.size-1));return new T.Vector3((x-.5)*10,(h-terrainBase)*terrainScale+lift,(z-.5)*terrainData.depth);}
 function ribbon(coords,color,widthValue,local=false,opacity=1){
  if(coords.length<2)return;
  const positions=[],indices=[],up=new T.Vector3(0,1,0);
  for(let i=0;i<coords.length;i++){
   const p=local?terrainPoint(coords[i]):vector(coords[i]);const prev=local?terrainPoint(coords[Math.max(0,i-1)]):vector(coords[Math.max(0,i-1)]);const next=local?terrainPoint(coords[Math.min(coords.length-1,i+1)]):vector(coords[Math.min(coords.length-1,i+1)]);
   let side=new T.Vector3().subVectors(next,prev).cross(local?up:p.clone().normalize());if(side.lengthSq()<1e-12)side.set(1,0,0);side.normalize().multiplyScalar(widthValue);
   positions.push(...p.clone().add(side).toArray(),...p.clone().sub(side).toArray());if(i<coords.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(positions,3));geom.setIndex(indices);geom.computeVertexNormals();
  return new T.Mesh(geom,new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1,polygonOffset:true,polygonOffsetFactor:-1}));
 }
 function drawPaths(){clear(allGroup);clear(dayGroup);const local=mode==='terrain';const add=(group,coords,color,w,opacity)=>{for(const part of local?G.clipSegments(coords,terrainData.bounds):[coords]){const mesh=ribbon(part,color,w,local,opacity);if(mesh)group.add(mesh);}};
  if(allCoords.length)add(allGroup,allCoords,night?0x8c9b9d:0x5f7275,local?.012:.009,.7);
  if(dayCoords.length>1)add(dayGroup,dayCoords,night?0xf0ce92:0x8a4b22,local?.025:.017,1);
  updateTraveler();
 }
 function updateTraveler(){if(!travelerCoord){traveler.visible=halo.visible=false;return;}const local=mode==='terrain';if(local&&!G.inside(travelerCoord,terrainData.bounds)){traveler.visible=halo.visible=false;return;}const p=local?terrainPoint(travelerCoord,.09):vector(travelerCoord,3.55);traveler.position.copy(p);halo.position.copy(p);traveler.scale.setScalar(local?1.5:1);halo.scale.setScalar(local?1.5:1);if(local)halo.rotation.set(-Math.PI/2,0,0);else halo.lookAt(p.clone().multiplyScalar(2));traveler.visible=halo.visible=true;}
 function makeMarkers(){clear(markerGroup);labels.replaceChildren();markers=[];if(!routeData)return;const points=routeData.features.filter(f=>f.geometry.type==='Point');for(let i=0;i<points.length;i++){
  const f=points[i],c=f.geometry.coordinates;if(mode==='terrain'&&!G.inside(c,terrainData.bounds))continue;
  const p=mode==='terrain'?terrainPoint(c,.08):vector(c,3.55);const dot=new T.Mesh(new T.SphereGeometry(mode==='terrain'?.055:.025,12,8),new T.MeshBasicMaterial({color:night?0xede8dc:0x344b50}));dot.position.copy(p);markerGroup.add(dot);
  const b=document.createElement('button');b.type='button';b.textContent=f.properties.name;b.title='拉近查看 '+f.properties.name;b.addEventListener('click',()=>onPick?.(f.properties.key));labels.append(b);markers.push({p,b,key:f.properties.key,priority:i===0||i===points.length-1});
 }
 if(mode==='terrain'&&terrainData.place){const p=terrainPoint(terrainData.place.center,.08);const b=document.createElement('span');b.className='atlas-place-label';b.textContent=terrainData.place.name;labels.append(b);markers.unshift({p,b,key:'terrain-center',priority:true});}}
 function drawTexture(){
  const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle=night?'#172b35':'#dbe7e5';ctx.fillRect(0,0,2048,1024);
  // Equirectangular texture, with explicit antimeridian unwrapping and duplicate wraps.
  const path=(rings,offset)=>{ctx.beginPath();for(const ring of rings){let prev=null;ring.forEach(([lng,lat],i)=>{let lon=lng;if(prev!==null){while(lon-prev>180)lon-=360;while(lon-prev< -180)lon+=360;}prev=lon;const x=(lon+180)/360*2048+offset,y=(90-lat)/180*1024;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}};
  if(landData){ctx.fillStyle=night?'#526469':'#a9b9ae';ctx.strokeStyle=night?'#73858a':'#899c91';ctx.lineWidth=.8;for(const polygon of landData.land)for(const offset of [-2048,0,2048]){path(polygon,offset);ctx.fill('evenodd');ctx.stroke();}
   ctx.strokeStyle=night?'#7b8987':'#889a8d';ctx.lineWidth=.55;for(const f of landData.borders){const lines=f.type==='LineString'?[f.coordinates]:f.coordinates;for(const line of lines){ctx.beginPath();let prev=null;line.forEach(([lon,lat],i)=>{if(prev!==null&&Math.abs(lon-prev)>180)ctx.moveTo((lon+180)/360*2048,(90-lat)/180*1024);else if(i)ctx.lineTo((lon+180)/360*2048,(90-lat)/180*1024);else ctx.moveTo((lon+180)/360*2048,(90-lat)/180*1024);prev=lon;});ctx.stroke();}}
   ctx.fillStyle=night?'#172b35':'#dbe7e5';for(const f of landData.lakes)for(const polygon of f.type==='Polygon'?[f.coordinates]:f.coordinates){path(polygon,0);ctx.fill('evenodd');}
  }
  ctx.strokeStyle=night?'#ffffff0a':'#183f4220';ctx.lineWidth=.6;for(let lat=-60;lat<=75;lat+=15){ctx.beginPath();ctx.moveTo(0,(90-lat)/180*1024);ctx.lineTo(2048,(90-lat)/180*1024);ctx.stroke();}for(let lon=-180;lon<180;lon+=30){ctx.beginPath();ctx.moveTo((lon+180)/360*2048,0);ctx.lineTo((lon+180)/360*2048,1024);ctx.stroke();}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;map.offset.x=.25;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());sphere.material.map?.dispose();sphere.material.map=map;sphere.material.color.set(0xffffff);sphere.material.needsUpdate=true;
 }
 function setTheme(){night=document.documentElement.dataset.theme==='night';renderer.setClearColor(night?0x202828:0xe8ebe4);scene.fog=new T.Fog(night?0x202828:0xe8ebe4,18,45);drawTexture();if(routeData){drawPaths();makeMarkers();}invalidate();}
 function overview(animate=true){mode='globe';sphere.visible=true;terrainGroup.visible=false;const coords=allCoords.length?allCoords:[[100,40]],lngs=coords.map(c=>c[0]),lats=coords.map(c=>c[1]);flyTo([(Math.min(...lngs)+Math.max(...lngs))/2,(Math.min(...lats)+Math.max(...lats))/2],1,animate);drawPaths();makeMarkers();}
 function flyTo(center,z=1.7,animate=true){mode='globe';sphere.visible=true;terrainGroup.visible=false;const dest=vector(center,1).normalize();if(reduced||!animate){baseCenter.copy(dest);zoom=z;yaw=pitch=0;flight=null;}else flight={from:baseCenter.clone(),to:dest,fromZoom:zoom,toZoom:z,start:performance.now(),duration:1300};invalidate();}
 function showTerrain(data){
  flight=null;clear(terrainGroup);terrainData=data;mode='terrain';sphere.visible=false;terrainGroup.visible=true;zoom=1;yaw=0;pitch=.6;
  const hs=data.heights;terrainBase=Math.floor(Math.min(...hs)/100)*100;terrainScale=10/((data.bounds.east-data.bounds.west)*111320*Math.cos(data.place.center[1]*Math.PI/180))*1.8;
  const geometry=new T.PlaneGeometry(10,data.depth,data.size-1,data.size-1);geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){const h=hs[i];p.setY(i,(h-terrainBase)*terrainScale);const t=Math.max(0,Math.min(1,h/4500));const low=new T.Color(night?0x3e635d:0x7c9781),mid=new T.Color(night?0x9caa95:0xb4b49d),high=new T.Color(0xe9e9dc);const col=t<.55?low.lerp(mid,t/.55):mid.lerp(high,(t-.55)/.45);colors.push(...col.toArray());}
  p.needsUpdate=true;geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();terrainGroup.add(new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide})));
  const edge=[];for(let c=0;c<data.size;c++)edge.push(c);for(let r=1;r<data.size;r++)edge.push(r*data.size+data.size-1);for(let c=data.size-2;c>=0;c--)edge.push((data.size-1)*data.size+c);for(let r=data.size-2;r>0;r--)edge.push(r*data.size);
  const skirtPos=[],skirtIndices=[];for(let i=0;i<=edge.length;i++){const j=edge[i%edge.length];skirtPos.push(p.getX(j),p.getY(j),p.getZ(j),p.getX(j),-.12,p.getZ(j));if(i<edge.length){const a=i*2;skirtIndices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(skirtPos,3));skirt.setIndex(skirtIndices);skirt.computeVertexNormals();terrainGroup.add(new T.Mesh(skirt,new T.MeshStandardMaterial({color:night?0x344c45:0x8b9b85,roughness:1,side:T.DoubleSide})));
  const plate=new T.Mesh(new T.BoxGeometry(10,.16,data.depth),new T.MeshStandardMaterial({color:night?0x253633:0x80958b,roughness:1}));plate.position.y=-.13;terrainGroup.add(plate);
  drawPaths();makeMarkers();invalidate();
 }
 function invalidate(){if(!disposed&&visible&&!document.hidden&&!frame)frame=requestAnimationFrame(render);}
 function render(now){frame=0;if(disposed||!visible||document.hidden)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  if(flight){const raw=Math.min(1,(now-flight.start)/flight.duration),t=raw*raw*(3-2*raw);baseCenter.copy(flight.from).lerp(flight.to,t).normalize();zoom=flight.fromZoom+(flight.toZoom-flight.fromZoom)*t;yaw=pitch=0;if(raw===1)flight=null;}
  if(mode==='globe'){const center=baseCenter.clone().applyAxisAngle(new T.Vector3(0,1,0),yaw);const right=new T.Vector3().crossVectors(center,new T.Vector3(0,1,0)).normalize();center.applyAxisAngle(right,pitch);camera.position.copy(center.multiplyScalar(10/zoom));camera.lookAt(0,0,0);}
  else{const r=13/zoom,angle=.75+pitch*.55;camera.position.set(Math.sin(yaw)*r*Math.cos(angle),Math.sin(angle)*r,Math.cos(yaw)*r*Math.cos(angle));camera.lookAt(0,.8,0);}
  camera.updateMatrixWorld();if(animating)tick?.(dt);renderer.render(scene,camera);
  const used=[];for(const marker of [...markers].sort((a,b)=>Number(b.priority)-Number(a.priority))){const {p,b}=marker,v=p.clone().project(camera),x=(v.x+1)*width/2,y=(1-v.y)*height/2-8;const front=mode==='terrain'||p.dot(camera.position)>3.55**2;const show=front&&v.z<1&&x>30&&x<width-30&&y>25&&y<height-10&&!used.some(q=>Math.abs(q.x-x)<90&&Math.abs(q.y-y)<30);b.hidden=!show;if(show){b.style.left=x+'px';b.style.top=y+'px';used.push({x,y});}}
  if(flight||animating)invalidate();else last=0;
 }
 const pointers=new Map();let pinch=0;
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);flight=null;pinch=0;});
 canvas.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)dolly(dist/pinch);pinch=dist;}else{yaw-=dx*.006;pitch=Math.max(-.9,Math.min(.9,pitch+dy*.006));}invalidate();});
 const release=e=>{pointers.delete(e.pointerId);pinch=0;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('wheel',e=>{e.preventDefault();flight=null;dolly(e.deltaY<0?1.08:1/1.08);},{passive:false});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','r','R'].includes(e.key))return;e.preventDefault();flight=null;if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch=Math.max(-.9,pitch-.12);if(e.key==='ArrowDown')pitch=Math.min(.9,pitch+.12);if(['+','='].includes(e.key))dolly(1.1);if(e.key==='-')dolly(1/1.1);if(['r','R'].includes(e.key))overview();invalidate();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onFatal?.();});
 function dolly(factor){zoom=Math.max(.65,Math.min(mode==='globe'?2.35:2.1,zoom*factor));invalidate();}
 const themeObserver=new MutationObserver(()=>{setTheme();if(mode==='terrain'&&terrainData)showTerrain(terrainData);});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});setTheme();
 return {
  setWorld(data){landData=data;drawTexture();invalidate();},
  setRoute(data){routeData=data;allCoords=G.sample(data.features.find(f=>f.geometry.type==='LineString').geometry.coordinates);dayCoords=[];travelerCoord=allCoords[0];overview(true);},
  setDay(coords,t=0){dayCoords=coords;travelerCoord=G.along(coords,G.lengths(coords),t);drawPaths();invalidate();},
  move(coords,lengths,t){travelerCoord=G.along(coords,lengths,t);updateTraveler();invalidate();},
  focus(place){if(mode==='terrain'){mode='globe';drawPaths();makeMarkers();}flyTo(place.center,2.05,true);},
  terrain:showTerrain,overview,dolly,
  animate(value,callback){animating=value;tick=callback;last=0;invalidate();},
  setVisible(value){visible=value;if(!value){cancelAnimationFrame(frame);frame=0;last=0;}else invalidate();},
  dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();themeObserver.disconnect();clear(allGroup);clear(dayGroup);clear(markerGroup);clear(terrainGroup);sphere.geometry.dispose();sphere.material.map?.dispose();sphere.material.dispose();traveler.geometry.dispose();traveler.material.dispose();halo.geometry.dispose();halo.material.dispose();renderer.dispose();canvas.remove();labels.remove();}
 };
}
