const G=globalThis.RoadbookGeo;
const cache=new Map();
async function readTile(key,signal){
 const id=`${key.z}/${key.x}/${key.y}`;
 if(cache.has(id)){const data=cache.get(id);cache.delete(id);cache.set(id,data);return data;}
 const response=await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${id}.png`,{signal,mode:'cors'});
 if(!response.ok)throw Error('高程瓦片读取失败');
 const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
 try{
  if(bitmap.width!==256||bitmap.height!==256)throw Error('高程瓦片尺寸异常');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
  const pixels=ctx.getImageData(0,0,256,256).data,heights=new Float32Array(256*256);
  for(let i=0;i<heights.length;i++){heights[i]=G.decode(pixels[i*4],pixels[i*4+1],pixels[i*4+2]);if(heights[i]< -12000||heights[i]>9000)throw Error('高程数据无效');}
  cache.set(id,heights);while(cache.size>24)cache.delete(cache.keys().next().value);return heights;
 }finally{bitmap.close();}
}
export async function loadTerrain(place,{signal,onProgress}={}){
 const bounds=G.bounds(place),z=8,keys=G.tileKeys(bounds,z),tiles=new Map();let complete=0;
 await Promise.all(keys.map(async key=>{const data=await readTile(key,signal);tiles.set(`${key.x}/${key.y}`,data);onProgress?.(++complete,keys.length);}));
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 // Bilinear interpolation across tile boundaries; no arbitrary terrain or random heights.
 function elevation(lng,lat){const [tx,ty]=G.tile(lng,lat,z),px=tx*256-.5,py=ty*256-.5,x=Math.floor(px),y=Math.floor(py),u=px-x,v=py-y;
  const read=(xx,yy)=>{const kx=Math.floor(xx/256),ky=Math.floor(yy/256),tile=tiles.get(`${kx}/${ky}`);if(!tile){const fallback=tiles.get(`${Math.floor(tx)}/${Math.floor(ty)}`);if(!fallback)throw Error('缺少边界高程');return G.bilinear(fallback,256,(tx%1)*256,(ty%1)*256);}return tile[((yy%256+256)%256)*256+(xx%256+256)%256];};
  return read(x,y)*(1-u)*(1-v)+read(x+1,y)*u*(1-v)+read(x,y+1)*(1-u)*v+read(x+1,y+1)*u*v;
 }
 const size=matchMedia('(max-width: 600px)').matches?65:97,heights=new Float32Array(size*size);
 for(let row=0;row<size;row++)for(let col=0;col<size;col++)heights[row*size+col]=elevation(bounds.west+(bounds.east-bounds.west)*col/(size-1),bounds.north-(bounds.north-bounds.south)*row/(size-1));
 const widthKm=(bounds.east-bounds.west)*111.32*Math.cos(place.center[1]*Math.PI/180),heightKm=(bounds.north-bounds.south)*111.32;
 return {place,bounds,size,heights,depth:10*heightKm/widthKm,widthKm,heightKm,min:Math.min(...heights),max:Math.max(...heights),source:'Mapzen / AWS Terrain Tiles · Terrarium z8 · USGS SRTM/GMTED2010'};
}
