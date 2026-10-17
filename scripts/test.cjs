const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const core=require('../src/core.js');
const data=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../src/catalog.json')));
const i=n=>{const b=Buffer.alloc(4);b.writeInt32LE(n);return b;};
const f=n=>{const b=Buffer.alloc(4);b.writeFloatLE(n);return b;};
const str=s=>{const b=Buffer.from(s),a=[];let n=b.length;do{a.push((n&127)|(n>127?128:0));n>>>=7;}while(n);return Buffer.concat([Buffer.from(a),b]);};
const dict=o=>Buffer.concat([i(Object.keys(o).length),...Object.entries(o).flatMap(([k,v])=>[str(k),f(v)])]);
function fixture(latest=false){
 // Independent minimal profile fixture: 17 eaten chicken, zero crafted chicken,
 // and one skill with fractional level and in-progress XP.
 const player=Buffer.concat([i(latest?34:33),f(25),f(25),f(0),f(0),str(''),f(0),i(latest?110:109),Buffer.alloc(2),...Array.from({length:7},()=>i(0)),i(0),str(''),str(''),Buffer.alloc(24),i(0),i(0),i(2),i(1),i(102),f(33.5),f(16.5),i(0),f(0),f(0),f(0),i(0),...(latest?[i(2),i(12),i(3),i(-42),i(7),i(1),i(99),i(-1234)]:[])]);
 const buckets=Array.from({length:10},()=>Buffer.concat([Buffer.alloc(205*4),dict({}),dict({}),dict({}),i(5),...Array.from({length:5},()=>dict({})),dict({}),dict({}),dict({}),dict({'$item_honeyglazedchicken':17}),dict({})]));
 const body=Buffer.concat([i(latest?47:46),i(205),i(10),...buckets,Buffer.from([0]),i(0),str('Fixture'),Buffer.alloc(8),str(''),Buffer.from([0]),Buffer.alloc(8),Buffer.from([1]),i(player.length),player]);
 return Buffer.concat([i(body.length),body,i(64),crypto.createHash('sha512').update(body).digest()]);
}
(async()=>{
 const bytes=fixture(),save=await core.parseSave(bytes);
 const newer=await core.parseSave(fixture(true));assert.equal(newer.version,47);assert.equal(newer.discovered.version,34);assert.deepEqual(newer.discovered.skills,save.discovered.skills);assert.deepEqual(newer.buckets,save.buckets);
 const unsupported=Buffer.from(bytes);unsupported.writeInt32LE(48,4);crypto.createHash('sha512').update(unsupported.subarray(4,4+unsupported.readInt32LE(0))).digest().copy(unsupported,unsupported.length-64);await assert.rejects(()=>core.parseSave(unsupported),/profile 48/);
 assert.deepEqual(save.discovered.skills,[{id:102,level:33.5,xp:16.5}]);
 const food={tokens:['$item_honeyglazedchicken'],mapping:'exact'};
 assert.equal(core.evaluate({type:'craft'},food,save).status,'missing');
 assert.equal(core.evaluate({type:'eat'},food,save).count,17);
 const damaged=Buffer.from(bytes);damaged[100]^=1;await assert.rejects(()=>core.parseSave(damaged),/Checksum/);
 const b=data.catalog.find(c=>c.title==='The Blacksmith'),a=data.catalog.find(c=>c.title==='The Artisan');assert.equal(b.total,145);assert.equal(a.total,415);
 for(const c of data.catalog){assert.equal(c.items.length,c.total);for(const item of c.items){const r=core.evaluate(c,item,save);assert(['done','missing','unknown'].includes(r.status));assert(Number.isFinite(r.count));}}
 const enemy={tokens:['$enemy_hare'],mapping:'exact'};save.buckets[1].enemy[0]['$enemy_hare']=45;save.buckets[7].enemy[0]['$enemy_hare']=6;
 assert.equal(core.evaluate({type:'killAny'},enemy,save).count,45);assert.equal(core.evaluate({type:'killHard'},enemy,save).count,6);
 console.log('Passed: skill decoding, cooking/eating separation, checksum validation, catalog integrity, difficulty records.');
})().catch(e=>{console.error(e);process.exitCode=1;});
