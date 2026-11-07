const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const G=require('../route-core.js');
const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'trip-model.js'),'utf8')+'\nthis.plans=TripModel.plans;',context);
const data=Object.fromEntries(['xinjiang','northeast'].map(k=>[k,JSON.parse(fs.readFileSync(path.join(root,'routes',k+'.geojson'),'utf8'))]));

test('all thirty itinerary days resolve to existing road geometry or an explicit stationary point',()=>{
 for(const route of Object.keys(data)){
  assert.equal(context.plans[route].length,15);
  for(const plan of context.plans[route]){
   const d=G.daily(data[route],plan);assert.ok(d.coordinates.length>=1,route+' '+plan[0]);
   assert.equal(d.stationary,plan[2]===plan[3]);
   const a=data[route].features.find(f=>f.geometry.type==='Point'&&f.properties.key===plan[2]);
   const b=data[route].features.find(f=>f.geometry.type==='Point'&&f.properties.key===plan[3]);
   const distance=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
   assert.ok(distance(d.coordinates[0],a.geometry.coordinates)<.01);
   assert.ok(distance(d.coordinates.at(-1),b.geometry.coordinates)<.01);
  }
 }
});
test('return routes reverse the actual road instead of connecting waypoints by straight lines',()=>{
 const forward=G.daily(data.xinjiang,['','','jinhua','lanzhou','']);
 const back=G.daily(data.xinjiang,['','','lanzhou','jinhua','']);
 assert.deepEqual(forward.coordinates,back.coordinates.slice().reverse());assert.ok(back.coordinates.length>100);
});
test('uncertain transport ranges are marked, stationary days do not invent motion',()=>{
 const uncertain=G.daily(data.xinjiang,context.plans.xinjiang[0]);assert.equal(uncertain.uncertain,true);
 const rest=G.daily(data.xinjiang,context.plans.xinjiang[5]);assert.equal(rest.coordinates.length,1);
 assert.deepEqual(G.along(rest.coordinates,G.lengths(rest.coordinates),.8),rest.coordinates[0]);
});
test('distance interpolation follows lengths, handles endpoints and duplicate points',()=>{
 const c=[[0,0],[1,0],[4,0]],ls=G.lengths(c);
 assert.deepEqual(G.along(c,ls,.5),[2,0]);assert.deepEqual(G.along(c,ls,0),c[0]);assert.deepEqual(G.along(c,ls,1),c[2]);
 assert.ok(G.along([[1,1],[1,1]],[0,0],.5).every(Number.isFinite));
});
test('Terrarium decoding and Web Mercator tile addressing match published formulas',()=>{
 assert.equal(G.decode(128,0,0),0);assert.equal(G.decode(127,255,0),-1);assert.equal(G.decode(128,100,128),100.5);
 assert.deepEqual(G.tile(0,0,8),[128,128]);
 assert.equal(G.bilinear([0,10,20,30],2,.5,.5),15);
 const b=G.bounds({center:[87,48],extent:.4});assert.ok(G.tileKeys(b).length<=6);
});
test('terrain path clipping never draws a line across missing outside geometry',()=>{
 const b={west:0,east:2,south:0,north:2};
 assert.deepEqual(G.clipSegments([[.1,.1],[1,1],[4,4],[1,1],[1.8,1.8]],b),[[[.1,.1],[1,1]],[[1,1],[1.8,1.8]]]);
});
test('Natural Earth geography is locally packaged with land, boundaries and lakes',()=>{
 const world=JSON.parse(fs.readFileSync(path.join(root,'data/world.json'),'utf8'));
 assert.ok(world.land.length>100);assert.ok(world.borders.length>100);assert.ok(world.lakes.length>100);
});
test('real terrain mesh samples decoded pixels and carries source metadata',async()=>{
 global.RoadbookGeo=G;
 const previous={fetch:global.fetch,document:global.document,createImageBitmap:global.createImageBitmap,matchMedia:global.matchMedia};
 const requests=[];const pixels=new Uint8ClampedArray(256*256*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=128;pixels[i+1]=100;pixels[i+2]=128;pixels[i+3]=255;}
 global.fetch=async(url,options)=>{requests.push(url);return {ok:true,blob:async()=>({})};};
 global.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};
 global.createImageBitmap=async()=>({width:256,height:256,close(){}});global.matchMedia=()=>({matches:true});
 try{
  const {loadTerrain}=await import(pathToFileURL(path.join(root,'route-terrain.mjs')).href+'?fixture=constant');
  const mesh=await loadTerrain({name:'test',center:[87,48],extent:.4});
  assert.equal(mesh.size,65);assert.equal(mesh.heights.length,65**2);assert.equal(mesh.min,100.5);assert.equal(mesh.max,100.5);
  assert.ok(mesh.widthKm>40);assert.ok(requests.every(u=>u.startsWith('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/')));
 }finally{Object.assign(global,previous);}
});
test('a failed elevation tile rejects rather than substituting invented terrain',async()=>{
 global.RoadbookGeo=G;const previous=global.fetch;global.fetch=async()=>({ok:false});
 try{const {loadTerrain}=await import(pathToFileURL(path.join(root,'route-terrain.mjs')).href+'?fixture=failure');await assert.rejects(()=>loadTerrain({center:[81,44],extent:.3}),/高程瓦片/);}finally{global.fetch=previous;}
});

