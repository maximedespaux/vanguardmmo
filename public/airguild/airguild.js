
const D=JSON.parse(document.getElementById('AG_DATA').textContent);
const ICONS=D.icons,LOGOS=D.logos,SLOT=9999;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sq=s=>String(s).replace(/'/g,"\\'");
const fmt=n=>(+n||0).toLocaleString('fr-FR');
function img(ic){return ic&&ICONS[ic]?`<img src="${ICONS[ic]}" alt="">`:'';}
function slotTxt(q){if(typeof q!=='number')return'';const s=q/SLOT;if(s>=1)return(Number.isInteger(s)?s:s.toFixed(1))+' slot'+(s>=2?'s':'');return Math.round(s*100)/100+' slot';}
const LOGOIDX={};Object.keys(LOGOS).forEach((k,i)=>LOGOIDX[k]=i);
const ICOIDX={};Object.keys(ICONS).forEach((k,i)=>ICOIDX[k]=i);
function injectLogoCSS(){let css='';Object.keys(LOGOS).forEach((k,i)=>{css+='.cl-'+i+'{background-image:url('+LOGOS[k]+')}';});Object.keys(ICONS).forEach((k,i)=>{css+='.bic-'+i+'{background-image:url('+ICONS[k]+')}';});const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);}
function classLogo(cl){return cl&&LOGOIDX[cl]!=null?`<span class="climg cl-${LOGOIDX[cl]}"></span>`:null;}

const KEY='vg_airguild_u2';
let S=load();
function canEdit(){return ['VANGUARD','DIRECTION'].indexOf(window.__agRole||'')>=0;} // édition du catalogue réservée Vanguard/Direction (les dépôts de quantité restent ouverts à tous les contributeurs)
function load(){try{const r=JSON.parse(JSON.stringify(window.__AGSTATE||null));if(r&&r.members){r.prices=r.prices||{};r.debts=r.debts||[];r.cart=r.cart||{};r.farm=r.farm||{};r.overrides=r.overrides||{};r.recipes=r.recipes||{};r.cats=r.cats||[];r.hiddenCats=r.hiddenCats||[];r.catAssets=r.catAssets||{};r.catOrder=r.catOrder||[];if(r.tab==='dj')r.tab='bank';if(r.tab==='obj')r.tab='craft';if(r.tab==='shop')r.tab='set';return r;}}catch(e){}
  return{members:['Commun'],cur:'Commun',inv:{Commun:{}},custom:[],hidden:[],log:[],closed:{},farm:{},prices:{},debts:[],cart:{},overrides:{},recipes:{},cats:[],hiddenCats:[],catAssets:{},catOrder:[],shopMember:'',tab:'bank'};}
function save(){try{(window.__agSave&&window.__agSave(S));}catch(e){}}
// ── Dropdown maison : remplace les <select> natifs moches par une liste stylée ──
function vgDD(){
  if(!document.getElementById('vgdd-css')){var st=document.createElement('style');st.id='vgdd-css';st.textContent='.vgdd{position:relative;display:inline-block;vertical-align:bottom}.vgdd-b{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:var(--bg3,#1e1e27);border:1px solid var(--border,#2c2c36);border-radius:8px;color:var(--text,#e8e8ee);padding:7px 11px;font:600 13px Rajdhani,sans-serif;cursor:pointer;transition:border-color .14s,box-shadow .14s}.vgdd-b:hover{border-color:#FF8C1A88}.vgdd.open .vgdd-b{border-color:#FF8C1A;box-shadow:0 0 0 3px rgba(255,140,26,.16)}.vgdd-b i{color:#FF8C1A;font-style:normal;font-size:10px;transition:transform .16s}.vgdd.open .vgdd-b i{transform:rotate(180deg)}.vgdd-l{display:none;position:absolute;top:calc(100% + 5px);left:0;min-width:100%;z-index:99999;background:var(--bg2,#16161d);border:1px solid var(--border,#2c2c36);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);padding:5px;max-height:240px;overflow-y:auto}.vgdd.open .vgdd-l{display:block;animation:vgddin .14s ease}.vgdd-o{padding:7px 12px;border-radius:7px;font-size:13px;cursor:pointer;white-space:nowrap;color:var(--text,#e8e8ee);transition:background .12s}.vgdd-o:hover{background:rgba(255,255,255,.07)}.vgdd-o.on{background:rgba(255,140,26,.14);color:#FF8C1A;font-weight:700}@keyframes vgddin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}';document.head.appendChild(st);}
  document.querySelectorAll('.agx select:not([data-dd])').forEach(function(sel){sel.setAttribute('data-dd','1');var w=sel.offsetWidth;var wrap=document.createElement('span');wrap.className='vgdd';if(w>40)wrap.style.minWidth=w+'px';sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.style.display='none';var btn=document.createElement('button');btn.type='button';btn.className='vgdd-b';wrap.appendChild(btn);var list=document.createElement('div');list.className='vgdd-l';wrap.appendChild(list);function sync(){btn.innerHTML='';var o=sel.options[sel.selectedIndex];var t=document.createElement('span');t.textContent=(o&&o.textContent)||'';var a=document.createElement('i');a.textContent='▾';btn.appendChild(t);btn.appendChild(a);}function close(){wrap.classList.remove('open');list.style.cssText='';document.removeEventListener('mousedown',onOut);window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);}function onOut(e){if(!wrap.contains(e.target))close();}function place(){var r=btn.getBoundingClientRect();list.style.position='fixed';list.style.left=r.left+'px';list.style.minWidth=r.width+'px';var below=window.innerHeight-r.bottom,lh=Math.min(list.scrollHeight,240);if(below<lh+14&&r.top>below){list.style.top=(r.top-lh-4)+'px';}else{list.style.top=(r.bottom+4)+'px';}}function openList(){list.innerHTML='';Array.prototype.forEach.call(sel.options,function(o){var d=document.createElement('div');d.className='vgdd-o'+(o.selected?' on':'');d.textContent=o.textContent;d.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();sel.value=o.value;sync();sel.dispatchEvent(new Event('change',{bubbles:true}));close();});list.appendChild(d);});wrap.classList.add('open');place();setTimeout(function(){document.addEventListener('mousedown',onOut);window.addEventListener('scroll',place,true);window.addEventListener('resize',place);},0);}btn.addEventListener('click',function(e){e.stopPropagation();wrap.classList.contains('open')?close():openList();});sync();});
}
window.addEventListener('beforeunload',save);

