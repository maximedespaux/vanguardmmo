/* __VGI_FALLBACK : le pont d'icônes (public/icons/vg-icons.js) est chargé avant
   ce fichier par src/lib/vanillaLoader.ts. Filet si le moteur est chargé seul. */
if(typeof window.VGI!=='function'){window.VGI=function(){return '';};window.VGI.has=function(){return false;};}

const D=JSON.parse(document.getElementById('AG_DATA').textContent);
const ICONS=D.icons,LOGOS=D.logos,SLOT=9999;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sq=s=>String(s).replace(/'/g,"\\'");
const fmt=n=>(+n||0).toLocaleString('fr-FR');
function img(ic){return ic?(ICONS[ic]?`<img src="${ICONS[ic]}" alt="">`:(ic.charAt(0)==='/'?`<img src="${ic}" alt="">`:'')):'';}
function slotTxt(q){if(typeof q!=='number')return'';const s=q/SLOT;if(s>=1)return(Number.isInteger(s)?s:s.toFixed(1))+' slot'+(s>=2?'s':'');return Math.round(s*100)/100+' slot';}
const LOGOIDX={};Object.keys(LOGOS).forEach((k,i)=>LOGOIDX[k]=i);
const ICOIDX={};Object.keys(ICONS).forEach((k,i)=>ICOIDX[k]=i);
function injectLogoCSS(){let css='';Object.keys(LOGOS).forEach((k,i)=>{css+='.cl-'+i+'{background-image:url('+LOGOS[k]+')}';});Object.keys(ICONS).forEach((k,i)=>{css+='.bic-'+i+'{background-image:url('+ICONS[k]+')}';});const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);}
// Retire le fond magenta (#f0f, chroma-key des sprites Flyff) d'une image data-URL, via un canvas → PNG transparent.
function keyMagenta(dataUrl,cb){if(!dataUrl||typeof dataUrl!=='string'||dataUrl.indexOf('data:image')!==0){cb(dataUrl);return;}var im=new Image();im.onload=function(){try{var w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;if(!w||!h){cb(dataUrl);return;}var cv=document.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d');cx.drawImage(im,0,0);var d=cx.getImageData(0,0,w,h),p=d.data,ch=false;for(var i=0;i<p.length;i+=4){if(p[i]>200&&p[i+1]<80&&p[i+2]>200&&p[i+3]>0){p[i+3]=0;ch=true;}}if(!ch){cb(dataUrl);return;}cx.putImageData(d,0,0);cb(cv.toDataURL('image/png'));}catch(e){cb(dataUrl);}};im.onerror=function(){cb(dataUrl);};im.src=dataUrl;}
// Nettoyage UNIQUE des icônes déjà uploadées avec un fond magenta (items custom, overrides d'objets, images de catégorie).
function cleanMagentaIcData(){if(S._magClean)return;var refs=[];(S.custom||[]).forEach(function(it){if(it&&it.icData)refs.push([it,'icData']);});var ov=S.overrides||{};Object.keys(ov).forEach(function(id){if(ov[id]&&ov[id].icData)refs.push([ov[id],'icData']);});var ca=S.catAssets||{};Object.keys(ca).forEach(function(c){if(ca[c])refs.push([ca,c]);});if(!refs.length){S._magClean=1;save();return;}var done=0,any=false;refs.forEach(function(r){var obj=r[0],k=r[1],orig=obj[k];keyMagenta(orig,function(clean){if(clean&&clean!==orig){obj[k]=clean;any=true;}if(++done===refs.length){S._magClean=1;save();if(any){render();agToast&&agToast('Icônes nettoyées (fond magenta retiré) ',true);}}});});}
function classLogo(cl){return cl&&LOGOIDX[cl]!=null?`<span class="climg cl-${LOGOIDX[cl]}"></span>`:null;}

const KEY='vg_airguild_u2';
let S=load();
function canEdit(){return ['VANGUARD','DIRECTION'].indexOf(window.__agRole||'')>=0;} // édition du catalogue réservée Vanguard/Direction
// Dépôt : chaque staff ne modifie que SON coffre (repéré par pseudo Discord) ; Vanguard/Direction peuvent corriger partout.
function canDeposit(){var me=(window.__agUser||'').toLowerCase().trim();return canEdit()||(S.cur!=='__total__'&&!!me&&String(S.cur).toLowerCase().trim()===me);}
function load(){try{const r=JSON.parse(JSON.stringify(window.__AGSTATE||null));if(r&&r.members){r.prices=r.prices||{};r.debts=r.debts||[];r.cart=r.cart||{};r.farm=r.farm||{};r.overrides=r.overrides||{};r.recipes=r.recipes||{};r.cats=r.cats||[];r.hiddenCats=r.hiddenCats||[];r.catAssets=r.catAssets||{};r.catOrder=r.catOrder||[];r.customCrafts=r.customCrafts||[];r.hiddenCrafts=r.hiddenCrafts||[];r.craftAssets=r.craftAssets||{};if(r.tab==='dj')r.tab='bank';if(r.tab==='obj')r.tab='craft';if(r.tab==='shop')r.tab='set';return r;}}catch(e){}
  return{members:[],cur:'__total__',inv:{},mainCoffre:'ibeats',_csetup:2,custom:[],hidden:[],log:[],closed:{},farm:{},prices:{},debts:[],cart:{},overrides:{},recipes:{},cats:[],hiddenCats:[],catAssets:{},catOrder:[],customCrafts:[],hiddenCrafts:[],craftAssets:{},shopMember:'',tab:'bank'};}
function save(){try{(window.__agSave&&window.__agSave(S));}catch(e){}}
// ── Dropdown maison : remplace les <select> natifs moches par une liste stylée ──
function vgDD(){
  if(!document.getElementById('vgdd-css')){var st=document.createElement('style');st.id='vgdd-css';st.textContent='.vgdd{position:relative;display:inline-block;vertical-align:bottom}.vgdd-b{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:var(--bg3,#1e1e27);border:1px solid var(--border,#2c2c36);border-radius:8px;color:var(--text,#e8e8ee);padding:7px 11px;font:600 13px Rajdhani,sans-serif;cursor:pointer;transition:border-color .14s,box-shadow .14s}.vgdd-b:hover{border-color:#FF8C1A88}.vgdd.open .vgdd-b{border-color:#FF8C1A;box-shadow:0 0 0 3px rgba(255,140,26,.16)}.vgdd-b i{color:#FF8C1A;font-style:normal;font-size:10px;transition:transform .16s}.vgdd.open .vgdd-b i{transform:rotate(180deg)}.vgdd-l{display:none;position:absolute;top:calc(100% + 5px);left:0;min-width:100%;z-index:99999;background:var(--bg2,#16161d);border:1px solid var(--border,#2c2c36);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);padding:5px;max-height:240px;overflow-y:auto}.vgdd.open .vgdd-l{display:block;animation:vgddin .14s ease}.vgdd-o{padding:7px 12px;border-radius:7px;font-size:13px;cursor:pointer;white-space:nowrap;color:var(--text,#e8e8ee);transition:background .12s}.vgdd-o:hover{background:rgba(255,255,255,.07)}.vgdd-o.on{background:rgba(255,140,26,.14);color:#FF8C1A;font-weight:700}@keyframes vgddin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}';document.head.appendChild(st);}
  document.querySelectorAll('.agx select:not([data-dd])').forEach(function(sel){sel.setAttribute('data-dd','1');var w=sel.offsetWidth;var wrap=document.createElement('span');wrap.className='vgdd';if(w>40)wrap.style.minWidth=w+'px';sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.style.display='none';var btn=document.createElement('button');btn.type='button';btn.className='vgdd-b';wrap.appendChild(btn);var list=document.createElement('div');list.className='vgdd-l';wrap.appendChild(list);function sync(){btn.innerHTML='';var o=sel.options[sel.selectedIndex];var t=document.createElement('span');t.textContent=(o&&o.textContent)||'';var a=document.createElement('i');a.className='vgi-chevron-down';a.style.width='13px';a.style.height='13px';btn.appendChild(t);btn.appendChild(a);}function close(){wrap.classList.remove('open');list.style.cssText='';document.removeEventListener('mousedown',onOut);window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);}function onOut(e){if(!wrap.contains(e.target))close();}function place(){var r=btn.getBoundingClientRect();list.style.position='fixed';list.style.left=r.left+'px';list.style.minWidth=r.width+'px';var below=window.innerHeight-r.bottom,lh=Math.min(list.scrollHeight,240);if(below<lh+14&&r.top>below){list.style.top=(r.top-lh-4)+'px';}else{list.style.top=(r.bottom+4)+'px';}}function openList(){list.innerHTML='';Array.prototype.forEach.call(sel.options,function(o){var d=document.createElement('div');d.className='vgdd-o'+(o.selected?' on':'');d.textContent=o.textContent;d.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();sel.value=o.value;sync();sel.dispatchEvent(new Event('change',{bubbles:true}));close();});list.appendChild(d);});wrap.classList.add('open');place();setTimeout(function(){document.addEventListener('mousedown',onOut);window.addEventListener('scroll',place,true);window.addEventListener('resize',place);},0);}btn.addEventListener('click',function(e){e.stopPropagation();wrap.classList.contains('open')?close():openList();});sync();});
}
window.addEventListener('beforeunload',save);