function controller(){
 const elements=new Map(),requests=[];const element=()=>({closest:()=>null,hidden:false,textContent:'',value:'1',children:[],listeners:{},dataset:{},classList:{toggle(){}},append(...c){this.children.push(...c);},replaceChildren(...c){this.children=c;},setAttribute(k,v){this[k]=v;},addEventListener(k,v){this.listeners[k]=v;},querySelectorAll(){return this.children;},removeAttribute(){}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};get('routeGlobe').hidden=true;
 const c={RoadbookGeo:G,RoutePlaces:{xinjiang:[],northeast:[]},current:'xinjiang',selectedDay:0,TripModel:{plans:context.plans},DATA:{xinjiang:{days:Array.from({length:15},()=>['Title','100km','运输','服务区','疲劳'])}},renderCalls:0,tripCalls:0,
 document:{getElementById:get,querySelector:get,documentElement:{dataset:{}},createElement:element,createTextNode:s=>s,addEventListener(){}},matchMedia:()=>({matches:true}),fetch:u=>{requests.push(u);throw Error('offline');},window:{dispatchEvent(){},addEventListener(){}},Event:class{},IntersectionObserver:class{observe(){}},setTimeout,clearTimeout,AbortController};
 c.renderRoute=()=>c.renderCalls++;c.selectDay=i=>{c.selectedDay=i;c.renderRoute();};c.setTrip=()=>c.tripCalls++;
 vm.runInNewContext(fs.readFileSync(path.join(root,'route-globe.js'),'utf8'),c);
 return {get,requests,c};
}
test('3D stays lazy and day controls call the existing itinerary without replacing it',()=>{
 const w=controller();assert.equal(w.requests.length,0);assert.equal(w.get('globeDays').children.length,15);
 w.get('globeDays').children[7].listeners.click();assert.equal(w.c.selectedDay,7);assert.equal(w.c.renderCalls,1);
});
test('engine failure remains recoverable and the original 2D map can be restored',async()=>{
 const w=controller();w.get('viewGlobe').listeners.click();await new Promise(setImmediate);await new Promise(setImmediate);
 assert.equal(w.get('globeRetry').hidden,false);assert.match(w.get('globeStatus').textContent,/二维地图/);
 w.get('viewMap').listeners.click();assert.equal(w.get('routeCanvas').hidden,false);assert.equal(w.get('routeGlobe').hidden,true);
});

test('playback advances through all fifteen days and finishes without wrapping endlessly',()=>{
 let state={day:0,progress:0,ended:false};const visited=new Set([0]);
 for(let i=0;i<3000&&!state.ended;i++){state=G.advance(state.day,state.progress,.05,2,state.day===5);visited.add(state.day);}
 assert.equal(visited.size,15);assert.equal(state.day,14);assert.equal(state.progress,1);assert.equal(state.ended,true);
});
test('page preserves original controls and every new controller target exists',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=fs.readFileSync(path.join(root,'route-globe.js'),'utf8');
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of source.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1])||m[1]==='mapTileStatus',m[1]);
 for(const id of ['routeCanvas','tripMode','fitMap','amapRoute','openTrip','timeline','weatherPlace','roadChecked'])assert.ok(ids.includes(id));
 assert.ok(html.indexOf('route-core.js')<html.indexOf('route-globe.js'));
 assert.ok(html.includes('非完整十五天往返轨迹'));
});