function applyOv(it){const o=S.overrides[it.id];return o?Object.assign({},it,o):it;}
function agConfirm(msg,onYes){window.__agY=onYes;openSheet('<div style="padding:4px 2px"><div style="font-size:14px;line-height:1.55;margin-bottom:18px;white-space:pre-line">'+(msg||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="var f=window.__agY;window.__agY=null;closeSheet();if(f)f();">Confirmer</button></div></div>');}
function agToast(msg,ok){var t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:99999;background:#16161c;color:#E8E8EC;border:1px solid '+(ok===false?'#F87171':'#FF8C1A')+';border-radius:10px;padding:11px 18px;font:600 13px/1.4 Inter,system-ui,sans-serif;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.55);opacity:0;transition:opacity .25s,transform .25s';document.body.appendChild(t);requestAnimationFrame(function(){t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";});setTimeout(function(){t.style.opacity="0";t.style.transform="translateX(-50%) translateY(8px)";setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},2800);}
function catalog(){const hid=new Set(S.hidden||[]);return D.bankItems.concat(S.custom||[]).map(applyOv).filter(i=>!hid.has(i.id));}
function vgDot(col){return '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+col+';box-shadow:0 0 4px '+col+'88;vertical-align:middle"></span>';}
function catIcon(cat){const c=cat.trim();if(c.startsWith('Stuff'))return c.includes('Éternel')?vgDot('#f59e0b'):c.includes('Shaitan')?vgDot('#ef4444'):c.includes('Dryades')?vgDot('#22c55e'):vgDot('#a855f7');if(c.startsWith('Armes'))return '⚔️';if(c==='Bijoux')return'💍';if(c==='R1')return vgDot('#3b82f6');if(c==='R2')return vgDot('#eab308');if(c==='Ressource')return'⛏️';if(c.startsWith('Carte'))return'🃏';if(c.startsWith('Butin'))return'🎁';return'📦';}
function catBadge(cat){const c=cat.trim();if(S.catAssets&&S.catAssets[c])return '<img src="'+S.catAssets[c]+'" style="width:16px;height:16px;border-radius:4px;object-fit:cover;vertical-align:middle" alt="">';return catIcon(c);}
function qty(m,id){return(S.inv[m]&&S.inv[m][id])||0;}
function totalGuild(id){let t=0;S.members.forEach(m=>t+=qty(m,id));return t;}
function setQty(m,id,v,label){v=Math.max(0,Math.round(+v||0));if(!S.inv[m])S.inv[m]={};const old=qty(m,id);if(v===old)return;S.inv[m][id]=v;S.log.unshift({ts:Date.now(),member:m,by:(window.__agUser||''),label:label||id,delta:v-old});if(S.log.length>200)S.log.length=200;save();}
function health(q,cat,unit,id){var t=id&&S.thresh&&S.thresh[id];if(t){var ok=+t.ok||0,mid=+t.mid||0;if(ok>0||mid>0){if(ok>0&&q>=ok)return'ok';if(mid>0&&q>=mid)return'mid';return'low';}}const c=cat.trim();if(unit==='slot'){if(q>=2)return'ok';if(q>=1)return'mid';return'low';}if(c==='Ressource'||c==='R1'||c==='R2'||c.startsWith('Carte')){if(q>=20)return'ok';if(q>=8)return'mid';return'low';}if(q>=10)return'ok';if(q>=6)return'mid';return'low';}
function itemAsset(it){if(it.icData)return `<img src="${it.icData}" alt="">`;if(it.ic&&ICOIDX[it.ic]!=null)return `<span class="climg bic-${ICOIDX[it.ic]}"></span>`;return classLogo(it.classe)||`<span>${catIcon(it.cat)}</span>`;}
function priceOf(id){return S.prices[id]!=null?S.prices[id]:(catalog().find(x=>x.id===id)||{}).prix||0;}

const TABS=[['bank','🏦','Dépôt en Coffre de Guilde'],['craft','⚒️','Craft'],['set','⚙️','Paramètres']];
function renderTabs(){$('#tabs').innerHTML=TABS.map(([k,ic,l])=>`<div class="tab ${S.tab===k?'on':''}" onclick="go('${k}')"><span>${ic}</span>${l}${k==='shop'&&S.debts.length?`<span class="pill pr">${S.debts.length}</span>`:''}</div>`).join('');}
function go(t){S.tab=t;save();renderTabs();render();window.scrollTo({top:0,behavior:'smooth'});}
function render(){const v=$('#view');if(!v){if((render._n=(render._n||0)+1)<90)requestAnimationFrame(render);return;}render._n=0;if($('#tabs')&&!$('#tabs').innerHTML.trim()){try{renderTabs();}catch(e){}}try{v.innerHTML=S.tab==='bank'?viewBank():S.tab==='craft'?viewCraft():S.tab==='shop'?viewShop():viewSettings();if(S.tab==='bank'&&bankQ)filterBank(bankQ);if(S.tab==='set'&&cfgQ)filterSet(cfgQ);}catch(err){console.error('[AirGuild] rendu partiel',err);}vgDD();}

/* ============ BANQUE ============ */
let bankQ='';
// F2 : coffres membres liés au roster Discord (auto-créés, plus de « +Membre » manuel ; jamais de suppression de coffre existant → on garde les données).
function syncRoster(){var r=window.__agRoster||[];if(!r.length)return;var ch=false;r.forEach(function(name){if(name&&S.members.indexOf(name)<0){S.members.push(name);if(!S.inv[name])S.inv[name]={};ch=true;}});if(ch)save();}
function viewBank(){
  syncRoster();
  if(!S.members.includes(S.cur)&&S.cur!=='__total__')S.cur=S.members[0];
  const isTotal=S.cur==='__total__';
  const me=(window.__agUser||'').toLowerCase().trim();const roster=window.__agRoster||[];
  const sortedM=S.members.filter(m=>m!=='Commun').sort((a,b)=>{const am=a.toLowerCase().trim()===me,bm=b.toLowerCase().trim()===me;return am===bm?a.localeCompare(b,'fr'):(am?-1:1);});
  const mtabs=`<div class="mtab commun ${S.cur==='Commun'?'on':''}" onclick="selM('Commun')">🏛️ Commun</div>`+
    sortedM.map(m=>{const isMe=!!me&&m.toLowerCase().trim()===me;const inR=roster.indexOf(m)>=0;return `<div class="mtab ${S.cur===m?'on':''}" onclick="selM('${sq(m)}')"${isMe?' title="Ton coffre personnel"':''}>${isMe?'🫵 ':'👤 '}${esc(m)}${isMe?' <span class="pill" style="font-size:8px;padding:1px 5px;background:var(--orange);color:#0a0a0c">perso</span>':''}${inR?'':` <span class="x" onclick="event.stopPropagation();delM('${sq(m)}')">✕</span>`}</div>`;}).join('')+
    `<div class="mtab ${isTotal?'on':''}" onclick="selM('__total__')" style="border-style:dashed">Σ Total guilde</div>`;
  return `<div class="card"><div class="sec-h">🏦 Coffres <span class="n">commun + individuels</span></div><div class="mtabs">${mtabs}</div></div>
   ${S.cur==='Commun'?'<div class="hint" style="margin-top:8px">🏛️ <b>Coffre commun</b> — le coffre partagé de la guilde (dépôts et retraits communs ; sert à la boutique et aux crafts).</div>':isTotal?'<div class="hint" style="margin-top:8px">Σ <b>Total guilde</b> — vue en <b>lecture seule</b> : la somme de tous les coffres (Commun + chaque membre), pour voir ce que la guilde possède au total.</div>':''}
   <div class="toolbar" style="margin-top:14px"><input class="inp" id="bankq" placeholder="Rechercher un objet…" value="${esc(bankQ)}" oninput="bankQ=this.value;filterBank(this.value)" style="flex:1;min-width:180px">${canEdit()?'<button class="btn o" onclick="addItem()">＋ Objet</button>':''}<button class="btn" onclick="recapSheet()">📊 Récap</button><button class="btn" onclick="itemSearchSheet()">🔍 Fiche objet</button><button class="btn" onclick="openJournal()">🧾 Journal</button></div>
   <div id="bankbody">${bankBody()}</div>`;
}
// ── B1 : récap « Mes objets / Mes ventes » + qui détient quoi (par membre) ──
function recapSheet(mineOnly){var me=(window.__agUser||'').toLowerCase().trim();var members=S.members||[];if(mineOnly&&me)members=members.filter(function(m){return m.toLowerCase().trim()===me;});var nameOf={};(catalog()||[]).forEach(function(it){nameOf[it.id]=it;});
  var body=members.map(function(m){var inv=S.inv[m]||{};var items=Object.keys(inv).filter(function(id){return (+inv[id]||0)>0;}).map(function(id){var it=nameOf[id]||{};return {nom:(it.item||id.split('|').pop()),cls:it.classe||'',cat:(it.cat||'').trim(),qty:+inv[id]};});items.sort(function(a,b){return (a.cat+a.nom).localeCompare(b.cat+b.nom,'fr');});var isMe=!!me&&m.toLowerCase().trim()===me;var total=items.reduce(function(s,x){return s+x.qty;},0);
    return '<div class="ocard" style="margin-bottom:10px'+(isMe?';border-color:var(--orange)':'')+'"><div class="sec-h" style="margin:0 0 6px">'+(m==='Commun'?'🏛️ ':'👤 ')+esc(m)+(isMe?' <span class="pill" style="background:var(--orange);color:#0a0a0c">🫵 Mes objets</span>':'')+' <span class="n">'+items.length+' items · '+fmt(total)+' u.</span></div>'+(items.length?'<div style="display:flex;flex-direction:column;gap:3px">'+items.map(function(x){return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span>'+esc(x.nom)+(x.cls?' <span class="mut" style="font-size:10px">'+esc(x.cls)+'</span>':'')+'</span><b style="color:var(--gold)">×'+fmt(x.qty)+'</b></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Coffre vide.</div>')+'</div>';}).join('');
  if(mineOnly&&!body)body='<div class="mut" style="font-size:12px;padding:8px 2px">Aucun coffre à ton nom (« '+esc(window.__agUser||'?')+' »). Vérifie que le coffre porte ton pseudo.</div>';
  var toggle=me?'<button class="btn '+(mineOnly?'o':'')+' sm" onclick="recapSheet('+(mineOnly?'false':'true')+')">'+(mineOnly?'👥 Voir tous les coffres':'🫵 Mes objets seulement')+'</button>':'';
  openSheet('<h3>📊 Récap des coffres — qui détient quoi</h3><div class="hint">Le contenu de chaque coffre, membre par membre. Le tien (« 🫵 Mes objets ») est surligné.</div><div class="toolbar" style="margin:0 0 10px">'+toggle+'</div>'+body+'<div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="closeSheet()">Fermer</button></div>');}
function sortByOrder(arr){const o=S.order||[];return arr.slice().sort(function(a,b){var ia=o.indexOf(a.id),ib=o.indexOf(b.id);return (ia<0?1e9:ia)-(ib<0?1e9:ib);});}
function moveItem(id,dir){var all=sortByOrder(catalog());var it=all.find(function(x){return x.id===id;});if(!it)return;var cat=(it.cat||'').trim();var sibs=all.filter(function(x){return (x.cat||'').trim()===cat;});var i=sibs.findIndex(function(x){return x.id===id;}),j=i+dir;if(j<0||j>=sibs.length)return;S.order=all.map(function(x){return x.id;});var a=S.order.indexOf(id),b=S.order.indexOf(sibs[j].id);var t=S.order[a];S.order[a]=S.order[b];S.order[b]=t;save();render();}
function bankBody(){const cats=sortByOrder(catalog());const isTotal=S.cur==='__total__';
  const byCat={};cats.forEach(it=>{(byCat[it.cat]=byCat[it.cat]||[]).push(it);});
  const order=sortCats(D.bankCats.concat(Object.keys(byCat).filter(c=>!D.bankCats.includes(c))));
  let body='';order.forEach(cat=>{let list=byCat[cat];if(!list||!list.length)return;
    const closed=S.closed[cat]?'closed':'';const sums=list.reduce((a,it)=>a+(isTotal?totalGuild(it.id):qty(S.cur,it.id)),0);
    body+=`<div class="catblk ${closed}"><div class="cathead" onclick="togC('${sq(cat)}')"><span class="ci">${catBadge(cat)}</span><span class="ct">${esc(cat.trim())}</span><span class="meta"><span class="pill">${list.length}</span><span class="pill">${fmt(sums)} u.</span><span class="chev">▾</span></span></div><div class="catbody">${list.map(it=>itemRow(it,isTotal)).join('')}</div></div>`;});
  return body||'<div class="empty">Aucun objet.</div>';
}
function itemRow(it,isTotal){const v=isTotal?totalGuild(it.id):qty(S.cur,it.id);const h=health(v,it.cat,it.unit,it.id);const isSlot=it.unit==='slot';
  const unitTag=isSlot?'<span class="utag">slot</span>':'';
  const ctrl=isTotal?`<div style="font-family:Rajdhani;font-weight:700;font-size:17px;width:96px;text-align:right">${fmt(v)}</div>`:`<div class="step"><button onclick="adj('${sq(it.id)}',-1)">−</button><input value="${v}" onchange="setQ('${sq(it.id)}',this.value)"><button onclick="adj('${sq(it.id)}',1)">＋</button></div>`;
  const custom=(S.custom||[]).some(c=>c.id===it.id);
  const ds=(it.item+' '+(it.classe||'')+' '+it.cat).toLowerCase();
  return `<div class="it" data-s="${esc(ds)}"><div class="logo" onclick="itemDetail('${sq(it.id)}')" style="cursor:pointer" title="Fiche complète">${itemAsset(it)}</div><div class="nm" onclick="itemDetail('${sq(it.id)}')" style="cursor:pointer" title="Fiche complète"><div class="a">${esc(it.item)}</div><div class="b">${it.classe?esc(it.classe):it.cat.trim()}${isSlot?' · compté en slots':''}</div></div><span class="dot ${h}"></span>${ctrl}${unitTag}<span class="rm" onclick="rmItem('${sq(it.id)}',${custom})">✕</span></div>`;
}
function paintBank(){const b=$('#bankbody');if(b){b.innerHTML=bankBody();if(bankQ)filterBank(bankQ);}}
function filterBank(qv){const q=(qv||'').toLowerCase().trim();
  document.querySelectorAll('#bankbody .it').forEach(el=>{el.style.display=(!q||el.dataset.s.includes(q))?'':'none';});
  document.querySelectorAll('#bankbody .catblk').forEach(blk=>{const any=[...blk.querySelectorAll('.it')].some(e=>e.style.display!=='none');blk.style.display=any?'':'none';});
}
function selM(m){S.cur=m;save();render();}
function togC(c){S.closed[c]=!S.closed[c];save();paintBank();}
function adj(id,d){const it=catalog().find(x=>x.id===id);setQty(S.cur,id,qty(S.cur,id)+d,it?it.item:id);paintBank();}
function setQ(id,v){const it=catalog().find(x=>x.id===id);setQty(S.cur,id,v,it?it.item:id);paintBank();}
function addMember(){openSheet(`<h3>Ajouter un coffre membre</h3><div class="field"><label>Nom</label><input class="inp" id="mn" placeholder="ex. Daiisukae"></div><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="doAddMember()">Créer</button></div>`);}
function doAddMember(){const n=$('#mn').value.trim();if(!n)return;if(!S.members.includes(n)){S.members.push(n);S.inv[n]={};}S.cur=n;save();closeSheet();render();}
function delM(m){agConfirm('Supprimer le coffre de '+m+' ?',function(){S.members=S.members.filter(x=>x!==m);delete S.inv[m];if(S.cur===m)S.cur='Commun';save();render();});}
function allCats(){var hid=new Set(S.hiddenCats||[]);return [...new Set(D.bankCats.concat(S.cats||[]).concat((catalog()||[]).map(function(x){return (x.cat||'').trim();}).filter(Boolean)))].filter(function(c){return !hid.has(c);});}
function sortCats(cats){var o=S.catOrder||[];return cats.slice().sort(function(a,b){var ia=o.indexOf(a),ib=o.indexOf(b);return (ia<0?1e9:ia)-(ib<0?1e9:ib);});}
function moveCat(c,dir){if(!canEdit())return;var cats=sortCats(allCats());var i=cats.indexOf(c),j=i+dir;if(j<0||j>=cats.length)return;var t=cats[i];cats[i]=cats[j];cats[j]=t;S.catOrder=cats;save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}}
let _aiTab='item';
function addItem(){if(!canEdit())return agToast('Ajout réservé au rôle Vanguard.',false);_aiTab='item';openSheet(addItemHTML());}
function addItemHTML(){return `<h3>Ajouter au coffre</h3>
  <div style="display:flex;gap:6px;margin-bottom:14px"><button class="btn aitab ${_aiTab==='item'?'o':''}" onclick="addItemTab('item')">📦 Item</button><button class="btn aitab ${_aiTab==='cat'?'o':''}" onclick="addItemTab('cat')">🏷️ Catégories</button></div>
  <div id="aiBody">${_aiTab==='item'?aiItemHTML():aiCatHTML()}</div>`;}
function addItemTab(t){_aiTab=t;var btns=document.querySelectorAll('.aitab');btns.forEach(function(x,i){x.classList.toggle('o',(i===0&&t==='item')||(i===1&&t==='cat'));});var b=document.getElementById('aiBody');if(b){b.innerHTML=t==='item'?aiItemHTML():aiCatHTML();vgDD();}}
function aiItemHTML(){return `<div class="field"><label>Asset / image (optionnel)</label><input class="inp" id="iimg" type="file" accept="image/*"><div class="mut" style="font-size:10.5px;margin-top:4px">PNG/JPG. Vide = logo de classe.</div></div>
  <div class="field"><label>Nom de l'objet</label><input class="inp" id="ii" placeholder="ex. Cristal féerique"></div>
  <div class="field"><label>Catégorie</label><select class="inp" id="ic">${allCats().map(c=>`<option>${esc(c)}</option>`).join('')}</select><div class="mut" style="font-size:10.5px;margin-top:4px">Pas la bonne ? Crée-la dans l'onglet 🏷️ Catégories.</div></div>
  <div class="field"><label>Classe (optionnel)</label><input class="inp" id="icl" placeholder="ex. Arcaniste — ou vide"></div>
  <div class="field"><label>Unité de comptage</label><select class="inp" id="iu"><option value="unitaire">Unitaire (à la pièce)</option><option value="slot">Slot (1 slot = 9 999)</option></select></div>
  <div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="doAddItem()">Ajouter l'item</button></div>`;}
function aiCatHTML(){var cats=sortCats(allCats());var ed=canEdit();return `<div class="hint">Crée et gère les catégories — elles apparaissent dans le menu déroulant de l'onglet Item.${ed?'':' <b>Édition réservée au rôle Vanguard.</b>'}</div>
  ${ed?`<div class="field"><label>Nouvelle catégorie</label><div style="display:flex;gap:8px"><input class="inp" id="newcat" placeholder="ex. Stuff - Luzaka" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();addCat();}"><button class="btn o" onclick="addCat()">Ajouter</button></div></div>`:''}
  <div style="margin-top:12px"><div class="sec-h" style="font-size:11.5px;margin:0 0 6px">Catégories existantes <span class="n">${cats.length}</span></div><div style="display:flex;flex-direction:column;gap:3px;max-height:38vh;overflow:auto">${cats.map(function(c){var n=(catalog()||[]).filter(function(x){return (x.cat||'').trim()===c;}).length;return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;padding:5px 8px;background:#ffffff05;border-radius:6px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${catBadge(c)} ${esc(c)} <span class="mut" style="font-size:10px">${n} item(s)</span></span>${ed?`<span style="display:flex;gap:7px;flex:none;align-items:center"><span style="cursor:pointer;opacity:.6;font-weight:700" title="Monter" onclick="moveCat('${sq(c)}',-1)">↑</span><span style="cursor:pointer;opacity:.6;font-weight:700" title="Descendre" onclick="moveCat('${sq(c)}',1)">↓</span><span style="cursor:pointer;opacity:.7" title="Image de la catégorie" onclick="setCatAsset('${sq(c)}')">📷</span><span style="cursor:pointer;opacity:.7" title="Renommer" onclick="renameCat('${sq(c)}')">✎</span>${!n?`<span class="rm" style="cursor:pointer" title="Supprimer (catégorie vide)" onclick="delCat('${sq(c)}')">✕</span>`:`<span style="opacity:.35;font-size:10px" title="Catégorie non vide — renomme-la ou vide ses objets pour la supprimer">🔒</span>`}</span>`:''}</div>`;}).join('')}</div></div>
  <div class="toolbar" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>`;}
function addCat(){var el=$('#newcat');var v=((el&&el.value)||'').trim();if(!v)return;S.cats=S.cats||[];if(allCats().indexOf(v)<0){S.cats.push(v);save();agToast('Catégorie « '+v+' » ajoutée ✓',true);}else{agToast('Cette catégorie existe déjà.',false);}var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}}
function delCat(c){if(!canEdit())return;var n=(catalog()||[]).filter(function(x){return (x.cat||'').trim()===c;}).length;if(n)return agToast('Catégorie non vide — renomme-la ou vide ses objets avant.',false);S.cats=(S.cats||[]).filter(function(x){return x!==c;});if((D.bankCats||[]).indexOf(c)>=0){S.hiddenCats=S.hiddenCats||[];if(S.hiddenCats.indexOf(c)<0)S.hiddenCats.push(c);}if(S.catAssets)delete S.catAssets[c];save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}agToast('Catégorie « '+c+' » supprimée ✓',true);}
function reopenAddCat(){_aiTab='cat';openSheet(addItemHTML());}
function renameCat(c){if(!canEdit())return;openSheet(`<h3>✎ Renommer la catégorie</h3><div class="field"><label>Nouveau nom</label><input class="inp" id="rncat" value="${esc(c)}"></div><div class="hint">Tous les objets de « ${esc(c)} » seront déplacés vers le nouveau nom.</div><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="reopenAddCat()">Annuler</button><button class="btn o" onclick="doRenameCat('${sq(c)}')">Renommer</button></div>`);var f=$('#rncat');if(f){f.focus();f.select();}}
function doRenameCat(oldc){var nv=(($('#rncat')||{}).value||'').trim();if(!nv)return;if(nv===oldc)return reopenAddCat();
  (S.custom||[]).forEach(function(it){if((it.cat||'').trim()===oldc)it.cat=nv;});
  (D.bankItems||[]).forEach(function(it){var eff=((S.overrides[it.id]&&S.overrides[it.id].cat)||it.cat||'').trim();if(eff===oldc){S.overrides[it.id]=Object.assign({},S.overrides[it.id]||{},{cat:nv});}});
  S.cats=(S.cats||[]).map(function(x){return x===oldc?nv:x;});
  if((D.bankCats||[]).indexOf(oldc)>=0){S.hiddenCats=S.hiddenCats||[];if(S.hiddenCats.indexOf(oldc)<0)S.hiddenCats.push(oldc);}
  if(allCats().indexOf(nv)<0){S.cats.push(nv);}
  if(S.catAssets&&S.catAssets[oldc]){S.catAssets[nv]=S.catAssets[oldc];delete S.catAssets[oldc];}
  save();render();reopenAddCat();agToast('Catégorie renommée en « '+nv+' » ✓',true);}
function setCatAsset(c){if(!canEdit())return;var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){S.catAssets=S.catAssets||{};S.catAssets[c]=r.result;save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}agToast('Image de « '+c+' » mise à jour ✓',true);};r.readAsDataURL(f);};inp.click();}
function doAddItem(){const cat=$('#ic').value,cl=$('#icl').value.trim(),it=$('#ii').value.trim(),unit=$('#iu').value;if(!it)return;
  const fin=icData=>{S.custom=S.custom||[];S.custom.push({id:'custom|'+cl+'|'+it+'|'+Date.now(),cat,classe:cl,item:it,unit,icData:icData||'',ic:'',prix:0});save();closeSheet();render();};
  const f=$('#iimg').files[0];
  if(f){const r=new FileReader();r.onload=()=>fin(r.result);r.readAsDataURL(f);}else fin('');}
function rmItem(id,custom){if(custom)S.custom=(S.custom||[]).filter(c=>c.id!==id);else{S.hidden=S.hidden||[];if(!S.hidden.includes(id))S.hidden.push(id);}save();render();}
function openJournal(){const l=S.log||[];var _byP={};l.forEach(function(e){if(e.by)_byP[e.by]=(_byP[e.by]||0)+e.delta;});var _recap=Object.keys(_byP).sort(function(a,b){return _byP[b]-_byP[a];}).map(function(n){return esc(n)+': '+(_byP[n]>=0?'+':'')+_byP[n];}).join(' · ');openSheet(`<h3>🧾 Journal des mouvements</h3>${_recap?`<div class="mut" style="font-size:11.5px;margin:0 0 8px;padding:8px 10px;background:#ffffff06;border-radius:8px">📊 Par personne : ${_recap}</div>`:''}<div style="max-height:50vh;overflow:auto">${l.length?l.map(e=>`<div class="jrow"><span class="mut" style="width:92px;flex:none;font-size:11px">${new Date(e.ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} ${new Date(e.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span><span style="flex:1;min-width:0"><b>${esc(e.label)}</b> <span class="mut">· ${esc(e.member)}${e.by?' · 👤 '+esc(e.by):''}</span></span><span class="jdelta ${e.delta>=0?'pos':'neg'}">${e.delta>=0?'+':''}${e.delta}</span></div>`).join(''):'<div class="empty">Aucun mouvement.</div>'}</div><div class="toolbar" style="justify-content:space-between;margin:12px 0 0"><button class="btn danger" onclick="clearLog()">Vider</button><button class="btn o" onclick="closeSheet()">Fermer</button></div>`);}
function clearLog(){agConfirm('Vider le journal ?',function(){S.log=[];save();openJournal();});}
// ── F4 : fiche complète d'un objet (où il est · qui l'a · qui le vend · crafts · farm · mouvements) ──
function itemDetail(id){var it=(catalog()||[]).find(function(x){return x.id===id;});if(!it)return;
  var nm=it.item||id,lc=(nm||'').trim().toLowerCase();
  var commun=qty('Commun',id),totG=totalGuild(id),price=priceOf(id);
  var holders=(S.members||[]).filter(function(m){return m!=='Commun'&&qty(m,id)>0;}).map(function(m){return {m:m,q:qty(m,id)};}).sort(function(a,b){return b.q-a.q;});
  var crafts=(((D.objectifs||{}).crafts)||[]).map(function(c){var o=craftCost(c).find(function(o){return (o.n||'').trim().toLowerCase()===lc;});return o?{key:c.key,q:o.q}:null;}).filter(Boolean);
  var farm=((D.dungeons)||[]).filter(function(d){var hit=false;Object.keys(d.groups||{}).forEach(function(g){(d.groups[g]||[]).forEach(function(o){if((o.n||'').trim().toLowerCase()===lc)hit=true;});});return hit;});
  var moves=(S.log||[]).filter(function(e){var l=(e.label||'');return l===nm||l.indexOf(nm)>=0;}).slice(0,12);
  function sect(t,inner){return '<div style="margin:11px 0 0"><div class="sec-h" style="margin:0 0 5px;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px">'+t+'</div>'+inner+'</div>';}
  var html='<h3 style="display:flex;align-items:center;gap:8px"><span class="logo" style="width:34px;height:34px">'+itemAsset(it)+'</span>'+esc(nm)+'</h3>'
    +'<div class="hint">'+esc((it.cat||'').trim())+(it.classe?' · '+esc(it.classe):'')+(it.unit==='slot'?' · compté en slots (1 = 9 999)':'')+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 2px"><span class="pill" style="font-size:12px">🏛️ Commun <b>'+fmt(commun)+'</b></span><span class="pill" style="font-size:12px">🏰 Total guilde <b>'+fmt(totG)+'</b></span>'+(price?'<span class="pill" style="font-size:12px">💰 <b>'+fmt(price)+'</b> périns</span>':'')+'</div>';
  html+=sect('🧍 Membres qui en possèdent',holders.length?'<div style="display:flex;flex-direction:column;gap:3px">'+holders.map(function(h){return '<div style="display:flex;justify-content:space-between;font-size:12.5px"><span>👤 '+esc(h.m)+'</span><b style="color:var(--gold)">×'+fmt(h.q)+'</b></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Aucun membre — seulement le coffre commun.</div>');
  html+=sect('💰 Qui en vend',((commun>0?'<div style="font-size:12.5px">🏛️ Boutique de guilde — <b>'+fmt(commun)+'</b> dispo'+(price?' à <b style="color:var(--gold)">'+fmt(price)+'</b> périns':' <span class="mut">(prix non défini)</span>')+'</div>':'')+(holders.length?'<div class="mut" style="font-size:11.5px;margin-top:3px">À demander aux détenteurs : '+holders.map(function(h){return esc(h.m);}).join(', ')+'</div>':''))||'<div class="mut" style="font-size:12px">Pas en vente actuellement.</div>');
  html+=sect('⚒️ Crafts qui l\'utilisent',crafts.length?'<div style="display:flex;flex-direction:column;gap:3px">'+crafts.map(function(c){return '<div style="display:flex;justify-content:space-between;font-size:12.5px;cursor:pointer" onclick="craftCalc(\''+sq(c.key)+'\')"><span>⚒️ '+esc(c.key)+'</span><span class="mut">×'+esc(String(c.q))+'</span></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Aucune recette connue ne l\'utilise.</div>');
  html+=sect('🌾 Où le farmer',farm.length?'<div style="display:flex;flex-wrap:wrap;gap:6px">'+farm.map(function(d){return '<span class="pill" style="font-size:11.5px">'+d.icon+' '+esc(d.name)+' <span class="mut">'+d.type+'</span></span>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Pas dans les donjons recensés (achat / échange).</div>');
  html+=sect('📋 Derniers mouvements',moves.length?'<div style="display:flex;flex-direction:column;gap:2px;max-height:150px;overflow:auto">'+moves.map(function(e){return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px"><span class="mut">'+new Date(e.ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' · '+esc(e.member)+(e.by?' · '+esc(e.by):'')+'</span><span style="font-weight:700;color:'+(e.delta>=0?'var(--green)':'var(--red)')+'">'+(e.delta>=0?'+':'')+e.delta+'</span></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Aucun mouvement enregistré.</div>');
  html+='<div class="toolbar" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>';
  openSheet(html);}
function itemSearchSheet(){openSheet('<h3>🔍 Fiche d\'un objet</h3><div class="hint">Tape un nom : où il est, qui l\'a, qui le vend, les crafts, le farm et les derniers mouvements.</div><input class="inp" id="isq" placeholder="ex. Catalyseur Bubble…" oninput="itemSearchFilter(this.value)" style="width:100%;margin-bottom:10px"><div id="isres" style="max-height:52vh;overflow:auto"></div><div class="toolbar" style="justify-content:flex-end;margin:8px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>');itemSearchFilter('');var f=document.getElementById('isq');if(f)f.focus();}
function itemSearchFilter(qv){var q=(qv||'').toLowerCase().trim();var items=(catalog()||[]).filter(function(it){return !q||(((it.item||'')+' '+(it.classe||'')+' '+(it.cat||'')).toLowerCase().indexOf(q)>=0);}).sort(function(a,b){return (a.item||'').localeCompare(b.item||'','fr');}).slice(0,40);var el=document.getElementById('isres');if(!el)return;el.innerHTML=items.length?items.map(function(it){return '<div class="it" onclick="itemDetail(\''+sq(it.id)+'\')" style="cursor:pointer"><div class="logo">'+itemAsset(it)+'</div><div class="nm"><div class="a">'+esc(it.item)+'</div><div class="b">'+(it.classe?esc(it.classe):esc((it.cat||'').trim()))+'</div></div><span class="mut" style="font-size:11px;white-space:nowrap">commun ×'+fmt(qty('Commun',it.id))+' · total ×'+fmt(totalGuild(it.id))+'</span></div>';}).join(''):'<div class="empty">Aucun objet.</div>';}

/* ============ DONJONS ============ */
let sel=D.dungeons[0].id,djType='Tous',q='';
function farmCount(){return Object.keys(S.farm||{}).length;}
function djMatches(d,query){if(!query)return true;const s=query.toLowerCase();if(d.name.toLowerCase().includes(s))return true;return Object.values(d.groups).some(a=>a.some(o=>o.n.toLowerCase().includes(s)));}
function viewDj(){
  let list=D.dungeons.slice();if(djType!=='Tous')list=list.filter(d=>d.type===djType);
  const matching=list.filter(d=>djMatches(d,q));if(q&&matching.length&&!matching.some(d=>d.id===sel))sel=matching[0].id;
  const cur=D.dungeons.find(d=>d.id===sel);
  const items=list.map(d=>{const dim=q&&!djMatches(d,q)?'dim':'';const pr=d.prestige?`<span class="pill pr">P${d.prestige}</span>`:'';
    return `<div class="dj ${sel===d.id?'on':''} ${dim}" onclick="pick(${d.id})"><div class="ic">${d.icon}</div><div class="nm"><div class="a">${esc(d.name)}</div><div class="b"><span class="pill ${d.type==='SOLO'?'solo':'groupe'}">${d.type}</span>${pr}</div></div><div class="cnt">${d.n}</div></div>`;}).join('');
  return `${farmBar()}
   <div class="toolbar"><input class="inp" placeholder="🔎 Cherche un objet (Yggdrasil, Anneau, Nucléus…) ou un donjon" value="${esc(q)}" oninput="q=this.value;render()" style="flex:1;min-width:240px"><div class="seg">${['Tous','SOLO','GROUPE'].map(t=>`<button class="${djType===t?'on':''}" onclick="djType='${t}';render()">${t==='Tous'?'Tous':t==='SOLO'?'☀️ Solo':'👥 Groupe'}</button>`).join('')}</div><span class="pill">${matching.length}/${D.dungeons.length}</span></div>
   <div class="split"><div class="djlist">${items}</div><div class="detail">${cur?detail(cur):''}</div></div>`;
}
function pick(id){sel=id;render();}
function detail(d){const pr=d.prestige?`<span class="pill pr">Prestige ${d.prestige}</span>`:'';const cats=Object.keys(d.groups);
  const body=cats.length?cats.map(c=>{const arr=d.groups[c];
    return `<div class="catsec"><h3 class="catcolor-${c.replace(/[^A-Za-z]/g,'')}"><span class="cc">${esc(c)}</span><span class="n">${arr.length}</span></h3><div class="drops">${arr.map(o=>{const f=S.farm[o.n];const sel2=f?'sel':'';const hit=q&&o.n.toLowerCase().includes(q.toLowerCase())?'hit':'';
      return `<div class="drop ${o.slot?'res':''} ${sel2} ${hit}" title="Clique pour viser cette récompense" onclick="farmAdd('${sq(o.n)}','${o.ic}',${d.id},'${c}')">${img(o.ic)||'<span style=width:26px></span>'}<span class="dn">${esc(o.n)}</span>${o.slot?'<span class="slot">slot</span>':''}${f?`<span class="qb">×${f.target}</span>`:''}</div>`;}).join('')}</div></div>`;}).join(''):'<div class="empty">Aucun objet utile recensé.</div>';
  return `<div class="dethead"><div class="ic">${d.icon}</div><div><h2>${esc(d.name)}</h2><div class="meta"><span class="pill ${d.type==='SOLO'?'solo':'groupe'}">${d.type}</span>${pr}<span class="pill">Niv. ${esc(d.lvl)}</span><span class="pill">${fmt(d.hp)} PV</span><span class="pill">${esc(d.elem)}</span></div></div></div>
   <div class="hint">🎯 Clique une récompense pour la viser (re-clic = +1). Puis « Verser au coffre » pour remplir la banque de guilde.</div>${body}`;
}
function farmAdd(name,ic,dj,cat){const f=S.farm[name];if(f)f.target++;else S.farm[name]={n:name,ic,dj,cat:cat||'Butin',target:1,have:0};save();render();}
function farmBar(){const keys=Object.keys(S.farm);if(!keys.length)return '';
  return `<div class="farmbar"><span style="font-family:Rajdhani;font-weight:700;color:var(--orange)">🎯 ${keys.length} objectif(s) de farm</span><span class="spacer"></span><button class="btn sm" onclick="openFarm()">Voir / verser au coffre</button><button class="btn sm danger" onclick="agConfirm('Vider les objectifs ?',function(){S.farm={};save();render();})">Vider</button></div>`;}
function openFarm(){const keys=Object.keys(S.farm);openSheet(`<h3>🎯 Objectifs de farm</h3><div class="hint">« Possédé » se verse au coffre commun puis se remet à 0.</div>${keys.length?keys.map(k=>{const f=S.farm[k];const dj=D.dungeons.find(x=>x.id===f.dj);const pc=f.target?Math.min(100,f.have/f.target*100):0;
   return `<div class="fitem">${img(f.ic)||'<span class="x" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#ffffff08;border-radius:8px">📦</span>'}<div class="fn"><div class="a">${esc(f.n)}</div><div class="b">${dj?dj.icon+' '+esc(dj.name):''}</div><div class="prog"><i style="width:${pc}%"></i></div></div>
     <div style="text-align:center"><div class="mut" style="font-size:10px">possédé</div><div class="step"><button onclick="farmHave('${sq(k)}',-1)">−</button><input value="${f.have}" onchange="farmSet('${sq(k)}','have',this.value)"><button onclick="farmHave('${sq(k)}',1)">＋</button></div></div>
     <div style="text-align:center"><div class="mut" style="font-size:10px">visé</div><div class="step"><button onclick="farmTar('${sq(k)}',-1)">−</button><input value="${f.target}" onchange="farmSet('${sq(k)}','target',this.value)"><button onclick="farmTar('${sq(k)}',1)">＋</button></div></div>
     <button class="btn g sm" onclick="pourToBank('${sq(k)}')">→ Coffre</button>
     <span class="rm" style="opacity:.6" onclick="delFarm('${sq(k)}')">✕</span></div>`;}).join(''):'<div class="empty">Aucun objectif. Clique des récompenses dans les donjons.</div>'}<div class="toolbar" style="justify-content:flex-end;margin:12px 0 0"><button class="btn o" onclick="closeSheet()">Fermer</button></div>`);}
function farmHave(k,d){const f=S.farm[k];if(f){f.have=Math.max(0,f.have+d);save();openFarm();renderTabs();}}
function farmTar(k,d){const f=S.farm[k];if(f){f.target=Math.max(1,f.target+d);save();openFarm();}}
function farmSet(k,p,v){const f=S.farm[k];if(f){f[p]=Math.max(p==='target'?1:0,Math.round(+v||0));save();openFarm();}}
function delFarm(k){delete S.farm[k];save();openFarm();renderTabs();}
function pourToBank(k){const f=S.farm[k];if(!f||!f.have)return;
  if(!D.bankCats.includes('Butin de donjon'))D.bankCats.push('Butin de donjon');
  const id='loot|'+f.n;let it=catalog().find(x=>x.id===id);
  if(!it){S.custom.push({id,cat:'Butin de donjon',classe:'',item:f.n,prix:0});}
  setQty('Commun',id,qty('Commun',id)+f.have,f.n);
  f.have=0;save();openFarm();renderTabs();
}

/* ============ CRAFT ============ */
function ingRow(o){const sl=o.slot&&typeof o.q==='number'?`<div class="b">${slotTxt(o.q)} · 1 slot = 9 999</div>`:'';return `<div class="ing">${img(o.ic)||'<span class="x">📦</span>'}<div class="in"><div class="a">${esc(o.n)}</div>${sl}</div><div class="q">×${typeof o.q==='number'?fmt(o.q):o.q}</div></div>`;}
function craftCost(c){return S.recipes[c.key]||c.cost||[];}
const GROUP_EMOJI={'Œufs':'🥚','Badges':'🎖️','Masques':'🎭','Mantras':'🥋','Médailles & reliques':'🏅'};
// ── Calculateur de craft : recette ↔ stock du coffre (#Phase C) ──
function craftBaseOpts(){return ['Σ Total guilde'].concat(S.members||[]);}
function iqStock(name){var it=(catalog()||[]).find(function(x){return (x.item||'').trim().toLowerCase()===(name||'').trim().toLowerCase();});if(!it)return {found:false,stock:0};var b=window.__craftBase||'Σ Total guilde';var st;if(b==='Σ Total guilde'){st=(S.members||[]).reduce(function(s,m){return s+(+((S.inv[m]||{})[it.id])||0);},0);}else{st=+((S.inv[b]||{})[it.id])||0;}return {found:true,stock:st,id:it.id,unit:it.unit,item:it.item};}
function craftCalc(key){var c=(D.objectifs.crafts||[]).find(function(x){return x.key===key;});if(!c)return;var cost=craftCost(c).filter(function(o){return o.n&&String(o.n).trim();});var base=window.__craftBase||'Σ Total guilde';
  var rows=cost.map(function(o){var req=Number(o.q);var hasNum=!isNaN(req)&&o.q!==''&&o.q!=='?';var s=iqStock(o.n);var ok=hasNum?(s.stock>=req):null;var col=ok===null?'var(--mut)':(ok?'var(--green)':'var(--red)');var poss=hasNum?((s.found?s.stock:0)+' / '+req):('? / '+(o.q||'?'));return '<div class="ing"><span class="x">'+(img(o.ic)||'📦')+'</span><div class="in"><div class="a">'+esc(o.n)+(s.found?'':' <span class="mut" style="font-size:9px">(pas au coffre)</span>')+'</div></div><div class="q" style="color:'+col+';font-weight:700">'+poss+' '+(ok===null?'':(ok?'✅':'⚠️'))+'</div></div>';}).join('');
  var numeric=cost.filter(function(o){var q=Number(o.q);return !isNaN(q)&&o.q!==''&&o.q!=='?';});
  var feasible=numeric.length?Math.min.apply(null,numeric.map(function(o){var s=iqStock(o.n);var q=Number(o.q);return q>0?Math.floor(s.stock/q):0;})):0;
  var missing=numeric.map(function(o){var s=iqStock(o.n);return {n:o.n,manque:Number(o.q)-s.stock};}).filter(function(m){return m.manque>0;});
  var totReq=0,totHave=0;numeric.forEach(function(o){var req=Number(o.q);var s=iqStock(o.n);totReq+=req;totHave+=Math.min(s.stock,req);});var prog=totReq?Math.round(totHave/totReq*100):0;var progCol=prog>=100?'var(--green)':prog>=50?'var(--gold)':'var(--orange)';var progBar=numeric.length?'<div style="margin:12px 0 4px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><span class="mut">Progression vers le craft</span><span style="font-weight:700;color:'+progCol+'">'+prog+'%</span></div><div style="height:8px;background:#ffffff10;border-radius:5px;overflow:hidden"><i style="display:block;width:'+Math.min(100,prog)+'%;height:100%;background:'+progCol+';transition:width .3s"></i></div></div>':'';
  var verdict=!numeric.length?'<div class="mut">Recette à compléter (renseigne les quantités).</div>':(!missing.length?'<div style="color:var(--green);font-weight:700;font-size:15px">✅ Réalisable ×'+feasible+'</div>':'<div style="color:var(--red);font-weight:700">⚠️ Il manque : '+missing.map(function(m){return esc(m.n)+' ×'+m.manque;}).join(' · ')+'</div>');
  var baseSel='<select class="inp" style="max-width:210px" onchange="window.__craftBase=this.value;craftCalc(\''+sq(key)+'\')">'+craftBaseOpts().map(function(b){return '<option '+(b===base?'selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select>';
  openSheet('<h3>🧮 '+esc(key)+'</h3><div class="hint" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">Base de stock : '+baseSel+'</div><div id="recrows" style="margin-top:8px">'+(rows||'<div class="mut">Aucun ingrédient.</div>')+'</div>'+progBar+'<div style="margin:12px 0">'+verdict+'</div><div class="toolbar" style="justify-content:space-between;margin:0">'+(missing.length?'<button class="btn o" onclick="craftFarm(\''+sq(key)+'\')">📋 Créer une demande de farm</button>':'<span></span>')+'<button class="btn" onclick="closeSheet()">Fermer</button></div>');}
function craftFarm(key){var c=(D.objectifs.crafts||[]).find(function(x){return x.key===key;});if(!c)return;var cost=craftCost(c);var added=0;S.farm=S.farm||{};cost.forEach(function(o){var q=Number(o.q);if(isNaN(q)||o.q===''||o.q==='?')return;var s=iqStock(o.n);var manque=q-s.stock;if(manque>0){if(S.farm[o.n]){S.farm[o.n].target=Math.max(S.farm[o.n].target||0,manque);S.farm[o.n].cat='Craft : '+key;}else{S.farm[o.n]={n:o.n,ic:o.ic||'',dj:0,cat:'Craft : '+key,target:manque,have:0};}added++;}});save();closeSheet();render();agToast(added+' ingrédient(s) ajouté(s) à la liste de farm ✓',true);}
function craftCard(c){const cost=craftCost(c);const edited=!!S.recipes[c.key];
  return `<div class="ocard"><h3>${img(c.ic)||GROUP_EMOJI[c.group]||'⚒️'} ${esc(c.key)}</h3>
    <div class="npc">${c.npc?esc(c.npc):(cost.length?'Composants':'Recette à compléter')}${edited?' · <span style="color:var(--gold)">modifiée</span>':''}</div>
    ${cost.length?cost.map(ingRow).join(''):'<div class="mut" style="font-size:12px;padding:6px 0">Aucune recette renseignée.</div>'}
    <div class="toolbar" style="margin:8px 0 0">${cost.length?`<button class="btn sm o" onclick="craftCalc('${sq(c.key)}')">🧮 Calculer</button> `:''}<button class="btn sm" onclick="openRecipe('${sq(c.key)}')">✎ Éditer la recette</button></div></div>`;}
function farmReqSection(){var fk=Object.keys(S.farm||{});if(!fk.length)return '';return '<div style="margin-top:6px"><div class="sec-h">📋 Demandes de farm en cours <span class="n">'+fk.length+'</span></div><div class="ogrid">'+fk.map(function(k){var f=S.farm[k];var have=f.have||0;var pc=f.target?Math.min(100,Math.round(have/f.target*100)):0;return '<div class="ocard" style="padding:10px"><div style="display:flex;align-items:center;gap:8px"><span class="x">'+(img(f.ic)||'📦')+'</span><div style="flex:1;min-width:0"><div class="a" style="font-weight:600">'+esc(f.n)+'</div><div class="mut" style="font-size:10px">'+esc(f.cat||'')+'</div></div><span class="rm" style="cursor:pointer" onclick="delete S.farm[\''+sq(k)+'\'];save();render()">✕</span></div><div class="mut" style="font-size:11px;margin:5px 0 3px">'+have+' / '+f.target+'</div><div class="prog"><i style="width:'+pc+'%"></i></div><div class="toolbar" style="margin:6px 0 0;gap:4px"><button class="btn sm" onclick="var f=S.farm[\''+sq(k)+'\'];if(f){f.have=Math.max(0,(f.have||0)-1);save();render();}">−</button><button class="btn sm" onclick="var f=S.farm[\''+sq(k)+'\'];if(f){f.have=(f.have||0)+1;save();render();}">＋</button></div></div>';}).join('')+'</div></div>';}
function viewCraft(){const O=D.objectifs;const groups=['Œufs','Badges','Masques','Mantras','Médailles & reliques'];
  const byG={};O.crafts.forEach(c=>{(byG[c.group]=byG[c.group]||[]).push(c);});
  const tiers=Object.keys(O.prestige).sort((a,b)=>+a-+b);
  return `<div class="legend">Recettes & items. Les <b>ressources</b> en gros volume se comptent en <b>slots</b> (1 = 9 999) ; <b>médailles & reliques</b> à l'unité. Tu peux <b>compléter une recette</b> dès que tu as les infos du guide book.</div>
   ${farmReqSection()}
   ${groups.map(g=>byG[g]?`<div style="margin-top:6px"><div class="sec-h">${GROUP_EMOJI[g]||''} ${esc(g)} <span class="n">${byG[g].length}</span></div><div class="ogrid">${byG[g].map(craftCard).join('')}</div></div>`:'').join('')}
   <div style="margin-top:14px"><div class="sec-h">🏆 Prestige — coût par palier</div><div class="ogrid">${tiers.map(t=>`<div class="ocard"><div class="tierhead">P${+t-1} → P${t}</div>${O.prestige[t].map(ingRow).join('')}</div>`).join('')}</div></div>`;
}
function openRecipe(key){const base=D.objectifs.crafts.find(c=>c.key===key);const cur=(S.recipes[key]||base.cost||[]).map(x=>({n:x.n,q:x.q,slot:!!x.slot,ic:x.ic||''}));
  window.__rec=cur;
  drawRecipe(key);}
function drawRecipe(key){const cur=window.__rec;
  const rows=cur.map((r,i)=>`<div class="ing"><span class="x">${img(r.ic)||'📦'}</span><input class="inp" style="flex:1" value="${esc(r.n)}" oninput="window.__rec[${i}].n=this.value" placeholder="Nom de l'ingrédient"><input class="inp" style="width:90px" value="${esc(r.q)}" oninput="window.__rec[${i}].q=this.value" placeholder="Qté"><label class="mut" style="font-size:10px;display:flex;flex-direction:column;align-items:center">slot<input type="checkbox" ${r.slot?'checked':''} onchange="window.__rec[${i}].slot=this.checked"></label><span class="rm" style="opacity:.6;cursor:pointer" onclick="window.__rec.splice(${i},1);drawRecipe('${sq(key)}')">✕</span></div>`).join('');
  openSheet(`<h3>✎ Recette — ${esc(key)}</h3><div class="hint">Renseigne les ingrédients et quantités. Coche « slot » pour les grosses ressources.</div>
   <div id="recrows">${rows||'<div class="mut" style="font-size:12px">Aucun ingrédient.</div>'}</div>
   <div class="toolbar" style="margin:10px 0"><button class="btn sm" onclick="window.__rec.push({n:'',q:'',slot:false,ic:''});drawRecipe('${sq(key)}')">＋ Ingrédient</button></div>
   <div class="toolbar" style="justify-content:space-between;margin:0"><button class="btn danger sm" onclick="delete S.recipes['${sq(key)}'];save();closeSheet();render()">Réinitialiser</button><div><button class="btn" onclick="closeSheet()">Annuler</button> <button class="btn o" onclick="saveRecipe('${sq(key)}')">Enregistrer</button></div></div>`);}
function saveRecipe(key){const cur=(window.__rec||[]).filter(r=>r.n&&String(r.n).trim()).map(r=>{const qn=Number(r.q);return {n:r.n.trim(),q:isNaN(qn)||r.q===''?(r.q||'?'):qn,slot:!!r.slot,ic:r.ic||''};});
  S.recipes[key]=cur;save();closeSheet();render();}

/* ============ BOUTIQUE / DETTE ============ */
let shopQ='';
function viewShop(){
  if(!S.shopMember)S.shopMember=S.members.find(m=>m!=='Commun')||'';
  const memberOpts=S.members.filter(m=>m!=='Commun');
  const cats=catalog();const q=shopQ.toLowerCase();
  // articles dispo = stock Commun > 0
  let list=cats.filter(it=>qty('Commun',it.id)>0);
  if(q)list=list.filter(it=>(it.item+' '+it.classe).toLowerCase().includes(q));
  const rows=list.map(it=>{const stock=qty('Commun',it.id);const inCart=(S.cart[it.id]||0);const logo=itemAsset(it);
    return `<div class="shopitem"><div class="logo">${logo}</div><div class="nm" style="flex:1;min-width:0"><div class="a" style="font-weight:600;font-size:13.5px">${esc(it.item)}</div><div class="b" style="color:var(--mut);font-size:11px">${it.classe?esc(it.classe)+' · ':''}stock ${stock}</div></div>
      <div class="price"><input class="inp" type="number" value="${priceOf(it.id)}" onchange="setPrice('${sq(it.id)}',this.value)" title="Prix (périns)"></div>
      <div class="step"><button onclick="cartAdd('${sq(it.id)}',-1)">−</button><input value="${inCart}" onchange="cartSet('${sq(it.id)}',this.value)"><button onclick="cartAdd('${sq(it.id)}',1)">＋</button></div></div>`;}).join('');
  return `<div class="card" style="margin-bottom:14px"><div class="sec-h">🛒 Boutique de guilde <span class="n">articles en stock dans le coffre commun</span></div>
    <div class="toolbar" style="margin:0"><label class="mut" style="font-size:12px">Membre :</label>
      <select class="inp" onchange="S.shopMember=this.value;save();render()">${memberOpts.length?memberOpts.map(m=>`<option ${S.shopMember===m?'selected':''}>${esc(m)}</option>`).join(''):'<option value="">— ajoute un membre dans Banque —</option>'}</select>
      <input class="inp" placeholder="Rechercher un article…" value="${esc(shopQ)}" oninput="shopQ=this.value;render()" style="flex:1;min-width:160px"></div></div>
   <div class="shopgrid"><div class="card" style="padding:8px 12px">${rows||'<div class="empty">Aucun article en stock dans le coffre commun. Remplis-le via Banque ou Donjons.</div>'}</div>
     ${cartPanel()}</div>
   ${debtsPanel()}`;
}
function setPrice(id,v){S.prices[id]=Math.max(0,Math.round(+v||0));save();}
function cartAdd(id,d){const stock=qty('Commun',id);S.cart[id]=Math.max(0,Math.min(stock,(S.cart[id]||0)+d));if(!S.cart[id])delete S.cart[id];save();render();}
function cartSet(id,v){const stock=qty('Commun',id);S.cart[id]=Math.max(0,Math.min(stock,Math.round(+v||0)));if(!S.cart[id])delete S.cart[id];save();render();}
function cartTotal(){let t=0;Object.keys(S.cart).forEach(id=>t+=S.cart[id]*priceOf(id));return t;}
function cartPanel(){const ids=Object.keys(S.cart);const cat=catalog();
  const rows=ids.map(id=>{const it=cat.find(x=>x.id===id)||{item:id};return `<div class="crow"><span class="cn">${esc(it.item)} <span class="mut">×${S.cart[id]}</span></span><span class="cq">${fmt(S.cart[id]*priceOf(id))}</span><span class="rm" style="opacity:.6;cursor:pointer" onclick="cartSet('${sq(id)}',0)">✕</span></div>`;}).join('');
  return `<div class="cart"><div class="sec-h">🧺 Panier de ${esc(S.shopMember||'—')}</div>${ids.length?rows:'<div class="empty" style="padding:20px">Panier vide.</div>'}
    <div class="tot"><span class="mut" style="font-size:13px">Total</span><span style="color:var(--gold)">${fmt(cartTotal())} <span style="font-size:12px">périns</span></span></div>
    <div class="toolbar" style="margin:0"><button class="btn g" style="flex:1" onclick="checkout('achat')" ${!ids.length||!S.shopMember?'disabled':''}>🛒 Achat direct</button><button class="btn o" style="flex:1" onclick="checkout('dette')" ${!ids.length||!S.shopMember?'disabled':''}>📝 Dette</button></div>
    <div class="hint">Les deux options retirent les objets du coffre commun. « Dette » enregistre le montant dû par le membre.</div></div>`;
}
function checkout(mode){const ids=Object.keys(S.cart);if(!ids.length||!S.shopMember)return;const cat=catalog();
  const items=ids.map(id=>({id,name:(cat.find(x=>x.id===id)||{item:id}).item,qty:S.cart[id],price:priceOf(id)}));
  const total=cartTotal();
  items.forEach(l=>setQty('Commun',l.id,qty('Commun',l.id)-l.qty,(mode==='dette'?'Dette ':'Vente ')+l.name+' ('+S.shopMember+')'));
  if(mode==='dette')S.debts.unshift({member:S.shopMember,items,total,ts:Date.now()});
  S.cart={};save();render();
  openSheet(`<h3>${mode==='dette'?'📝 Dette enregistrée':'🛒 Achat effectué'}</h3><p class="mut">${esc(S.shopMember)} · ${items.reduce((a,l)=>a+l.qty,0)} objet(s) · <b style="color:var(--gold)">${fmt(total)} périns</b>${mode==='dette'?' dû à la guilde.':' — réglé.'}</p><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn o" onclick="closeSheet()">OK</button></div>`);
}
function debtsPanel(){if(!S.debts.length)return '';
  return `<div class="card" style="margin-top:14px"><div class="sec-h">📒 Dettes en cours <span class="n">${S.debts.length}</span></div>
   ${S.debts.map((d,i)=>`<div class="debt"><span class="dm">${esc(d.member)}</span><span class="badgeo">${fmt(d.total)} périns</span><span class="mut" style="flex:1;font-size:11.5px">${d.items.map(l=>esc(l.name)+'×'+l.qty).join(', ')}</span><span class="mut" style="font-size:11px">${new Date(d.ts).toLocaleDateString('fr-FR')}</span><button class="btn g sm" onclick="settleDebt(${i})">Réglée</button><button class="btn sm danger" onclick="cancelDebt(${i})">Annuler</button></div>`).join('')}</div>`;}
function settleDebt(i){S.debts.splice(i,1);save();render();}
function cancelDebt(i){const d=S.debts[i];agConfirm('Annuler la dette et remettre les objets au coffre commun ?',function(){d.items.forEach(l=>setQty('Commun',l.id,qty('Commun',l.id)+l.qty,'Annul. dette '+l.name));S.debts.splice(i,1);save();render();});}

/* ============ PARAMÈTRES (base de données) ============ */
let cfgQ='';
function filterSet(qv){const q=(qv||'').toLowerCase().trim();document.querySelectorAll('#setbody .it').forEach(el=>{el.style.display=(!q||el.dataset.s.includes(q))?'':'none';});}
function viewSettings(){const cats=sortByOrder(catalog());
  const rows=cats.map(it=>{const ds=(it.item+' '+(it.classe||'')+' '+it.cat).toLowerCase();const custom=(S.custom||[]).some(c=>c.id===it.id);const ov=!!S.overrides[it.id];
    return `<div class="it" data-s="${esc(ds)}"><div class="logo">${itemAsset(it)}</div>
      <div class="nm"><div class="a">${esc(it.item)} ${ov?'<span class="utag" style="color:var(--gold);border-color:#ffd24a55;background:#ffd24a14">modifié</span>':''}${custom?'<span class="utag" style="color:var(--blue);border-color:#4ea8ff55;background:#4ea8ff14">perso</span>':''}</div><div class="b">${esc(it.cat.trim())}${it.classe?' · '+esc(it.classe):''} · ${it.unit==='slot'?'slot':'unitaire'}${it.prix?' · '+fmt(it.prix)+' périns':''}</div></div>
      ${canEdit()?`<button class="btn sm" onclick="moveItem('${sq(it.id)}',-1)" title="Monter dans la catégorie">↑</button><button class="btn sm" onclick="moveItem('${sq(it.id)}',1)" title="Descendre dans la catégorie">↓</button><button class="btn sm" onclick="editItem('${sq(it.id)}')">✎ Éditer</button><span class="rm" onclick="rmItem('${sq(it.id)}',${custom});render()">🗑</span>`:'<span class="mut" style="font-size:10px">🔒 lecture seule</span>'}</div>`;}).join('');
  return `<div class="card" style="margin-bottom:14px"><div class="sec-h">⚙️ Base de données du coffre <span class="n">${cats.length} objets</span></div>
     <div class="toolbar" style="margin:0"><input class="inp" placeholder="Rechercher…" value="${esc(cfgQ)}" oninput="cfgQ=this.value;filterSet(this.value)" style="flex:1;min-width:160px">${canEdit()?'<button class="btn o" onclick="addItem()">＋ Ajouter</button>':''}<button class="btn" onclick="exportData()">⬇️ Exporter</button>${canEdit()?'<button class="btn" onclick="importData()">⬆️ Importer</button>':''}</div>
     <div class="hint">Édite n'importe quel objet (nom, catégorie, classe, unité unitaire/slot, asset, prix) ou ajoute-en. Tout est sauvegardé localement.</div></div>
   <div class="card" id="setbody" style="padding:8px 12px">${rows||'<div class="empty">Aucun objet.</div>'}</div>`;
}
function editItem(id){if(!canEdit())return agToast('Édition réservée au rôle Vanguard.',false);const it=catalog().find(x=>x.id===id);if(!it)return;
  const opts=D.bankCats.concat(['Butin de donjon','Autre']).filter((v,i,a)=>a.indexOf(v)===i);
  openSheet(`<h3>✎ Éditer l'objet</h3>
   <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><div class="logo" style="width:54px;height:54px">${itemAsset(it)}</div><div class="mut" style="font-size:11px">Asset actuel</div></div>
   <div class="field"><label>Nom</label><input class="inp" id="eN" value="${esc(it.item)}"></div>
   <div class="field"><label>Catégorie</label><select class="inp" id="eC">${[...new Set(opts.concat(allCats()).concat([(it.cat||'').trim()]).filter(Boolean))].map(c=>`<option ${c===(it.cat||'').trim()?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
   <div class="field"><label>Classe (optionnel)</label><input class="inp" id="eCl" value="${esc(it.classe||'')}"></div>
   <div class="field"><label>Unité</label><select class="inp" id="eU"><option value="unitaire" ${it.unit!=='slot'?'selected':''}>Unitaire</option><option value="slot" ${it.unit==='slot'?'selected':''}>Slot (×9 999)</option></select></div>
   <div class="field"><label>Prix boutique (périns)</label><input class="inp" id="eP" type="number" value="${it.prix||0}"></div>
   <div class="field"><label>Seuils de couleur du stock <span class="mut" style="font-size:10px">(laisse vide = seuils par défaut)</span></label><div style="display:flex;gap:8px"><input class="inp" id="eTmid" type="number" min="0" placeholder="Orange à partir de…" value="${(S.thresh&&S.thresh[id]&&S.thresh[id].mid)||''}"><input class="inp" id="eTok" type="number" min="0" placeholder="Vert à partir de…" value="${(S.thresh&&S.thresh[id]&&S.thresh[id].ok)||''}"></div></div>
   <div class="field"><label>Changer l'asset (image)</label><input class="inp" id="eImg" type="file" accept="image/*"><div class="mut" style="font-size:10.5px;margin-top:4px"><label><input type="checkbox" id="eClr"> Retirer l'asset (revenir au logo de classe)</label></div></div>
   <div class="toolbar" style="justify-content:space-between;margin:0"><button class="btn danger" onclick="agConfirm('Supprimer cet objet ?',function(){rmItem('${sq(id)}',${(S.custom||[]).some(c=>c.id===id)});closeSheet();render();})">Supprimer</button><div><button class="btn" onclick="closeSheet()">Annuler</button> <button class="btn o" onclick="saveItem('${sq(id)}')">Enregistrer</button></div></div>`);}
function saveItem(id){const item=$('#eN').value.trim();if(!item)return;const cat=$('#eC').value,classe=$('#eCl').value.trim(),unit=$('#eU').value,prix=Math.max(0,Math.round(+$('#eP').value||0));const tmid=Math.max(0,parseInt($('#eTmid').value,10)||0),tok=Math.max(0,parseInt($('#eTok').value,10)||0);S.thresh=S.thresh||{};if(tmid>0||tok>0){S.thresh[id]={mid:tmid,ok:tok};}else{delete S.thresh[id];}
  const fin=icData=>{const cust=(S.custom||[]).find(c=>c.id===id);
    if(cust){Object.assign(cust,{item,cat,classe,unit,prix});if($('#eClr').checked)cust.icData='';else if(icData)cust.icData=icData;delete S.overrides[id];}
    else{const ov=Object.assign({},S.overrides[id]||{},{item,cat,classe,unit,prix});if($('#eClr').checked)ov.icData='';else if(icData)ov.icData=icData;S.overrides[id]=ov;}
    save();closeSheet();render();};
  const f=$('#eImg').files[0];
  if(f){const r=new FileReader();r.onload=()=>fin(r.result);r.readAsDataURL(f);}else fin('');}
function exportData(){const blob=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='airguild-coffre.json';a.click();}
function importData(){const inp=document.createElement('input');inp.type='file';inp.accept='application/json';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d&&d.members){S=d;S.overrides=S.overrides||{};S.recipes=S.recipes||{};S.prices=S.prices||{};S.debts=S.debts||[];save();renderTabs();render();}else agToast('Fichier invalide.',false);}catch(e){agToast('Fichier illisible.',false);}};r.readAsText(f);};inp.click();}

function openSheet(html){$('#sheet').innerHTML=html;$('#modal').classList.add('on');vgDD();}
function closeSheet(){$('#modal').classList.remove('on');}
let _agBd=false;$('#modal').addEventListener('mousedown',e=>{_agBd=(e.target.id==='modal');});$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&_agBd)closeSheet();_agBd=false;});
injectLogoCSS();renderTabs();render();
;
window.__APP='airguild';
// Auto-réparation : si le conteneur AirGuild est recréé vide (re-clic sur le lien nav / navigation vers la même route), on relance render() automatiquement.
(function(){try{var _heal=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var ns=muts[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(n.nodeType!==1)continue;var v=(n.id==='view')?n:(n.querySelector?n.querySelector('#view'):null);if(v&&!v.innerHTML.trim()){try{render();}catch(e){}return;}}}});_heal.observe(document.body,{childList:true,subtree:true});}catch(e){}})();