function applyOv(it){const o=S.overrides[it.id];return o?Object.assign({},it,o):it;}
function agConfirm(msg,onYes){window.__agY=onYes;openSheet('<div style="padding:4px 2px"><div style="font-size:14px;line-height:1.55;margin-bottom:18px;white-space:pre-line">'+(msg||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="var f=window.__agY;window.__agY=null;closeSheet();if(f)f();">Confirmer</button></div></div>');}
function agToast(msg,ok){var t=document.createElement('div');
  // Statut porté par une icône + la couleur du liseré, plus par un emoji dans le
  // texte. Le libellé reste en textContent : aucune injection possible.
  var _ic=document.createElement('i');_ic.className='vgi-'+(ok===false?'alert':'check');
  _ic.style.cssText='width:15px;height:15px;flex:none;color:'+(ok===false?'#F87171':'#4ADE80');
  var _tx=document.createElement('span');_tx.textContent=msg;
  t.appendChild(_ic);t.appendChild(_tx);t.style.cssText='display:flex;align-items:center;gap:9px;position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:99999;background:#16161c;color:#E8E8EC;border:1px solid '+(ok===false?'#F87171':'#FF8C1A')+';border-radius:10px;padding:11px 18px;font:600 13px/1.4 Inter,system-ui,sans-serif;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.55);opacity:0;transition:opacity .25s,transform .25s';document.body.appendChild(t);requestAnimationFrame(function(){t.style.opacity="1";t.style.transform="translateX(-50%) translateY(0)";});setTimeout(function(){t.style.opacity="0";t.style.transform="translateX(-50%) translateY(8px)";setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},2800);}
function catalog(){const hid=new Set(S.hidden||[]);return D.bankItems.concat(S.custom||[]).map(applyOv).filter(i=>!hid.has(i.id));}
function vgDot(col){return '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+col+';box-shadow:0 0 4px '+col+'88;vertical-align:middle"></span>';}
function catIcon(cat){const c=cat.trim();if(c.startsWith('Stuff'))return c.includes('Éternel')?vgDot('#f59e0b'):c.includes('Shaitan')?vgDot('#ef4444'):c.includes('Dryades')?vgDot('#22c55e'):vgDot('#a855f7');if(c.startsWith('Armes'))return '<i class=vgi-sword-cross></i>';if(c==='Bijoux')return'<i class=vgi-ring></i>';if(c==='R1')return vgDot('#3b82f6');if(c==='R2')return vgDot('#eab308');if(c==='Ressource')return'<i class=vgi-pickaxe></i>';if(c.startsWith('Carte'))return'<i class=vgi-card></i>';if(c.startsWith('Butin'))return'<i class=vgi-gift></i>';return'<i class=vgi-package></i>';}
function catBadge(cat){const c=cat.trim();if(S.catAssets&&S.catAssets[c])return '<img src="'+S.catAssets[c]+'" style="width:16px;height:16px;border-radius:4px;object-fit:cover;vertical-align:middle" alt="">';return catIcon(c);}
function qty(m,id){return(S.inv[m]&&S.inv[m][id])||0;}
function totalGuild(id){let t=0;S.members.forEach(m=>t+=qty(m,id));return t;}
// Coffre par défaut où DÉPOSER : le coffre du membre connecté (repli = coffre historique/1er membre).
function mainCoffre(){var m=(S.mainCoffre||'ibeats');if(S.members.indexOf(m)<0){S.members.push(m);if(!S.inv[m])S.inv[m]={};}return m;}
function myCoffre(){var me=(window.__agUser||'').toLowerCase().trim();var m=me&&(S.members||[]).find(function(x){return x.toLowerCase().trim()===me;});return m||mainCoffre();}
// La boutique & les crafts se basent sur le TOTAL GUILDE (somme de tous les coffres). Une vente puise
// dans les coffres, du plus gros détenteur au plus petit, pour que le stock de chaque membre y serve aussi.
function drawFromGuild(id,need,label){need=Math.max(0,Math.round(+need||0));var holders=(S.members||[]).map(function(m){return {m:m,q:qty(m,id)};}).filter(function(h){return h.q>0;}).sort(function(a,b){return b.q-a.q;});for(var i=0;i<holders.length&&need>0;i++){var take=Math.min(need,holders[i].q);setQty(holders[i].m,id,holders[i].q-take,label);need-=take;}return need;}
function setQty(m,id,v,label){v=Math.max(0,Math.round(+v||0));if(!S.inv[m])S.inv[m]={};const old=qty(m,id);if(v===old)return;S.inv[m][id]=v;S.log.unshift({ts:Date.now(),member:m,by:(window.__agUser||''),label:label||id,delta:v-old});if(S.log.length>200)S.log.length=200;save();}
function health(q,cat,unit,id){var t=id&&S.thresh&&S.thresh[id];if(t){var ok=+t.ok||0,mid=+t.mid||0;if(ok>0||mid>0){if(ok>0&&q>=ok)return'ok';if(mid>0&&q>=mid)return'mid';return'low';}}const c=cat.trim();if(unit==='slot'){if(q>=2)return'ok';if(q>=1)return'mid';return'low';}if(c==='Ressource'||c==='R1'||c==='R2'||c.startsWith('Carte')){if(q>=20)return'ok';if(q>=8)return'mid';return'low';}if(q>=10)return'ok';if(q>=6)return'mid';return'low';}
function itemAsset(it){if(it.icData)return `<img src="${it.icData}" alt="">`;if(it.ic&&ICOIDX[it.ic]!=null)return `<span class="climg bic-${ICOIDX[it.ic]}"></span>`;return classLogo(it.classe)||`<span>${catIcon(it.cat)}</span>`;}
// Tarifs par objet. Legacy = un nombre (= prix public). Nouveau modèle = objet à paliers.
//  v = vendable (achat direct) · d = dette membre autorisée · pub/mem/det = prix public/membre/dette
//  Pour une arme, la cle porte la rarete : id|R#rare, id|R#epique, ... (un prix par rarete)
function priceObj(id){var p=S.prices[id];
  if(p&&typeof p==='object')return {v:p.v!==false,d:p.d!==false,pub:+p.pub||0,mem:+p.mem||0,det:+p.det||0};
  var n=(p!=null?+p:0)||((catalog().find(function(x){return x.id===id;})||{}).prix||0);
  return {v:true,d:true,pub:n,mem:n,det:n};
}
function priceOf(id){return priceObj(id).pub;} // prix public (compat panier / checkout / fiche objet)
//── Rareté des armes (Yggdrasil/Luzaka) : un stock par rareté. Clé = id|R#rareté (le sexe/des armes). ──
var RARITIES=[['rare','Rare','#4EA8FF'],['epique','Épique','#C77DFF'],['legendaire','Légendaire','#FF8C1A'],['premyth','Pré-myth.','#FF5C8A']];
// Rareté = TOUTES les armes des catégories « Armes… », SAUF ce que liste noRarity.
// La liste vit dans data.json (clé noRarity) pour être partagée avec le plan de
// farm côté serveur : dupliquée, elle avait aussitôt dérivé — « grimoire » y
// manquait ici, donc les grimoires réclamaient un exemplaire pré-mythique.
var NO_RARITY=(D&&Array.isArray(D.noRarity)&&D.noRarity.length)?D.noRarity:['rune','marteau','bouclier','grimoire'];
function needsRarity(it){if(!it||String(it.cat||'').toLowerCase().indexOf('armes')!==0)return false;var n=String(it.item||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');return !NO_RARITY.some(function(w){return n.indexOf(w)>=0;});}
function rarKey(id,r){return id+'|R#'+r;}
function baseId(key){return String(key).split('|R#')[0];}
function rarOf(key){var p=String(key).split('|R#');return p.length>1?p[1]:null;}
function rarMeta(r){for(var i=0;i<RARITIES.length;i++)if(RARITIES[i][0]===r)return RARITIES[i];return null;}
function itemStock(it,isTotal){if(needsRarity(it)){var t=0;RARITIES.forEach(function(r){var k=rarKey(it.id,r[0]);t+=isTotal?totalGuild(k):qty(S.cur,k);});return t;}return isTotal?totalGuild(it.id):qty(S.cur,it.id);}

const TABS=[['bank','<i class=vgi-bank></i>','Dépôt en Coffre de Guilde'],['craft','<i class=vgi-hammer></i>','Craft'],['set','<i class=vgi-settings></i>','Paramètres']];
function renderTabs(){$('#tabs').innerHTML=TABS.map(([k,ic,l])=>`<div class="tab ${S.tab===k?'on':''}" onclick="go('${k}')"><span>${ic}</span>${l}${k==='shop'&&S.debts.length?`<span class="pill pr">${S.debts.length}</span>`:''}</div>`).join('');}
function go(t){S.tab=t;save();renderTabs();render();window.scrollTo({top:0,behavior:'smooth'});}
/* Lien profond : ?tab=bank&coffre=moi ouvre directement le depot sur SON coffre.
   Sert au bouton « Deposer au coffre » du plan de farm — sans ca il fallait
   arriver sur le coffre, trouver l'onglet, puis se retrouver dans la liste.
   Le parametre est retire de l'URL apres coup : un rechargement ne doit pas
   reimposer l'onglet des heures plus tard. */
function vgLienProfond(){
  try{
    var p=new URLSearchParams(location.search);
    var t=p.get('tab'), c=p.get('coffre');
    if(!t&&!c)return;
    if(c){var moi=(window.__agUser||'').trim();
      var cible=(c==='moi')?moi:c;
      if(cible&&S.members.indexOf(cible)>=0)S.cur=cible;}
    if(t&&TABS.some(function(x){return x[0]===t;}))S.tab=t;
    save();renderTabs();render();
    p.delete('tab');p.delete('coffre');
    history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));
  }catch(e){}
}
function render(){const v=$('#view');if(!v){if((render._n=(render._n||0)+1)<90)requestAnimationFrame(render);return;}render._n=0;if($('#tabs')&&!$('#tabs').innerHTML.trim()){try{renderTabs();}catch(e){}}try{v.innerHTML=S.tab==='bank'?viewBank():S.tab==='craft'?viewCraft():S.tab==='shop'?viewShop():viewSettings();if(S.tab==='bank'&&bankQ)filterBank(bankQ);if(S.tab==='set'&&cfgQ)filterSet(cfgQ);}catch(err){console.error('[AirGuild] rendu partiel',err);}vgDD();}

/* ============ BANQUE ============ */
let bankQ='';
// F2 : coffres membres liés au roster Discord (auto-créés, plus de « +Membre » manuel ; jamais de suppression de coffre existant → on garde les données).
function syncRoster(){var r=window.__agRoster||[];if(!r.length)return;var ch=false;r.forEach(function(name){if(name&&S.members.indexOf(name)<0){S.members.push(name);if(!S.inv[name])S.inv[name]={};ch=true;}});if(ch)save();}
function viewBank(){
  syncRoster();
  if(!S.members.includes(S.cur)&&S.cur!=='__total__')S.cur='__total__';
  const isTotal=S.cur==='__total__';
  const me=(window.__agUser||'').toLowerCase().trim();const roster=window.__agRoster||[];const canM=canEdit();
  const sortedM=S.members.filter(m=>m!=='Commun').sort((a,b)=>{const am=a.toLowerCase().trim()===me,bm=b.toLowerCase().trim()===me;return am===bm?a.localeCompare(b,'fr'):(am?-1:1);});
  const mtabs=
    sortedM.map(m=>{const isMe=!!me&&m.toLowerCase().trim()===me;const inR=roster.indexOf(m)>=0;return `<div class="mtab ${S.cur===m?'on':''}" onclick="selM('${sq(m)}')"${isMe?' title="Ton coffre personnel"':''}>${isMe?'<i class=vgi-hand-point></i> ':'<i class=vgi-user></i> '}${esc(m)}${isMe?' <span class="pill" style="font-size:8px;padding:1px 5px;background:var(--orange);color:#0a0a0c">perso</span>':''}${(canM&&!inR)?` <span class="x" onclick="event.stopPropagation();delM('${sq(m)}')"><i class=vgi-x></i></span>`:''}</div>`;}).join('')+
    (canM?`<div class="mtab" onclick="addMember()" style="border-style:dashed;opacity:.9" title="Ajouter un coffre membre (Vanguard)"><i class=vgi-plus></i> Coffre</div>`:'')+
    `<div class="mtab ${isTotal?'on':''}" onclick="selM('__total__')" style="border-style:dashed">Σ Total guilde</div>`;
  return `<div class="card"><div class="sec-h"><i class=vgi-bank></i> Coffres <span class="n">coffres individuels</span></div><div class="mtabs">${mtabs}</div></div>
   ${isTotal?'<div class="hint" style="margin-top:8px">Σ <b>Total guilde</b> = la somme de <b>tous</b> les coffres membres. C\'est la <b>référence</b> : la boutique et les crafts se basent dessus, donc le stock de chaque membre compte.</div>':'<div class="hint" style="margin-top:8px">Le stock de ce coffre compte dans le <b>Total guilde</b> (référence boutique &amp; crafts). Dépose ici ce que tu ramènes.</div>'}
   <div class="toolbar" style="margin-top:14px"><input class="inp" id="bankq" placeholder="Rechercher un objet…" value="${esc(bankQ)}" oninput="bankQ=this.value;filterBank(this.value)" style="flex:1;min-width:180px">${canEdit()?'<button class="btn o" onclick="addItem()"><i class=vgi-plus></i> Objet</button>':''}<button class="btn o" onclick="inventaireSheet()" style="font-size:14px;padding:10px 18px"><i class=vgi-bar-chart></i> Qui détient quoi</button><button class="btn" onclick="openJournal()"><i class=vgi-receipt></i> Journal</button></div>
   <div id="bankbody">${bankBody()}</div>`;
}
// ── B1 : récap « Mes objets / Mes ventes » + qui détient quoi (par membre) ──

/* ─── Inventaire : Récap + Fiche objet dans un seul panneau ──────────────
   Les deux repondaient a la meme question (« ou est cet objet, qui l'a ») par
   deux boutons et deux fenetres separees. Ils sont desormais deux sous-onglets
   d'un meme panneau, ouvert par un bouton unique et mis en avant.
   L'onglet actif est garde en memoire pour la duree de la session. */
window.__invOnglet = window.__invOnglet || 'recap';
window.__invMine = false;

function inventaireSheet(onglet){
  if(onglet)window.__invOnglet=onglet;
  var o=window.__invOnglet;
  var bt=function(cle,ic,lib){
    var on=o===cle;
    return '<span onclick="inventaireSheet(\''+cle+'\')" style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;'
      +'font-size:14px;font-weight:700;padding:9px 16px;border-radius:9px;user-select:none;'
      +(on?'background:linear-gradient(180deg,#FFB552,#FF8C1A);color:#0A0A0C;border:1px solid #FF8C1A':'background:#17171d;color:#d2d2d9;border:1px solid rgba(255,255,255,.14)')
      +'"><i class='+ic+'></i>'+lib+'</span>';
  };
  var barre='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px">'
    +bt('recap','vgi-bar-chart','Qui détient quoi')+bt('fiche','vgi-search','Fiche d\'un objet')+'</div>';

  openSheet('<h3 style="font-size:19px"><i class=vgi-bank></i> Inventaire de la guilde</h3>'
    +barre+'<div id="invCorps"></div>'
    +'<div class="toolbar" style="justify-content:flex-end;margin:10px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>');
  invCorps();
}

function invCorps(){
  var el=document.getElementById('invCorps');if(!el)return;
  if(window.__invOnglet==='fiche'){
    el.innerHTML='<div class="hint">Tape un nom : où il est, qui l\'a, qui le vend, les crafts, le farm et les derniers mouvements.</div>'
      +'<input class="inp" id="isq" placeholder="ex. Catalyseur Bubble…" oninput="itemSearchFilter(this.value)" style="width:100%;margin-bottom:10px;font-size:15px;padding:12px 14px">'
      +'<div id="isres" style="max-height:56vh;overflow:auto"></div>';
    itemSearchFilter('');
    var f=document.getElementById('isq');if(f)f.focus();
  }else{
    var me=(window.__agUser||'').trim();
    /* Barre d'outils fixe, resultats dans #recRes : la recherche ne redessine
       que les resultats, le champ garde donc le focus a chaque frappe. */
    el.innerHTML='<div class="hint">Le contenu de chaque coffre, membre par membre. Cherche un objet ou une catégorie.</div>'
      +'<input class="inp" id="recq" placeholder="ex. Glaive, Perles, Carnet d\'Arcanes…" value="'+esc(window.__invQ||'')+'" oninput="invRecherche(this.value)" style="width:100%;margin-bottom:9px;font-size:15px;padding:12px 14px">'
      +'<div class="toolbar" style="margin:0 0 10px;flex-wrap:wrap">'
      +(me?'<button class="btn '+(window.__invMine?'o':'')+' sm" onclick="invMine('+(window.__invMine?'false':'true')+')"><i class=vgi-hand-point></i> '+(window.__invMine?'Voir tous les coffres':'Mes objets seulement')+'</button>':'')
      +'<button class="btn sm" onclick="invToutPlier(false)"><i class=vgi-chevron-down></i> Tout déplier</button>'
      +'<button class="btn sm" onclick="invToutPlier(true)"><i class=vgi-chevron-right></i> Tout replier</button></div>'
      +'<div id="recRes" style="max-height:54vh;overflow:auto"></div>';
    var r=document.getElementById('recRes');if(r)r.innerHTML=recapCorps(window.__invMine);
    var f=document.getElementById('recq');if(f&&window.__invQ)f.focus();
  }
}

/* Bascule « mes objets » / tous les coffres, sans reconstruire la fenetre. */
function invMine(v){window.__invMine=!!v;invCorps();}

/* ─── Récap : un seul écran (recherche + replis + regroupement) ──────────
   Avant : une liste a plat par membre, sans recherche ni repli — illisible des
   qu'un coffre contenait vingt objets. Ici la recherche porte sur le nom, la
   categorie, la classe ET le membre, et les objets sont regroupes par categorie
   des qu'il y en a plusieurs dans la meme (sinon le titre de groupe serait du
   bruit pour une seule ligne). */
window.__invQ = window.__invQ || '';
window.__invPlie = window.__invPlie || {};
/* Categories dont on a demande l'affichage complet (cle = membre|categorie). */
window.__invTout = window.__invTout || {};

/* Icone d'un objet. img() ne sait pas rendre un data-URI (il teste le '/' de
   tete), or les objets crees a la main stockent leur image dans icData : sans ce
   resolveur, ces objets s'affichaient sans vignette. */
function recapIcone(it){
  var d=it&&it.icData;
  if(d)return '<img src="'+d+'" alt="" style="width:22px;height:22px;object-fit:contain;flex:none">';
  var ic=it&&it.ic;
  var src=ic?(ICONS[ic]||(String(ic).charAt(0)==='/'?ic:'')):'';
  return src?'<img src="'+src+'" alt="" style="width:22px;height:22px;object-fit:contain;flex:none">'
            :'<span style="width:22px;height:22px;flex:none"></span>';
}

/* Lignes d'un coffre, cle de rarete resolue vers l'objet de base. */
function recapLignes(inv, nameOf){
  return Object.keys(inv).filter(function(id){return (+inv[id]||0)>0;}).map(function(id){
    var base=baseId(id), r=rarOf(id);
    var it=nameOf[id]||nameOf[base]||{};
    var meta=r?rarMeta(r):null;
    return {nom:(it.item||base.split('|').pop()),cls:it.classe||'',cat:(it.cat||'').trim()||'Sans catégorie',
            ic:recapIcone(it),
            rar:r,rarLabel:meta?meta[1]:(r||''),rarColor:meta?meta[2]:'var(--text-muted)',qty:+inv[id]};
  });
}

function recapCorps(mineOnly){
  var me=(window.__agUser||'').toLowerCase().trim();
  var members=S.members||[];
  if(mineOnly&&me)members=members.filter(function(m){return m.toLowerCase().trim()===me;});
  var nameOf={};(catalog()||[]).forEach(function(it){nameOf[it.id]=it;});
  var q=(window.__invQ||'').toLowerCase().trim();

  var corps=members.map(function(m){
    var lignes=recapLignes(S.inv[m]||{},nameOf);
    /* La recherche porte sur l'OBJET et sa categorie seulement. Le membre est
       deja une section et la classe est deja sur la ligne : les chercher
       n'apportait rien et brouillait les resultats. */
    if(q)lignes=lignes.filter(function(x){
      return (x.nom+' '+x.cat).toLowerCase().indexOf(q)>=0;});
    if(q&&!lignes.length)return '';

    var isMe=!!me&&m.toLowerCase().trim()===me;
    var total=lignes.reduce(function(s,x){return s+x.qty;},0);
    /* Un repli explicite gagne toujours ; sinon une recherche deplie d'office. */
    var plie=(window.__invPlie[m]!==undefined)?window.__invPlie[m]:!(q||isMe);

    var parCat={};lignes.forEach(function(x){(parCat[x.cat]=parCat[x.cat]||[]).push(x);});
    var cats=Object.keys(parCat).sort(function(a,b){return a.localeCompare(b,'fr');});

    var ligneHtml=function(x){
      return '<div style="display:flex;align-items:center;gap:9px;font-size:14px;padding:5px 0">'
        +x.ic
        +'<span style="flex:1;min-width:0"><b style="font-weight:600">'+esc(x.nom)+'</b>'
        +(x.rar?' <span style="font-size:11px;font-weight:700;padding:1px 8px;border-radius:20px;white-space:nowrap;border:1px solid '+x.rarColor+';color:'+x.rarColor+';background:'+x.rarColor+'22">'+esc(x.rarLabel)+'</span>':'')
        +(x.cls?' <span class="mut" style="font-size:11.5px">'+esc(x.cls)+'</span>':'')
        +'</span><b style="color:var(--gold);font-size:15px;white-space:nowrap">×'+fmt(x.qty)+'</b></div>';
    };

    var dedans=cats.length?cats.map(function(c){
      var l=parCat[c];
      /* On n'affiche que les 3 premiers : la fenetre tenait sur plusieurs ecrans
         alors qu'on veut la lire d'un coup. Le reste s'ouvre a la demande, et une
         recherche montre tout (on a deja restreint le resultat soi-meme). */
      var cle=m+'|'+c, tout=q||window.__invTout[cle], caches=l.length-3;
      var vus=tout?l:l.slice(0,3);
      /* Titre de groupe seulement s'il regroupe vraiment : pour un objet seul,
         il ajouterait une ligne sans rien apprendre. */
      var titre=l.length>1
        ? '<div class="mut" style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;margin:8px 0 2px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:3px">'+esc(c)+' <span style="color:var(--orange)">'+l.length+'</span></div>'
        : '<div class="mut" style="font-size:11px;margin:6px 0 0">'+esc(c)+'</div>';
      return titre+vus.map(ligneHtml).join('')
        +((!tout&&caches>0)?'<div onclick="invTout(\''+sq(cle)+'\')" style="cursor:pointer;font-size:11.5px;font-weight:700;color:var(--orange);padding:4px 0 2px">+ '+caches+' autre'+(caches>1?'s':'')+'</div>':'')
        +((tout&&!q&&l.length>3)?'<div onclick="invTout(\''+sq(cle)+'\')" style="cursor:pointer;font-size:11.5px;color:var(--text-muted);padding:4px 0 2px">Réduire</div>':'');
    }).join('') : '<div class="mut" style="font-size:12.5px">Coffre vide.</div>';

    return '<div class="ocard" style="margin-bottom:10px;padding:0'+(isMe?';border-color:var(--orange)':'')+'">'
      +'<div onclick="invPlier(\''+sq(m)+'\')" style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:11px 13px;user-select:none">'
      +'<i class=vgi-'+(plie?'chevron-right':'chevron-down')+' style="color:var(--orange)"></i>'
      +(m===S.mainCoffre?'<i class=vgi-landmark></i>':'<i class=vgi-user></i>')
      +'<b style="font-size:15px">'+esc(m)+'</b>'
      +(isMe?' <span class="pill" style="background:var(--orange);color:#0a0a0c"><i class=vgi-hand-point></i> Mes objets</span>':'')
      +'<span class="n" style="margin-left:auto;font-size:12px">'+lignes.length+' items · '+fmt(total)+' u.</span></div>'
      +(plie?'':'<div style="padding:0 13px 12px">'+dedans+'</div>')+'</div>';
  }).join('');

  if(!corps)corps='<div class="mut" style="font-size:13px;padding:10px 2px">'
    /* Message aligne sur la portee reelle de la recherche : elle ne cherche plus
       les coffres, l'annoncer serait faux. On rappelle aussi que seuls les objets
       en stock apparaissent — sinon une recherche vide passe pour un bug. */
    +(q?'Aucun objet en stock ne correspond à « '+esc(window.__invQ)+' ». Seuls les objets présents dans un coffre sont listés.':'Aucun coffre à afficher.')+'</div>';
  return corps;
}

/* Recherche : on ne redessine QUE les resultats, sinon le champ perdrait le focus. */
function invRecherche(v){window.__invQ=v;var el=document.getElementById('recRes');if(el)el.innerHTML=recapCorps(window.__invMine);}
function invPlier(m){window.__invPlie[m]=!( (window.__invPlie[m]!==undefined)?window.__invPlie[m]:false );var el=document.getElementById('recRes');if(el)el.innerHTML=recapCorps(window.__invMine);}
function invTout(cle){window.__invTout[cle]=!window.__invTout[cle];var el=document.getElementById('recRes');if(el)el.innerHTML=recapCorps(window.__invMine);}
function invToutPlier(v){(S.members||[]).forEach(function(m){window.__invPlie[m]=!!v;});var el=document.getElementById('recRes');if(el)el.innerHTML=recapCorps(window.__invMine);}

/* Conserve pour les anciens appels : ouvre le panneau sur le bon sous-onglet. */
function recapSheet(mineOnly){window.__invMine=!!mineOnly;inventaireSheet('recap');}
function sortByOrder(arr){const o=S.order||[];return arr.slice().sort(function(a,b){var ia=o.indexOf(a.id),ib=o.indexOf(b.id);return (ia<0?1e9:ia)-(ib<0?1e9:ib);});}
function moveItem(id,dir){var all=sortByOrder(catalog());var it=all.find(function(x){return x.id===id;});if(!it)return;var cat=(it.cat||'').trim();var sibs=all.filter(function(x){return (x.cat||'').trim()===cat;});var i=sibs.findIndex(function(x){return x.id===id;}),j=i+dir;if(j<0||j>=sibs.length)return;S.order=all.map(function(x){return x.id;});var a=S.order.indexOf(id),b=S.order.indexOf(sibs[j].id);var t=S.order[a];S.order[a]=S.order[b];S.order[b]=t;save();render();}
function bankBody(){const cats=sortByOrder(catalog());const isTotal=S.cur==='__total__';
  const byCat={};cats.forEach(it=>{(byCat[it.cat]=byCat[it.cat]||[]).push(it);});
  const order=sortCats(D.bankCats.concat(Object.keys(byCat).filter(c=>!D.bankCats.includes(c))));
  let body='';order.forEach(cat=>{let list=byCat[cat];if(!list||!list.length)return;
    const closed=S.closed[cat]?'closed':'';const sums=list.reduce((a,it)=>a+itemStock(it,isTotal),0);
    body+=`<div class="catblk ${closed}"><div class="cathead" onclick="togC('${sq(cat)}')"><span class="ci">${catBadge(cat)}</span><span class="ct">${esc(cat.trim())}</span><span class="meta"><span class="pill">${list.length}</span><span class="pill">${fmt(sums)} u.</span><span class="chev"><i class=vgi-chevron-down></i></span></span></div><div class="catbody">${list.map(it=>needsRarity(it)?weaponRows(it,isTotal):itemRow(it,isTotal)).join('')}</div></div>`;});
  return body||'<div class="empty">Aucun objet.</div>';
}
function itemRow(it,isTotal){const v=isTotal?totalGuild(it.id):qty(S.cur,it.id);const h=health(v,it.cat,it.unit,it.id);const isSlot=it.unit==='slot';
  const unitTag=isSlot?'<span class="utag">slot</span>':'';
  const editable=!isTotal&&canDeposit(); // édition seulement dans SON coffre (ou Vanguard/Direction) — sinon lecture seule
  const ctrl=editable?`<div class="step"><button onclick="adj('${sq(it.id)}',-1)">−</button><input value="${v}" onchange="setQ('${sq(it.id)}',this.value)"><button onclick="adj('${sq(it.id)}',1)"><i class=vgi-plus></i></button></div>`:`<div style="font-family:Rajdhani;font-weight:700;font-size:17px;width:96px;text-align:right">${fmt(v)}</div>`;
  const custom=(S.custom||[]).some(c=>c.id===it.id);
  const price=editable?priceMini(it.id):'';
  const rm=editable?`<span class="rm" onclick="rmItem('${sq(it.id)}',${custom})"><i class=vgi-x></i></span>`:'';
  const ds=(it.item+' '+(it.classe||'')+' '+it.cat).toLowerCase();
  return `<div class="it" data-s="${esc(ds)}"><div class="logo" onclick="itemDetail('${sq(it.id)}')" style="cursor:pointer" title="Fiche complète">${itemAsset(it)}</div><div class="nm" onclick="itemDetail('${sq(it.id)}')" style="cursor:pointer" title="Fiche complète"><div class="a">${esc(it.item)}</div><div class="b">${it.classe?esc(it.classe):it.cat.trim()}${isSlot?' · compté en slots':''}</div></div><span class="dot ${h}"></span>${price}${ctrl}${unitTag}${rm}</div>`;
}
// Arme suivie par rareté : une ligne d'en-tête (total) + 4 lignes de rareté (stock indépendant, clé id|R#rareté).
function weaponRows(it,isTotal){var tot=itemStock(it,isTotal);var ds=(it.item+' '+(it.classe||'')+' '+it.cat).toLowerCase();
  var editable=!isTotal&&canDeposit();
  var price=editable?priceMini(it.id):'';
  var head=`<div class="it" data-s="${esc(ds)}" style="background:rgba(255,255,255,.02)"><div class="logo" onclick="itemDetail('${sq(it.id)}')" style="cursor:pointer" title="Fiche complète">${itemAsset(it)}</div><div class="nm" onclick="itemDetail('${sq(it.id)}')" style="cursor:pointer" title="Fiche complète"><div class="a">${esc(it.item)}</div><div class="b">${it.classe?esc(it.classe):it.cat.trim()} · par rareté</div></div>${price}<div style="font-family:Rajdhani;font-weight:700;font-size:17px;width:96px;text-align:right;color:var(--gold)">${fmt(tot)}</div></div>`;
  var rows=RARITIES.map(function(r){var key=rarKey(it.id,r[0]);var v=isTotal?totalGuild(key):qty(S.cur,key);
    var ctrl=editable?`<div class="step"><button onclick="adj('${sq(key)}',-1)">−</button><input value="${v}" onchange="setQ('${sq(key)}',this.value)"><button onclick="adj('${sq(key)}',1)"><i class=vgi-plus></i></button></div>`:`<div style="font-family:Rajdhani;font-weight:700;font-size:15px;width:96px;text-align:right">${fmt(v)}</div>`;
    var clr=(editable&&v>0)?`<span class="rm" onclick="setQ('${sq(key)}','0')" title="Vider"><i class=vgi-x></i></span>`:'<span style="width:14px;flex:none"></span>';
    return `<div class="it" data-s="${esc(ds)}" style="padding-left:30px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${r[2]};box-shadow:0 0 5px ${r[2]}99;flex:none;margin-right:2px"></span><div class="nm" style="flex:1;min-width:0"><div class="a" style="color:${r[2]};font-size:12.5px">${r[1]}</div></div>${ctrl}${clr}</div>`;}).join('');
  // Ancien stock déposé AVANT le système de rareté (clé sans « |R# ») : on l'affiche pour pouvoir le supprimer/migrer.
  var legacy=isTotal?totalGuild(it.id):qty(S.cur,it.id);
  var legacyRow=legacy>0?`<div class="it" data-s="${esc(ds)}" style="padding-left:30px;background:rgba(248,113,113,.06)"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--red);flex:none;margin-right:2px"></span><div class="nm" style="flex:1;min-width:0"><div class="a" style="color:var(--red);font-size:12px">Sans rareté (ancien)</div><div class="b" style="font-size:10px">à supprimer — re-dépose avec la bonne rareté</div></div><div style="font-family:Rajdhani;font-weight:700;font-size:15px;width:70px;text-align:right">${fmt(legacy)}</div>${editable?`<span class="rm" onclick="setQ('${sq(it.id)}','0')" title="Supprimer l'ancien stock sans rareté"><i class=vgi-x></i></span>`:'<span style="width:14px;flex:none"></span>'}</div>`:'';
  return head+legacyRow+rows;
}
function paintBank(){const b=$('#bankbody');if(b){b.innerHTML=bankBody();if(bankQ)filterBank(bankQ);}}
function filterBank(qv){const q=(qv||'').toLowerCase().trim();
  document.querySelectorAll('#bankbody .it').forEach(el=>{el.style.display=(!q||el.dataset.s.includes(q))?'':'none';});
  document.querySelectorAll('#bankbody .catblk').forEach(blk=>{const any=[...blk.querySelectorAll('.it')].some(e=>e.style.display!=='none');blk.style.display=any?'':'none';});
}
function selM(m){S.cur=m;save();render();}
function togC(c){S.closed[c]=!S.closed[c];save();paintBank();}
function adj(id,d){if(!canDeposit())return agToast('Tu ne peux déposer que dans TON coffre.',false);var it=catalog().find(x=>x.id===baseId(id));var rm=rarMeta(rarOf(id));setQty(S.cur,id,qty(S.cur,id)+d,(it?it.item:id)+(rm?' ('+rm[1]+')':''));paintBank();if(d>0)promptPriceIfNew(id);}
function setQ(id,v){if(!canDeposit())return agToast('Tu ne peux déposer que dans TON coffre.',false);var it=catalog().find(x=>x.id===baseId(id));var rm=rarMeta(rarOf(id));setQty(S.cur,id,v,(it?it.item:id)+(rm?' ('+rm[1]+')':''));paintBank();if((+v||0)>0)promptPriceIfNew(id);}
function addMember(){openSheet(`<h3>Ajouter un coffre membre</h3><div class="field"><label>Nom</label><input class="inp" id="mn" placeholder="ex. Daiisukae"></div><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="doAddMember()">Créer</button></div>`);}
function doAddMember(){const n=$('#mn').value.trim();if(!n)return;if(!S.members.includes(n)){S.members.push(n);S.inv[n]={};}S.cur=n;save();closeSheet();render();}
function delM(m){if(!canEdit())return agToast('Suppression de coffre réservée au rôle Vanguard.',false);agConfirm('Supprimer le coffre de '+m+' ?\nLe contenu sera perdu — l\'action est tracée dans le journal.',function(){S.log.unshift({ts:Date.now(),member:m,by:(window.__agUser||''),label:'Coffre supprimé',delta:0});if(S.log.length>200)S.log.length=200;S.members=S.members.filter(x=>x!==m);delete S.inv[m];if(S.cur===m)S.cur='__total__';save();render();agToast('Coffre de '+m+' supprimé (journalisé).',true);});}
function allCats(){var hid=new Set(S.hiddenCats||[]);return [...new Set(D.bankCats.concat(S.cats||[]).concat((catalog()||[]).map(function(x){return (x.cat||'').trim();}).filter(Boolean)))].filter(function(c){return !hid.has(c);});}
function sortCats(cats){var o=S.catOrder||[];return cats.slice().sort(function(a,b){var ia=o.indexOf(a),ib=o.indexOf(b);return (ia<0?1e9:ia)-(ib<0?1e9:ib);});}
function moveCat(c,dir){if(!canEdit())return;var cats=sortCats(allCats());var i=cats.indexOf(c),j=i+dir;if(j<0||j>=cats.length)return;var t=cats[i];cats[i]=cats[j];cats[j]=t;S.catOrder=cats;save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}}
function catDragStart(e,c){window.__dragCat=c;if(e.dataTransfer){e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',c);}catch(_){}}}
function catDrop(e,target){e.preventDefault();var d=window.__dragCat;window.__dragCat=null;if(!d||d===target||!canEdit())return;var cats=sortCats(allCats());var di=cats.indexOf(d);if(di<0)return;cats.splice(di,1);var ti=cats.indexOf(target);if(ti<0)ti=cats.length;cats.splice(ti,0,d);S.catOrder=cats;save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}}
let _aiTab='item';
function addItem(){if(!canEdit())return agToast('Ajout réservé au rôle Vanguard.',false);_aiTab='item';openSheet(addItemHTML());}
function addItemHTML(){return `<h3>Ajouter au coffre</h3>
  <div style="display:flex;gap:6px;margin-bottom:14px"><button class="btn aitab ${_aiTab==='item'?'o':''}" onclick="addItemTab('item')"><i class=vgi-package></i> Item</button><button class="btn aitab ${_aiTab==='cat'?'o':''}" onclick="addItemTab('cat')"><i class=vgi-tag></i> Catégories</button></div>
  <div id="aiBody">${_aiTab==='item'?aiItemHTML():aiCatHTML()}</div>`;}
function addItemTab(t){_aiTab=t;var btns=document.querySelectorAll('.aitab');btns.forEach(function(x,i){x.classList.toggle('o',(i===0&&t==='item')||(i===1&&t==='cat'));});var b=document.getElementById('aiBody');if(b){b.innerHTML=t==='item'?aiItemHTML():aiCatHTML();vgDD();}}
function aiItemHTML(){return `<div class="field"><label>Asset / image (optionnel)</label><input class="inp" id="iimg" type="file" accept="image/*"><div class="mut" style="font-size:10.5px;margin-top:4px">PNG/JPG. Vide = logo de classe.</div></div>
  <div class="field"><label>Nom de l'objet</label><input class="inp" id="ii" placeholder="ex. Cristal féerique"></div>
  <div class="field"><label>Catégorie</label><select class="inp" id="ic">${allCats().map(c=>`<option>${esc(c)}</option>`).join('')}</select><div class="mut" style="font-size:10.5px;margin-top:4px">Pas la bonne ? Crée-la dans l'onglet <i class=vgi-tag></i> Catégories.</div></div>
  <div class="field"><label>Classe (optionnel)</label><input class="inp" id="icl" placeholder="ex. Arcaniste — ou vide"></div>
  <div class="field"><label>Unité de comptage</label><select class="inp" id="iu"><option value="unitaire">Unitaire (à la pièce)</option><option value="slot">Slot (1 slot = 9 999)</option></select></div>
  <div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="doAddItem()">Ajouter l'item</button></div>`;}
function aiCatHTML(){var cats=sortCats(allCats());var ed=canEdit();return `<div class="hint">Crée et gère les catégories — elles apparaissent dans le menu déroulant de l'onglet Item.${ed?'':' <b>Édition réservée au rôle Vanguard.</b>'}</div>
  ${ed?`<div class="field"><label>Nouvelle catégorie</label><div style="display:flex;gap:8px"><input class="inp" id="newcat" placeholder="ex. Stuff - Luzaka" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();addCat();}"><button class="btn o" onclick="addCat()">Ajouter</button></div></div>`:''}
  <div style="margin-top:12px"><div class="sec-h" style="font-size:11.5px;margin:0 0 6px">Catégories existantes <span class="n">${cats.length}</span></div><div style="display:flex;flex-direction:column;gap:3px;max-height:38vh;overflow:auto">${cats.map(function(c){var n=(catalog()||[]).filter(function(x){return (x.cat||'').trim()===c;}).length;return `<div draggable="true" ondragstart="catDragStart(event,'${sq(c)}')" ondragover="event.preventDefault()" ondrop="catDrop(event,'${sq(c)}')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;padding:5px 8px;background:#ffffff05;border-radius:6px;cursor:grab"><span style="opacity:.35;flex:none" title="Glisser pour réordonner">⠿</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${catBadge(c)} ${esc(c)} <span class="mut" style="font-size:10px">${n} item(s)</span></span>${ed?`<span style="display:flex;gap:7px;flex:none;align-items:center"><span style="cursor:pointer;opacity:.6;font-weight:700" title="Monter" onclick="moveCat('${sq(c)}',-1)"><i class=vgi-arrow-up></i></span><span style="cursor:pointer;opacity:.6;font-weight:700" title="Descendre" onclick="moveCat('${sq(c)}',1)"><i class=vgi-arrow-down></i></span><span style="cursor:pointer;opacity:.7" title="Image de la catégorie" onclick="setCatAsset('${sq(c)}')"><i class=vgi-camera></i></span><span style="cursor:pointer;opacity:.7" title="Renommer" onclick="renameCat('${sq(c)}')"><i class=vgi-edit></i></span>${!n?`<span class="rm" style="cursor:pointer" title="Supprimer (catégorie vide)" onclick="delCat('${sq(c)}')"><i class=vgi-x></i></span>`:`<span style="opacity:.35;font-size:10px" title="Catégorie non vide — renomme-la ou vide ses objets pour la supprimer"><i class=vgi-lock></i></span>`}</span>`:''}</div>`;}).join('')}</div></div>
  <div class="toolbar" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>`;}
function addCat(){var el=$('#newcat');var v=((el&&el.value)||'').trim();if(!v)return;S.cats=S.cats||[];if(allCats().indexOf(v)<0){S.cats.push(v);save();agToast('Catégorie « '+v+' » ajoutée ',true);}else{agToast('Cette catégorie existe déjà.',false);}var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}}
function delCat(c){if(!canEdit())return;var n=(catalog()||[]).filter(function(x){return (x.cat||'').trim()===c;}).length;if(n)return agToast('Catégorie non vide — renomme-la ou vide ses objets avant.',false);S.cats=(S.cats||[]).filter(function(x){return x!==c;});if((D.bankCats||[]).indexOf(c)>=0){S.hiddenCats=S.hiddenCats||[];if(S.hiddenCats.indexOf(c)<0)S.hiddenCats.push(c);}if(S.catAssets)delete S.catAssets[c];save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}agToast('Catégorie « '+c+' » supprimée ',true);}
function reopenAddCat(){_aiTab='cat';openSheet(addItemHTML());}
function renameCat(c){if(!canEdit())return;openSheet(`<h3><i class=vgi-edit></i> Renommer la catégorie</h3><div class="field"><label>Nouveau nom</label><input class="inp" id="rncat" value="${esc(c)}"></div><div class="hint">Tous les objets de « ${esc(c)} » seront déplacés vers le nouveau nom.</div><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="reopenAddCat()">Annuler</button><button class="btn o" onclick="doRenameCat('${sq(c)}')">Renommer</button></div>`);var f=$('#rncat');if(f){f.focus();f.select();}}
function doRenameCat(oldc){var nv=(($('#rncat')||{}).value||'').trim();if(!nv)return;if(nv===oldc)return reopenAddCat();
  (S.custom||[]).forEach(function(it){if((it.cat||'').trim()===oldc)it.cat=nv;});
  (D.bankItems||[]).forEach(function(it){var eff=((S.overrides[it.id]&&S.overrides[it.id].cat)||it.cat||'').trim();if(eff===oldc){S.overrides[it.id]=Object.assign({},S.overrides[it.id]||{},{cat:nv});}});
  S.cats=(S.cats||[]).map(function(x){return x===oldc?nv:x;});
  if((D.bankCats||[]).indexOf(oldc)>=0){S.hiddenCats=S.hiddenCats||[];if(S.hiddenCats.indexOf(oldc)<0)S.hiddenCats.push(oldc);}
  if(allCats().indexOf(nv)<0){S.cats.push(nv);}
  if(S.catAssets&&S.catAssets[oldc]){S.catAssets[nv]=S.catAssets[oldc];delete S.catAssets[oldc];}
  save();render();reopenAddCat();agToast('Catégorie renommée en « '+nv+' » ',true);}
function setCatAsset(c){if(!canEdit())return;var inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){keyMagenta(r.result,function(clean){S.catAssets=S.catAssets||{};S.catAssets[c]=clean;save();render();var b=document.getElementById('aiBody');if(b){b.innerHTML=aiCatHTML();vgDD();}agToast('Image de « '+c+' » mise à jour ',true);});};r.readAsDataURL(f);};inp.click();}
function doAddItem(){const cat=$('#ic').value,cl=$('#icl').value.trim(),it=$('#ii').value.trim(),unit=$('#iu').value;if(!it)return;
  const fin=icData=>{S.custom=S.custom||[];S.custom.push({id:'custom|'+cl+'|'+it+'|'+Date.now(),cat,classe:cl,item:it,unit,icData:icData||'',ic:'',prix:0});save();closeSheet();render();};
  const f=$('#iimg').files[0];
  if(f){const r=new FileReader();r.onload=()=>keyMagenta(r.result,fin);r.readAsDataURL(f);}else fin('');}
function rmItem(id,custom){if(custom)S.custom=(S.custom||[]).filter(c=>c.id!==id);else{S.hidden=S.hidden||[];if(!S.hidden.includes(id))S.hidden.push(id);}save();render();}
function openJournal(){const l=S.log||[];var _byP={};l.forEach(function(e){if(e.by)_byP[e.by]=(_byP[e.by]||0)+e.delta;});var _recap=Object.keys(_byP).sort(function(a,b){return _byP[b]-_byP[a];}).map(function(n){return esc(n)+': '+(_byP[n]>=0?'+':'')+_byP[n];}).join(' · ');openSheet(`<h3><i class=vgi-receipt></i> Journal des mouvements</h3>${_recap?`<div class="mut" style="font-size:11.5px;margin:0 0 8px;padding:8px 10px;background:#ffffff06;border-radius:8px"><i class=vgi-bar-chart></i> Par personne : ${_recap}</div>`:''}<div style="max-height:50vh;overflow:auto">${l.length?l.map(e=>`<div class="jrow"><span class="mut" style="width:92px;flex:none;font-size:11px">${new Date(e.ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})} ${new Date(e.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span><span style="flex:1;min-width:0"><b>${esc(e.label)}</b> <span class="mut">· ${esc(e.member)}${e.by?' · <i class=vgi-user></i> '+esc(e.by):''}</span></span><span class="jdelta ${e.delta>=0?'pos':'neg'}">${e.delta>=0?'+':''}${e.delta}</span></div>`).join(''):'<div class="empty">Aucun mouvement.</div>'}</div><div class="toolbar" style="justify-content:space-between;margin:12px 0 0"><button class="btn danger" onclick="clearLog()">Vider</button><button class="btn o" onclick="closeSheet()">Fermer</button></div>`);}
function clearLog(){agConfirm('Vider le journal ?',function(){S.log=[];save();openJournal();});}
// ── F4 : fiche complète d'un objet (où il est · qui l'a · qui le vend · crafts · farm · mouvements) ──
function itemDetail(id){var it=(catalog()||[]).find(function(x){return x.id===id;});if(!it)return;
  var nm=it.item||id,lc=(nm||'').trim().toLowerCase();
  var totG=totalGuild(id),price=priceOf(id);
  var holders=(S.members||[]).filter(function(m){return qty(m,id)>0;}).map(function(m){return {m:m,q:qty(m,id)};}).sort(function(a,b){return b.q-a.q;});
  var crafts=allCrafts().map(function(c){var o=craftCost(c).find(function(o){return (o.n||'').trim().toLowerCase()===lc;});return o?{key:c.key,q:o.q}:null;}).filter(Boolean);
  var farm=((D.dungeons)||[]).filter(function(d){var hit=false;Object.keys(d.groups||{}).forEach(function(g){(d.groups[g]||[]).forEach(function(o){if((o.n||'').trim().toLowerCase()===lc)hit=true;});});return hit;});
  var moves=(S.log||[]).filter(function(e){var l=(e.label||'');return l===nm||l.indexOf(nm)>=0;}).slice(0,12);
  function sect(t,inner){return '<div style="margin:11px 0 0"><div class="sec-h" style="margin:0 0 5px;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px">'+t+'</div>'+inner+'</div>';}
  var html='<h3 style="display:flex;align-items:center;gap:8px"><span class="logo" style="width:34px;height:34px">'+itemAsset(it)+'</span>'+esc(nm)+'</h3>'
    +'<div class="hint">'+esc((it.cat||'').trim())+(it.classe?' · '+esc(it.classe):'')+(it.unit==='slot'?' · compté en slots (1 = 9 999)':'')+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 2px"><span class="pill" style="font-size:12px"><i class=vgi-castle></i> Total guilde <b>'+fmt(totG)+'</b></span>'+(price?'<span class="pill" style="font-size:12px"><i class=vgi-coin></i> <b>'+fmt(price)+'</b> périns</span>':'')+'</div>';
  html+=sect('<i class=vgi-user></i> Membres qui en possèdent',holders.length?'<div style="display:flex;flex-direction:column;gap:3px">'+holders.map(function(h){return '<div style="display:flex;justify-content:space-between;font-size:12.5px"><span><i class=vgi-user></i> '+esc(h.m)+'</span><b style="color:var(--gold)">×'+fmt(h.q)+'</b></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Personne n\'en a en coffre.</div>');
  html+=sect('<i class=vgi-coin></i> Qui en vend',((totG>0?'<div style="font-size:12.5px"><i class=vgi-cart></i> Boutique de guilde — <b>'+fmt(totG)+'</b> dispo <span class="mut">(total guilde)</span>'+(price?' à <b style="color:var(--gold)">'+fmt(price)+'</b> périns':' <span class="mut">(prix non défini)</span>')+'</div>':'')+(holders.length?'<div class="mut" style="font-size:11.5px;margin-top:3px">Détenu par : '+holders.map(function(h){return esc(h.m);}).join(', ')+'</div>':''))||'<div class="mut" style="font-size:12px">Pas en vente actuellement.</div>');
  html+=sect('<i class=vgi-hammer></i> Crafts qui l\'utilisent',crafts.length?'<div style="display:flex;flex-direction:column;gap:3px">'+crafts.map(function(c){return '<div style="display:flex;justify-content:space-between;font-size:12.5px;cursor:pointer" onclick="craftCalc(\''+sqa(c.key)+'\')"><span><i class=vgi-hammer></i> '+esc(c.key)+'</span><span class="mut">×'+esc(String(c.q))+'</span></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Aucune recette connue ne l\'utilise.</div>');
  html+=sect('<i class=vgi-sprout-farm></i> Où le farmer',farm.length?'<div style="display:flex;flex-wrap:wrap;gap:6px">'+farm.map(function(d){return '<span class="pill" style="font-size:11.5px">'+d.icon+' '+esc(d.name)+' <span class="mut">'+d.type+'</span></span>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Pas dans les donjons recensés (achat / échange).</div>');
  html+=sect('<i class=vgi-clipboard></i> Derniers mouvements',moves.length?'<div style="display:flex;flex-direction:column;gap:2px;max-height:150px;overflow:auto">'+moves.map(function(e){return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px"><span class="mut">'+new Date(e.ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' · '+esc(e.member)+(e.by?' · '+esc(e.by):'')+'</span><span style="font-weight:700;color:'+(e.delta>=0?'var(--green)':'var(--red)')+'">'+(e.delta>=0?'+':'')+e.delta+'</span></div>';}).join('')+'</div>':'<div class="mut" style="font-size:12px">Aucun mouvement enregistré.</div>');
  html+='<div class="toolbar" style="justify-content:flex-end;margin:12px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>';
  openSheet(html);}
function itemSearchSheet(){openSheet('<h3><i class=vgi-search></i> Fiche d\'un objet</h3><div class="hint">Tape un nom : où il est, qui l\'a, qui le vend, les crafts, le farm et les derniers mouvements.</div><input class="inp" id="isq" placeholder="ex. Catalyseur Bubble…" oninput="itemSearchFilter(this.value)" style="width:100%;margin-bottom:10px"><div id="isres" style="max-height:52vh;overflow:auto"></div><div class="toolbar" style="justify-content:flex-end;margin:8px 0 0"><button class="btn" onclick="closeSheet()">Fermer</button></div>');itemSearchFilter('');var f=document.getElementById('isq');if(f)f.focus();}
function itemSearchFilter(qv){var q=(qv||'').toLowerCase().trim();var items=(catalog()||[]).filter(function(it){return !q||(((it.item||'')+' '+(it.classe||'')+' '+(it.cat||'')).toLowerCase().indexOf(q)>=0);}).sort(function(a,b){return (a.item||'').localeCompare(b.item||'','fr');}).slice(0,40);var el=document.getElementById('isres');if(!el)return;el.innerHTML=items.length?items.map(function(it){return '<div class="it" onclick="itemDetail(\''+sq(it.id)+'\')" style="cursor:pointer"><div class="logo">'+itemAsset(it)+'</div><div class="nm"><div class="a">'+esc(it.item)+'</div><div class="b">'+(it.classe?esc(it.classe):esc((it.cat||'').trim()))+'</div></div><span class="mut" style="font-size:11px;white-space:nowrap">total ×'+fmt(totalGuild(it.id))+'</span></div>';}).join(''):'<div class="empty">Aucun objet.</div>';}

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
   <div class="toolbar"><input class="inp" placeholder="Cherche un objet (Yggdrasil, Anneau, Nucléus…) ou un donjon" value="${esc(q)}" oninput="q=this.value;render()" style="flex:1;min-width:240px"><div class="seg">${['Tous','SOLO','GROUPE'].map(t=>`<button class="${djType===t?'on':''}" onclick="djType='${t}';render()">${t==='Tous'?'Tous':t==='SOLO'?'<i class=vgi-sun></i> Solo':'<i class=vgi-users></i> Groupe'}</button>`).join('')}</div><span class="pill">${matching.length}/${D.dungeons.length}</span></div>
   <div class="split"><div class="djlist">${items}</div><div class="detail">${cur?detail(cur):''}</div></div>`;
}
function pick(id){sel=id;render();}
function detail(d){const pr=d.prestige?`<span class="pill pr">Prestige ${d.prestige}</span>`:'';const cats=Object.keys(d.groups);
  const body=cats.length?cats.map(c=>{const arr=d.groups[c];
    return `<div class="catsec"><h3 class="catcolor-${c.replace(/[^A-Za-z]/g,'')}"><span class="cc">${esc(c)}</span><span class="n">${arr.length}</span></h3><div class="drops">${arr.map(o=>{const f=S.farm[o.n];const sel2=f?'sel':'';const hit=q&&o.n.toLowerCase().includes(q.toLowerCase())?'hit':'';
      return `<div class="drop ${o.slot?'res':''} ${sel2} ${hit}" title="Clique pour viser cette récompense" onclick="farmAdd('${sq(o.n)}','${o.ic}',${d.id},'${c}')">${img(o.ic)||'<span style=width:26px></span>'}<span class="dn">${esc(o.n)}</span>${o.slot?'<span class="slot">slot</span>':''}${f?`<span class="qb">×${f.target}</span>`:''}</div>`;}).join('')}</div></div>`;}).join(''):'<div class="empty">Aucun objet utile recensé.</div>';
  return `<div class="dethead"><div class="ic">${d.icon}</div><div><h2>${esc(d.name)}</h2><div class="meta"><span class="pill ${d.type==='SOLO'?'solo':'groupe'}">${d.type}</span>${pr}<span class="pill">Niv. ${esc(d.lvl)}</span><span class="pill">${fmt(d.hp)} PV</span><span class="pill">${esc(d.elem)}</span></div></div></div>
   <div class="hint"><i class=vgi-target></i> Clique une récompense pour la viser (re-clic = +1). Puis « Verser au coffre » pour remplir la banque de guilde.</div>${body}`;
}
function farmAdd(name,ic,dj,cat){const f=S.farm[name];if(f)f.target++;else S.farm[name]={n:name,ic,dj,cat:cat||'Butin',target:1,have:0};save();render();}
function farmBar(){const keys=Object.keys(S.farm);if(!keys.length)return '';
  return `<div class="farmbar"><span style="font-family:Rajdhani;font-weight:700;color:var(--orange)"><i class=vgi-target></i> ${keys.length} objectif(s) de farm</span><span class="spacer"></span><button class="btn sm" onclick="openFarm()">Voir / verser au coffre</button><button class="btn sm danger" onclick="agConfirm('Vider les objectifs ?',function(){S.farm={};save();render();})">Vider</button></div>`;}
function openFarm(){const keys=Object.keys(S.farm);openSheet(`<h3><i class=vgi-target></i> Objectifs de farm</h3><div class="hint">« Possédé » se verse dans <b>ton coffre</b> (qui compte dans le Total guilde) puis se remet à 0.</div>${keys.length?keys.map(k=>{const f=S.farm[k];const dj=D.dungeons.find(x=>x.id===f.dj);const pc=f.target?Math.min(100,f.have/f.target*100):0;
   return `<div class="fitem">${img(f.ic)||'<span class="x" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#ffffff08;border-radius:8px"><i class=vgi-package></i></span>'}<div class="fn"><div class="a">${esc(f.n)}</div><div class="b">${dj?'<i class=vgi-'+dj.icon+'></i> '+esc(dj.name):''}</div><div class="prog"><i style="width:${pc}%"></i></div></div>
     <div style="text-align:center"><div class="mut" style="font-size:10px">possédé</div><div class="step"><button onclick="farmHave('${sq(k)}',-1)">−</button><input value="${f.have}" onchange="farmSet('${sq(k)}','have',this.value)"><button onclick="farmHave('${sq(k)}',1)"><i class=vgi-plus></i></button></div></div>
     <div style="text-align:center"><div class="mut" style="font-size:10px">visé</div><div class="step"><button onclick="farmTar('${sq(k)}',-1)">−</button><input value="${f.target}" onchange="farmSet('${sq(k)}','target',this.value)"><button onclick="farmTar('${sq(k)}',1)"><i class=vgi-plus></i></button></div></div>
     <button class="btn g sm" onclick="pourToBank('${sq(k)}')">→ Coffre</button>
     <span class="rm" style="opacity:.6" onclick="delFarm('${sq(k)}')"><i class=vgi-x></i></span></div>`;}).join(''):'<div class="empty">Aucun objectif. Clique des récompenses dans les donjons.</div>'}<div class="toolbar" style="justify-content:flex-end;margin:12px 0 0"><button class="btn o" onclick="closeSheet()">Fermer</button></div>`);}
function farmHave(k,d){const f=S.farm[k];if(f){f.have=Math.max(0,f.have+d);save();openFarm();renderTabs();}}
function farmTar(k,d){const f=S.farm[k];if(f){f.target=Math.max(1,f.target+d);save();openFarm();}}
function farmSet(k,p,v){const f=S.farm[k];if(f){f[p]=Math.max(p==='target'?1:0,Math.round(+v||0));save();openFarm();}}
function delFarm(k){delete S.farm[k];save();openFarm();renderTabs();}
function pourToBank(k){const f=S.farm[k];if(!f||!f.have)return;
  if(!D.bankCats.includes('Butin de donjon'))D.bankCats.push('Butin de donjon');
  const id='loot|'+f.n;let it=catalog().find(x=>x.id===id);
  if(!it){S.custom.push({id,cat:'Butin de donjon',classe:'',item:f.n,prix:0});}
  var dst=myCoffre();setQty(dst,id,qty(dst,id)+f.have,f.n);
  f.have=0;save();openFarm();renderTabs();
}

/* ============ CRAFT ============ */
function ingRow(o){const sl=o.slot&&typeof o.q==='number'?`<div class="b">${slotTxt(o.q)} · 1 slot = 9 999</div>`:'';return `<div class="ing">${img(o.ic)||'<span class="x"><i class=vgi-package></i></span>'}<div class="in"><div class="a">${esc(o.n)}</div>${sl}</div><div class="q">×${typeof o.q==='number'?fmt(o.q):o.q}</div></div>`;}
function craftCost(c){return S.recipes[c.key]||c.cost||[];}
/* Ce que la recette PRODUIT. Decision de Maxime : un craft peut rendre un seul
   objet ou plusieurs, avec quantite — on garde les deux possibles.
   Repli : les 25 crafts predefinis n'ont pas de champ produits et rendent 1 fois
   leur propre nom. Sans ce repli, ils afficheraient tous « ne produit rien ». */
function craftProduits(c){
  var p=(S.craftYields||{})[c.key]||c.produits;
  if(!p||!p.length)return [{n:c.key,q:1}];
  return p;
}
/* Vrai si la recette produit autre chose qu'un seul exemplaire d'elle-meme :
   c'est le seul cas ou l'afficher apporte une information. */
function craftProduitsSpeciaux(c){
  var p=craftProduits(c);
  return !(p.length===1 && p[0].n===c.key && Number(p[0].q)===1);
}
const GROUP_EMOJI={'Œufs':'<i class=vgi-egg></i>','Badges':'<i class=vgi-medal></i>','Masques':'<i class=vgi-mask></i>','Mantras':'<i class=vgi-shirt></i>','Médailles & reliques':'<i class=vgi-medal></i>'};
// ── Crafts personnalisés (Vanguard) : créer / supprimer / éditer les icônes (assets craft.zip) ──
const CRAFT_ASSETS={
  'Badges':['badgeworldboss','badgejardinprestigieux','badgedelatour','badgedonjon','badgedonjonmineur'].map(function(n){return '/assets/items/craft/badges/'+n+'.png';}),
  'Mantras':['hp1','hp2','hp3','pve1','pve2','pve3','pvp1','pvp2','pvp3'].map(function(n){return '/assets/items/craft/mantra/'+n+'.png';}),
  'Masques':['hp1','hp2','hp3','pv1','pv2','pve3','pvp1','pvp2','pvp3'].map(function(n){return '/assets/items/craft/masques/'+n+'.png';})
};
function allCrafts(){return (((D||{}).objectifs||{}).crafts||[]).concat(S.customCrafts||[]).filter(function(c){return (S.hiddenCrafts||[]).indexOf(c.key)<0;});}
function craftIcon(c){return (S.craftAssets||{})[c.key]||c.ic;}
function findCraft(key){return allCrafts().find(function(c){return c.key===key;});}
// échappe une valeur destinée à un argument de chaîne JS DANS un attribut onclick="" (guillemets doubles) : anti-casse + anti-XSS.
function sqa(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function galleryRows(fnName,extra){var out='';['Badges','Mantras','Masques'].forEach(function(cat){out+='<div class="sec-h" style="margin:8px 0 4px;font-size:11px">'+cat+'</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+CRAFT_ASSETS[cat].map(function(p){return '<span class="logo" style="width:40px;height:40px;cursor:pointer;border:2px solid transparent;border-radius:8px;padding:2px" title="'+esc(p.split('/').pop())+'" onclick="'+fnName+'('+extra+',\''+sq(p)+'\')">'+img(p)+'</span>';}).join('')+'</div>';});return out;}
//matching amélioré nom d'ingrédient -> objet du coffre (accents/ponctuation ignorés + sous-ensemble de mots)
function iqNorm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function iqFind(name){var q=iqNorm(name);if(!q)return null;var cat=catalog()||[];var it=cat.find(function(x){return iqNorm(x.item)===q;});if(it)return it;var qt=q.split(' ').filter(Boolean);if(qt.length<2)return null;/* flou uniquement sur les noms à ≥2 mots (ex. « liane ruine prestigieuse » → « Liane de Ruine Prestigieuse ») : tous les mots de l'ingrédient présents dans le nom de l'objet. Pas d'appariement inverse (éviterait qu'un objet générique « Casque » matche « Casque du Berserker »). */return cat.find(function(x){var t=iqNorm(x.item);return t&&qt.every(function(w){return t.indexOf(w)>=0;});})||null;}
function iqHolders(name){var it=iqFind(name);if(!it)return [];return (S.members||[]).map(function(m){return {m:m,q:+((S.inv[m]||{})[it.id])||0};}).filter(function(h){return h.q>0;}).sort(function(a,b){return b.q-a.q;});}
function newCraftForm(){if(!canEdit())return;
  /* Categories existantes + celles deja creees a la main : la liste etait figee,
     donc impossible de ranger un nouvel objet ailleurs que dans les 4 d'origine. */
  var groups=[];allCrafts().forEach(function(c){if(c.group&&groups.indexOf(c.group)<0)groups.push(c.group);});
  ['Œufs','Badges','Masques','Mantras'].forEach(function(g){if(groups.indexOf(g)<0)groups.push(g);});openSheet('<h3><i class=vgi-plus></i> Nouveau craft</h3><div class="hint">Crée le craft puis renseigne sa recette. Tu pourras changer son icône ensuite.</div><div class="field"><label>Nom</label><input class="inp" id="ncN" placeholder="ex. Masque HP III"></div><div class="field"><label>Catégorie</label><select class="inp" id="ncG" onchange="var f=document.getElementById(\'ncGnew\');if(f)f.style.display=this.value===\'__new__\'?\'block\':\'none\';">'+groups.map(function(g){return '<option>'+esc(g)+'</option>';}).join('')+'<option value="__new__">+ Nouvelle catégorie…</option></select><input class="inp" id="ncGnew" placeholder="Nom de la nouvelle catégorie" style="display:none;margin-top:6px"></div><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="closeSheet()">Annuler</button> <button class="btn o" onclick="doAddCraft()">Créer</button></div>');}
function doAddCraft(){var n=(($('#ncN')||{}).value||'').replace(/["'\\<>&]/g,'').replace(/\s+/g,' ').trim();if(!n)return;var g=($('#ncG')||{}).value||'Badges';
  if(g==='__new__'){g=((($('#ncGnew')||{}).value)||'').replace(/["'\\<>&]/g,'').trim();if(!g){agToast('Donne un nom à la nouvelle catégorie.',false);return;}}
  // Si on recrée un craft prédéfini supprimé (caché), on le restaure au lieu de créer un doublon fantôme.
  if((S.hiddenCrafts||[]).indexOf(n)>=0){S.hiddenCrafts=(S.hiddenCrafts||[]).filter(function(k){return k!==n;});save();closeSheet();render();openRecipe(n);return;}
  if(allCrafts().some(function(c){return c.key===n;})){agToast('Un craft porte déjà ce nom.',false);return;}
  S.customCrafts=S.customCrafts||[];S.customCrafts.push({key:n,group:g,npc:'',ic:'',cost:[]});save();closeSheet();render();openRecipe(n);}
function delCraft(key){if(!canEdit())return;agConfirm('Supprimer le craft « '+key+' » ?',function(){if((S.customCrafts||[]).some(function(c){return c.key===key;})){S.customCrafts=(S.customCrafts||[]).filter(function(c){return c.key!==key;});}else{S.hiddenCrafts=S.hiddenCrafts||[];if(S.hiddenCrafts.indexOf(key)<0)S.hiddenCrafts.push(key);}if(S.recipes)delete S.recipes[key];if(S.craftAssets)delete S.craftAssets[key];if(S.craftYields)delete S.craftYields[key];save();render();});}
function editCraftIcon(key){if(!canEdit())return;openSheet('<h3><i class=vgi-image></i> Icône — '+esc(key)+'</h3><div class="hint">Choisis une icône fournie, ou colle un lien.</div>'+galleryRows('setCraftIcon',"'"+sqa(key)+"'")+'<div class="field" style="margin-top:10px"><label>Lien personnalisé (URL ou /chemin)</label><input class="inp" id="ciU" value="'+esc((S.craftAssets||{})[key]||'')+'" placeholder="/assets/... ou https://..."></div><div class="toolbar" style="justify-content:space-between;margin:0"><button class="btn danger sm" onclick="setCraftIcon(\''+sqa(key)+'\',\'\')">Retirer</button><div><button class="btn" onclick="closeSheet()">Annuler</button> <button class="btn o" onclick="setCraftIcon(\''+sqa(key)+'\',((document.getElementById(\'ciU\')||{}).value||\'\').trim())">Enregistrer</button></div></div>');}
function setCraftIcon(key,path){S.craftAssets=S.craftAssets||{};if(path){S.craftAssets[key]=path;}else{delete S.craftAssets[key];}save();closeSheet();render();}
function pickIngIcon(i,key){openSheet('<h3><i class=vgi-image></i> Icône ingrédient</h3><div class="hint">Choisis une icône, ou colle un lien.</div>'+galleryRows('setIngIcon',i+",'"+sqa(key)+"'")+'<div class="field" style="margin-top:10px"><label>Lien personnalisé</label><input class="inp" id="iiU" placeholder="/assets/... ou https://..."></div><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn" onclick="drawRecipe(\''+sqa(key)+'\')">Retour</button> <button class="btn o" onclick="setIngIcon('+i+',\''+sqa(key)+'\',((document.getElementById(\'iiU\')||{}).value||\'\').trim())">Enregistrer</button></div>');}
function setIngIcon(i,key,path){if(window.__rec&&window.__rec[i]){window.__rec[i].ic=path;}drawRecipe(key);}
//── Calculateur de craft : recette -> stock du coffre (#Phase C) ──
function craftBaseOpts(){return ['Σ Total guilde'].concat(S.members||[]);}
function iqStock(name){var it=iqFind(name);if(!it)return {found:false,stock:0};var b=window.__craftBase||'Σ Total guilde';var st;if(b==='Σ Total guilde'){st=(S.members||[]).reduce(function(s,m){return s+(+((S.inv[m]||{})[it.id])||0);},0);}else{st=+((S.inv[b]||{})[it.id])||0;}return {found:true,stock:st,id:it.id,unit:it.unit,item:it.item};}
function craftCalc(key){var c=findCraft(key);if(!c)return;var cost=craftCost(c).filter(function(o){return o.n&&String(o.n).trim();});var base=window.__craftBase||'Σ Total guilde';
  var rows=cost.map(function(o){var req=Number(o.q);var hasNum=!isNaN(req)&&o.q!==''&&o.q!=='?';var s=iqStock(o.n);var ok=hasNum?(s.stock>=req):null;var col=ok===null?'var(--mut)':(ok?'var(--green)':'var(--red)');var poss=hasNum?((s.found?s.stock:0)+' / '+req):('? / '+(o.q||'?'));var hold=iqHolders(o.n);var holdTxt=hold.length?'<div class="mut" style="font-size:10px;margin-top:1px"><i class=vgi-user></i> '+hold.slice(0,4).map(function(h){return esc(h.m)+' ×'+fmt(h.q);}).join(', ')+(hold.length>4?' +'+(hold.length-4)+' autre(s)':'')+'</div>':(s.found?'<div class="mut" style="font-size:10px;margin-top:1px">Aucun membre n\'en a en coffre</div>':'');return '<div class="ing"><span class="x">'+(img(o.ic)||'<i class=vgi-package></i>')+'</span><div class="in"><div class="a">'+esc(o.n)+(s.found?'':' <span class="mut" style="font-size:9px">(pas au coffre)</span>')+'</div>'+holdTxt+'</div><div class="q" style="color:'+col+';font-weight:700">'+poss+' '+(ok===null?'':(ok?'<i class=vgi-check></i>':'<i class=vgi-alert></i>'))+'</div></div>';}).join('');
  var numeric=cost.filter(function(o){var q=Number(o.q);return !isNaN(q)&&o.q!==''&&o.q!=='?';});
  var feasible=numeric.length?Math.min.apply(null,numeric.map(function(o){var s=iqStock(o.n);var q=Number(o.q);return q>0?Math.floor(s.stock/q):0;})):0;
  var missing=numeric.map(function(o){var s=iqStock(o.n);return {n:o.n,manque:Number(o.q)-s.stock};}).filter(function(m){return m.manque>0;});
  var totReq=0,totHave=0;numeric.forEach(function(o){var req=Number(o.q);var s=iqStock(o.n);totReq+=req;totHave+=Math.min(s.stock,req);});var prog=totReq?Math.round(totHave/totReq*100):0;var progCol=prog>=100?'var(--green)':prog>=50?'var(--gold)':'var(--orange)';var progBar=numeric.length?'<div style="margin:12px 0 4px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px"><span class="mut">Progression vers le craft</span><span style="font-weight:700;color:'+progCol+'">'+prog+'%</span></div><div style="height:8px;background:#ffffff10;border-radius:5px;overflow:hidden"><i style="display:block;width:'+Math.min(100,prog)+'%;height:100%;background:'+progCol+';transition:width .3s"></i></div></div>':'';
  var verdict=!numeric.length?'<div class="mut">Recette à compléter (renseigne les quantités).</div>':(!missing.length?'<div style="color:var(--green);font-weight:700;font-size:15px"><i class=vgi-check></i> Réalisable ×'+feasible+'</div>':'<div style="color:var(--red);font-weight:700"><i class=vgi-alert></i> Il manque : '+missing.map(function(m){return esc(m.n)+' ×'+m.manque;}).join(' · ')+'</div>');
  var baseSel='<select class="inp" style="max-width:210px" onchange="window.__craftBase=this.value;craftCalc(\''+sqa(key)+'\')">'+craftBaseOpts().map(function(b){return '<option '+(b===base?'selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select>';
  openSheet('<h3><i class=vgi-gauge></i> '+esc(key)+'</h3><div class="hint" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">Base de stock : '+baseSel+'</div><div id="recrows" style="margin-top:8px">'+(rows||'<div class="mut">Aucun ingrédient.</div>')+'</div>'+progBar+'<div style="margin:12px 0">'+verdict+'</div><div class="toolbar" style="justify-content:space-between;margin:0">'+(missing.length?'<button class="btn o" onclick="craftFarm(\''+sqa(key)+'\')"><i class=vgi-clipboard></i> Créer une demande de farm</button>':'<span></span>')+'<button class="btn" onclick="closeSheet()">Fermer</button></div>');}
function craftFarm(key){var c=findCraft(key);if(!c)return;var cost=craftCost(c);var added=0;S.farm=S.farm||{};cost.forEach(function(o){var q=Number(o.q);if(isNaN(q)||o.q===''||o.q==='?')return;var s=iqStock(o.n);var manque=q-s.stock;if(manque>0){if(S.farm[o.n]){S.farm[o.n].target=Math.max(S.farm[o.n].target||0,manque);S.farm[o.n].cat='Craft : '+key;}else{S.farm[o.n]={n:o.n,ic:o.ic||'',dj:0,cat:'Craft : '+key,target:manque,have:0};}added++;}});save();closeSheet();render();agToast(added+' ingrédient(s) ajouté(s) à la liste de farm ',true);}
function craftCard(c){const cost=craftCost(c);const edited=!!S.recipes[c.key];const ce=canEdit();
  return `<div class="ocard"><h3>${img(craftIcon(c))||GROUP_EMOJI[c.group]||'<i class=vgi-hammer></i>'} ${esc(c.key)}</h3>
    <div class="npc">${c.npc?esc(c.npc):(cost.length?'Composants':'Recette à compléter')}${edited?' · <span style="color:var(--gold)">modifiée</span>':''}</div>
    ${cost.length?cost.map(ingRow).join(''):'<div class="mut" style="font-size:12px;padding:6px 0">Aucune recette renseignée.</div>'}
    ${craftProduitsSpeciaux(c)?'<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.07);font-size:11.5px"><span class="mut">Produit :</span> '+craftProduits(c).map(function(pr){return '<b style="color:var(--gold,#FFB552)">'+esc(pr.q)+' ×</b> '+esc(pr.n);}).join(' · ')+'</div>':''}
    <div class="toolbar" style="margin:8px 0 0;flex-wrap:wrap">${cost.length?`<button class="btn sm o" onclick="craftCalc('${sqa(c.key)}')"><i class=vgi-gauge></i> Calculer</button> `:''}<button class="btn sm" onclick="openRecipe('${sqa(c.key)}')"><i class=vgi-edit></i> Recette</button>${ce?` <button class="btn sm" onclick="editCraftIcon('${sqa(c.key)}')"><i class=vgi-image></i> Icône</button> <button class="btn sm danger" onclick="delCraft('${sqa(c.key)}')"><i class=vgi-trash></i></button>`:''}</div></div>`;}
function farmReqSection(){var fk=Object.keys(S.farm||{});if(!fk.length)return '';return '<div style="margin-top:6px"><div class="sec-h"><i class=vgi-clipboard></i> Demandes de farm en cours <span class="n">'+fk.length+'</span></div><div class="ogrid">'+fk.map(function(k){var f=S.farm[k];var have=f.have||0;var pc=f.target?Math.min(100,Math.round(have/f.target*100)):0;return '<div class="ocard" style="padding:10px"><div style="display:flex;align-items:center;gap:8px"><span class="x">'+(img(f.ic)||'<i class=vgi-package></i>')+'</span><div style="flex:1;min-width:0"><div class="a" style="font-weight:600">'+esc(f.n)+'</div><div class="mut" style="font-size:10px">'+esc(f.cat||'')+'</div></div><span class="rm" style="cursor:pointer" onclick="delete S.farm[\''+sq(k)+'\'];save();render()"><i class=vgi-x></i></span></div><div class="mut" style="font-size:11px;margin:5px 0 3px">'+have+' / '+f.target+'</div><div class="prog"><i style="width:'+pc+'%"></i></div><div class="toolbar" style="margin:6px 0 0;gap:4px"><button class="btn sm" onclick="var f=S.farm[\''+sq(k)+'\'];if(f){f.have=Math.max(0,(f.have||0)-1);save();render();}">−</button><button class="btn sm" onclick="var f=S.farm[\''+sq(k)+'\'];if(f){f.have=(f.have||0)+1;save();render();}"><i class=vgi-plus></i></button></div></div>';}).join('')+'</div></div>';}
function viewCraft(){const O=D.objectifs;
  const byG={};allCrafts().forEach(c=>{(byG[c.group]=byG[c.group]||[]).push(c);});
  /* Les categories d'origine d'abord, pour garder l'ordre habituel, PUIS toute
     categorie creee a la main. Cette liste etait figee : un craft range dans une
     nouvelle categorie etait bien enregistre mais n'apparaissait nulle part. */
  const groups=['Œufs','Badges','Masques','Mantras','Médailles & reliques'].filter(g=>byG[g])
    .concat(Object.keys(byG).filter(g=>['Œufs','Badges','Masques','Mantras','Médailles & reliques'].indexOf(g)<0).sort());
  const tiers=Object.keys(O.prestige).sort((a,b)=>+a-+b);
  return `<div class="legend">Recettes & items. Les <b>ressources</b> en gros volume se comptent en <b>slots</b> (1 = 9 999) ; <b>médailles & reliques</b> à l'unité. Tu peux <b>compléter une recette</b> dès que tu as les infos du guide book.</div>
   ${canEdit()?`<div class="toolbar" style="margin:8px 0"><button class="btn o" onclick="newCraftForm()"><i class=vgi-plus></i> Nouveau craft</button></div>`:''}
   ${farmReqSection()}
   ${groups.map(g=>byG[g]?`<div style="margin-top:6px"><div class="sec-h">${GROUP_EMOJI[g]||''} ${esc(g)} <span class="n">${byG[g].length}</span></div><div class="ogrid">${byG[g].map(craftCard).join('')}</div></div>`:'').join('')}
   <div style="margin-top:14px"><div class="sec-h"><i class=vgi-trophy></i> Prestige — coût par palier</div><div class="ogrid">${tiers.map(t=>`<div class="ocard"><div class="tierhead">P${+t-1} → P${t}</div>${O.prestige[t].map(ingRow).join('')}</div>`).join('')}</div></div>`;
}
function openRecipe(key){const base=findCraft(key)||{cost:[]};const cur=(S.recipes[key]||base.cost||[]).map(x=>({n:x.n,q:x.q,slot:!!x.slot,ic:x.ic||''}));
  window.__rec=cur;
  /* Vide quand la recette rend 1 fois son propre nom : l'editeur affiche alors
     le comportement par defaut plutot qu'une ligne a supprimer. */
  window.__prod=craftProduitsSpeciaux(base)?craftProduits(base).map(function(x){return {n:x.n,q:x.q};}):[];
  drawRecipe(key);}
function drawRecipe(key){const cur=window.__rec;
  const rows=cur.map((r,i)=>`<div class="ing"><span class="x" style="cursor:pointer" title="Changer l'icône" onclick="pickIngIcon(${i},'${sqa(key)}')">${img(r.ic)||'<i class=vgi-package></i>'}</span><input class="inp" style="flex:1" value="${esc(r.n)}" oninput="window.__rec[${i}].n=this.value" placeholder="Nom de l'ingrédient"><input class="inp" style="width:90px" value="${esc(r.q)}" oninput="window.__rec[${i}].q=this.value" placeholder="Qté"><label class="mut" style="font-size:10px;display:flex;flex-direction:column;align-items:center">slot<input type="checkbox" ${r.slot?'checked':''} onchange="window.__rec[${i}].slot=this.checked"></label><span class="rm" style="opacity:.6;cursor:pointer" onclick="window.__rec.splice(${i},1);drawRecipe('${sqa(key)}')"><i class=vgi-x></i></span></div>`).join('');
  var prods=window.__prod||[];
  var prodRows=prods.map(function(r,i){return '<div class="ing"><input class="inp" style="flex:1" value="'+esc(r.n)+'" oninput="window.__prod['+i+'].n=this.value" placeholder="Objet produit"><input class="inp" style="width:90px" value="'+esc(r.q)+'" oninput="window.__prod['+i+'].q=this.value" placeholder="Qté"><span class="rm" style="opacity:.6;cursor:pointer" onclick="window.__prod.splice('+i+',1);drawRecipe(\''+sqa(key)+'\')"><i class=vgi-x></i></span></div>';}).join('');
  openSheet(`<h3><i class=vgi-edit></i> Recette — ${esc(key)}</h3><div class="hint">Renseigne les ingrédients et quantités. Coche « slot » pour les grosses ressources.</div>
   <div id="recrows">${rows||'<div class="mut" style="font-size:12px">Aucun ingrédient.</div>'}</div>
   <div class="toolbar" style="margin:10px 0"><button class="btn sm" onclick="window.__rec.push({n:'',q:'',slot:false,ic:''});drawRecipe('${sqa(key)}')"><i class=vgi-plus></i> Ingrédient</button></div>
   <h3 style="margin-top:14px"><i class=vgi-package></i> Ce que la recette produit</h3>
   <div class="hint">Laisse vide si la recette rend simplement <b>1 ${esc(key)}</b>. Ajoute une ou plusieurs lignes pour un autre résultat, ou pour plusieurs objets à la fois.</div>
   <div id="prodrows">${prodRows||'<div class="mut" style="font-size:12px">1 × ' + esc(key) + ' (par défaut)</div>'}</div>
   <div class="toolbar" style="margin:10px 0"><button class="btn sm" onclick="window.__prod.push({n:'',q:1});drawRecipe('${sqa(key)}')"><i class=vgi-plus></i> Objet produit</button></div>
   <div class="toolbar" style="margin:10px 0"><button class="btn sm" onclick="window.__rec.push({n:'',q:'',slot:false,ic:''});drawRecipe('${sqa(key)}')"><i class=vgi-plus></i> Ingrédient</button></div>
   <div class="toolbar" style="justify-content:space-between;margin:0"><button class="btn danger sm" onclick="delete S.recipes['${sqa(key)}'];save();closeSheet();render()">Réinitialiser</button><div><button class="btn" onclick="closeSheet()">Annuler</button> <button class="btn o" onclick="saveRecipe('${sqa(key)}')">Enregistrer</button></div></div>`);}
function saveRecipe(key){const cur=(window.__rec||[]).filter(r=>r.n&&String(r.n).trim()).map(r=>{const qn=Number(r.q);return {n:r.n.trim(),q:isNaN(qn)||r.q===''?(r.q||'?'):qn,slot:!!r.slot,ic:r.ic||''};});
  S.recipes[key]=cur;
  /* Quantite invalide ou absente -> 1 : une recette qui produit « ? » objets
     serait inexploitable par le calcul de cout. */
  var prod=(window.__prod||[]).filter(function(r){return r.n&&String(r.n).trim();}).map(function(r){
    var q=Math.max(1,Math.floor(Number(r.q)||1));return {n:String(r.n).trim(),q:q};});
  S.craftYields=S.craftYields||{};
  if(prod.length)S.craftYields[key]=prod;else delete S.craftYields[key];
  save();closeSheet();render();}

/* ============ BOUTIQUE / DETTE ============ */
let shopQ='';
function viewShop(){
  if(!S.shopMember||!S.members.includes(S.shopMember))S.shopMember=S.members[0]||'';
  const memberOpts=S.members.slice();
  const cats=catalog();const q=shopQ.toLowerCase();
  // articles dispo = stock TOTAL GUILDE > 0 (somme de tous les coffres membres)
  let list=cats.filter(it=>totalGuild(it.id)>0);
  if(q)list=list.filter(it=>(it.item+' '+it.classe).toLowerCase().includes(q));
  const rows=list.map(it=>{const stock=totalGuild(it.id);const inCart=(S.cart[it.id]||0);const logo=itemAsset(it);
    return `<div class="shopitem"><div class="logo">${logo}</div><div class="nm" style="flex:1;min-width:0"><div class="a" style="font-weight:600;font-size:13.5px">${esc(it.item)}</div><div class="b" style="color:var(--mut);font-size:11px">${it.classe?esc(it.classe)+' · ':''}stock ${stock}</div></div>
      <div class="price">${priceBtn(it.id)}</div>
      <div class="step"><button onclick="cartAdd('${sq(it.id)}',-1)">−</button><input value="${inCart}" onchange="cartSet('${sq(it.id)}',this.value)"><button onclick="cartAdd('${sq(it.id)}',1)"><i class=vgi-plus></i></button></div></div>`;}).join('');
  return `<div class="card" style="margin-bottom:14px"><div class="sec-h"><i class=vgi-cart></i> Boutique de guilde <span class="n">stock total de la guilde</span></div>
    <div class="toolbar" style="margin:0"><label class="mut" style="font-size:12px">Membre :</label>
      <select class="inp" onchange="S.shopMember=this.value;save();render()">${memberOpts.length?memberOpts.map(m=>`<option ${S.shopMember===m?'selected':''}>${esc(m)}</option>`).join(''):'<option value="">— ajoute un membre dans Banque —</option>'}</select>
      <input class="inp" placeholder="Rechercher un article…" value="${esc(shopQ)}" oninput="shopQ=this.value;render()" style="flex:1;min-width:160px"></div></div>
   <div class="shopgrid"><div class="card" style="padding:8px 12px">${rows||'<div class="empty">Aucun article en stock dans la guilde. Remplissez les coffres via Banque ou Donjons.</div>'}</div>
     ${cartPanel()}</div>
   ${debtsPanel()}`;
}
function setPrice(id,v){var p=priceObj(id);p.pub=Math.max(0,Math.round(+v||0));S.prices[id]=p;save();} // compat : fixe le prix public en gardant les paliers
// Éditeur de tarifs (réservé Vanguard/Direction) : vendable/dette + prix public/membre/dette.
// ── Tarifs ───────────────────────────────────────────────────────────────────
// Une arme a un stock PAR RARETE (cle id|R#rarete) : une Hache Rare et une Hache
// Pre-mythique n'ont evidemment pas le meme prix. La fenetre affiche donc une
// GRILLE (une ligne par rarete en stock) au lieu d'un tarif unique.
// La caution a ete supprimee : un membre rembourse sa dette en plusieurs fois.

/** Raretes de cet objet REELLEMENT en stock, tous coffres confondus. */
function raritesEnStock(id){
  var it=catalog().find(function(x){return x.id===id;});
  if(!needsRarity(it))return [];
  return RARITIES.filter(function(r){
    var k=rarKey(id,r[0]);
    return Object.keys(S.inv||{}).some(function(m){return qty(m,k)>0;});
  }).map(function(r){return r;});
}
/** Liste des cles tarifaires a renseigner : les raretes en stock, sinon l'objet seul. */
function clesTarifaires(id){
  var rs=raritesEnStock(id);
  return rs.length?rs.map(function(r){return {cle:rarKey(id,r[0]),lib:r[1],couleur:r[2]};})
                  :[{cle:id,lib:'',couleur:'var(--orange)'}];
}
function editPrice(id){
  if(!canEdit()&&!canDeposit())return agToast('Tarifs : possible au dépôt dans TON coffre (ou rôle Vanguard/Direction).',false);
  var it=catalog().find(function(x){return x.id===id;})||{item:id};
  var cles=clesTarifaires(id);
  var parRarete=cles.length>1||cles[0].lib;
  var num=function(cle,champ,val){
    return '<input class="inp" id="p_'+champ+'_'+btoa(unescape(encodeURIComponent(cle))).replace(/=/g,'')+'" type="number" min="0" step="1" value="'+(val||0)+'" style="width:100%;text-align:right">';
  };
  var lignes=cles.map(function(c){
    var p=priceObj(c.cle);
    return '<tr>'
      +'<td style="padding:6px 8px 6px 0;white-space:nowrap">'+(c.lib
          ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;color:'+c.couleur+';border:1px solid '+c.couleur+'55;background:'+c.couleur+'18">'+c.lib+'</span>'
          : '<span style="color:var(--mut)">Tarif</span>')+'</td>'
      +'<td style="padding:4px">'+num(c.cle,'pub',p.pub)+'</td>'
      +'<td style="padding:4px">'+num(c.cle,'mem',p.mem)+'</td>'
      +'<td style="padding:4px">'+num(c.cle,'det',p.det)+'</td>'
      +'</tr>';
  }).join('');
  var p0=priceObj(cles[0].cle);
  openSheet('<h3>Tarifs — '+esc(it.item)+'</h3>'
   +'<div class="hint">Le membre voit le prix membre, le public le prix public. '
   +(parRarete?'Chaque rareté en stock doit avoir son prix.':'Le prix est obligatoire pour que l\'objet apparaisse en Boutique.')+'</div>'
   +'<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="pV" '+(p0.v?'checked':'')+'> Vendable (achat direct)</label></div>'
   +'<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="pD" '+(p0.d?'checked':'')+'> Dette membre autorisée</label></div>'
   +'<table style="width:100%;border-collapse:collapse;margin-top:4px">'
   +'<thead><tr style="font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px">'
   +'<th style="text-align:left;padding-bottom:4px"></th><th style="padding-bottom:4px">Public</th><th style="padding-bottom:4px">Membre</th><th style="padding-bottom:4px">Dette</th>'
   +'</tr></thead><tbody>'+lignes+'</tbody></table>'
   +'<div class="toolbar" style="justify-content:flex-end;margin:10px 0 0"><button class="btn" onclick="closeSheet()">Annuler</button><button class="btn o" onclick="savePrice(\''+sqa(id)+'\')">Enregistrer</button></div>');
}
function savePrice(id){
  var v=document.getElementById('pV').checked, d=document.getElementById('pD').checked;
  var cles=clesTarifaires(id);
  var lire=function(cle,champ){
    var el=document.getElementById('p_'+champ+'_'+btoa(unescape(encodeURIComponent(cle))).replace(/=/g,''));
    return Math.max(0,Math.round(+(el||{}).value||0));
  };
  // Chaque rarete en stock doit avoir un prix : on refuse l'enregistrement partiel
  // plutot que de laisser un article a 0 perin, donc « gratuit », en Boutique.
  var manquants=cles.filter(function(c){return lire(c.cle,'pub')<=0;});
  if(manquants.length)
    return agToast('Prix public manquant pour : '+manquants.map(function(c){return c.lib||'cet objet';}).join(', '),false);
  cles.forEach(function(c){
    S.prices[c.cle]={v:v,d:d,pub:lire(c.cle,'pub'),mem:lire(c.cle,'mem')||lire(c.cle,'pub'),det:lire(c.cle,'det')||lire(c.cle,'pub')};
  });
  save();closeSheet();render();
  agToast(cles.length>1?'Tarifs enregistrés pour '+cles.length+' raretés':'Tarifs enregistrés',true);
}
function priceBtn(id){var p=priceObj(id);return '<button class="inp" style="cursor:pointer;text-align:right;white-space:nowrap;min-width:120px" onclick="editPrice(\''+sqa(id)+'\')" title="Éditer les tarifs (public / membre / dette)"><b style="color:var(--gold)">'+fmt(p.pub)+'</b> <span class="mut" style="font-size:10px">pub</span> · <b style="color:var(--green)">'+fmt(p.mem)+'</b> <span class="mut" style="font-size:10px">mbr</span>'+(p.v?'':' <span style="color:var(--red);font-size:10px"><i class=vgi-x></i>vente</span>')+'</button>';}
//Bouton compact « tarifs » posé sur chaque ligne du coffre (au dépôt). Doré si le tarif n'est pas encore fixé.
function priceMini(id){var bid=baseId(id);var set=S.prices[bid]!=null;var p=priceObj(bid);return '<button class="btn" style="padding:3px 8px;font-size:11px;white-space:nowrap;flex:none;'+(set?'':'border-color:var(--gold);color:var(--gold)')+'" onclick="editPrice(\''+sqa(bid)+'\')" title="Tarifs : à vendre et/ou dette · prix public/membre/dette +"><i class=vgi-coin></i> '+(set?fmt(p.pub):'à fixer')+'</button>';}
// Au 1er dépôt d'un objet non tarifé dans SON coffre : ouvre la fenêtre de tarifs (« que faire de l'objet + prix »).
function promptPriceIfNew(id){var bid=baseId(id);if(canDeposit()&&S.prices[bid]==null&&qty(S.cur,id)>0)editPrice(bid);}
function cartAdd(id,d){const stock=totalGuild(id);S.cart[id]=Math.max(0,Math.min(stock,(S.cart[id]||0)+d));if(!S.cart[id])delete S.cart[id];save();render();}
function cartSet(id,v){const stock=totalGuild(id);S.cart[id]=Math.max(0,Math.min(stock,Math.round(+v||0)));if(!S.cart[id])delete S.cart[id];save();render();}
function cartTotal(){let t=0;Object.keys(S.cart).forEach(id=>t+=S.cart[id]*priceOf(id));return t;}
function cartPanel(){const ids=Object.keys(S.cart);const cat=catalog();
  const rows=ids.map(id=>{const it=cat.find(x=>x.id===id)||{item:id};return `<div class="crow"><span class="cn">${esc(it.item)} <span class="mut">×${S.cart[id]}</span></span><span class="cq">${fmt(S.cart[id]*priceOf(id))}</span><span class="rm" style="opacity:.6;cursor:pointer" onclick="cartSet('${sq(id)}',0)"><i class=vgi-x></i></span></div>`;}).join('');
  return `<div class="cart"><div class="sec-h"><i class=vgi-basket></i> Panier de ${esc(S.shopMember||'—')}</div>${ids.length?rows:'<div class="empty" style="padding:20px">Panier vide.</div>'}
    <div class="tot"><span class="mut" style="font-size:13px">Total</span><span style="color:var(--gold)">${fmt(cartTotal())} <span style="font-size:12px">périns</span></span></div>
    <div class="toolbar" style="margin:0"><button class="btn g" style="flex:1" onclick="checkout('achat')" ${!ids.length||!S.shopMember?'disabled':''}><i class=vgi-cart></i> Achat direct</button><button class="btn o" style="flex:1" onclick="checkout('dette')" ${!ids.length||!S.shopMember?'disabled':''}><i class=vgi-edit></i> Dette</button></div>
    <div class="hint">Les deux options retirent les objets des coffres de la guilde (du plus gros stock d'abord). « Dette » enregistre le montant dû par le membre.</div></div>`;
}
function checkout(mode){const ids=Object.keys(S.cart);if(!ids.length||!S.shopMember)return;const cat=catalog();
  // On re-plafonne chaque ligne au stock RÉEL (Total guilde) au moment du checkout : un panier périmé
  // (stock tombé depuis l'ajout, autre appareil…) ne peut ni sur-facturer ni créer d'unités fantômes.
  const items=ids.map(id=>({id,name:(cat.find(x=>x.id===id)||{item:id}).item,qty:Math.min(S.cart[id]||0,totalGuild(id)),price:priceOf(id)})).filter(l=>l.qty>0);
  if(!items.length){S.cart={};save();render();agToast&&agToast('Plus de stock disponible pour ces articles.',false);return;}
  const total=items.reduce((a,l)=>a+l.qty*l.price,0);
  items.forEach(l=>drawFromGuild(l.id,l.qty,(mode==='dette'?'Dette ':'Vente ')+l.name+' ('+S.shopMember+')'));
  if(mode==='dette')S.debts.unshift({member:S.shopMember,items,total,ts:Date.now()});
  S.cart={};save();render();
  openSheet(`<h3>${mode==='dette'?'<i class=vgi-edit></i> Dette enregistrée':'<i class=vgi-cart></i> Achat effectué'}</h3><p class="mut">${esc(S.shopMember)} · ${items.reduce((a,l)=>a+l.qty,0)} objet(s) · <b style="color:var(--gold)">${fmt(total)} périns</b>${mode==='dette'?' dû à la guilde.':' — réglé.'}</p><div class="toolbar" style="justify-content:flex-end;margin:0"><button class="btn o" onclick="closeSheet()">OK</button></div>`);
}
function debtsPanel(){if(!S.debts.length)return '';
  return `<div class="card" style="margin-top:14px"><div class="sec-h"><i class=vgi-book></i> Dettes en cours <span class="n">${S.debts.length}</span></div>
   ${S.debts.map((d,i)=>`<div class="debt"><span class="dm">${esc(d.member)}</span><span class="badgeo">${fmt(d.total)} périns</span><span class="mut" style="flex:1;font-size:11.5px">${d.items.map(l=>esc(l.name)+'×'+l.qty).join(', ')}</span><span class="mut" style="font-size:11px">${new Date(d.ts).toLocaleDateString('fr-FR')}</span><button class="btn g sm" onclick="settleDebt(${i})">Réglée</button><button class="btn sm danger" onclick="cancelDebt(${i})">Annuler</button></div>`).join('')}</div>`;}
function settleDebt(i){S.debts.splice(i,1);save();render();}
function cancelDebt(i){const d=S.debts[i];agConfirm('Annuler la dette et remettre les objets dans ton coffre ?',function(){var dst=myCoffre();d.items.forEach(l=>setQty(dst,l.id,qty(dst,l.id)+l.qty,'Annul. dette '+l.name));S.debts.splice(i,1);save();render();});}

/* ============ PARAMÈTRES (base de données) ============ */
let cfgQ='';
function filterSet(qv){const q=(qv||'').toLowerCase().trim();document.querySelectorAll('#setbody .it').forEach(el=>{el.style.display=(!q||el.dataset.s.includes(q))?'':'none';});}
function viewSettings(){const cats=sortByOrder(catalog());
  const rows=cats.map(it=>{const ds=(it.item+' '+(it.classe||'')+' '+it.cat).toLowerCase();const custom=(S.custom||[]).some(c=>c.id===it.id);const ov=!!S.overrides[it.id];
    return `<div class="it" data-s="${esc(ds)}"><div class="logo">${itemAsset(it)}</div>
      <div class="nm"><div class="a">${esc(it.item)} ${ov?'<span class="utag" style="color:var(--gold);border-color:#ffd24a55;background:#ffd24a14">modifié</span>':''}${custom?'<span class="utag" style="color:var(--blue);border-color:#4ea8ff55;background:#4ea8ff14">perso</span>':''}</div><div class="b">${esc(it.cat.trim())}${it.classe?' · '+esc(it.classe):''} · ${it.unit==='slot'?'slot':'unitaire'}${it.prix?' · '+fmt(it.prix)+' périns':''}</div></div>
      ${canEdit()?`<button class="btn sm" onclick="moveItem('${sq(it.id)}',-1)" title="Monter dans la catégorie"><i class=vgi-arrow-up></i></button><button class="btn sm" onclick="moveItem('${sq(it.id)}',1)" title="Descendre dans la catégorie"><i class=vgi-arrow-down></i></button><button class="btn sm" onclick="editItem('${sq(it.id)}')"><i class=vgi-edit></i> Éditer</button><span class="rm" onclick="rmItem('${sq(it.id)}',${custom});render()"><i class=vgi-trash></i></span>`:'<span class="mut" style="font-size:10px"><i class=vgi-lock></i> lecture seule</span>'}</div>`;}).join('');
  return `<div class="card" style="margin-bottom:14px"><div class="sec-h"><i class=vgi-settings></i> Base de données du coffre <span class="n">${cats.length} objets</span></div>
     <div class="toolbar" style="margin:0"><input class="inp" placeholder="Rechercher…" value="${esc(cfgQ)}" oninput="cfgQ=this.value;filterSet(this.value)" style="flex:1;min-width:160px">${canEdit()?'<button class="btn o" onclick="addItem()"><i class=vgi-plus></i> Ajouter</button>':''}<button class="btn" onclick="exportData()"><i class=vgi-arrow-down></i> Exporter</button>${canEdit()?'<button class="btn" onclick="importData()"><i class=vgi-upgrade></i> Importer</button>':''}</div>
     <div class="hint">Édite n'importe quel objet (nom, catégorie, classe, unité unitaire/slot, asset, prix) ou ajoute-en. Tout est sauvegardé localement.</div></div>
   <div class="card" id="setbody" style="padding:8px 12px">${rows||'<div class="empty">Aucun objet.</div>'}</div>`;
}
function editItem(id){if(!canEdit())return agToast('Édition réservée au rôle Vanguard.',false);const it=catalog().find(x=>x.id===id);if(!it)return;
  const opts=D.bankCats.concat(['Butin de donjon','Autre']).filter((v,i,a)=>a.indexOf(v)===i);
  openSheet(`<h3><i class=vgi-edit></i> Éditer l'objet</h3>
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
  if(f){const r=new FileReader();r.onload=()=>keyMagenta(r.result,fin);r.readAsDataURL(f);}else fin('');}
function exportData(){const blob=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='airguild-coffre.json';a.click();}
function importData(){const inp=document.createElement('input');inp.type='file';inp.accept='application/json';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d&&d.members){var _n=Object.keys(S.members||{}).length,_p=Object.keys(S.prices||{}).length,_d=(S.debts||[]).length;var _n2=Object.keys(d.members||{}).length;agConfirm('REMPLACER tout le coffre de la guilde par ce fichier ?\n\nActuel : '+_n+' coffre(s), '+_p+' tarif(s), '+_d+' dette(s)\nFichier : '+_n2+' coffre(s)\n\nCela ecrase les donnees de TOUS les membres, et il n\'y a aucune annulation.',function(){S=d;S.overrides=S.overrides||{};S.recipes=S.recipes||{};S.prices=S.prices||{};S.debts=S.debts||[];save();renderTabs();render();agToast('Coffre remplace par le fichier importe.',true);});}else agToast('Fichier invalide.',false);}catch(e){agToast('Fichier illisible.',false);}};r.readAsText(f);};inp.click();}

function openSheet(html){$('#sheet').innerHTML=html;$('#modal').classList.add('on');vgDD();}
function closeSheet(){$('#modal').classList.remove('on');}
let _agBd=false;$('#modal').addEventListener('mousedown',e=>{_agBd=(e.target.id==='modal');});$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&_agBd)closeSheet();_agBd=false;});
injectLogoCSS();renderTabs();render();try{cleanMagentaIcData();}catch(e){}vgLienProfond();
;
window.__APP='airguild';
// Auto-réparation : si le conteneur AirGuild est recréé vide (re-clic sur le lien nav / navigation vers la même route), on relance render() automatiquement.
(function(){try{var _heal=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var ns=muts[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(n.nodeType!==1)continue;var v=(n.id==='view')?n:(n.querySelector?n.querySelector('#view'):null);if(v&&!v.innerHTML.trim()){try{render();}catch(e){}return;}}}});_heal.observe(document.body,{childList:true,subtree:true});}catch(e){}})();