test('actual Three.js constructs globe, road ribbons and a real-height terrain mesh without geometry errors',async()=>{
 global.RoadbookGeo=G;
 const THREE=await import(pathToFileURL(path.join(root,'vendor/three/three.module.min.js')).href);
 const previous={document:global.document,ResizeObserver:global.ResizeObserver,MutationObserver:global.MutationObserver,requestAnimationFrame:global.requestAnimationFrame,cancelAnimationFrame:global.cancelAnimationFrame,devicePixelRatio:global.devicePixelRatio};
 let scheduled=null,scene=null,resizeCallback=null;
 const node=()=>({children:[],style:{},className:'',hidden:false,addEventListener(){},setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},remove(){},setPointerCapture(){},getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){}})});
 const stage={...node(),clientWidth:800,clientHeight:480};
 global.document={hidden:false,documentElement:{dataset:{theme:'day'}},createElement:node};global.devicePixelRatio=2;
 global.ResizeObserver=class{constructor(fn){this.fn=fn;resizeCallback=fn;}observe(){this.fn();}disconnect(){}};
 global.MutationObserver=class{observe(){}disconnect(){}};
 global.requestAnimationFrame=fn=>{scheduled=fn;return 1;};global.cancelAnimationFrame=()=>{scheduled=null;};
 class Renderer{constructor(){this.domElement=node();this.capabilities={getMaxAnisotropy:()=>4};}setPixelRatio(r){this.ratio=r;}setSize(w,h,updateStyle=true){this.domElement.width=Math.floor(w*(this.ratio||1));this.domElement.height=Math.floor(h*(this.ratio||1));if(updateStyle){this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}}setClearColor(){}render(s){scene=s;}dispose(){}}
 try{
  const {createEngine}=await import(pathToFileURL(path.join(root,'route-engine.mjs')).href+'?fixture=geometry');
  const engine=createEngine({...THREE,WebGLRenderer:Renderer},stage,{reduced:true});
  const canvas=stage.children[0];
  assert.equal(canvas.style.width,'100%','canvas CSS width must follow the stage, not stay at initialization size');
  assert.equal(canvas.style.height,'100%','canvas CSS height must follow the stage');
  assert.equal(canvas.width,1280);assert.equal(canvas.height,768);
  stage.clientWidth=360;stage.clientHeight=340;resizeCallback();
  assert.equal(canvas.width,576);assert.equal(canvas.height,544);
  assert.equal(canvas.style.width,'100%');assert.equal(canvas.style.height,'100%');

  const world=JSON.parse(fs.readFileSync(path.join(root,'data/world.json'),'utf8'));engine.setWorld(world);engine.setRoute(data.xinjiang);
  const segment=G.daily(data.xinjiang,context.plans.xinjiang[4]);engine.setDay(segment.coordinates);scheduled(0);
  assert.ok(scene.children.some(c=>c.isGroup));
  const b={west:80.5,east:81.8,south:44.1,north:45.1};
  engine.terrain({place:{name:'test',center:[81.163,44.597]},bounds:b,size:3,depth:8,heights:new Float32Array([2000,2100,2400,1900,2073,2600,2100,2300,3000])});scheduled(20);
  const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const terrain=meshes.find(m=>m.geometry.type==='PlaneGeometry');assert.ok(terrain);
  assert.equal(terrain.geometry.attributes.position.count,9);
  for(const m of meshes)if(m.geometry.attributes.position)assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));
  engine.overview(false);engine.setVisible(false);engine.dispose();
 }finally{Object.assign(global,previous);}
});

test('terrain interpolation stays continuous when the patch crosses four tile boundaries',async()=>{
 global.RoadbookGeo=G;
 const previous={fetch:global.fetch,document:global.document,createImageBitmap:global.createImageBitmap,matchMedia:global.matchMedia};
 global.fetch=async url=>{const m=url.match(/\/(\d+)\/(\d+)\/(\d+)\.png$/);return {ok:true,blob:async()=>({x:Number(m[2]),y:Number(m[3])})};};
 global.createImageBitmap=async blob=>({...blob,width:256,height:256,close(){}});global.matchMedia=()=>({matches:true});
 global.document={createElement:()=>{let tile;return {getContext:()=>({drawImage(bitmap){tile=bitmap;},getImageData(){const pixels=new Uint8ClampedArray(256*256*4);for(let row=0;row<256;row++)for(let col=0;col<256;col++){const h=(tile.x*256+col)*.1+(tile.y*256+row)*.05+32768,at=(row*256+col)*4;pixels[at]=Math.floor(h/256);pixels[at+1]=Math.floor(h)%256;pixels[at+2]=Math.round((h-Math.floor(h))*256)%256;pixels[at+3]=255;}return {data:pixels};}})};}};
 try{const {loadTerrain}=await import(pathToFileURL(path.join(root,'route-terrain.mjs')).href+'?fixture=seams');const mesh=await loadTerrain({center:[0,0],extent:.4});
  const expected=(128*256-.5)*.15;assert.ok(Math.abs(mesh.heights[32*65+32]-expected)<.01);
  for(let i=1;i<65;i++)assert.ok(mesh.heights[32*65+i]>mesh.heights[32*65+i-1]);
 }finally{Object.assign(global,previous);}
});
