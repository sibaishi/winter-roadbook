/* Geospatial calculations shared by the globe, real terrain and tests. */
(function(root){
 'use strict';
 const RAD=Math.PI/180;
 function vector(lng,lat,r=3.5){return [r*Math.cos(lat*RAD)*Math.sin(lng*RAD),r*Math.sin(lat*RAD),r*Math.cos(lat*RAD)*Math.cos(lng*RAD)];}
 function tile(lng,lat,z){const n=2**z,p=Math.max(-85.05112878,Math.min(85.05112878,lat))*RAD;return [(lng+180)/360*n,(1-Math.asinh(Math.tan(p))/Math.PI)/2*n];}
 function decode(r,g,b){return r*256+g+b/256-32768;}
 function nearest(coords,p){let at=0,best=Infinity;for(let i=0;i<coords.length;i++){const d=(coords[i][0]-p[0])**2*Math.cos(p[1]*RAD)**2+(coords[i][1]-p[1])**2;if(d<best){best=d;at=i;}}return at;}
 function sample(coords,max=2200){if(coords.length<=max)return coords;const stride=Math.ceil(coords.length/(max-1)),out=coords.filter((_,i)=>i%stride===0);if(out.at(-1)!==coords.at(-1))out.push(coords.at(-1));return out;}
 function daily(data,plan){
  const route=data.features.find(f=>f.geometry.type==='LineString').geometry.coordinates;
  const points=data.features.filter(f=>f.geometry.type==='Point');
  const a=points.find(f=>f.properties.key===plan[2]),b=points.find(f=>f.properties.key===plan[3]);
  if(!a||!b)return {coordinates:[],uncertain:true,stationary:false};
  const i=nearest(route,a.geometry.coordinates),j=nearest(route,b.geometry.coordinates);
  const uncertain=/待定|方向|前一晚/.test([plan[0],plan[1],plan[4]].join(' '));
  if(i===j)return {coordinates:[route[i]],uncertain,stationary:true};
  const line=sample(route.slice(Math.min(i,j),Math.max(i,j)+1));if(i>j)line.reverse();
  return {coordinates:line,uncertain,stationary:false};
 }
 function lengths(coords){const out=[0];for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],lat=(a[1]+b[1])/2*RAD;out.push(out[i-1]+Math.hypot((b[0]-a[0])*Math.cos(lat),b[1]-a[1]));}return out;}
 function along(coords,ls,t){if(!coords.length)return null;if(coords.length===1)return coords[0];const d=Math.max(0,Math.min(1,t))*ls.at(-1);let lo=1,hi=ls.length-1;while(lo<hi){const m=(lo+hi)>>1;if(ls[m]<d)lo=m+1;else hi=m;}const span=ls[lo]-ls[lo-1],f=span?(d-ls[lo-1])/span:0;return coords[lo-1].map((v,k)=>v+(coords[lo][k]-v)*f);}
 function bounds(place){const c=place.center,dx=place.extent||.55,dy=dx*.72;return {west:c[0]-dx,east:c[0]+dx,south:c[1]-dy,north:c[1]+dy};}
 function tileKeys(b,z=8){const a=tile(b.west,b.north,z),c=tile(b.east,b.south,z),out=[];for(let x=Math.floor(a[0]);x<=Math.floor(c[0]);x++)for(let y=Math.floor(a[1]);y<=Math.floor(c[1]);y++)out.push({x,y,z});return out;}
 function bilinear(grid,width,x,y){x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(grid.length/width-1,y));const a=Math.floor(x),b=Math.floor(y),c=Math.min(a+1,width-1),d=Math.min(b+1,grid.length/width-1),u=x-a,v=y-b;return grid[b*width+a]*(1-u)*(1-v)+grid[b*width+c]*u*(1-v)+grid[d*width+a]*(1-u)*v+grid[d*width+c]*u*v;}
 function inside(p,b){return p[0]>=b.west&&p[0]<=b.east&&p[1]>=b.south&&p[1]<=b.north;}
 function clipSegments(coords,b){const out=[];let part=[];for(const p of coords){if(inside(p,b))part.push(p);else if(part.length){if(part.length>1)out.push(part);part=[];}}if(part.length>1)out.push(part);return out;}
 function contours(heights,size,step=200){
  const result=[],min=Math.min(...heights),max=Math.max(...heights);
  for(let level=Math.ceil(min/step)*step;level<max;level+=step)for(let row=0;row<size-1;row++)for(let col=0;col<size-1;col++){
   const ps=[[col,row],[col+1,row],[col+1,row+1],[col,row+1]],hs=ps.map(([x,y])=>heights[y*size+x]),cross=[];
   for(let e=0;e<4;e++){const j=(e+1)%4;if((hs[e]<level)===(hs[j]<level))continue;const t=(level-hs[e])/(hs[j]-hs[e]);cross.push([ps[e][0]+(ps[j][0]-ps[e][0])*t,ps[e][1]+(ps[j][1]-ps[e][1])*t]);}
   if(cross.length===2)result.push({level,a:cross[0],b:cross[1]});
   else if(cross.length===4){const high=hs.reduce((a,b)=>a+b,0)/4>=level;const order=high?[0,3,1,2]:[0,1,2,3];result.push({level,a:cross[order[0]],b:cross[order[1]]},{level,a:cross[order[2]],b:cross[order[3]]});}
  }
  return result;
 }
 function advance(day,progress,seconds,speed=1,stationary=false){
  const next=Math.max(0,progress)+Math.max(0,seconds)*speed/(stationary?3.5:7);
  return next>=1?day>=14?{day:14,progress:1,ended:true}:{day:day+1,progress:0,ended:false}:{day,progress:next,ended:false};
 }
 const api={contours,advance,vector,tile,decode,nearest,sample,daily,lengths,along,bounds,tileKeys,bilinear,inside,clipSegments};if(typeof module!=='undefined')module.exports=api;else root.RoadbookGeo=api;
})(globalThis);
