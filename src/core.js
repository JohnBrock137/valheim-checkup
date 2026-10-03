(function(root){
'use strict';
class Reader {
 constructor(bytes){this.b=bytes;this.v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);this.o=0;this.dec=new TextDecoder('utf-8',{fatal:true});}
 need(n){if(!Number.isSafeInteger(n)||n<0||this.o+n>this.b.length)throw Error('The save is truncated or has an unsupported layout.');}
 skip(n){this.need(n);this.o+=n;}
 i(){this.need(4);let n=this.v.getInt32(this.o,true);this.o+=4;return n;}
 f(){this.need(4);let n=this.v.getFloat32(this.o,true);this.o+=4;if(!Number.isFinite(n))throw Error('Invalid numeric record in save.');return n;}
 byte(){this.need(1);return this.b[this.o++];}
 u16(){this.need(2);let n=this.v.getUint16(this.o,true);this.o+=2;return n;}
 count(max=100000){let n=this.i();if(n<0||n>max)throw Error('Invalid record count in save.');return n;}
 str(){let n=0,m=1,b;for(let j=0;j<5;j++){b=this.byte();n+=(b&127)*m;if(!(b&128)){this.need(n);let s=this.dec.decode(this.b.subarray(this.o,this.o+n));this.o+=n;return s;}m*=128;}throw Error('Invalid string length in save.');}
 dict(){let d=Object.create(null);for(let n=this.count();n--;){let k=this.str();if(Object.hasOwn(d,k))throw Error('Duplicate save record.');d[k]=this.f();}return d;}
 list(){return Array.from({length:this.count()},()=>this.str());}
 longString(){this.need(8);const n=this.v.getBigInt64(this.o,true);this.o+=8;return n.toString();}
}
function inventory(r){
 const ver=r.i();if(ver!==109)throw Error('Inventory version '+ver+' is not supported yet.');
 const items=r.u16();if(items>4096)throw Error('Invalid inventory size.');
 for(let j=0;j<items;j++){
  r.skip(7);const flags=r.byte();if(flags&4)r.skip(2);if(flags&8)r.skip(2);if(flags&16)r.skip(4);if(flags&32){r.skip(8);r.str();}if(flags&64)r.skip(4);
  if(flags&128){let n=r.byte();if(n&128)n=((n&127)<<8)|r.byte();for(let k=0;k<n;k++){r.str();r.str();}}
  r.byte();
 }
}
function playerData(bytes){
 const r=new Reader(bytes),version=r.i();if(version!==33)throw Error('Player data version '+version+' is not supported yet.');
 for(let j=0;j<4;j++)r.f();r.str();r.f();inventory(r);
 const recipes=r.list();for(let n=r.count();n--;){r.str();r.i();}const materials=r.list();r.list();r.list();const trophies=r.list();const biomes=r.list();
 for(let n=r.count();n--;){r.str();r.str();}r.str();r.str();r.skip(24);r.i();for(let n=r.count();n--;){r.str();r.f();}
 if(r.i()!==2)throw Error('Unsupported skills version.');for(let n=r.count();n--;){r.i();r.f();r.f();}for(let n=r.count();n--;){r.str();r.str();}
 r.f();r.f();r.f();r.skip(r.count(bytes.length));if(r.o!==bytes.length)throw Error('Player data length does not match.');
 return {version,recipes,materials,trophies,biomes};
}
async function parseSave(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(bytes.length<20||bytes.length>32*1024*1024)throw Error('Choose a valid .fch character save (up to 32 MB).');
 const file=new Reader(bytes),size=file.count(bytes.length-8);file.need(size+4);const body=bytes.subarray(4,4+size);file.skip(size);const checksumSize=file.i();if(checksumSize!==64||file.o+64!==bytes.length)throw Error('Invalid save checksum header.');
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-512',body));if(!hash.every((v,i)=>v===bytes[file.o+i]))throw Error('Checksum failed. This file may be incomplete or damaged.');
 const r=new Reader(body),version=r.i(),statCount=r.count(1000),bucketCount=r.count(20);if(version!==46||statCount!==205||bucketCount!==10)throw Error('This tool currently supports profile 46 / player 33 saves. This save uses profile '+version+'.');
 const buckets=[];for(let index=0;index<bucketCount;index++){
  const stats=Array.from({length:statCount},()=>r.f());r.dict();r.dict();r.dict();const enemy=Array.from({length:r.count(10)},()=>r.dict());if(enemy.length!==5)throw Error('Unsupported enemy records.');
  const pickup=r.dict(),craft=r.dict(),fish=r.dict(),eat=r.dict(),build=r.dict();buckets.push({stats,enemy,pickup,craft,fish,eat,build});
 }
 r.byte();const worlds=r.count(10000);for(let j=0;j<worlds;j++){r.skip(8);r.skip(51);if(r.byte())r.skip(r.count(body.length));}
 const name=r.str(),id=r.longString();r.str();const usedCheats=!!r.byte();r.skip(8);let discovered={recipes:[],materials:[],trophies:[],biomes:[]};if(r.byte()){const n=r.count(body.length);r.need(n);discovered=playerData(body.subarray(r.o,r.o+n));r.skip(n);}if(r.o!==body.length)throw Error('Profile data length does not match.');
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 return {name,id,version,worlds,usedCheats,buckets,discovered,fingerprint,loadedAt:new Date().toISOString()};
}
function evaluate(category,item,save,mode='achievement',override){
 if(!save)return {status:override===true?'done':override===false?'missing':'unloaded',count:0,discovery:'unknown',manual:override!==undefined};
 const bucket=save.buckets[mode==='raw'?0:category.type==='killHard'?7:1];
 const records=category.type==='killHard'||category.type==='killAny'?bucket.enemy[0]:bucket[category.type];
 const count=Math.max(0,...item.tokens.map(t=>records[t]||0));
 const valid=item.mapping==='exact'||item.mapping==='alias';
 let status=valid?(count>0?'done':'missing'):'unknown';
 const known=new Set(category.type==='pickup'||category.type==='eat'?save.discovered.materials:save.discovered.recipes);
 let discovery=['craft','build','eat','pickup'].includes(category.type)&&valid?(item.tokens.some(t=>known.has(t))||count>0?'known':'undiscovered'):'unknown';
 if(override!==undefined)status=override?'done':'missing';
 return {status,count,discovery,manual:override!==undefined};
}
const api={parseSave,evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ValheimCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
