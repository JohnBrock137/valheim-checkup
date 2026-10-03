'use strict';
const DATA=JSON.parse(document.getElementById('catalogData').textContent), $=id=>document.getElementById(id), core=ValheimCore;
const labels={craft:'Crafting',build:'Building',eat:'Eating',pickup:'Trophies',fish:'Fishing',killHard:'Hunting · Hard or higher',killAny:'Hunting · Any difficulty'};
const descriptions={'The Artisan':'Craft every kind of item.','The Carpenter':'Build everything.','The Gourmet':'Eat every kind of edible item.','The Master Chef':'Cook every kind of dish.','The Trophy Collector':'Collect all trophies.','The Fisherman':'Catch every kind of fish.','The Master Hunter':'Kill every kind of creature on Hard difficulty or higher.','The Hunter':'Kill every kind of creature on any difficulty.'};
const categories=DATA.catalog;
const hunter=structuredClone(categories.find(c=>c.type==='killHard'));hunter.title='The Hunter';hunter.type='killAny';hunter.items.forEach(i=>i.id='The Hunter:'+i.order);categories.splice(0,0,hunter);
const order=['The Artisan','The Carpenter','The Master Chef','The Gourmet','The Trophy Collector','The Hunter','The Master Hunter','The Fisherman'];categories.sort((a,b)=>order.indexOf(a.title)-order.indexOf(b.title));
let current='The Master Chef',save=null,overrides={},pins={},mode='achievement',lastRows=[],storageAvailable=true,toastTimer;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString();
function notify(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4500);}
function message(text,error=false){$('message').className=text?'notice'+(error?' error':''):'';$('message').textContent=text;}
function key(){return 'valheim-checkup:v1:'+save.id;}
function persist(){if(!save)return;try{localStorage.setItem(key(),JSON.stringify({format:'valheim-checkup',version:1,save,overrides,pins}));localStorage.setItem('valheim-checkup:active',save.id);}catch{storageAvailable=false;message('Browser storage is unavailable or full. Export progress to keep your corrections.');}}
function readStored(id){try{const value=JSON.parse(localStorage.getItem('valheim-checkup:v1:'+id));return value&&validateProgress(value)?value:null;}catch{return null;}}
function validateProgress(d){
 if(!d||d.format!=='valheim-checkup'||d.version!==1||!d.save||typeof d.save.name!=='string'||!/^[-0-9]+$/.test(d.save.id)||d.save.version!==46||!Array.isArray(d.save.buckets)||d.save.buckets.length!==10)return false;
 for(const b of d.save.buckets){if(!b||!Array.isArray(b.stats)||b.stats.length!==205||!b.stats.every(Number.isFinite)||!Array.isArray(b.enemy)||b.enemy.length!==5)return false;for(const dict of [b.pickup,b.craft,b.fish,b.eat,b.build,...b.enemy])if(!dict||typeof dict!=='object'||Array.isArray(dict)||!Object.values(dict).every(x=>Number.isFinite(x)&&x>=0))return false;}
 if(!d.save.discovered||!['recipes','materials','trophies','biomes'].every(k=>Array.isArray(d.save.discovered[k])&&d.save.discovered[k].every(x=>typeof x==='string')))return false;
 if(!d.overrides||!d.pins||!Object.values(d.overrides).every(x=>typeof x==='boolean')||!Object.values(d.pins).every(x=>typeof x==='boolean'))return false;return true;
}
function stats(category){const totals={done:0,missing:0,unknown:0,undiscovered:0};for(const i of category.items){const r=core.evaluate(category,i,save,mode,overrides[i.id]);if(r.status in totals)totals[r.status]++;if(r.discovery==='undiscovered')totals.undiscovered++;}return totals;}
function renderNav(){
 $('categories').innerHTML=categories.map(c=>{const s=stats(c);return `<button class="category ${c.title===current?'active':''}" data-category="${escape(c.title)}" aria-current="${c.title===current?'page':'false'}"><div class="label"><span>${escape(c.title.replace('The ',''))}</span><small>${save?`${s.done} / ${c.total}`:c.total+' items'}</small></div><div class="track"><i style="width:${save?s.done/c.total*100:0}%"></i></div></button>`;}).join('');
 $('mobileCategory').innerHTML=categories.map(c=>`<option ${c.title===current?'selected':''}>${escape(c.title)}</option>`).join('');
 const total=categories.reduce((n,c)=>n+c.total,0),done=categories.reduce((n,c)=>n+stats(c).done,0);$('overall').innerHTML=`<div class="eyebrow">Collection targets</div><strong>${save?fmt(done):'—'} <span style="font-size:16px;color:var(--muted)">/ ${fmt(total)}</span></strong><p>Overlapping targets count in each collection.</p>`;
}
function setCategory(title){current=title;$('biomeFilter').value='all';$('discoveryFilter').value='all';render();}
function render(){
 const c=categories.find(c=>c.title===current),s=stats(c);renderNav();$('title').textContent=c.title;$('description').textContent=descriptions[c.title];$('collectionLabel').textContent=labels[c.type];
 $('dropzone').classList.toggle('hidden',!!save);$('profile').classList.toggle('hidden',!save);
 if(save)$('profile').innerHTML=`<strong>${escape(save.name)}</strong><span class="pill">Profile ${save.version} · Read locally</span><span class="pill">${escape(new Date(save.loadedAt).toLocaleString())}</span><button id="switchCharacter">Load another save</button>`;
 $('exportProgress').disabled=!save;$('forget').disabled=!save;
 $('metrics').innerHTML=[['done','Completed',s.done],['missing','Missing',s.missing],['unknown','Unverified',s.unknown],['discovered','Undiscovered',s.undiscovered]].map(([cls,label,n])=>`<div class="metric ${cls}"><strong>${save?fmt(n):'—'}</strong><span>${label}</span></div>`).join('');
 $('mainTrack').innerHTML=`<i style="width:${save?s.done/c.total*100:0}%"></i>`;$('progressCaption').textContent=save?`${s.done} of ${c.total} targets completed (${Math.round(s.done/c.total*100)}%).${s.unknown?' '+s.unknown+' require verification.':''}`:`${c.total} targets in this collection. Load a character to calculate progress.`;
 const bucket=save?.buckets[mode==='raw'?0:c.type==='killHard'?7:1],t=bucket?.stats;
 $('statline').innerHTML=t?`<span>Items crafted <b>${fmt(Math.floor(t[13]))}</b></span><span>Food eaten <b>${fmt(Math.floor(t[49]))}</b></span><span>Build actions <b>${fmt(Math.floor(t[2]))}</b></span><span>Enemy kills <b>${fmt(Math.floor(t[6]))}</b></span>`:'';
 const notices=[];if(mode==='raw')notices.push('Lifetime actions can include progress that did not earn achievement credit. Hard-difficulty requirements are not applied in this view.');
 if(c.type==='fish')notices.push('Fishing uses the game’s catch records. Merely collecting a fish does not check it off. Bait requirements are shown in the item details.');
 if(s.unknown)notices.push('Unverified items have unresolved or ambiguous save mappings. They are not counted as Missing.');
 if(c.type==='killHard')notices.push('This list reads the verified Hard difficulty record, which also credits kills on higher difficulties.');
 $('collectionNotice').innerHTML=notices.map(n=>`<div class="notice">${escape(n)}</div>`).join('');
 $('discoveryFilter').disabled=['fish','killHard','killAny'].includes(c.type);
 const oldBiome=$('biomeFilter').value,biomes=[...new Set(c.items.map(i=>i.biome).filter(Boolean))].sort();$('biomeFilter').innerHTML='<option value="all">All biomes</option>'+biomes.map(b=>`<option value="${escape(b)}">${escape(b)}</option>`).join('');$('biomeFilter').value=biomes.includes(oldBiome)?oldBiome:'all';$('biomeFilter').disabled=!biomes.length;
 renderRows();
}
function renderRows(){
 const c=categories.find(c=>c.title===current),query=$('search').value.toLowerCase().trim(),filter=$('statusFilter').value,discovery=$('discoveryFilter').disabled?'all':$('discoveryFilter').value,biome=$('biomeFilter').value;
 let rows=c.items.map(item=>({item,...core.evaluate(c,item,save,mode,overrides[item.id])})).filter(r=>{
  if(query&&!`${r.item.name} ${r.item.biome} ${r.item.bait} ${r.item.tokens.join(' ')}`.toLowerCase().includes(query))return false;
  if(save&&filter==='remaining'&&r.status==='done')return false;if(save&&filter!=='all'&&filter!=='remaining'&&r.status!==filter)return false;
  if(discovery!=='all'&&r.discovery!==discovery)return false;if(biome!=='all'&&r.item.biome!==biome)return false;return !$('pinnedOnly').checked||pins[r.item.id];
 });
 const biomeOrder=['Meadows','Black Forest','Swamp','Mountain','Plains','Mistlands','Ashlands','Deep North','Ocean'];
 rows.sort((a,b)=>$('sort').value==='source'?a.item.order-b.item.order:$('sort').value==='biome'?(biomeOrder.indexOf(a.item.biome)-biomeOrder.indexOf(b.item.biome)||a.item.name.localeCompare(b.item.name)):a.item.name.localeCompare(b.item.name));lastRows=rows;
 $('listCount').textContent=`${rows.length} of ${c.total} items shown`;
 $('items').innerHTML=rows.length?rows.map(r=>{
  const item=r.item,statusLabels={done:'Completed',missing:'Missing',unknown:'Unverified',unloaded:'Load a save'},dLabels={known:'Discovered',undiscovered:'Undiscovered',unknown:'—'};
  const note=item.note||(item.mapping==='unmapped'?'No verified save identifier. Manual confirmation is available.':'Automatically matched to a save identifier.');
  return `<tr><td><button class="pin ${pins[item.id]?'on':''}" data-pin="${escape(item.id)}" aria-label="${pins[item.id]?'Unpin':'Pin'} ${escape(item.name)}" aria-pressed="${!!pins[item.id]}">${pins[item.id]?'★':'☆'}</button></td><td><div class="item-name">${escape(item.name)}</div>${r.count>0?`<div class="sub">Recorded count: ${fmt(r.count)}</div>`:''}${r.manual?'<div class="sub">Manual correction</div>':''}</td><td><span class="status ${r.status}">${statusLabels[r.status]}</span></td><td class="discovery-cell">${dLabels[r.discovery]}</td><td class="biome-cell">${escape(item.biome||'—')}</td><td class="item-actions"><details><summary>Details & correction</summary><div><select data-override="${escape(item.id)}" aria-label="Correction for ${escape(item.name)}" ${save?'':'disabled'}><option value="auto" ${!r.manual?'selected':''}>Automatic</option><option value="true" ${overrides[item.id]===true?'selected':''}>Mark completed</option><option value="false" ${overrides[item.id]===false?'selected':''}>Mark missing</option></select><p class="sub">${escape(note)}</p>${item.bait?`<p class="sub">Bait: ${escape(item.bait)}</p>`:''}<p class="sub">${escape(item.tokens.join(', ')||'Identifier not verified')}</p><a href="https://valheim.weirdgloop.org/w/${encodeURIComponent(item.name.replaceAll(' ','_'))}" target="_blank" rel="noopener">Wiki reference</a></div></details></td></tr>`;
 }).join(''):'<tr><td colspan="6" class="empty">No items match these filters. Try All items or clear your search.</td></tr>';
}
async function loadFile(file){
 if(!file)return;if(!/\.fch$/i.test(file.name)){message('Choose a .fch character file.',true);return;}
 $('loadTop').disabled=true;$('loadMain').disabled=true;message('Reading character save…');
 try{const next=await core.parseSave(await file.arrayBuffer()),existing=readStored(next.id);save=next;overrides=existing?.overrides||{};pins=existing?.pins||{};persist();render();message(storageAvailable?'':'Browser storage is unavailable. Export progress before closing.');notify('Loaded '+save.name+'. Progress is up to date.');}
 catch(e){message(e.message||'Could not read this save.',true);}
 finally{$('loadTop').disabled=false;$('loadMain').disabled=false;$('saveFile').value='';}
}
function download(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const safeName=()=>save?save.name.replace(/[^a-z0-9_-]/gi,'_'):'checklist';
$('loadTop').onclick=$('loadMain').onclick=()=>$('saveFile').click();$('saveFile').onchange=e=>loadFile(e.target.files[0]);
$('categories').onclick=e=>{const b=e.target.closest('[data-category]');if(b)setCategory(b.dataset.category);};$('mobileCategory').onchange=e=>setCategory(e.target.value);
$('profile').onclick=e=>{if(e.target.id==='switchCharacter')$('saveFile').click();};
$('recordMode').onchange=e=>{mode=e.target.value;render();};for(const id of ['search','statusFilter','discoveryFilter','biomeFilter','sort','pinnedOnly'])$(id).addEventListener(id==='search'?'input':'change',renderRows);
$('items').onclick=e=>{const b=e.target.closest('[data-pin]');if(b){pins[b.dataset.pin]=!pins[b.dataset.pin];persist();renderRows();}};
$('items').onchange=e=>{if(e.target.dataset.override&&save){const id=e.target.dataset.override;if(e.target.value==='auto')delete overrides[id];else overrides[id]=e.target.value==='true';persist();render();notify('Correction saved locally.');}};
$('exportProgress').onclick=()=>{if(save)download(safeName()+'-valheim-progress.json',JSON.stringify({format:'valheim-checkup',version:1,save,overrides,pins},null,2),'application/json');};
$('importProgress').onclick=()=>$('progressFile').click();$('progressFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('Progress file is too large.');const d=JSON.parse(await file.text());if(!validateProgress(d))throw Error('Choose a progress export created by Valheim Checkup.');save=d.save;overrides=d.overrides;pins=d.pins;persist();render();message('Restored an exported snapshot. Load a current .fch to refresh automatic progress.');notify('Progress restored.');}catch(err){message(err.message,true);}finally{e.target.value='';}};
$('exportList').onclick=()=>{const quote=s=>'"'+String(s).replaceAll('"','""')+'"';const lines=[['Collection','Item','Status','Discovery','Recorded count','Biome','Bait','Manual correction','Pinned'],...lastRows.map(r=>[current,r.item.name,r.status,r.discovery,r.count,r.item.biome,r.item.bait,r.manual,!!pins[r.item.id]])];download(safeName()+'-'+current.replaceAll(' ','-')+'.csv','\uFEFF'+lines.map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');};
$('forget').onclick=()=>{if(!save||!confirm('Forget '+save.name+'’s extracted progress, corrections, and pins in this browser? Your game save will not change.'))return;try{localStorage.removeItem(key());localStorage.removeItem('valheim-checkup:active');}catch{}save=null;overrides={};pins={};render();message('Saved progress cleared from this browser.');};
for(const name of ['dragenter','dragover'])$('dropzone').addEventListener(name,e=>{e.preventDefault();$('dropzone').classList.add('drag');});$('dropzone').addEventListener('dragleave',()=>$('dropzone').classList.remove('drag'));$('dropzone').addEventListener('drop',e=>{e.preventDefault();$('dropzone').classList.remove('drag');loadFile(e.dataTransfer.files[0]);});
try{const active=localStorage.getItem('valheim-checkup:active'),d=active&&readStored(active);if(d){save=d.save;overrides=d.overrides;pins=d.pins;message('Restored saved progress from this browser. Load a current .fch after playing to refresh it.');}}catch{storageAvailable=false;}
render();
