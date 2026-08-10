/* __VGI_FALLBACK : le pont d'icônes (public/icons/vg-icons.js) est normalement
   chargé avant ce fichier par src/lib/vanillaLoader.ts. Filet de sécurité pour
   les points d'entrée hérités qui chargeraient le moteur seul. */
if(typeof window.VGI!=='function'){window.VGI=function(){return '';};window.VGI.has=function(){return false;};}
const DB=JSON.parse(document.getElementById('DATA').textContent);
const {ITEMS,CARNETS,GEMU,GEMC,IC,FAM,RANKS,LVLMAX,TYPES,MAXB,SLOTIC,MECH,ELEMENTS,DIASTATS,HOLOSTATS,EVSTATS,FAIRYMAX}=DB;
const esc=s=>(s||'').toString().replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const imgT=(f,s)=>f&&IC[f]?`<img src="${IC[f]}" width="${s}" height="${s}">`:'';
const CLASSES=['Templier','Spadassin','Arcaniste','Envouteur','Arbaletrier','Sylphide','Primat','Chanoine'];
/** Les clés restent sans accent (elles sont écrites dans les sauvegardes) ;
 *  l'affichage, lui, s'écrit correctement. */
const CLASSE_FR={Envouteur:'Envoûteur',Arbaletrier:'Arbalétrier'};
const clsFr=function(c){return CLASSE_FR[c]||c||'';};
const CKEY={Templier:'templier',Spadassin:'spada',Arcaniste:'arcaniste',Envouteur:'envouteur',Arbaletrier:'arbaletrier',Sylphide:'sylphide',Primat:'primat',Chanoine:'chanoine'};
// Repli si le PNG de classe manque : nom d'icône Vanguard (cf. public/icons/vg-icons.css).
const SIL={Templier:'shield',Spadassin:'sword-cross',Arcaniste:'orb',Envouteur:'spiral',Arbaletrier:'bow',Sylphide:'target',Primat:'sparkles',Chanoine:'fist'};
const CHARIMG={"Arcaniste|G":"/airbuilder/icons/emb_024.png","Arcaniste|F":"/airbuilder/icons/emb_025.png","Spadassin|G":"/airbuilder/icons/emb_026.png","Spadassin|F":"/airbuilder/icons/emb_027.png","Templier|G":"/airbuilder/icons/emb_028.png","Templier|F":"/airbuilder/icons/emb_029.png","Envouteur|G":"/airbuilder/icons/emb_030.png","Envouteur|F":"/airbuilder/icons/emb_031.png","Arbaletrier|G":"/airbuilder/icons/emb_032.png","Arbaletrier|F":"/airbuilder/icons/emb_033.png","Sylphide|G":"/airbuilder/icons/emb_034.png","Sylphide|F":"/airbuilder/icons/emb_035.png","Primat|G":"/airbuilder/icons/emb_036.png","Primat|F":"/airbuilder/icons/emb_037.png","Chanoine|G":"/airbuilder/icons/emb_038.png","Chanoine|F":"/airbuilder/icons/emb_039.png"};

// slots config (mirrors WndQueryEquipdark)
const SLOTS={
 // ico = nom d'icône Vanguard, utilisé seulement si SLOTIC n'a pas de visuel pour ce slot.
 weapon:{lbl:'Arme',ico:'sword'}, weapon2:{lbl:'Arme 2',ico:'sword',pool:'weapon'}, shield:{lbl:'Bouclier',ico:'shield'}, mantra:{lbl:'Mantra',ico:'scroll'}, cape:{lbl:'Cape',ico:'cape'}, masque:{lbl:'Masque',ico:'mask'},
 helmet:{lbl:'Casque',ico:'helmet'}, suit:{lbl:'Tenue',ico:'shirt-armor'}, gauntlet:{lbl:'Gants',ico:'gloves'}, boots:{lbl:'Bottes',ico:'boots'},
 // « Fashion » est la CATEGORIE des quatre pieces, pas leur nom : le titre de
 // la rangee le dit une fois, chaque piece garde le sien.
 fhead:{lbl:'Tête',ico:'hat',pool:'fashion'}, ftop:{lbl:'Haut',ico:'shirt',pool:'fashion'}, fhand:{lbl:'Gants',ico:'gloves',pool:'fashion'}, ffoot:{lbl:'Bottes',ico:'boots',pool:'fashion'},
 ramasseur:{lbl:'Ramasseur',ico:'paw'}, familier:{lbl:'Familier',ico:'paw'}, fairy:{lbl:'Fée',ico:'fairy'},
 necklace:{lbl:'Collier',ico:'necklace'}, ring1:{lbl:'Anneau 1',ico:'ring',pool:'ring'}, ring2:{lbl:'Anneau 2',ico:'ring',pool:'ring'}, earring1:{lbl:'Boucle 1',ico:'earring',pool:'earring'}, earring2:{lbl:'Boucle 2',ico:'earring',pool:'earring'}};
const LAYOUT={top:['ring1','earring1','necklace','earring2','ring2'],right:['helmet','suit','gauntlet','boots'],bottom:['fhead','ftop','fhand','ffoot'],pets:['ramasseur','familier','fairy']};
function leftCol(){const cls=C().cls;let second='shield';if(cls==='Arbaletrier'||cls==='Sylphide')second=null;else if(cls==='Spadassin')second='weapon2';return ['weapon',second,'mantra','cape','masque'].filter(Boolean);}
const ARMOR=['helmet','suit','gauntlet','boots'];
function pool(s){if(s==='weapon2')return 'weapon';if(SLOTS[s]&&SLOTS[s].pool)return SLOTS[s].pool;if(s==='mantra')return 'mantra';if(s==='masque')return 'masque';if(s==='ramasseur')return 'ramasseur';return s.replace(/[0-9]/g,'');}

function newStuff(n){return {name:n||'Stuff',eq:{}};}
function newChar(n){return {name:n||'Perso '+(state.chars.length+1),cls:'Arcaniste',sex:'G',lvl:200,prestige:3,carnets:[],carnetsFull:[],stuffs:[newStuff('DPS'),newStuff('Tank'),newStuff('Hybride')],curStuff:0};}
const state={chars:[],cur:0};
(function(){try{const s=(window.__VIEW_BLOB&&window.__VIEW_BLOB.chars&&window.__VIEW_BLOB.chars.length)?window.__VIEW_BLOB:JSON.parse(localStorage.getItem('vg_air_e1')||'null');if(s&&s.chars&&s.chars.length)Object.assign(state,s);}catch(e){}try{var _seed=JSON.parse(localStorage.getItem('vg_air_seed')||'null');if(_seed&&_seed.length){localStorage.removeItem('vg_air_seed');var _norm=function(x){return (x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');};var _mcls=function(x){var n=_norm(x);for(var i=0;i<CLASSES.length;i++){if(_norm(CLASSES[i])===n)return CLASSES[i];}return 'Arcaniste';};state.chars=_seed.slice(0,20).map(function(sc){var nc=newChar(sc&&sc.name);nc.name=(sc&&sc.name)||nc.name;nc.cls=_mcls(sc&&sc.cls);if(sc&&sc.prestige!=null)nc.prestige=+sc.prestige;return nc;});state.cur=0;}}catch(e){}if(!state.chars||!state.chars.length)state.chars=[newChar('Daiisuke')];state.chars.forEach(function(c){if(!c||typeof c!=='object')return;if(!c.cls||CLASSES.indexOf(c.cls)<0)c.cls='Arcaniste';if(c.sex!=='F')c.sex='G';if(!c.name)c.name='Perso';if(c.lvl==null)c.lvl=200;if(c.prestige==null)c.prestige=1;});state.chars=state.chars.filter(function(c){return c&&typeof c==='object';});if(!state.chars.length)state.chars=[newChar('Daiisuke')];if(!(state.cur>=0&&state.cur<state.chars.length))state.cur=0;})();
const C=()=>{if(!(state.cur>=0&&state.cur<state.chars.length))state.cur=0;return state.chars[state.cur];};
function ST(){const c=C();
  if(!c.stuffs){c.carnets=c.carnets||[];c.carnetsFull=c.carnetsFull||[];c.stuffs=[{name:'DPS',eq:c.eq||{}},newStuff('Tank'),newStuff('Hybride')];c.curStuff=0;delete c.eq;}
  // migration: si d'anciens carnets sont stockés dans un stuff, les remonter au personnage
  if(c.carnets==null){c.carnets=[];c.carnetsFull=[];}
  c.stuffs.forEach(s=>{if(s.carnets&&s.carnets.length){s.carnets.forEach(x=>{if(!c.carnets.includes(x))c.carnets.push(x);});}if(s.carnetsFull&&s.carnetsFull.length){s.carnetsFull.forEach(x=>{if(!c.carnetsFull.includes(x))c.carnetsFull.push(x);});}delete s.carnets;delete s.carnetsFull;});
  if(c.curStuff==null||c.curStuff>=c.stuffs.length)c.curStuff=0;return c.stuffs[c.curStuff];}
const E=s=>ST().eq[s];
function save(){if(window.__VIEW)return;if(window.__refSave){try{window.__refSave(state);}catch(e){}return;}try{state._ts=Date.now();localStorage.setItem('vg_air_e1',JSON.stringify(state));}catch(e){}vgPushCloud();}
var _vgPushT=null;
/* Un visiteur non connecte compose librement, mais rien ne quitte son
   navigateur : pas de compte ou l'enregistrer, pas de guilde a qui le publier.
   `vgConnexion()` le dit et propose la marche a suivre plutot que d'echouer en
   silence sur un 401. */
function vgAnon(){return !!window.__ANON;}
/* Un visiteur non connecte entre en mode LECTURE. Le moteur en a deja un — celui
   qui sert a voir le build d'un autre membre — et en inventer un second aurait
   diverge au premier ajout. On le pose donc au demarrage, et `_ro()` explique
   la difference : ici ce n'est pas « le build d'un autre », c'est « connecte-toi
   pour composer ». */
if (typeof window !== 'undefined' && window.__ANON) window.__VIEW = true;
function vgConnexion(quoi){
  agConfirm('Pour '+quoi+', il faut avoir rejoint le Discord de Vanguard et t\'y être connecté.\n\nTon build reste dans ce navigateur en attendant : tu le retrouveras en revenant.\n\nConfirmer pour aller à la connexion.',
    function(){location.href='/login';});
}
function vgPushCloud(){if(window.__embed||window.__VIEW||vgAnon())return;if(_vgPushT)clearTimeout(_vgPushT);_vgPushT=setTimeout(function(){try{var snap=(Date.now()-(window.__lastSnap||0)>600000);if(snap)window.__lastSnap=Date.now();fetch('/api/builder-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({blob:state,snapshot:snap})}).catch(function(){});try{fetch('/api/characters/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chars:vgCollectBuilds()})}).catch(function(){});}catch(e2){}}catch(e){}},1500);}
// ── Dropdown maison : remplace les <select> natifs moches par une liste stylée ──
function vgDD(){if(!document.getElementById('vgdd-css')){var _st=document.createElement('style');_st.id='vgdd-css';_st.textContent='.vgdd{position:relative;display:inline-block;vertical-align:bottom}.vgdd-b{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:var(--bg3,#1e1e27);border:1px solid var(--border,#2c2c36);border-radius:8px;color:var(--text,#e8e8ee);padding:7px 11px;font:600 13px Rajdhani,sans-serif;cursor:pointer;transition:border-color .14s,box-shadow .14s}.vgdd-b:hover{border-color:#FF8C1A88}.vgdd.open .vgdd-b{border-color:#FF8C1A;box-shadow:0 0 0 3px rgba(255,140,26,.16)}.vgdd-b i{color:#FF8C1A;font-style:normal;font-size:11px;transition:transform .16s}.vgdd.open .vgdd-b i{transform:rotate(180deg)}.vgdd-l{display:none;position:absolute;top:calc(100% + 5px);left:0;min-width:100%;z-index:99999;background:var(--bg2,#16161d);border:1px solid var(--border,#2c2c36);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);padding:5px;max-height:260px;overflow-y:auto}.vgdd.open .vgdd-l{display:block;animation:vgddin .14s ease}.vgdd-o{padding:7px 12px;border-radius:7px;font-size:13px;cursor:pointer;white-space:nowrap;color:var(--text,#e8e8ee);transition:background .12s}.vgdd-o:hover{background:rgba(255,255,255,.07)}.vgdd-o.on{background:rgba(255,140,26,.14);color:#FF8C1A;font-weight:700}@keyframes vgddin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}';document.head.appendChild(_st);}document.querySelectorAll('.abx select:not([data-dd])').forEach(function(sel){sel.setAttribute('data-dd','1');var wrap=document.createElement('span');wrap.className='vgdd';sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.style.display='none';var btn=document.createElement('button');btn.type='button';btn.className='vgdd-b';wrap.appendChild(btn);var list=document.createElement('div');list.className='vgdd-l';wrap.appendChild(list);function sync(){btn.innerHTML='';var o=sel.options[sel.selectedIndex];var t=document.createElement('span');t.textContent=(o&&o.textContent)||'';var a=document.createElement('i');a.className='vgi-chevron-down';a.style.width='13px';a.style.height='13px';btn.appendChild(t);btn.appendChild(a);}function close(){wrap.classList.remove('open');list.style.cssText='';document.removeEventListener('mousedown',onOut);window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);}function onOut(e){if(!wrap.contains(e.target))close();}function place(){var r=btn.getBoundingClientRect();list.style.position='fixed';list.style.left=r.left+'px';list.style.minWidth=r.width+'px';var below=window.innerHeight-r.bottom,lh=Math.min(list.scrollHeight,260);if(below<lh+14&&r.top>below){list.style.top=(r.top-lh-4)+'px';}else{list.style.top=(r.bottom+4)+'px';}}function openList(){list.innerHTML='';Array.prototype.forEach.call(sel.options,function(o){var d=document.createElement('div');d.className='vgdd-o'+(o.selected?' on':'');d.textContent=o.textContent;d.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();sel.value=o.value;sync();sel.dispatchEvent(new Event('change',{bubbles:true}));close();});list.appendChild(d);});wrap.classList.add('open');place();setTimeout(function(){document.addEventListener('mousedown',onOut);window.addEventListener('scroll',place,true);window.addEventListener('resize',place);},0);}btn.addEventListener('click',function(e){e.stopPropagation();wrap.classList.contains('open')?close():openList();});sync();});}
function listFor(slot){const c=C();const ck=CKEY[c.cls];
  if(['fhead','ftop','fhand','ffoot'].includes(slot)){return (ITEMS.fashion||[]).filter(it=>it.piece===slot&&(!it.sex||it.sex===c.sex));}
  if(slot==='mantra')return ITEMS.mantra||[];
  if(slot==='masque')return ITEMS.masque||[];
  if(slot==='ramasseur')return ITEMS.ramasseur||[];
  const arr=ITEMS[pool(slot)]||[];
  return arr.filter(it=>{if(it.classes&&it.classes.length){if(!it.classes.includes(ck))return false;}else if(it.cls&&it.cls!==ck)return false;if(it.sex&&c.sex&&it.sex!==c.sex)return false;return true;});}

function slotHTML(slot){try{const e=E(slot),cfg=SLOTS[slot]||{lbl:slot};const small=LAYOUT.top.includes(slot)||LAYOUT.bottom.includes(slot);
  let empty=SLOTIC[slot]?`<img class="phimg" src="${SLOTIC[slot]}" width="${small?30:38}" height="${small?30:38}">`:`<span class="ico"><i class=vgi-${cfg.ico}></i></span>`;
  let inner=e?(e.item.ic&&IC[e.item.ic]?imgT(e.item.ic,small?34:42):empty):empty;
  let badge='';const cf=e&&e.cfg;
  const up=cf&&cf.up; if(e&&(up||(cf&&cf.evL)))badge=`<span class="pl ${cf&&cf.up>10?'art':''}">+${up||0}</span>`;
  let rk='';
  if(slot==='familier'&&e&&e.rank)rk=`<span class="rk">${e.rank}</span>`;
  else if(slot==='fairy'&&cf&&cf.lvl)rk=`<span class="rk">${cf.lvl}</span>`;
  // Deuxieme bulle native au meme endroit, et elle affichait « Rune true » sur
  // une arme — `rune` y est un booleen. L'infobulle du builder dit deja laquelle.
  else if(cf&&cf.rune)rk=`<span class="rk" style="background:var(--green)" aria-label="Rune${typeof cf.rune==='string'?' '+esc(cf.rune):''}">R</span>`;
  else if((slot==='mantra'||slot==='masque')&&e&&e.item.cat)rk=`<span class="rk" style="background:var(--blue);color:#001">${e.item.cat[0]}</span>`;
  /* En jeu, une piece equipee se reconnait a la couleur de son cadre avant meme
     qu'on lise son nom. L'emplacement etait uniformement gris : rien ne
     distinguait une Yggdrasil d'une piece de depart. */
  const teinte=(e&&e.item&&e.item.col)?` style="border-color:${e.item.col}77;box-shadow:inset 0 0 0 1px ${e.item.col}22, inset 0 0 14px ${e.item.col}1a"`:'';
  return `<div class="slot ${small?'small':''}${e?' plein':''}"${teinte} onclick="openPick('${slot}')" onmouseenter="itipSlot(event,'${slot}')" onmousemove="itipMove(event)" onmouseleave="itipHide()" aria-label="${esc(cfg.lbl)}">${badge}${rk}${inner}<span class="lbl">${esc(cfg.lbl)}</span></div>`;}catch(_e){const cf2=SLOTS[slot]||{lbl:slot};return `<div class="slot" onclick="openPick('${slot}')" aria-label="${esc(cf2.lbl)}"><span class="ico"><i class=vgi-alert></i></span><span class="lbl">${esc(cf2.lbl)}</span></div>`;}}

function render(){
  var _pt=document.getElementById('ptabs');if(!_pt){if((render._n=(render._n||0)+1)<90)requestAnimationFrame(render);return;}render._n=0;vgSyncChip();
  _pt.innerHTML=state.chars.map((c,i)=>`<div class="ptab ${i===state.cur?'on':''}" onclick="switchChar(${i})">${IC['class_'+c.cls.toLowerCase()]?`<img src="${IC['class_'+c.cls.toLowerCase()]}">`:`<i class=vgi-${SIL[c.cls]||'user'}></i>`} ${esc(c.name)} ${state.chars.length>1?`<span class="x" onclick="event.stopPropagation();delChar(${i})" title="Supprimer ce perso"><i class=vgi-x></i></span>`:''}</div>`).join('')+`<div class="addp" onclick="addChar()">+ Perso</div>`;
  const c=C();
  document.getElementById('setup').innerHTML=`
   <div class="f"><label>Nom</label><input value="${esc(c.name)}" style="width:130px" onchange="C().name=this.value;render()"></div>
   <div class="f"><label>Classe</label><div class="clssel">${CLASSES.map(x=>`<div class="ci ${x===c.cls?'on':''}" title="${x}" onclick="setCls('${x}')">${IC['class_'+x.toLowerCase()]?`<img src="${IC['class_'+x.toLowerCase()]}">`:x[0]}</div>`).join('')}</div></div>
   <div class="f"><label>Sexe</label><select onchange="C().sex=this.value;render()">${['G','F'].map(s=>`<option ${s===c.sex?'selected':''}>${s}</option>`).join('')}</select></div>
   <div class="f"><label>Niveau</label><span style="display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg3)"><button type="button" onclick="setLvl(C().lvl-1)" style="width:26px;height:32px;border:none;background:var(--bg2);color:var(--mut);cursor:pointer;font-size:15px">−</button><input type="text" inputmode="numeric" value="${c.lvl}" onchange="setLvl(this.value)" style="width:48px;height:32px;border:none;background:transparent;color:var(--text);text-align:center;font-size:14px;outline:none"><button type="button" onclick="setLvl(C().lvl+1)" style="width:26px;height:32px;border:none;background:var(--bg2);color:var(--mut);cursor:pointer;font-size:15px"><i class=vgi-plus></i></button></span></div>
   <div class="f"><label>Prestige</label><select onchange="C().prestige=+this.value;render()">${[0,1,2,3,4,5,6,7,8,9,10].map(p=>`<option ${p===c.prestige?'selected':''}>${p}</option>`).join('')}</select></div>`;
  document.getElementById('stuffbar').innerHTML='<span class="slabel">Stuffs :</span>'+(C().stuffs||[]).map((s,i)=>`<div class="stab ${i===C().curStuff?'on':''}" onclick="switchStuff(${i})" ondblclick="event.stopPropagation();renStuff(${i})" title="Clic : ouvrir · Double-clic : renommer">${esc(s.name)}${(C().stuffs.length>1)?` <span class="x" onclick="event.stopPropagation();delStuff(${i})"><i class=vgi-x></i></span>`:''}</div>`).join('')+'<div class="saddp" onclick="addStuff()">+ Stuff</div>'+((C().stuffs||[]).length?'<div class="saddp" onclick="copyStuff()" title="Crée un nouveau stuff avec les mêmes pièces et les mêmes réglages"><i class=vgi-clipboard></i> Dupliquer</div>':'')+'<div class="saddp danger" onclick="resetChar()" title="Retirer toutes les pièces de ce stuff (les carnets sont conservés)"><i class=vgi-rotate-ccw></i> Vider</div>';
  try{
  document.getElementById('rowT').innerHTML=LAYOUT.top.map(slotHTML).join('');
  document.getElementById('colL').innerHTML=leftCol().map(slotHTML).join('');
  document.getElementById('colR').innerHTML=LAYOUT.right.map(slotHTML).join('');
  document.getElementById('rowB').innerHTML='<div class="rowttl">Fashion</div>'+LAYOUT.bottom.map(slotHTML).join('');
  document.getElementById('petbar').innerHTML=LAYOUT.pets.map(slotHTML).join('');
  const _ci=CHARIMG[c.cls+'|'+c.sex]||CHARIMG[c.cls+'|G']||'';const _im=document.getElementById('charimg');if(_im){_im.src=_ci;_im.style.display=_ci?'block':'none';}
  document.getElementById('cn').textContent=c.name;document.getElementById('cc').textContent=`${clsFr(c.cls)} · Niv ${c.lvl} · P${c.prestige}`;
  renderFamNote();renderCarnets();
  }catch(err){console.error('[AirBuilder] rendu partiel ignoré (donnée corrompue)',err);}
  save();vgDD();
}
function renderFamNote(){const n=document.getElementById('famnote');if(n)n.style.display='none';return; // ligne familier retirée (demande iBeats)
  const e=E('familier');if(!e){return;}
  const type=guessType(e.item.n);const stat=TYPES[type]||'—';const rank=e.rank||'D';const max=MAXB[stat]||0;
  // bonus simplifié = max * (lvlmax(rank)/9) arrondi
  const ratio=(LVLMAX[rank]||1)/9;const bonus=Math.round(max*ratio);
  n.style.display='block';
  n.innerHTML=`<i class=vgi-paw></i> <b>${esc(e.item.n)}</b> — rang <b style="color:var(--gold)">${rank}</b> (niveau max ${LVLMAX[rank]}). Type ${esc(type)} → <b style="color:var(--green)">${esc(stat)} +${bonus}</b>. Rune : <b>${e.rune?'Oui':'Non'}</b>.`;}
function guessType(name){const n=(name||'').toLowerCase();
  if(n.includes('tigre'))return 'Tigre blanc';if(n.includes('lion'))return 'Lion';if(n.includes('lapin'))return 'Lapin';
  if(n.includes('renard'))return 'Renard à neuf queues';if(n.includes('dragon'))return 'Dragon';if(n.includes('licorne'))return 'Licorne';return 'Licorne';}

/**
 * L'étui d'un carnet, en image.
 *
 * C'était une pastille de couleur avec la légende « gris/bleu/rouge » dans le
 * titre du panneau : il fallait lire une phrase pour comprendre un point de
 * couleur. L'objet du jeu se reconnaît, lui, du premier coup d'œil.
 *
 * Trois fichiers à déposer dans /public/assets/site/etuis :
 *   etui-1 = Gris (Commun) · etui-2 = Bleu (Rare) · etui-3 = Rouge (Épique &
 *   Légendaire). Tant qu'ils manquent, on retombe sur la pastille — la page ne
 *   montre jamais d'image cassée.
 */
function etuiHtml(coul,col){
  var n=coul==='Bleu'?2:(coul==='Rouge'?3:1);
  var repli="var s=document.createElement('span');s.className='dot';s.style.background='"+col+"';this.replaceWith(s);";
  return '<img class="etui" src="/assets/site/etuis/etui-'+n+'.webp" alt="" title="Étui '+esc(coul)+'"'
    +' onerror="if(!this.dataset.png){this.dataset.png=1;this.src=\'/assets/site/etuis/etui-'+n+'.png\';}else{'+repli+'}">';
}
function renderCarnets(){const c=C();ST();
  document.getElementById('carnetsPanel').innerHTML=`<h3><i class=vgi-book></i> Carnets des Arcanes — ${esc(c.name)} <span style="color:var(--mut);font-weight:400;font-size:12px;text-transform:none">liés au personnage, partagés entre ses stuffs</span></h3>
   <div class="carnets">${CARNETS.map((cn,i)=>{const on=(c.carnets||[]).includes(i);const full=(c.carnetsFull||[]).includes(i);const bonus=full?cn.complet:cn.base;
     return `<div class="carn ${on?'on':''}" style="border-left:3px solid ${cn.col};box-shadow:inset 14px 0 22px -16px ${cn.col}">
         <div class="cn" onclick="toggleCarnet(${i})">${etuiHtml(cn.etui_couleur,cn.col)}${esc(cn.nom)}</div>
         <div style="font-size:11px;color:var(--mut);margin-bottom:4px">Étui ${esc(cn.etui_couleur)} · ${esc(cn.rarete)} · ${cn.tier===1?'1 carte de chaque (set complet)':cn.copies+' carte(s) de chaque'}</div>
         <div class="cc-cards">${cn.cartes.map(ca=>`<span class="cc-card r-${(ca.rarete||'').toLowerCase()}">${esc(ca.nom)}</span>`).join('')}</div>
         ${on&&cn.tier>1?`<div class="seg"><div class="sg ${!full?'on':''}" onclick="setMode(${i},false)"><i class=vgi-star></i> Base</div><div class="sg ${full?'on':''}" onclick="setMode(${i},true)"><i class=vgi-star></i> Complet</div></div>`:''}
         <div class="cb">${bonus.map(b=>esc(b[0])+' +'+b[1]).join(' · ')}</div></div>`;}).join('')}</div>`;}
function totals(){const c=C();const acc={};const add=(k,v)=>{if(v)acc[k]=(acc[k]||0)+v;};
  const st=ST();for(const s in st.eq){const e=st.eq[s];if(!e||s==='familier')continue;(e.item.b||[]).forEach(b=>add(b[0],b[1]));if(s==='weapon'){weaponTotals(add,e);}}
  const _c=C();(_c.carnets||[]).forEach(ci=>{const cn=CARNETS[ci];if(!cn)return;((_c.carnetsFull||[]).includes(ci)?cn.complet:cn.base).forEach(b=>add(b[0],b[1]));});
  return acc;}
// Catégorie d'une stat pour le résumé groupé.
function statCat(k){var s=(k||'').toLowerCase();
  if(s.indexOf("vitesse d'attaque")>=0)return 'off';
  if(/force|dext|intel|attaque|critiq|magiq|préci|preci|dmg|dégât|degat|toutes stats|jcj|pvp|pve|boss|monstre/.test(s))return 'off';
  if(/endurance|défense|defense|block/.test(s))return 'def';
  if(/pv max|mp max|mp_max/.test(s))return 'vit';
  return 'uti';}
function renderStats(){var t=totals();var G={off:[],def:[],vit:[],uti:[]};
  Object.entries(t).sort(function(a,b){return b[1]-a[1];}).forEach(function(p){G[statCat(p[0])].push(p);});
  var META={off:['<i class=vgi-sword-cross></i> Offensif','#F87171'],def:['<i class=vgi-shield></i> Défensif','#4EA8FF'],vit:['<i class=vgi-heart></i> Vitalité','#4ADE80'],uti:['<i class=vgi-sparkles></i> Utilitaire','#FFD24A']};
  var html='<h3><i class=vgi-bar-chart></i> Résumé du build</h3>',any=false;
  ['off','def','vit','uti'].forEach(function(g){if(!G[g].length)return;any=true;
    html+='<div style="margin:9px 0 2px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:'+META[g][1]+'">'+META[g][0]+'</div>'+
      G[g].map(function(p){return '<div class="l"><span>'+esc(p[0])+'</span><b>+'+(+p[1]).toLocaleString('fr-FR')+'</b></div>';}).join('');});
  if(!any)html+='<div style="color:var(--mut);font-size:12px">Équipe des pièces pour voir le résumé…</div>';
  document.getElementById('stats').innerHTML=html;}

window.C=C;
function switchChar(i){state.cur=i;render();}
function switchStuff(i){C().curStuff=i;render();}
function setLvl(v){if(_ro())return;C().lvl=Math.min(200,Math.max(1,Math.round(+v||1)));save();render();}
function addStuff(){if(_ro())return;const dn='Stuff '+((C().stuffs||[]).length+1);agPrompt('Nom du nouveau stuff ?',dn,function(n){if(n===null)return;C().stuffs.push(newStuff((n||'').trim()||dn));C().curStuff=C().stuffs.length-1;render();});}
function copyStuff(){var c=C();var s=ST();if(!s)return;var base=((s.name||'Stuff')+' (copie)').slice(0,40);agPrompt('Nom du stuff dupliqué ?',base,function(n){if(n===null)return;var copy={name:(n||'').trim().slice(0,40)||base,eq:JSON.parse(JSON.stringify(s.eq||{}))};c.stuffs.push(copy);c.curStuff=c.stuffs.length-1;render();agToast('Stuff dupliqué ',true);});}
// Renommer un stuff existant (double-clic sur son onglet).
function renStuff(i){if(_ro())return;var s=C().stuffs[i];if(!s)return;agPrompt('Nouveau nom du stuff ?',s.name||'Stuff',function(n){if(n===null)return;s.name=(n||'').trim().slice(0,40)||s.name;render();});}
// « Copier des items » retiré : dupliquer un stuff couvre le besoin — on
// repart d'une copie complète, puis on change ce qui doit changer. Un
// presse-papiers d'items en plus, c'était une deuxième façon de faire la
// même chose, avec ses propres règles de compatibilité classe/sexe.
// ── Modèles de stuff : enregistre un stuff complet, réapplique-le sur n'importe quel perso (pièces incompatibles ignorées) ──
function templates(){state.templates=state.templates||[];return state.templates;}
function saveTemplate(){if(_ro())return;var s=ST();if(!s||!s.eq||!Object.keys(s.eq).length)return agToast('Ce stuff est vide — équipe des pièces d\'abord.',false);agPrompt('Nom du modèle ?',(s.name||'Modèle'),function(n){if(n===null)return;var nm=(n||'').trim().slice(0,40)||'Modèle';templates().push({name:nm,eq:JSON.parse(JSON.stringify(s.eq))});if(typeof save==='function')save();templatesMenu();agToast('Modèle « '+nm+' » enregistré ',true);});}
function applyTemplate(idx){if(_ro())return;var t=templates()[idx];if(!t)return;var c=C();var ok=[],skip=0;Object.keys(t.eq||{}).forEach(function(slot){var e=t.eq[slot];if(!e||!e.item)return;var id=e.item.id;var lst=listFor(slot)||[];var valid=(lst.length===0)||lst.some(function(it){return String(it.id)===String(id);});if(valid)ok.push({slot:slot,e:e});else skip++;});
  if(!ok.length)return agToast('Aucune pièce du modèle n\'est compatible avec '+(c.cls||'cette classe')+' '+(c.sex||'')+'.',false);
  agConfirm('Appliquer le modèle « '+t.name+' » sur « '+(ST().name||'Stuff')+' » ?\nÇa remplace les pièces concernées.'+(skip?'\n\n'+skip+' pièce(s) ignorée(s) (incompatible(s) avec '+(c.cls||'')+' '+(c.sex||'')+').':''),function(){var st=ST();st.eq=st.eq||{};ok.forEach(function(x){st.eq[x.slot]=JSON.parse(JSON.stringify(x.e));});render();if(typeof save==='function')save();agToast('Modèle appliqué '+(skip?' · '+skip+' ignorée(s)':''),true);});}
function delTemplate(idx){if(_ro())return;var t=templates()[idx];if(!t)return;agConfirm('Supprimer le modèle « '+t.name+' » ?',function(){templates().splice(idx,1);if(typeof save==='function')save();templatesMenu();agToast('Modèle supprimé.',true);});}
function templatesMenu(){var list=templates();var rows=list.length?list.map(function(t,i){return '<div class="itl" style="cursor:default;gap:8px"><div class="n" style="flex:1">'+esc(t.name)+' <span class="mini">('+Object.keys(t.eq||{}).length+' pièces)</span></div><span class="pill" onclick="applyTemplate('+i+')">Appliquer</span> <span class="pill rm" onclick="delTemplate('+i+')"><i class=vgi-trash></i></span></div>';}).join(''):'<div class="mini" style="padding:12px">Aucun modèle. Construis un stuff puis « Enregistrer » pour le réutiliser sur d\'autres persos.</div>';
  document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3><i class=vgi-puzzle></i> Modèles de stuff</h3><div class="mini" style="margin-bottom:10px">Applique un modèle sur le stuff actuel. Les pièces incompatibles avec ta classe/sexe sont ignorées.</div><div style="max-height:320px;overflow:auto">'+rows+'</div><div class="sheet-foot"><span class="pill" style="background:#FF8C1A;color:#0A0A0C;font-weight:700" onclick="saveTemplate()"><i class=vgi-save></i> Enregistrer le stuff actuel</span><span class="pill" onclick="closePick()">Fermer</span></div></div></div>';}
function agConfirm(msg,onYes){window.__agYes=onYes;document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:430px;padding:22px"><div style="font-size:14px;line-height:1.55;margin-bottom:20px;white-space:pre-line">'+esc(msg)+'</div><div style="display:flex;gap:10px;justify-content:flex-end"><span class="pill" onclick="agClose(0)">Annuler</span><span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="agClose(1)">Confirmer</span></div></div></div>';}
function agClose(go){var f=window.__agYes;window.__agYes=null;document.getElementById('modalRoot').innerHTML='';if(go&&f)f();}
function agInfo(msg){document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:470px;padding:22px"><div style="font-size:13.5px;line-height:1.6;white-space:pre-line;margin-bottom:18px">'+esc(msg)+'</div><div style="display:flex;justify-content:flex-end"><span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="agClose(0)">Compris <i class=vgi-check></i></span></div></div></div>';}
function agToast(msg,ok){var t=document.createElement('div');
  // Le statut est porté par une icône + la couleur du liseré (plus par un emoji
  // dans le texte). Le libellé reste en textContent : aucune injection possible.
  var ic=document.createElement('i');ic.className='vgi-'+(ok===false?'alert':'check');
  ic.style.cssText='width:15px;height:15px;flex:none;color:'+(ok===false?'#F87171':'#4ADE80');
  var tx=document.createElement('span');tx.textContent=msg;
  t.appendChild(ic);t.appendChild(tx);
  t.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:99999;display:flex;align-items:center;gap:9px;background:#16161c;color:#E8E8EC;border:1px solid '+(ok===false?'#F87171':'#FF8C1A')+';border-radius:10px;padding:11px 18px;font:600 13px/1.4 Rubik,system-ui,sans-serif;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.55);opacity:0;transition:opacity .25s,transform .25s';document.body.appendChild(t);requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';});setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(8px)';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},2800);}
function agPrompt(msg,def,onOk){window.__agP=onOk;document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agPClose(0)"><div class="sheet" style="max-width:400px;padding:22px"><div style="font-size:14px;margin-bottom:12px">'+esc(msg)+'</div><input id="__agPI" class="srch" style="width:100%" value="'+esc(def||'')+'"><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><span class="pill" onclick="agPClose(0)">Annuler</span><span class="pill" style="background:#FF8C1A;color:#0A0A0C;font-weight:700" onclick="agPClose(1)">OK</span></div></div></div>';var i=document.getElementById('__agPI');if(i){i.focus();i.select();i.onkeydown=function(e){if(e.key==="Enter")agPClose(1);else if(e.key==="Escape")agPClose(0);};}}
function agPClose(go){var f=window.__agP;window.__agP=null;var el=document.getElementById('__agPI');var v=go&&el?el.value:null;document.getElementById('modalRoot').innerHTML='';if(go&&f)f(v);}
function delStuff(i){if(_ro())return;if(C().stuffs.length<=1)return;agConfirm('Supprimer ce stuff ?',function(){C().stuffs.splice(i,1);if(C().curStuff>=C().stuffs.length)C().curStuff=C().stuffs.length-1;render();});}
function addChar(){if(_ro())return;charForm();}
/**
 * « Mes personnages » — la liste complete, dans le builder.
 *
 * Les onglets du haut suffisent pour basculer, pas pour DECIDER : ils ne disent
 * ni le niveau, ni le prestige, ni quels stuffs sont reellement montes. C'est
 * pourtant ce qu'on regarde quand on revient apres deux semaines. La fiche le
 * dit d'un coup d'oeil, et renvoie au site pour ce qui n'appartient qu'a la
 * guilde : le perso principal, les specialisations.
 */
function vgMesPersos(){
  var lignes=state.chars.map(function(c,i){
    var stuffs=(c.stuffs||[]).filter(function(s){return s.eq&&Object.keys(s.eq).some(function(k){return s.eq[k]&&s.eq[k].item;});});
    var img=IC['class_'+String(c.cls||'').toLowerCase()];
    return '<div class="itl" onclick="vgOuvrirPerso('+i+')" style="cursor:pointer'+(i===state.cur?';border:2px solid var(--orange);background:rgba(255,140,26,.10)':'')+'">'
      +(img?'<img src="'+img+'">':'<i class=vgi-user></i>')
      +'<div class="n">'+esc(c.name)
      +'<div style="font-size:11.5px;color:var(--mut)">'+esc(c.cls||'')+' · niv '+(c.lvl||200)+' · P'+(c.prestige||0)
      +' · '+(stuffs.length?stuffs.map(function(s){return esc(s.name);}).join(', '):'aucun stuff monté')+'</div></div>'
      +(state.chars.length>1?'<span class="pill rm" onclick="event.stopPropagation();vgSupprPerso('+i+')" title="Supprimer"><i class=vgi-trash></i></span>':'')
      +'</div>';
  }).join('');
  document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:560px;padding:22px">'
    +'<div style="font-weight:700;font-size:15px;margin-bottom:4px;display:flex;align-items:center;gap:8px">'+VGI('users',{size:16})+' Mes personnages</div>'
    +'<div class="mut" style="font-size:11.5px;margin-bottom:12px">Clique un perso pour l\'ouvrir. Ils sont publiés à la guilde automatiquement — compositions, GuildViewer, tableau de bord.</div>'
    +(lignes||'<div class="mut" style="font-size:13px;padding:8px 0">Aucun personnage pour l\'instant.</div>')
    +'<div class="sheet-foot" style="margin-top:14px">'
    +'<span class="pill" onclick="agClose(0);addChar()">'+VGI('plus',{size:13})+' Nouveau personnage</span>'
    +'<a class="pill" href="/personnages" style="text-decoration:none">'+VGI('settings',{size:13})+' Gerer sur le site</a>'
    +'<span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="agClose(0)">Fermer</span></div>'
    +'</div></div>';
}
function vgOuvrirPerso(i){agClose(0);switchChar(i);}
function vgSupprPerso(i){agClose(0);delChar(i);}
function charForm(){if(_ro())return;window.__cfCls='Arcaniste';window.__cfSex='G';document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" id="cfSheet" style="width:620px;max-width:94vw;padding:22px"><style>#cfSheet input{width:100%;box-sizing:border-box;background:#0f0f15;border:1px solid rgba(255,255,255,.10);border-radius:9px;padding:10px 12px;color:#ece9f1;font-family:inherit;font-size:14px;font-weight:500;outline:none;box-shadow:none;-webkit-appearance:none;-moz-appearance:textfield;appearance:none;transition:border-color .14s,box-shadow .14s}#cfSheet input::placeholder{color:#6f6f78}#cfSheet input:focus{border-color:#FF8C1A;background:#14141b;box-shadow:0 0 0 3px rgba(255,140,26,.15)}#cfSheet input[type=number]::-webkit-inner-spin-button,#cfSheet input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}#cfSheet label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#9a9aa3;margin-bottom:6px}#cfSheet .cfsx{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:8px 15px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0f0f15;color:#ededf2;font-size:14px;font-weight:700;cursor:pointer;transition:border-color .14s,background .14s,color .14s;user-select:none}#cfSheet .cfsx:hover{border-color:rgba(255,255,255,.25);color:#fff}#cfSheet .cfsx.on{background:linear-gradient(180deg,#FFB552,#FF8C1A);border-color:#FF8C1A;color:#0A0A0C}#cfSheet .cfsx .sx{display:inline-flex;align-items:center}#cfSheet .cfsx .sx svg{width:17px;height:17px;display:block}#cfSheet .cfsx[data-s="G"] .sx{color:#5fa8ee}#cfSheet .cfsx[data-s="F"] .sx{color:#ef8fc4}#cfSheet .cfsx.on .sx{color:#0A0A0C}#cfSheet .clssel{max-width:none;flex-wrap:nowrap}#cfSheet .ci{width:46px;height:46px;border-radius:9px;box-sizing:border-box;flex:none}#cfSheet .ci img{width:42px;height:42px}#cfSheet .cfbtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:background .15s,border-color .15s,box-shadow .15s,transform .12s,filter .15s;user-select:none;font-family:inherit}#cfSheet .cfbtn svg{width:16px;height:16px}#cfSheet .cfbtn.ghost{background:#17171d;border-color:rgba(255,255,255,.14);color:#d2d2d9}#cfSheet .cfbtn.ghost:hover{background:#1e1e26;border-color:rgba(255,255,255,.3);color:#fff}#cfSheet .cfbtn.primary{background:linear-gradient(180deg,#FFB552,#FF8C1A);color:#0A0A0C;box-shadow:0 4px 14px rgba(255,140,26,.30)}#cfSheet .cfbtn.primary:hover{filter:brightness(1.05);box-shadow:0 7px 20px rgba(255,140,26,.45);transform:translateY(-1px)}#cfSheet .cfbtn.primary:active{transform:translateY(0)}</style><div style="font-weight:700;font-size:16px;margin-bottom:14px"><i class=vgi-orb></i> Nouveau personnage</div><div style="display:flex;gap:18px;flex-wrap:wrap"><div style="flex:1;min-width:395px"><div class="f" style="margin-bottom:10px"><label>Classe</label><div class="clssel" id="cfClsSel">${CLASSES.map(x=>`<div class="ci ${x==='Arcaniste'?'on':''}" data-c="${x}" title="${x}" onclick="cfPickCls('${x}')">${IC['class_'+x.toLowerCase()]?`<img src="${IC['class_'+x.toLowerCase()]}">`:x[0]}</div>`).join('')}</div><div id="cfClsRecap" style="font-size:11.5px;color:var(--orange,#ff8c1a);margin-top:7px;font-weight:600"><i class=vgi-check></i> Classe : Arcaniste</div></div><div class="f" style="margin-bottom:12px"><label>Nom du personnage</label><input class="inp" id="cfName" placeholder="ex. Daiisuke" style="width:100%"></div><div class="f" style="margin-bottom:12px"><label>Sexe</label><div style="display:flex;gap:8px"><span class="cfsx on" data-s="G" onclick="cfPickSex('G')"><span class="sx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5.5"/><path d="M14 10L20 4M15 4H20V9"/></svg></span> Garçon</span><span class="cfsx" data-s="F" onclick="cfPickSex('F')"><span class="sx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5.5"/><path d="M12 13.5V22M8.5 18.5H15.5"/></svg></span> Fille</span></div></div><div style="display:flex;gap:12px;flex-wrap:wrap"><div class="f" style="flex:1;min-width:90px"><label>Niveau</label><input class="inp" id="cfLvl" type="number" value="200" min="1" max="200" style="width:100%"></div><div class="f" style="flex:1;min-width:90px"><label>Prestige</label><input class="inp" id="cfPrest" type="number" value="3" min="0" max="12" style="width:100%"></div></div></div><div style="width:155px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff06;border:1px solid #ffffff10;border-radius:10px;padding:8px;min-height:200px"><img id="cfRender" alt="" style="max-width:100%;max-height:210px;object-fit:contain"><div class="mut" style="font-size:11px;margin-top:4px;text-align:center">aperçu (classe + sexe)</div></div></div><div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.07)"><span class="cfbtn ghost" onclick="agClose(0)">Annuler</span><span class="cfbtn primary" onclick="doCharForm()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Créer le perso</span></div></div></div>`;var n=document.getElementById('cfName');if(n)n.focus();cfUpdateRender();}
function cfUpdateRender(){var cls=window.__cfCls||'Arcaniste',sex=window.__cfSex||'G';var im=document.getElementById('cfRender');if(im){var src=(typeof CHARIMG!=='undefined'&&(CHARIMG[cls+'|'+sex]||CHARIMG[cls+'|G']))||'';im.src=src;im.style.display=src?'block':'none';}var r=document.getElementById('cfClsRecap');if(r)r.innerHTML='<i class=vgi-check></i> Classe : '+esc(cls)+' '+(sex==='F'?'<i class=vgi-female></i>':'<i class=vgi-male></i>');}
function cfPickCls(x){window.__cfCls=x;var s=document.getElementById('cfClsSel');if(s)Array.prototype.forEach.call(s.children,function(d){d.classList.toggle('on',d.getAttribute('data-c')===x);});cfUpdateRender();}
function cfPickSex(x){window.__cfSex=x;Array.prototype.forEach.call(document.querySelectorAll('.cfsx'),function(d){d.classList.toggle('on',d.getAttribute('data-s')===x);});cfUpdateRender();}
function doCharForm(){var el=document.getElementById('cfName');var nm=((el&&el.value)||'').trim();if(!nm){if(el){el.style.borderColor='#f87171';el.focus();}return;}var c=newChar(nm);c.cls=window.__cfCls||'Arcaniste';c.sex=window.__cfSex||'G';c.lvl=Math.min(200,Math.max(1,parseInt((document.getElementById('cfLvl')||{}).value,10)||200));c.prestige=Math.min(12,Math.max(0,parseInt((document.getElementById('cfPrest')||{}).value,10)||0));state.chars.push(c);state.cur=state.chars.length-1;agClose(0);render();vgPousserPersoCompte(c);}
function delChar(i){if(_ro())return;if(state.chars.length<=1)return;agConfirm('Supprimer ce personnage ?',function(){state.chars.splice(i,1);state.cur=0;render();});}
function setCls(v){if(_ro())return;if(C().cls===v)return;const hasGear=(C().stuffs||[]).some(s=>s.eq&&Object.keys(s.eq).length);const apply=function(){C().cls=v;(C().stuffs||[]).forEach(s=>s.eq={});render();};if(hasGear)agConfirm('Changer de classe va vider tout l\'équipement de ce personnage (sur tous ses stuffs).\n\nCette action est irréversible. Continuer ?',apply);else apply();}
function toggleCarnet(i){if(_ro())return;const c=C();c.carnets=c.carnets||[];c.carnetsFull=c.carnetsFull||[];const k=c.carnets.indexOf(i);if(k>=0){c.carnets.splice(k,1);const f=c.carnetsFull.indexOf(i);if(f>=0)c.carnetsFull.splice(f,1);}else c.carnets.push(i);render();}
function toggleFull(i){const c=C();c.carnetsFull=c.carnetsFull||[];const k=c.carnetsFull.indexOf(i);if(k>=0)c.carnetsFull.splice(k,1);else c.carnetsFull.push(i);render();}
function setMode(i,full){const c=C();c.carnetsFull=c.carnetsFull||[];const k=c.carnetsFull.indexOf(i);if(full&&k<0)c.carnetsFull.push(i);if(!full&&k>=0)c.carnetsFull.splice(k,1);render();}
function resetChar(){if(_ro())return;agConfirm('Vider l\'équipement de ce stuff ? (les carnets du personnage sont conservés)',function(){const s=ST();s.eq={};render();});}

let pickSlot=null;
function _ro(){if(window.__VIEW){if(!_ro._t||Date.now()-_ro._t>1500){_ro._t=Date.now();
  agToast(vgAnon()?'Connecte-toi pour composer ton stuff.':'Mode lecture — build non modifiable.',false);}
  return true;}return false;}
function openPick(s){if(_ro())return;pickSlot=s;drawPick('');}
function closePick(){document.getElementById('modalRoot').innerHTML='';pickSlot=null;itipHide();}
let _itipEl=null;
function _itip(){if(!_itipEl){_itipEl=document.createElement('div');_itipEl.className='itip';document.body.appendChild(_itipEl);}return _itipEl;}
function clsLabel(it){if(it.classes&&it.classes.length)return it.classes.map(c=>Object.keys(CKEY).find(k=>CKEY[k]===c)||c).join(', ');if(it.cls)return Object.keys(CKEY).find(k=>CKEY[k]===it.cls)||it.cls;return 'Toutes classes';}
function statTally(arr){if(!Array.isArray(arr))return'';const m={},order=[];arr.forEach(x=>{if(x){if(m[x]==null){m[x]=0;order.push(x);}m[x]++;}});return order.map(k=>esc(k)+(m[k]>1?' ×'+m[k]:'')).join(' · ');}
function pierceMaxFor(slot,it){if(slot==='suit')return 4;if(slot==='weapon'||slot==='weapon2')return(it&&['Éternel','Yggdrasil'].includes(it.tier))?12:10;return 10;}
/* Le sertissage se dessinait en losanges CSS — jaune pour un diamant, violet
   pour un holographique. Ce sont les vrais diamants du jeu maintenant, et
   l'holographique est la meme pierre teintee, faute d'asset dedie. */
const RUNEB={'Force':'force','Endurance':'endurance','Dextérité':'dexterite','Intelligence':'intelligence'};
/* La rune BONUS (fashion, cape, familier, ramasseur) porte la pierre de sa
   statistique. Elle n'a rien a voir avec la rune d'ARME, qui depend du palier. */
function runeBonusImg(stat){
  const f=RUNEB[stat];
  return f?`<img class="runeic" src="/airbuilder/icons/sertissage/runeb-${f}.png" alt="">`:'●';
}
/* Chaque piece de costume a sa propre gemme en jeu : la tete, le torse, les
   gants et les bottes ne portent pas le meme dessin. */
function gemmeCostume(slot,rempli){
  if(!rempli)return '<span class="gem e"></span>';
  const f=['fhead','ftop','fhand','ffoot'].includes(slot)?`gemme-${slot}`:'diamant';
  return `<img class="gem img" src="/airbuilder/icons/sertissage/${f}.png" alt="" title="Gemme${typeof rempli==='string'?' · '+rempli:''}">`;
}
function diaImg(rempli,holo){
  if(!rempli)return '<span class="gem e"></span>';
  return `<img class="gem img" src="/airbuilder/icons/sertissage/diamant${holo?'-holo':''}.png" alt="" title="${holo?'Diamant holographique':'Diamant'}${typeof rempli==='string'?' · '+rempli:''}">`;
}
/* La rune porte la pierre de sa famille : chaque palier a la sienne en jeu. */
const RUNEIMG={'Yggdrasil':'rune-yggdrasil','Éternel':'rune-force','Ancestral':'rune-endurance','Lusaka':'rune-intelligence'};
function runeImg(tier){
  const f=RUNEIMG[tier];
  return f?`<img class="runeic" src="/airbuilder/icons/sertissage/${f}.png" alt="">`:'<i class=vgi-rune></i>';
}
function itipBuild(it,cfg,slot,e){const col=couleurPiece(it,cfg);const icon=(it.ic&&IC[it.ic])?`<img src="${IC[it.ic]}">`:'';
  const isW=(slot==='weapon'||slot==='weapon2');
  const up=(cfg&&cfg.up)?` <span style="color:var(--gold)">+${cfg.up}</span>`:'';
  const stars=(isW&&cfg&&cfg.stars)?` <span class="arts">${'<img src="/airbuilder/icons/sertissage/artefact.png" alt="">'.repeat(cfg.stars)}</span>`:'';
  /* Le jeu annonce d'abord CE QUE C'EST, puis SI ON PEUT LE PORTER, et enfin ce
     qu'il apporte. L'ordre comptait : le niveau requis etait relegue tout en bas,
     alors que c'est la premiere chose qu'on cherche devant une piece convoitee. */
  let h=`<div class="t" style="color:${col}">${icon}<span>${esc(it.n)}${it.sex?' ('+it.sex+')':''}${up}${stars}</span></div>`;
  const tags=[];
  /* Le palier s'affichait pour les seules armes. Une armure Yggdrasil ou Lusaka
     en a un aussi, et il porte la couleur qui identifie la piece d'un coup d'oeil. */
  if(cfg&&cfg.tier&&RARCOL[cfg.tier])tags.push(`<span class="tag" style="background:${col}1a;color:${col};border:1px solid ${col}66">${esc(cfg.tier)}</span>`);
  if(it.tier)tags.push(`<span class="tag" style="background:${(it.col||'#cfd2dc')}14;color:${it.col||'var(--mut)'};border:1px solid ${(it.col||'#cfd2dc')}55">${esc(it.tier)}</span>`);
  if(it.set)tags.push(`<span class="tag" style="background:#ffffff0d;color:var(--mut);border:1px solid #ffffff24">Set ${esc(it.set)}</span>`);
  if(tags.length)h+=`<div class="tags">${tags.join('')}</div>`;
  /* Conditions pour equiper, juste sous le nom, comme en jeu. */
  const cond=[];
  if(it.lv)cond.push(`Niveau ${it.lv}`);
  if(it.pr)cond.push(`Prestige ${it.pr}`);
  const cl=clsLabel(it);
  if(cl&&cl!=='Toutes')cond.push(cl);
  if(cond.length)h+=`<div class="cond">${cond.map(c=>esc(c)).join(' · ')}</div>`;
  if(it.atk)h+=`<div class="atk"><span>Attaque</span><b>${it.atk[0]} ~ ${it.atk[1]}</b></div>`;
  const setb=it.setb&&it.setb.length,bonus=setb?it.setb:(it.b||[]);
  const configured=!!(cfg||(slot==='familier'&&e));
  /* Les bonus de base disparaissaient des qu'une piece etait configuree : on ne
     pouvait plus voir ce qu'elle apporte sans la desequiper. Ils restent. */
  if(bonus.length){h+=`<div class="sec">${setb?'Bonus de set':'Bonus'}</div>`+bonus.map(b=>`<div class="bl"><span>${esc(b[0])}</span><span>+${b[1]}</span></div>`).join('');}
  // --- Schéma de configuration (pièce équipée) ---
  if(configured){let cf='';const chips=[];
    if(isW&&cfg)chips.push(`<span class="chip" style="${cfg.rune?'color:var(--green);border-color:#4ADE8055':'color:var(--mut);opacity:.65'}">${runeImg(it.tier)} ${esc(runeName(it.tier))}</span>`);
    else if(cfg&&typeof cfg.rune==='string'&&cfg.rune){const _rc=STATCOL[cfg.rune]||'#4ADE80';chips.push(`<span class="chip" style="color:${_rc};border-color:${_rc}55">${runeBonusImg(cfg.rune)} ${esc(cfg.rune)}</span>`);}
    if(isW&&cfg&&cfg.mastery)chips.push(`<span class="chip" style="color:var(--gold);border-color:#FFD24A55"><i class=vgi-target></i> ${cfg.mastery}/100</span>`);
    if(slot==='familier'&&e){chips.push(`<span class="chip" style="color:var(--gold);border-color:#FFD24A55"><i class=vgi-medal></i> Rang ${e.rank||'D'}</span>`);if(typeof e.rune==='string'&&e.rune){const _rc=STATCOL[e.rune]||'#4ADE80';chips.push(`<span class="chip" style="color:${_rc};border-color:${_rc}55">${runeBonusImg(e.rune)} ${esc(e.rune)}</span>`);}}
    if(chips.length)cf+=`<div class="chips">${chips.join('')}</div>`;
    if(cfg&&cfg.dia){const gems=cfg.dia.map(d=>diaImg(d,false)).join('');const holos=(cfg.holo||[]).map(d=>diaImg(d,true)).join('');const dT=statTally(cfg.dia),hT=statTally(cfg.holo);cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Sertissage</span><div style="flex:1;min-width:0"><div class="gems">${gems}${holos?'<span class="sep"></span>'+holos:''}</div>${dT?`<div style="font-size:12px;color:var(--c-diamant);font-weight:600;margin-top:2px">${dT}</div>`:''}${hT?`<div style="font-size:12px;color:var(--c-holo);font-weight:600;margin-top:1px">Holo : ${hT}</div>`:''}</div></div>`;}
    if(cfg&&cfg.gems){const gems=cfg.gems.map(d=>gemmeCostume(slot,d)).join('');const gT=statTally(cfg.gems);cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Gemmes</span><div style="flex:1;min-width:0"><div class="gems">${gems}</div>${gT?`<div style="font-size:12px;color:var(--c-diamant);font-weight:600;margin-top:2px">${gT}</div>`:''}</div></div>`;}
    if(cfg&&cfg.pierce){const pel=pierceElDe(cfg,slot);const pcard=PIERCECARD[pel];const ecol=pcard?pcard.col:'#9a9aa8';const open=(cfg.pn!=null)?cfg.pn:cfg.pierce.filter(x=>x).length;
      const pgr=pierceGrades(pel);const plib=g=>pcard&&pcard.fam==='def'?g+'%':g;
      const pcas=pierceCases(cfg,slot);
      /* La pastille montre la carte reellement posee, pas un palier decoratif. */
      let phaut='';pcas.slice(0,open).forEach(function(v){if(pgr.indexOf(v)>pgr.indexOf(phaut))phaut=v;});
      if(!phaut)phaut=pgr[0]||'';
      if(pel||open){const pips=Array.from({length:open},(_,i)=>{const v=pcas[i];
          if(v&&pcard&&pcard.g[v])return `<img class="pcard" src="${pierceCarte(pel,slot,v)}" alt="${plib(v)}" title="${esc(pel)} ${plib(v)}">`;
          return `<span class="pip"></span>`;}).join('');
        let pc=`<div class="crow" style="align-items:flex-start"><span class="lab">Perçage</span><div style="flex:1;min-width:0">`;
        pc+=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px"><span class="chip" style="color:${ecol};border-color:${ecol}66">${pel?`<img class="pcard mini" src="${pierceCarte(pel,slot,phaut)}" alt="">`:'<i class=vgi-card></i>'} ${open}/${pierceMaxFor(slot,it)}</span>${pel?`<span class="chip" style="color:${ecol};border-color:${ecol}66;background:${ecol}1a"><img class="pcard mini" src="${pierceCarte(pel,slot,phaut)}" alt="">${esc(pel)}${phaut?' '+plib(phaut):''}</span>`:''}<div class="pips">${pips||'<span class="mini">—</span>'}</div></div>`;
        if(pcard){const t=pierceTotals(cfg,slot);if(t&&t.lines.length)pc+=`<div style="font-size:12px;color:var(--c-percage);font-weight:700">${t.lines.map(l=>esc(l[0])+' '+l[1]).join(' · ')}</div>`;}
        pc+=`</div></div>`;cf+=pc;}}
    if(cfg&&cfg.evL)cf+=`<div class="crow"><span class="lab">Éveil</span><b style="font-size:12px;color:var(--c-eveil)">${cfg.evL}${cfg.evS?' · '+esc(cfg.evS):''}</b></div>`;
    if(cfg&&cfg.scrS)cf+=`<div class="crow"><span class="lab">Scroll</span><b style="font-size:12px;display:inline-flex;align-items:center;gap:5px"><img class="runeic" src="/airbuilder/icons/sertissage/statscroll.png" alt="">${esc(cfg.scrS)} +${cfg.scrL||0}</b></div>`;
    if(slot==='fairy'&&cfg&&cfg.lvl)cf+=`<div class="crow"><span class="lab">Niveau fée</span><b style="font-size:12px">${cfg.lvl}</b></div>`;
    if(cf)h+=`<div class="sec">Configuration</div>${cf}`;}
  return h;}
function itipShow(ev,idRaw){if(!pickSlot)return;const id=String(idRaw);const it=(listFor(pickSlot)||[]).find(x=>String(x.id)===id);if(!it){itipHide();return;}const el=_itip();el.innerHTML=itipBuild(it);itipTeinte(el,it);el.style.display='block';itipMove(ev);}
function itipTeinte(el,it,cfg){const c=couleurPiece(it,cfg);el.style.borderColor=c?c+'88':'';el.style.boxShadow=c?`0 14px 36px #000d, 0 0 0 1px ${c}22 inset`:'';}
function itipSlot(ev,slot){const e=E(slot);if(!e||!e.item){itipHide();return;}const el=_itip();el.innerHTML=itipBuild(e.item,e.cfg,slot,e);itipTeinte(el,e.item,e.cfg);el.style.display='block';itipMove(ev);}
function itipMove(ev){if(!_itipEl||_itipEl.style.display!=='block')return;const pad=14,w=_itipEl.offsetWidth,h=_itipEl.offsetHeight;let x=ev.clientX+pad,y=ev.clientY+pad;if(x+w>window.innerWidth-8)x=ev.clientX-w-pad;if(x<8)x=8;if(y+h>window.innerHeight-8)y=window.innerHeight-h-8;if(y<8)y=8;_itipEl.style.left=x+'px';_itipEl.style.top=y+'px';}
function itipHide(){if(_itipEl)_itipEl.style.display='none';}
function drawPick(q){itipHide();const slot=pickSlot,e=E(slot),cfg=SLOTS[slot]||{lbl:slot};
  let body='';
  // familier : sections + rang
  if(slot==='familier'){
    let pk='';
    if(e){const rank=e.rank||'D';pk+=`<div class="sec"><div style="font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Rang du familier (apparence change en B puis S)</div>
      <div class="rankpick">${RANKS.map(r=>`<div class="rp ${rank===r?'on':''}" onclick="setRank('${r}')">${r}<div style="font-size:11px;color:var(--mut);font-weight:400">niv ${LVLMAX[r]}</div></div>`).join('')}</div>
      <div style="font-size:12px;color:var(--mut);margin-bottom:4px">Rune (bonus)</div><div class="seg2" style="flex-wrap:wrap;max-width:340px">${['Force','Endurance','Dextérité','Intelligence'].map(o=>statS2(o,(typeof e.rune==='string'&&e.rune===o),`famRune('${o}')`)).join('')}<div class="s2 ${(typeof e.rune!=='string'||!e.rune)?'on':''}" onclick="famRune('')">—</div></div></div>`;}
    for(const sec of Object.keys(FAM)){const arr=FAM[sec].filter(x=>!q||x.n.toLowerCase().includes(q.toLowerCase()));if(!arr.length)continue;
      pk+=`<div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">${esc(sec)} ${sec==='Doré'?'(œufs dorés)':''}</div>`+arr.map(x=>`<div class="itl" onclick="equipFam('${x.id}','${esc(x.n)}')">${IC[x.id]?`<img src="${IC[x.id]}">`:'<i class=vgi-paw></i>'}<div class="n">${esc(x.n)}</div></div>`).join('');}
    document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3>Familier</h3><input class="srch" placeholder="Familier…" oninput="drawPick(this.value)" ${q?`value="${esc(q)}"`:''}>${pk}<div class="sheet-foot">${e?'<span class="pill rm" onclick="removeItem()"><i class=vgi-trash></i> Retirer</span>':'<span></span>'}<span class="pill" onclick="closePick()">Fermer</span></div></div></div>`;vgDD();return;}
  if(e){try{body=panelFor(slot,e);}catch(err){body=`<div class="sec"><div class="mini" style="color:var(--red)">Réinitialise cette pièce (ancienne sauvegarde).</div></div>`;}}
  const items=listFor(slot).filter(it=>!q||it.n.toLowerCase().includes(q.toLowerCase()));
  const grpKey=(slot==='mantra'||slot==='masque')?'cat':(slot==='ramasseur'?null:(['fhead','ftop','fhand','ffoot'].includes(slot)?'cat':'tier'));
  const byTier={};items.forEach(it=>{const g=grpKey?(it[grpKey]||'—'):'';(byTier[g]=byTier[g]||[]).push(it);});
  const pick=`<input class="srch" placeholder="${items.length} objet(s) pour ${esc(C().cls)} ${C().sex}…" oninput="drawPick(this.value)" ${q?`value="${esc(q)}"`:''}>
    <div style="max-height:300px;overflow:auto">${Object.entries(byTier).map(([t,arr])=>`<div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">${esc(t)}</div>`+arr.slice(0,60).map(it=>{const lock=C().prestige<(it.pr||0);const _id=String(it.id).replace(/&/g,'&amp;').replace(/"/g,'&quot;');return `<div class="itl" onmouseenter="itipShow(event,&quot;${_id}&quot;)" onmousemove="itipMove(event)" onmouseleave="itipHide()" onclick="${lock?'':`equip(&quot;${_id}&quot;)`}" style="${lock?'opacity:.45;':''}${e&&e.item&&String(e.item.id)===String(it.id)?'border:2px solid var(--orange);background:rgba(255,140,26,.10);box-shadow:0 0 0 2px rgba(255,140,26,.18)':''}">${imgT(it.ic,32)||'<span style=width:32px></span>'}<div class="n" style="color:${it.col||'#cfd2dc'}">${esc(it.n)}${it.sex?' ('+it.sex+')':''}<div style="font-size:11px;color:var(--mut)">${it.setb&&it.setb.length?it.setb.slice(0,2).map(b=>b[0]+'+'+b[1]).join(' · '):(it.b&&it.b.length?it.b.slice(0,3).map(b=>b[0]+'+'+b[1]).join(' · '):(it.atk?'Atk '+it.atk[0]+'~'+it.atk[1]:''))}</div></div>${it.pr?`<span style="font-size:11px;color:${lock?'var(--red)':'var(--gold)'}">${lock?'<i class=vgi-lock></i>':'<i class=vgi-star></i>'}P${it.pr}</span>`:''}</div>`;}).join('')).join('')||'<div style="color:var(--mut);padding:10px">Aucun objet (à venir : ramasseur, masque, fashion en étape 2/3).</div>'}</div>`;
  document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3>${esc(cfg.lbl)} — ${esc(C().cls)} ${C().sex}</h3>${body}${pick}<div class="sheet-foot">${e?'<span class="pill rm" onclick="removeItem()"><i class=vgi-trash></i> Retirer cet objet</span>':'<span></span>'}<span class="pill" onclick="closePick()">Fermer</span></div></div></div>`;vgDD();}
function equip(id){if(_ro())return;const it=listFor(pickSlot).find(x=>String(x.id)===String(id));if(!it)return;const base={item:it};if(['weapon','weapon2','shield','suit','helmet','gauntlet','boots','ring1','ring2','earring1','earring2','necklace','fhead','ftop','fhand','ffoot','cape','ramasseur','fairy'].includes(pickSlot))base.cfg=defCfg(pickSlot);ST().eq[pickSlot]=base;if(base.cfg)defaultCfg(pickSlot,it.tier,C().cls);render();drawPick('');}
function defWcfg(){return {rune:{stat:'',val:0},mode:'normal',plus:0,dia:['','','','',''],holo:['','',''],pierce:Array(12).fill(null),tier:'Commun',rlines:[],r1:{stat:'',val:0},r2:{stat:'',val:0},scroll:0,elem:0};}
function equipFam(id,n){if(_ro())return;const e=E('familier');ST().eq.familier={item:{id:id,n:n,ic:id,b:[]},rank:(e&&e.rank)||'S'};render();drawPick('');}
function setRank(r){if(_ro())return;const e=E('familier');if(e){e.rank=r;render();drawPick('');}}
function famRune(v){const e=E('familier');if(e){e.rune=v;render();drawPick('');}}
function removeItem(){delete ST().eq[pickSlot];render();closePick();}
/**
 * « Demander cet objet » : la piece equipee part vers la boutique, avec ce
 * qu'on a regle dessus (rarete, +N, percage, eveil, scroll, element).
 *
 * On ne transporte que des DONNEES, jamais du HTML : la bulle est redessinee
 * cote site. Le relais est le localStorage — une URL ne tiendrait pas la
 * configuration complete, et on ne veut pas d'un aller-retour serveur pour un
 * geste qui n'engage encore a rien.
 */
/**
 * « Acheter un objet » — la liste des pieces montees sur ce stuff.
 *
 * Demander une piece se decidait depuis l'ecran de reglages d'un emplacement :
 * il fallait deja savoir laquelle, et l'ouvrir. On part desormais du build —
 * on voit ses pieces, on choisit celle qu'on veut se faire fournir.
 */
/* « Acheter un objet » — les pieces montees sur ce stuff.
 *
 * On n'en demandait qu'une a la fois : pour trois pieces il fallait revenir
 * trois fois sur le builder. On coche ce qu'on veut, et tout part ensemble ;
 * la boutique les presente ensuite une par une, chacune avec son prix.
 */
var VGSEL = {};
function vgSelPiece(slot, ev){
  if(ev) ev.stopPropagation();
  VGSEL[slot] = !VGSEL[slot];
  var ligne = document.querySelector('.itl[data-slot="' + slot + '"]');
  if(ligne) ligne.classList.toggle('sel', !!VGSEL[slot]);
  vgSelMaj();
}
function vgSelMaj(){
  var n = Object.keys(VGSEL).filter(function(k){ return VGSEL[k]; }).length;
  var b = document.getElementById('vgBuyGo');
  if(!b) return;
  b.textContent = n ? ('Demander ' + n + ' pièce' + (n > 1 ? 's' : '')) : 'Choisis au moins une pièce';
  b.classList.toggle('off', !n);
}
function vgAcheterPiece(){
  if(vgAnon()){vgConnexion('commander une pièce à la boutique');return;}
  if(window.__VIEW||window.__embed){agToast('Mode lecture seule.',false);return;}
  VGSEL = {};
  var eq = ST().eq || {};
  var slots = Object.keys(eq).filter(function(s){ return eq[s] && eq[s].item; });
  var lignes = slots.map(function(s){
    var e = eq[s], lbl = (SLOTS[s] && SLOTS[s].lbl) || s;
    var c = e.cfg || {}, bouts = [];
    if(c.tier && c.tier !== 'Commun') bouts.push(c.tier);
    if(c.up) bouts.push('+' + c.up);
    if(pierceElDe(c,s)) bouts.push(pierceElDe(c,s));
    if(c.evL) bouts.push('éveil ' + c.evL);
    var ic = (e.item.ic && IC[e.item.ic]) ? '<img src="' + IC[e.item.ic] + '" alt="">' : '<i class=vgi-package></i>';
    return '<div class="itl buyl" data-slot="' + s + '" onclick="vgSelPiece(\'' + s + '\',event)"'
      + ' onmouseenter="itipSlot(event,\'' + s + '\')" onmousemove="itipMove(event)" onmouseleave="itipHide()">'
      + '<span class="coche" aria-hidden="true"></span>'
      + '<span class="ic">' + ic + '</span>'
      + '<span class="n" style="color:' + (e.item.col || '#cfd2dc') + '">' + esc(e.item.n)
      + '<span class="sub">' + esc(lbl) + (bouts.length ? ' · ' + esc(bouts.join(' · ')) : '') + '</span></span>'
      + '</div>';
  }).join('');
  document.getElementById('modalRoot').innerHTML = '<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet buysheet" style="max-width:560px;padding:22px">'
    + '<div class="buyttl">' + VGI('cart',{size:16}) + ' Acheter un objet de mon build</div>'
    + '<div class="mut buysub">Coche les pièces qui t\'intéressent : elles partent vers la boutique avec leurs réglages (rareté, +N, perçage, éveil), et tu ajustes le prix de chacune avant d\'envoyer.</div>'
    + (lignes || '<div class="mut" style="font-size:13px;padding:8px 0">Ce stuff est vide — équipe au moins une pièce.</div>')
    + '<div class="sheet-foot buyfoot">'
    + '<span class="pill" onclick="agClose(0)">Annuler</span>'
    + '<span class="pill dem off" id="vgBuyGo" onclick="vgDemanderSelection()">Choisis au moins une pièce</span>'
    + '</div></div></div>';
}
/* Envoie la selection vers la boutique. La pile est lue piece par piece. */
function vgDemanderSelection(){
  var choisis = Object.keys(VGSEL).filter(function(k){ return VGSEL[k]; });
  if(!choisis.length){ agToast('Coche au moins une pièce.', false); return; }
  var pile = choisis.map(vgDepotPiece).filter(Boolean);
  if(!pile.length) return;
  try{ localStorage.setItem('vg_demande_pieces', JSON.stringify(pile)); localStorage.removeItem('vg_demande_piece'); }
  catch(err){ agToast('Stockage indisponible — ouvre la boutique et compose la pièce à la main.', false); return; }
  location.href = '/boutique?piece=1';
}
/* « Volcano » seul ne dit pas au vendeur s'il faut du 7 % ou du 15 % : on joint
   le palier le plus haut effectivement pose. */
function carteDemandee(c,slot){var el=pierceElDe(c,slot);if(!el)return '';
  var g=pierceGrades(el),haut='';
  pierceCases(c,slot).slice(0,(c.pn!=null)?c.pn:(c.pierce||[]).length).forEach(function(v){
    if(g.indexOf(v)>g.indexOf(haut))haut=v;});
  if(!haut)return el;
  return el+' '+(PIERCECARD[el].fam==='def'?haut+'\u00a0%':haut);}
/* Le depot d'UNE piece, tel que la boutique l'attend. Partage entre le bouton
   d'une seule piece et la selection multiple. */
function vgDepotPiece(slot){
  var e=E(slot); if(!e||!e.item) return null;
  var c=e.cfg||{};
  var ouverts=(c.pn!=null)?c.pn:((c.pierce||[]).filter(function(x){return x;}).length);
  return {slot:slot,itemId:String(e.item.id),nom:e.item.n,choix:{
    rarete:(c.tier&&c.tier!=='Commun')?c.tier:'',
    up:c.up?String(c.up):'',etoiles:c.stars?String(c.stars):'',
    percage:ouverts?String(ouverts):'',carte:carteDemandee(c,slot),
    eveilRang:c.evL||'',eveilStat:c.evS||'',
    scrollStat:c.scrS||'',scrollNiv:c.scrL?String(c.scrL):'',
    element:c.elemType||'',elementNiv:c.elemLvl?String(c.elemLvl):''}};
}
function vgDemanderPiece(slotDemande){
  if(window.__VIEW||window.__embed){agToast('Mode lecture seule.',false);return;}
  var slot=slotDemande||pickSlot;
  var d=vgDepotPiece(slot);
  if(!d){agToast('Équipe d\'abord une pièce dans cet emplacement.',false);return;}
  try{localStorage.setItem('vg_demande_pieces',JSON.stringify([d]));localStorage.removeItem('vg_demande_piece');}
  catch(err){agToast('Stockage indisponible — ouvre la boutique et compose la pièce à la main.',false);return;}
  location.href='/boutique?piece=1';
}
function exportBuild(){try{const c=C();const st=ST();const data={name:c.name,stuff:st.name,cls:c.cls,sex:c.sex,lvl:c.lvl,prestige:c.prestige,equipped:Object.fromEntries(Object.entries(st.eq||{}).filter(([k,e])=>e&&e.item).map(([k,e])=>[k,{name:e.item.n,id:e.item.id,rank:e.rank}])),carnets:(c.carnets||[]).map(i=>CARNETS[i]&&CARNETS[i].nom).filter(Boolean),stats:(()=>{try{return totals();}catch(e){return {};}})()};
  try{localStorage.setItem('vg_build_export',JSON.stringify(data));}catch(e){}if(window.__embed){try{window.parent&&window.parent.postMessage({type:'vg_build',data:data},'*');}catch(e){}return;}const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(c.name||'build')+'_'+(st.name||'stuff')+'.json';a.click();agToast('Build exporté ',true);}catch(err){try{var cc=C()||{};if(window.__embed&&window.parent)window.parent.postMessage({type:'vg_build',data:{name:cc.name||'Perso',cls:cc.cls||'',prestige:cc.prestige||1,equipped:{},stats:{}}},'*');else agToast('Build validé (données partielles)',true);}catch(e){}}}
// ── Vanguard : sauvegarde de TOUS les persos du builder vers le site (base) ──
function vgCollectBuilds(){var oc=state.cur;var out=state.chars.map(function(c,ci){var os=c.curStuff;var stuffs=(c.stuffs||[]).map(function(s,si){state.cur=ci;c.curStuff=si;var stats={};try{stats=totals();}catch(e){}return {name:s.name,equipped:Object.fromEntries(Object.entries(s.eq||{}).map(function(p){var e=p[1];return [p[0],{name:e&&e.item&&e.item.n,id:e&&e.item&&e.item.id,rank:e&&e.rank}];})),stats:stats};});c.curStuff=os;return {name:c.name,cls:c.cls,sex:c.sex,lvl:c.lvl,prestige:c.prestige,carnets:(c.carnets||[]).map(function(i){return CARNETS[i]&&CARNETS[i].nom;}).filter(Boolean),stuffs:stuffs};});state.cur=oc;return out;}
function vgSavePersos(){if(vgAnon()){vgConnexion('publier tes persos à la guilde');return;}if(window.__VIEW){agToast('Mode lecture seule — build d\'un autre membre.',false);return;}if(window.__refSave){agToast('Build de référence — enregistré automatiquement dans la composition.',true);return;}agConfirm('Forcer la publication maintenant ?\n\nTes persos sont déjà publiés automatiquement à la guilde (GuildViewer · Compositions · Dashboard) à chaque changement — tu n\'as rien à faire.\n\nCe bouton force juste une mise à jour immédiate + crée un point de restauration.',function(){fetch('/api/builder-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({blob:state,snapshot:true})}).catch(function(){});fetch('/api/characters/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chars:vgCollectBuilds()})}).then(function(r){return r.ok?r.json():Promise.reject(r);}).then(function(d){agToast(''+((d&&d.count)||'Tes')+' perso(s) publié(s) + version créée — visibles dans le GuildViewer / Compositions / Dashboard.',true);}).catch(function(){agToast('Erreur de publication — es-tu bien connecté au site ?',false);});});}
/**
 * Le mode d'emploi de l'AirBuilder.
 *
 * Il ne passe pas par agInfo : cette fonction ECHAPPE le HTML — c'est sa raison
 * d'etre, elle affiche des messages qui peuvent contenir un nom d'objet, et une
 * balise y ressortait telle quelle. L'aide, elle, est ecrite ici de bout en
 * bout : aucune saisie utilisateur ne la traverse, elle peut donc etre mise en
 * page.
 */
function vgSaveHelp(){document.getElementById('modalRoot').innerHTML=
  `<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet aide" style="max-width:600px;padding:22px">`
  +`<div class="aidettl">`+VGI('info',{size:18})+` Comment marche l&apos;AirBuilder ?</div>`
  +`<div class="aidesub">Sept points, et tu sais tout.</div>`
  +`<div class="aidesec">`+VGI('users',{size:17})+`<div><h4>Mes personnages</h4><p>Chaque perso a sa classe, son niveau et son prestige. Les onglets en haut à droite passent de l'un à l'autre ; <b>Mes personnages</b> les montre en détail. Ils sont publiés à la guilde tout seuls — GuildViewer, Compositions, Tableau de bord.</p></div></div>`
  +`<div class="aidesec">`+VGI('layers',{size:17})+`<div><h4>Les stuffs</h4><p>Un perso porte plusieurs stuffs (DPS, Tank, Hybride…), chacun avec son équipement. <b>+ Stuff</b> en crée un vide, <b>Dupliquer</b> en crée un identique au stuff ouvert — mêmes pièces, mêmes réglages — pour tester une variante sans rien perdre. <b>Vider</b> retire les pièces du stuff ouvert ; les carnets du perso, eux, restent.</p></div></div>`
  +`<div class="aidesec">`+VGI('sword-cross',{size:17})+`<div><h4>Équiper et régler</h4><p>Clique un emplacement : tu choisis l'objet, puis tu règles ce que le jeu permet dessus — rareté, +N, perçage, éveil, scroll, élément. Le résumé des statistiques se met à jour en bas de page.</p></div></div>`
  +`<div class="aidesec">`+VGI('book',{size:17})+`<div><h4>Carnets des Arcanes</h4><p>Ils appartiennent au <b>personnage</b>, pas au stuff : ils comptent quel que soit le stuff ouvert. <b>Base</b> = une carte de chaque, <b>Complet</b> = toutes les pages.</p></div></div>`
  +`<div class="aidesec">`+VGI('cart',{size:17})+`<div><h4>Acheter un objet</h4><p>Sur le cadre de l'équipement. Tu choisis une pièce de ton build, elle part vers la boutique avec ses réglages, et le détenteur la voit exactement comme tu la veux.</p></div></div>`
  +`<div class="aidesec">`+VGI('link',{size:17})+`<div><h4>Partager le build</h4><p>Le lien n'existe que si tu le demandes, et il ne s'ouvre qu'aux membres du serveur Discord. <b>Rendre privé</b> le désactive quand tu veux.</p></div></div>`
  +`<div class="aidesec">`+VGI('save',{size:17})+`<div><h4>Sauvegarde</h4><p>Tout est enregistré à chaque changement, sans bouton. Mais chaque changement <b>écrase</b> le précédent : il n'y a pas d'annulation. Un point de restauration est créé de temps en temps, et le staff peut en restaurer un depuis le GuildViewer.</p></div></div>`
  +`<div class="sheet-foot" style="margin-top:14px"><span></span><span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="agClose(0)">Compris</span></div>`
  +`</div></div>`;}
// ── Partage du build : un lien, créé au clic ──────────────────────────────
// Avant, l'encadré occupait 316 px en permanence et interrogeait l'API à chaque
// rendu. Le partage est pourtant un geste rare : on monte un stuff dix fois, on
// le montre une. Il vit donc dans une fenêtre, et RIEN n'est écrit en base tant
// que le joueur n'a pas demandé son lien.
function vgPartager(){
  if(vgAnon()){vgConnexion('partager ton build');return;}
  if(window.__VIEW||window.__embed){agToast('Mode lecture seule — build d\'un autre membre.',false);return;}
  if(window.__share){vgPartagerVue();return;}
  // Premier appel : on lit l'état (lecture seule, aucune écriture).
  vgPartagerVue(true);
  fetch('/api/builder-share').then(function(r){return r.ok?r.json():null;}).then(function(j){
    window.__share=j||{shareId:null,public:false};vgPartagerVue();
  }).catch(function(){window.__share={shareId:null,public:false};vgPartagerVue();});
}
function vgPartagerVue(chargement){
  var s=window.__share||{};var pub=!!s.public&&!!s.shareId;
  var lien=s.shareId?(location.origin+'/build/'+s.shareId):'';
  var corps;
  if(chargement){corps='<div class="mut" style="font-size:13px">Chargement…</div>';}
  else if(pub){
    corps='<div class="shmini" style="margin-bottom:11px">Ton build est visible par les membres qui ont ce lien. Il reste en lecture seule.</div>'
      +'<div class="shrow"><input class="shlink" id="__shlink" readonly value="'+esc(lien)+'" aria-label="Lien de partage">'
      +'<button type="button" class="shbtn" onclick="vgShareCopy()" aria-label="Copier le lien">'+VGI('clipboard',{size:14})+'</button></div>'
      +'<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">'
      +'<span class="pill" onclick="vgShareSet(0)">'+VGI('lock',{size:13})+' Rendre privé</span>'
      +'<span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="agClose(0)">Fermer</span></div>';
  } else {
    corps='<div class="shmini" style="margin-bottom:14px">Personne ne peut voir ce build. Génère un lien quand tu veux le montrer — rien n\'est enregistré avant ton clic. Le lien reste réservé aux membres du serveur.</div>'
      +'<div style="display:flex;gap:10px;justify-content:flex-end">'
      +'<span class="pill" onclick="agClose(0)">Annuler</span>'
      +'<span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="vgShareSet(1)">'+VGI('link',{size:13})+' Générer le lien</span></div>';
  }
  document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:460px;padding:22px">'
    +'<div style="font-weight:700;font-size:15px;margin-bottom:10px;display:flex;align-items:center;gap:8px">'+VGI('link',{size:16})+' Partager mon build</div>'
    +corps+'</div></div>';
}
// Bascule la visibilité. L'API génère le shareId au premier partage.
function vgShareSet(pub){if(window.__VIEW)return;pub=!!pub;
  fetch('/api/builder-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({public:pub})})
   .then(function(r){return r.ok?r.json():null;}).then(function(s){
      if(!s)return agToast('Erreur : partage non modifié.',false);
      window.__share={shareId:s.shareId,public:pub};
      agToast(pub?'Lien de partage créé':'Build repassé en privé',true);
      vgPartagerVue();
   }).catch(function(){agToast('Erreur réseau : partage non modifié.',false);});}
function vgShareCopy(){var i=document.getElementById('__shlink');
  if(!i||!i.value)return agToast('Génère d\'abord ton lien.',false);
  function done(){agToast('Lien copié',true);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(i.value).then(done).catch(function(){i.select();done();});}
  else{try{i.select();document.execCommand('copy');done();}catch(e){agToast('Copie impossible — sélectionne le lien à la main.',false);}}}
function vgSyncChip(){var c=document.getElementById('vgSaveChip');if(c)c.style.display=window.__VIEW?'none':'';}

/* ===================== VOLETS DE MÉCANIQUES ===================== */
let _scroll=0;
function keepScroll(){const s=document.querySelector('.sheet');if(s)_scroll=s.scrollTop;}
function restoreScroll(){requestAnimationFrame(()=>{const s=document.querySelector('.sheet');if(s)s.scrollTop=_scroll;});}
function cfgOf(slot){const e=E(slot);if(!e)return null;const d=defCfg(slot);e.cfg=Object.assign({},d,e.cfg||{});
  ['pierce','dia','holo','rlines','gems'].forEach(k=>{if(d[k]!==undefined&&!Array.isArray(e.cfg[k]))e.cfg[k]=Array.isArray(d[k])?d[k].slice():d[k];});
  if(Array.isArray(e.cfg.dia))e.cfg.dia=e.cfg.dia.map(x=>x==='Melee Stealhp'?'Syphon de vie':x);
  return e.cfg;}
function defCfg(slot){
  if(slot==='weapon'||slot==='weapon2')return{rune:false,up:0,stars:0,dia:['','','','',''],holo:['','',''],pierce:Array(12).fill(null),pierceEl:'',tier:'Commun',mastery:0,rlines:[],evL:'',evS:'',scrS:'',scrL:0,elemType:'',elemLvl:0};
  if(slot==='shield')return{up:0,pierce:Array(10).fill(null),pierceEl:'',evL:'',evS:'',elemType:'',elemLvl:0};
  if(slot==='suit')return{up:0,pierce:Array(4).fill(null),pierceEl:'',evL:'',evS:'',scrS:'',scrL:0,elemType:'',elemLvl:0};
  if(['helmet','gauntlet','boots'].includes(slot))return{up:0,evL:'',evS:'',scrS:'',scrL:0};
  if(['fhead','ftop','fhand','ffoot'].includes(slot))return{up:0,gems:['','','',''],rune:''};
  if(slot==='cape')return{rune:'',evL:'',evS:''};
  if(slot==='ramasseur')return{rune:''};
  if(slot==='fairy')return{lvl:0};
  if(['ring1','ring2','earring1','earring2','necklace'].includes(slot))return{up:0,evL:'',evS:''};
  return {};
}
// Maximise les NIVEAUX d'une pièce équipée (upgrade, étoiles, perçage plein au meilleur palier, scroll, élément, maîtrise, fée).
// Les CHOIX (type d'élément, stat de scroll/éveil, cartes) restent au joueur.
function maxCfg(slot,tier){var c=cfgOf(slot);if(!c)return;var artef=['Éternel','Yggdrasil'].indexOf(tier)>=0;
  var fillS=function(n){var g=pierceGrades(pierceElDe(c,slot));var top=g[g.length-1];c.pierce=c.pierce||[];
    for(var i=0;i<n;i++)c.pierce[i]=top||null;c.pn=n;};
  if(slot==='weapon'||slot==='weapon2'){c.rune=true;c.up=artef?20:10;if(artef)c.stars=3;fillS(artef?12:10);c.scrL=4;c.elemLvl=20;c.mastery=100;}
  else if(slot==='shield'){c.up=10;fillS(10);c.elemLvl=20;}
  else if(slot==='suit'){c.up=10;fillS(4);c.scrL=4;c.elemLvl=20;}
  else if(['helmet','gauntlet','boots'].indexOf(slot)>=0){c.up=10;c.scrL=4;}
  else if(['fhead','ftop','fhand','ffoot'].indexOf(slot)>=0){c.up=0;}
  else if(['ring1','ring2','earring1','earring2','necklace'].indexOf(slot)>=0){c.up=30;}
  else if(slot==='fairy'){c.lvl=(typeof FAIRYMAX!=='undefined')?FAIRYMAX:50;}
}
function maximizeSlot(slot){if(_ro())return;var e=E(slot);if(!e||!e.item)return;maxCfg(slot,e.item.tier);render();try{drawPick(curQ());}catch(x){}agToast('Pièce maximisée — choisis élément / stats',true);}
function maximizeAll(){if(_ro())return;var s=ST();if(!s||!s.eq||!Object.keys(s.eq).length)return agToast('Aucune pièce à maximiser.',false);agConfirm('Maximiser TOUTES les pièces équipées de ce stuff ?\n\nLes niveaux passent au max (tu gardes le choix des éléments et des stats).',function(){Object.keys(s.eq).forEach(function(slot){var e=s.eq[slot];if(e&&e.item&&e.cfg)maxCfg(slot,e.item.tier);});render();agToast('Stuff maximisé ',true);});}
// Classes magiques (Int) — leurs armes n'ont pas d'élément d'attaque par défaut.
var MAGIC_CLS=['Arcaniste','Envouteur','Primat'];
// Stats d'éveil : codes → noms exacts du builder.
var EVN={INT:'Intelligence',DCC:'Dégâts critiques',FOR:'Force',DEX:'Dextérité',END:'Endurance',ATK:'Attaque',HP:'PV max'};
// Recommandations ÉVEIL (evL) + CARTE de perçage (pierceEl) par classe & rôle (DPS / Tank).
function recoFor(cls,role){
  if(role==='tank')return{ev:{suit:'END',helmet:'END',gauntlet:'HP',boots:'HP',weapon:'END',weapon2:'END',shield:'END'},card:{suit:'Volcano',weapon:'Terre',weapon2:'Terre',shield:'Terre'}};
  if(MAGIC_CLS.indexOf(cls)>=0)return{ev:{suit:'INT',helmet:'INT',gauntlet:'ATK',boots:'ATK',weapon:'INT',weapon2:'INT',shield:'INT',ring1:'INT',ring2:'INT',earring1:'INT',earring2:'INT',necklace:'INT'},card:{suit:'Fulgur',weapon:'Eau',weapon2:'Eau',shield:'Eau'}};
  var arba=(cls==='Arbaletrier');
  var ev={suit:'DCC',helmet:arba?'DEX':'FOR',gauntlet:'ATK',boots:'DCC',weapon:'DCC',weapon2:'DCC',shield:'DCC',ring1:'DCC',ring2:'DCC',earring1:'DCC',earring2:'DCC',necklace:'DCC'};
  if(cls==='Chanoine'){ev.ring1=ev.ring2=ev.earring1=ev.earring2=ev.necklace='INT';} // Chanoine : bijoux en INT
  var wc=arba?'Foudre':'Feu';
  return{ev:ev,card:{suit:'Fulgur',weapon:wc,weapon2:wc,shield:wc}};
}
function stuffRole(){var n=((ST()||{}).name||'').toLowerCase();return n.indexOf('tank')>=0?'tank':'dps';}
// Valeurs PAR DÉFAUT à l'ajout d'une pièce : réglages guilde (up/élément) + reco éveil/cartes selon classe & rôle du stuff.
//  Arme : sans rune, +10, sans étoile · élément Vent+20 si physique (rien si magique) · Bijoux +20 · Armure +10 (Vent+20 plastron) · Fashion +0.
function defaultCfg(slot,tier,cls){var c=cfgOf(slot);if(!c)return;var magic=MAGIC_CLS.indexOf(cls)>=0;var R=recoFor(cls,stuffRole());
  var setEv=function(){if(R.ev[slot]&&EVN[R.ev[slot]]){c.evS=EVN[R.ev[slot]];c.evL='R1';}}; // evS = la stat d'éveil · evL = la ligne (R1 par défaut)
  // Palier courant (S a l'attaque, 10 % en defense) : celui de Baruna se pose a la main.
  var setCard=function(n){if(R.card[slot]){c.pierceEl=R.card[slot];var g=pierceGrades(c.pierceEl)[1]||pierceGrades(c.pierceEl)[0];
    c.pierce=c.pierce||[];for(var i=0;i<n;i++)c.pierce[i]=g||null;c.pn=n;}};
  if(slot==='weapon'||slot==='weapon2'){c.rune=false;c.up=10;c.stars=0;if(magic){c.elemType='';c.elemLvl=0;}else{c.elemType='Vent';c.elemLvl=20;}setCard(10);setEv();}
  else if(slot==='shield'){c.up=10;setCard(10);setEv();}
  else if(slot==='suit'){c.up=10;c.elemType='Vent';c.elemLvl=20;setCard(4);setEv();}
  else if(['helmet','gauntlet','boots'].indexOf(slot)>=0){c.up=10;setEv();}
  else if(['ring1','ring2','earring1','earring2','necklace'].indexOf(slot)>=0){c.up=20;setEv();}
  else if(['fhead','ftop','fhand','ffoot'].indexOf(slot)>=0){c.up=0;}
}
function upUI(slot,max){const w=cfgOf(slot);const v=w.up||0;const isW=(slot==='weapon'||slot==='weapon2');const art=(isW&&max>10&&v>10);
  let foot='';
  if(isW&&max>10)foot=`<div class="row" style="margin-top:5px"><span class="mini">Étoiles</span>${[0,1,2,3].map(s=>`<span class="tierbtn ${w.stars===s?'on':''}" onclick="cset('${slot}','stars',${s})">${s?'<i class=vgi-star></i>'.repeat(s):'—'}</span>`).join('')}</div><div class="mini">0–10 = normale · 11–20 = artefact</div>`;
  else if(isW)foot='<div class="mini">Pas d\'artefact sur ce tier (max +10).</div>';
  else if(slot==='shield')foot='<div class="mini">Max +'+max+' · pas d\'artefact</div>';
  else foot='<div class="mini">Max +'+max+'</div>';
  return `<div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/${art?'artefact':'upgrade'}.png" alt=""> Upgrade ${isW?`<span class="mini">(${art?'Artefact':'Normale'})</span>`:''}</div>
   <div class="lvl"><span class="mini">Niveau : <b>+${v}</b> / +${max}</span>
   <input type="range" min="0" max="${max}" value="${v}" oninput="upLive(this,'${slot}',${max})" onchange="cset('${slot}','up',+this.value)"></div>
   ${foot}</div>`;}
/* Deux systemes de couleur coexistent et se confondaient.
   - Le PALIER dit la famille de la piece : Eternel, Yggdrasil, Lusaka...
     Il vient de la base d'objets et porte deja sa couleur.
   - La RARETE se configure sur les armes, de Commun a Mythique, et n'avait
     AUCUNE couleur : le nom et le cadre restaient sur la teinte de famille,
     donc une arme Mythique se lisait comme une arme Commune.
   L'echelle reprise ici est celle du wiki des donjons : une seule grille de
   lecture sur tout le site. La rarete l'emporte quand elle est renseignee,
   c'est elle qu'on regarde en premier en jeu. */
const RARCOL={'Commun':'#9CA3AF','Rare':'#4EA8FF','Épique':'#C77DFF','Légendaire':'#FF8C1A','Pré-Mythique':'#FF5C8A','Mythique':'#C92A2A'};
const couleurPiece=(it,cfg)=>(cfg&&cfg.tier&&RARCOL[cfg.tier])||(it&&it.col)||'#cfd2dc';
/* DEUX familles de cartes de percage, et c'est la que le builder se trompait.
   Le meme element porte deux noms selon ce qu'on perce : le feu ATTAQUE sous le
   nom « Feu » et DEFEND sous le nom « Volcano ». Ce ne sont ni les memes
   dessins, ni les memes effets, ni les memes paliers.

     element       arme / bouclier     tenue
     feu           Feu                 Volcano   PV %
     eau           Eau                 Oceane    PM % et soins
     air           Air                 Neant     PF %
     terre         Terre               Seisme    Defense %
     electricite   Foudre              Fulgur    Attaque %

   Valeurs et libelles repris des descriptions du jeu. */
/* Les paliers PROPOSES. Le jeu en a quatre par famille — R et SR a l'attaque,
   12 et 15 % en defense (« de Baruna ») — mais on s'en tient a deux pour
   l'instant. Leurs valeurs restent decrites plus bas et leurs cartes restent
   posees dans `icons/percage/` : les rouvrir tient a cette seule ligne. */
const PIERCEGRADE={atk:['A','S'],def:['7','10']};
const PIERCECARD={
 // ATTAQUE — arme et bouclier
 'Feu':    {fam:'atk',col:'#F87171',ic:'<i class=vgi-flame></i>',  g:{A:[['Force',7,''],['Dégâts critiques',2,'%']],S:[['Force',12,''],['Dégâts critiques',4,'%']],R:[['Force',15,'']],SR:[['Force',18,''],['Dégâts critiques',8,'%']]}},
 'Eau':    {fam:'atk',col:'#4EA8FF',ic:'<i class=vgi-droplet></i>',g:{A:[['Intelligence',7,''],["Vitesse d'incantation",2,'%']],S:[['Intelligence',12,''],["Vitesse d'incantation",4,'%']],R:[['Intelligence',15,''],["Temps d'incantation",-5,'%']],SR:[['Intelligence',18,''],["Temps d'incantation",-8,'%']]}},
 'Air':    {fam:'atk',col:'#33D6A6',ic:'<i class=vgi-wind></i>',   g:{A:[['Vitesse de déplacement',7,'%'],['Soins',4,'%']],S:[['Vitesse de déplacement',12,'%'],['Soins',15,'%']]}},
 'Terre':  {fam:'atk',col:'#4ADE80',ic:'<i class=vgi-rock></i>',   g:{A:[['Endurance',7,'']],S:[['Endurance',12,''],['PV max',500,'']],R:[['Endurance',15,''],['PV',5,'%']],SR:[['Endurance',18,''],['PV',8,'%']]}},
 'Foudre': {fam:'atk',col:'#FFD24A',ic:'<i class=vgi-zap></i>',    g:{A:[['Dextérité',7,''],['Dégâts critiques',2,'%']],S:[['Dextérité',12,''],['Taux de critique',4,'%']],R:[['Dextérité',15,''],['Taux de critique',5,'%']],SR:[['Dextérité',18,''],['Taux de critique',8,'%']]}},
 // DEFENSE — tenue
 'Volcano':{fam:'def',col:'#F87171',ic:'<i class=vgi-flame></i>',  g:{'7':[['PV',7,'%']],'10':[['PV',10,'%']],'12':[['PV',12,'%']],'15':[['PV',15,'%']]}},
 'Océane': {fam:'def',col:'#4EA8FF',ic:'<i class=vgi-droplet></i>',g:{'7':[['PM',7,'%'],['Soins',15,'%']],'10':[['PM',10,'%'],['Soins',30,'%']],'12':[['PM',12,'%']],'15':[['PM',15,'%']]}},
 'Néant':  {fam:'def',col:'#33D6A6',ic:'<i class=vgi-wind></i>',   g:{'7':[['PF',7,'%']],'10':[['PF',10,'%']],'12':[['PF',12,'%']],'15':[['PF',15,'%']]}},
 'Séisme': {fam:'def',col:'#4ADE80',ic:'<i class=vgi-rock></i>',   g:{'7':[['Défense',7,'%']],'10':[['Défense',10,'%']],'12':[['Défense',12,'%']],'15':[['Défense',15,'%']]}},
 'Fulgur': {fam:'def',col:'#FFD24A',ic:'<i class=vgi-zap></i>',    g:{'7':[['Attaque',7,'%']],'10':[['Attaque',10,'%']],'12':[['Attaque',12,'%']],'15':[['Attaque',15,'%']]}}
};
/* Seuls l'arme, le bouclier et la tenue se percent dans le builder. */
const PIERCE_FAM=slot=>(slot==='weapon'||slot==='weapon2'||slot==='shield')?'atk':'def';
/* Une sauvegarde d'avant la correction porte un nom d'attaque sur la tenue, ou
   l'inverse. On traduit vers la bonne famille plutot que de vider le reglage. */
const PIERCETRAD={'Feu':'Volcano','Eau':'Océane','Air':'Néant','Vent':'Néant','Terre':'Séisme','Foudre':'Fulgur',
                  'Volcano':'Feu','Océane':'Eau','Néant':'Air','Séisme':'Terre','Fulgur':'Foudre'};
function pierceElDe(cfg,slot){const fam=PIERCE_FAM(slot);let el=(cfg&&cfg.pierceEl)||'';
  if(el&&(!PIERCECARD[el]||PIERCECARD[el].fam!==fam))el=PIERCETRAD[el]||'';
  if(el&&(!PIERCECARD[el]||PIERCECARD[el].fam!==fam))el='';
  return el;}
function pierceGrades(el){const c=PIERCECARD[el];return c?PIERCEGRADE[c.fam].filter(g=>c.g[g]):[];}
/* Meme chose pour les paliers : une tenue sauvegardee avant la correction porte
   des A/S. Le rang se conserve, seul son nom change. */
const PIERCEGRTRAD={A:'7',S:'10',R:'12',SR:'15','7':'A','10':'S','12':'R','15':'SR'};
function pierceCases(cfg,slot){const ok=pierceGrades(pierceElDe(cfg,slot));
  return ((cfg&&cfg.pierce)||[]).map(function(v){if(!v)return null;
    if(ok.indexOf(v)>=0)return v;const t=PIERCEGRTRAD[v];return (t&&ok.indexOf(t)>=0)?t:null;});}
/* L'accent d'« Oceane » est retire du nom de fichier : un chemin accentue se
   fait encoder et l'image ne se charge plus. */
const SANSACCENT=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function pierceCarte(el,slot,grade){
  const c=PIERCECARD[el];if(!c)return '';
  const dispo=pierceGrades(el);
  const g=c.g[grade]?grade:dispo[0];
  return `/airbuilder/icons/percage/${SANSACCENT(el)}-${SANSACCENT(g)}.png`;
}
/* Total : on additionne ligne par ligne, par libelle. Une carte Foudre A donne
   des DEGATS critiques et une S le TAUX de critique — deux lignes distinctes
   qu'il ne faut surtout pas fondre en une seule. */
function pierceTotals(cfg,slot){const el=pierceElDe(cfg,slot);const card=PIERCECARD[el];if(!card)return null;
  const par={},ordre=[],cases={};
  pierceCases(cfg,slot).slice(0,(cfg.pn!=null)?cfg.pn:(cfg.pierce||[]).length).forEach(v=>{const lg=card.g[v];if(!lg)return;
    cases[v]=(cases[v]||0)+1;
    lg.forEach(function(t){const lab=t[0],val=t[1],u=t[2],k=lab+'|'+u;
      if(par[k]===undefined){par[k]=0;ordre.push([lab,u,k]);}par[k]+=val;});});
  const lines=ordre.filter(function(o){return par[o[2]];}).map(function(o){return [o[0],(par[o[2]]>0?'+':'')+par[o[2]]+o[1]];});
  return{card:card,el:el,cases:cases,lines:lines};}
function pierceUI(slot,max){const w=cfgOf(slot);if(w.pn==null)w.pn=0;const n=w.pn;
  const fam=PIERCE_FAM(slot);
  const ELEM=Object.keys(PIERCECARD).filter(k=>PIERCECARD[k].fam===fam);
  const el=pierceElDe(w,slot);const cas=pierceCases(w,slot);   // une vieille sauvegarde se traduit
  if(el!==(w.pierceEl||''))w.pierceEl=el;
  if(cas.some((v,i)=>v!==(w.pierce[i]||null)))w.pierce=cas;
  const card=PIERCECARD[el];const elCol=card?card.col:'';
  const grades=pierceGrades(el);
  const lib=g=>fam==='def'?g+'%':g;
  const t=card?pierceTotals(w,slot):null;
  const totalHtml=card?((t&&t.lines.length)?t.lines.map(l=>`<b style="color:${elCol}">${esc(l[0])} ${l[1]}</b>`).join(' · '):'<span class="mini">aucune carte posée</span>')
                     :'<span class="mini">choisis une carte</span>';
  const ligne=g=>card.g[g].map(function(x){return esc(x[0])+' '+(x[1]>0?'+':'')+x[1]+x[2];}).join(' · ');
  const legend=card?`<div class="cardleg" style="border-color:${elCol}44"><div class="clh" style="color:${elCol}">${card.ic} Carte ${esc(el)}</div>${grades.map(g=>`<div><span class="cg cg${g}">${lib(g)}</span> ${ligne(g)}</div>`).join('')}</div>`:'';
  const entete=pierceCarte(ELEM[0],slot,grades[grades.length-1]||'');
  return `<div class="grp"><div class="gh"><img class="ghic" src="${entete}" alt=""> Perçage <span class="mini">(chaque niveau ouvre un emplacement)</span></div>
   <div class="mini" style="margin-bottom:3px">Carte / élément :</div>
   <div class="row" style="gap:4px;margin-bottom:5px">${ELEM.map(nm=>{const col=PIERCECARD[nm].col;const src=pierceCarte(nm,slot,pierceGrades(nm).slice(-1)[0]);return `<span class="tierbtn cardbtn ${el===nm?'on':''}" style="${el===nm?`border-color:${col};color:${col};background:${col}22`:`color:${col}`}" onclick="cset('${slot}','pierceEl','${nm}')"><img src="${src}" alt="">${nm}</span>`;}).join('')}<span class="tierbtn ${!el?'on':''}" onclick="cset('${slot}','pierceEl','')">—</span></div>
   ${legend}
   <div class="lvl"><span class="mini">Niveau de perçage : <b>${n}</b> / ${max}</span><input type="range" min="0" max="${max}" value="${n}" oninput="pnLive(this,'${slot}')" onchange="cpn('${slot}',+this.value,${max})"></div>
   <div class="row" style="gap:4px;margin-top:6px">${Array.from({length:n},(_,i)=>{const v=card&&card.g[cas[i]]?cas[i]:null;const fort=v===grades[grades.length-1];const cs=elCol&&v?`border-color:${elCol};color:${elCol}`+(fort?`;background:${elCol}33`:''):'';return `<div class="cslot ${v?'on':''}" style="${cs}" onclick="cpierce('${slot}',${i})">${v?lib(v):'+'}</div>`;}).join('')||'<span class="mini">Monte le niveau pour ouvrir des emplacements.</span>'}</div>
   <div class="mini" style="margin-top:5px">Total : ${totalHtml}${grades.length?' · clique une case → '+grades.map(lib).join(' → '):''}</div></div>`;}
function pnLive(el,slot){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function cpn(slot,v,max){keepScroll();const w=cfgOf(slot);w.pn=Math.max(0,Math.min(v,max));render();drawPick(curQ());restoreScroll();}
// Ordre des stats d'éveil par pièce (priorité iBeats en début de liste, le reste ensuite)
const EVORDER={ring1:['Intelligence','Dégâts critiques','Endurance','Force'],ring2:['Intelligence','Dégâts critiques','Endurance','Force'],earring1:['Intelligence','Dégâts critiques','Endurance','Force'],earring2:['Intelligence','Dégâts critiques','Endurance','Force'],necklace:['Intelligence','Dégâts critiques','Endurance','Force'],weapon:['Intelligence','Dégâts critiques','Endurance','Force'],weapon2:['Intelligence','Dégâts critiques','Endurance','Force'],shield:['Intelligence','Dégâts critiques','Endurance','Force'],cape:['Intelligence','Dégâts critiques','Endurance','Force'],masque:['Intelligence','Dégâts critiques','Endurance','Force'],fhead:['Intelligence','Dégâts critiques','Endurance','Force'],ftop:['Intelligence','Dégâts critiques','Endurance','Force'],fhand:['Intelligence','Dégâts critiques','Endurance','Force'],ffoot:['Intelligence','Dégâts critiques','Endurance','Force'],helmet:['Intelligence','Endurance','Force','Dextérité'],suit:['Intelligence','Dégâts critiques','Endurance','Force','MP max'],gauntlet:['Attaque','PV max','MP max'],boots:['Dégâts critiques','Attaque','PV max','MP max']};
function evStatsFor(slot){var pri=EVORDER[slot]||[];return pri.concat(EVSTATS.filter(function(s){return pri.indexOf(s)<0;}));}
function eveilUI(slot){const w=cfgOf(slot);
  return `<div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/R1.png" alt=""> Éveil (R1 ou R2)</div>
   <div class="row"><div class="seg2 seg-ev" style="max-width:186px"><div class="s2 ${w.evL==='R1'?'on':''}" onclick="cset('${slot}','evL','R1')"><img src="/airbuilder/icons/R1.png" alt="">R1</div><div class="s2 ${w.evL==='R2'?'on':''}" onclick="cset('${slot}','evL','R2')"><img src="/airbuilder/icons/R2.png" alt="">R2</div><div class="s2 ${!w.evL?'on':''}" onclick="cset('${slot}','evL','')">—</div></div>
   <select onchange="cset('${slot}','evS',this.value)"><option value="">— statistique —</option>${evStatsFor(slot).map(s=>`<option ${w.evS===s?'selected':''}>${s}</option>`).join('')}</select></div></div>`;}
function scrollUI(slot){const w=cfgOf(slot);
  return `<div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/statscroll.png" alt=""> Scroll stat</div><div class="row">
   <select onchange="cset('${slot}','scrS',this.value)"><option value="">— stat —</option>${['Force','Endurance','Dextérité','Intelligence'].map(s=>`<option ${w.scrS===s?'selected':''}>${s}</option>`).join('')}</select>
   <span class="mini">Niveau</span><select onchange="cset('${slot}','scrL',+this.value)">${[0,1,2,3,4].map(n=>`<option ${w.scrL===n?'selected':''}>+${n}</option>`).join('')}</select></div></div>`;}
// Icone de jeu par element. Un <select> ne sait pas afficher d'image : l'element
// se choisit donc sur une rangee de boutons, comme le percage juste au-dessus.
// Ne concerne QUE l'element de la piece, pas le percage (pierceEl).
const ELEMIC={'Feu':'FireSmall','Eau':'WaterSmall','Vent':'WindSmall','Terre':'EarthSmall','Électricité':'ElectricSmall'};
function elemUI(slot,max){const w=cfgOf(slot);
  return `<div class="grp"><div class="gh"><i class=vgi-flame></i> Élément</div>
   <div class="row" style="margin-bottom:5px">${ELEMENTS.map(el=>`<span class="elembtn ${w.elemType===el?'on':''}" title="${el}" onclick="cset('${slot}','elemType','${w.elemType===el?'':el}')"><img src="/airbuilder/icons/elements/${ELEMIC[el]}.webp" alt="" width="16" height="16"><span>${el}</span></span>`).join('')}<span class="elembtn ${!w.elemType?'on':''}" title="Aucun élément" onclick="cset('${slot}','elemType','')">Aucun</span></div>
   <div class="row"><div class="lvl"><span class="mini">Niveau : <b>+${w.elemLvl||0}</b>/+${max}</span><input type="range" min="0" max="${max}" value="${w.elemLvl||0}" oninput="elemLive(this,'${slot}')" onchange="cset('${slot}','elemLvl',+this.value)"></div></div></div>`;}

function panelFor(slot,e){
  if(slot==='weapon'||slot==='weapon2')return weaponPanel2(slot,e);
  if(slot==='shield')return shieldPanel(e);
  if(slot==='suit')return suitPanel(e);
  if(['helmet','gauntlet','boots'].includes(slot))return armorPanel(slot,e);
  if(slot==='cape')return capePanel(e);
  if(slot==='ramasseur')return ramasseurPanel(e);
  if(slot==='fairy')return fairyPanel(e);
  if(['fhead','ftop','fhand','ffoot'].includes(slot))return fashionPanel(slot,e);
  if(['ring1','ring2','earring1','earring2','necklace'].includes(slot))return jewelPanel(slot,e);
  if(slot==='mantra'||slot==='masque'){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh">${slot==='mantra'?'<i class=vgi-scroll></i> Mantra':'<i class=vgi-mask></i> Masque'} ${esc(e.item.cat||'')}${e.item.lvl?' '+e.item.lvl:''}</div><div class="cb" style="color:var(--green);font-size:12px">${b||'—'}</div></div>${slot==='masque'?eveilUI('masque'):''}</div>`;}
  return '';
}
function runeName(t){const m={'Éternel':'Rune Éternelle','Yggdrasil':'Rune Yggdrasil','Ancestral':'Rune Ancestrale','Lusaka':'Rune Lusaka'};return m[t]||'Rune';}
function weaponPanel2(slot,e){const _s=slot;return weaponPanelImpl(slot,e);}
function weaponPanel(e){return weaponPanelImpl('weapon',e);}
function weaponPanelImpl(SL,e){const w=cfgOf(SL);const artefactable=['Éternel','Yggdrasil'].includes(e.item.tier);const upMax=artefactable?20:10;const pMax=artefactable?12:10;if(!artefactable&&w.up>10)w.up=10;const art=artefactable&&w.up>10;
  return `<div class="wp">
   <div class="grp"><div class="gh">${runeImg(e.item.tier)} ${runeName(e.item.tier)}</div><div class="seg2" style="max-width:180px"><div class="s2 ${w.rune?'on':''}" onclick="cset('${SL}','rune',true)">Oui</div><div class="s2 ${!w.rune?'on':''}" onclick="cset('${SL}','rune',false)">Non</div></div></div>
   ${upUI(SL,upMax)}
   <div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/diamant.png" alt=""> Sertissage (5 diamants${art?' + 3 holographiques':''})</div>
     ${Array.from({length:5},(_,i)=>`<div class="dslot"><span class="mini" style="width:54px">Diamant ${i+1}</span><select onchange="cdia('${SL}','dia',${i},this.value)"><option value="">—</option>${DIASTATS.map(s=>`<option ${w.dia[i]===s?'selected':''}>${s}</option>`).join('')}</select></div>`).join('')}
     ${art?'<div class="mini" style="color:var(--purple);margin-top:5px">Diamants holographiques :</div>'+Array.from({length:3},(_,i)=>`<div class="dslot holo"><span class="mini" style="width:54px">Holo ${i+1}</span><select onchange="cdia('${SL}','holo',${i},this.value)"><option value="">—</option>${HOLOSTATS.map(d=>`<option value="${d[0]}" ${w.holo[i]===d[0]?'selected':''}>${d[0]} +${d[1]}</option>`).join('')}</select></div>`).join(''):'<div class="mini">Les 3 diamants holographiques se débloquent en Artefact (+11 à +20).</div>'}</div>
   ${pierceUI(SL,pMax)}
   <div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/artefact.png" alt=""> Rareté</div><div class="row">${MECH.arme.rarete_tiers.map(t=>{const rc=RARCOL[t]||'';return `<span class="tierbtn ${w.tier===t?'on':''}" style="${w.tier===t?`background:${rc};color:#0c0c11;border-color:${rc}`:`color:${rc};border-color:${rc}55`}" onclick="cset('${SL}','tier','${t}')">${t}</span>`;}).join('')}</div>
     ${artefactable?masteryUI(SL):''}
     ${w.tier==='Mythique'?'<div class="mini" style="color:var(--gold)">Mythique = arme niveau 100.</div>':''}
     <div style="margin-top:6px">${(w.rlines||[]).map((l,i)=>`<div class="line"><select onchange="crl(${i},this.value)"><option value="">— ligne de bonus —</option>${MECH.arme.rarete_pool.map(b=>`<option ${l===b.stat?'selected':''}>${b.stat}</option>`).join('')}</select><span class="pill" onclick="crlDel(${i})"><i class=vgi-x></i></span></div>`).join('')}</div>
     ${(w.rlines||[]).length<4?'<span class="pill" onclick="crlAdd()">+ ligne (max 4)</span>':''}<div class="mini">% variable selon la stat.</div></div>
   ${eveilUI(SL)}
   ${scrollUI(SL)}
   ${elemUI(SL,20)}
   </div>`;}
function shieldPanel(e){return `<div class="wp">${upUI('shield',10)}${pierceUI('shield',10)}${eveilUI('shield')}${elemUI('shield',20)}</div>`;}
function suitPanel(e){return `<div class="wp">${upUI('suit',10)}${pierceUI('suit',4)}${eveilUI('suit')}${scrollUI('suit')}${elemUI('suit',20)}</div>`;}
function armorPanel(slot,e){return `<div class="wp">${upUI(slot,10)}${eveilUI(slot)}${scrollUI(slot)}<div class="mini">Cette pièce n'a ni perçage ni élément.</div></div>`;}
function jewelPanel(slot,e){const w=cfgOf(slot);
  return `<div class="wp"><div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/upgrade.png" alt=""> Upgrade</div><div class="lvl"><span class="mini">Niveau : <b>+${w.up||0}</b> / +30</span><input type="range" min="0" max="30" value="${w.up||0}" oninput="upLive(this,'${slot}',30)" onchange="cset('${slot}','up',+this.value)"></div><div class="mini">+20 (aProtect) · jusqu'à +30 (aProtect lunaire = stats plus fortes)</div></div>${eveilUI(slot)}</div>`;}

function capePanel(e){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh"><i class=vgi-cape></i> ${esc(e.item.n)}</div><div class="cb" style="color:var(--green);font-size:12px">${b||'—'}</div></div>${runeUI('cape')}${eveilUI('cape')}</div>`;}
function ramasseurPanel(e){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh"><i class=vgi-paw></i> ${esc(e.item.n)}</div><div class="cb" style="color:var(--green);font-size:12px">${b||'—'}</div></div>${runeUI('ramasseur')}</div>`;}
function fairyPanel(e){const w=cfgOf('fairy');return `<div class="wp"><div class="grp"><div class="gh"><i class=vgi-fairy></i> ${esc(e.item.n)}</div>
   <div class="lvl"><span class="mini">Niveau de la fée : <b>${w.lvl||0}</b> / ${FAIRYMAX}</span><input type="range" min="0" max="${FAIRYMAX}" value="${w.lvl||0}" oninput="flvLive(this)" onchange="cset('fairy','lvl',+this.value)"></div>
   <div class="mini">Le bonus dépend du niveau (voir wiki).</div></div></div>`;}
function flvLive(el){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function fashionPanel(slot,e){const w=cfgOf(slot);const setb=(e.item.setb||[]).map(b=>esc(b[0])+' +'+b[1]).join(' · ');
  return `<div class="wp">
   <div class="grp"><div class="gh"><i class=vgi-sparkles></i> ${esc(e.item.set||'Fashion')} <span class="mini">(${esc(e.item.cat||'')})</span></div><div class="cb" style="color:var(--green);font-size:12px">Bonus du set : ${setb||'—'}</div></div>
   <div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/upgrade.png" alt=""> Upgrade</div><div class="lvl"><span class="mini">Niveau : <b>+${w.up||0}</b> / +10</span><input type="range" min="0" max="10" value="${w.up||0}" oninput="upLive(this,'${slot}',10)" onchange="cset('${slot}','up',+this.value)"></div></div>
   ${runeUI(slot)}
   <div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/diamant.png" alt=""> Gemmes costume (4)</div>
     ${Array.from({length:4},(_,i)=>`<div class="dslot"><span class="mini" style="width:54px">Gemme ${i+1}</span><select onchange="cdia('${slot}','gems',${i},this.value)"><option value="">—</option>${[...new Set(GEMC.map(g=>g.fr))].map(fr=>`<option value="${fr}" ${w.gems[i]===fr?'selected':''}>${fr}</option>`).join('')}</select></div>`).join('')}</div>
   </div>`;}
function runeUI(slot){const w=cfgOf(slot);return `<div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/rune-force.png" alt=""> Rune (bonus)</div>${seg2stat(slot,'rune',['Force','Endurance','Dextérité','Intelligence'])}</div>`;}
const STATCOL={Force:'#F87171',Endurance:'#4ADE80','Dextérité':'#FFD24A',Intelligence:'#4EA8FF'};
function statS2(o,on,onclk){const c=STATCOL[o];const st=c?(on?`background:${c};color:#0a0a0c;border-color:${c};font-weight:700`:`color:${c};border-color:${c}66`):'';return `<div class="s2 ${(!c&&on)?'on':''}" style="${st}" onclick="${onclk}">${o}</div>`;}
function seg2stat(slot,key,opts){const w=cfgOf(slot);return `<div class="seg2" style="flex-wrap:wrap;max-width:340px">${opts.map(o=>statS2(o,w[key]===o,`cset('${slot}','${key}','${o}')`)).join('')}<div class="s2 ${!w[key]?'on':''}" onclick="cset('${slot}','${key}','')">—</div></div>`;}
function upLive(el,slot,max){const lbl=el.parentNode.querySelector('.mini b');if(lbl)lbl.textContent='+'+el.value;}
function masteryUI(slot){const w=cfgOf(slot);const v=w.mastery||0;
  return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><div class="gh" style="font-size:12px;margin-bottom:4px"><i class=vgi-target></i> Maîtrise de l'arme <span class="mini">(0 à 100)</span></div>
   <div class="lvl"><span class="mini">Niveau : <b>${v}</b> / 100</span>
   <input type="range" min="0" max="100" value="${v}" oninput="masteryLive(this)" onchange="cset('${slot}','mastery',+this.value)">
   <input type="number" min="0" max="100" value="${v}" style="width:52px;margin-left:6px" onchange="cset('${slot}','mastery',Math.max(0,Math.min(100,parseInt(this.value)||0)))"></div></div>`;}
function masteryLive(el){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function elemLive(el,slot){const lbl=el.parentNode.querySelector('.mini b');if(lbl)lbl.textContent='+'+el.value;}
function cset(slot,key,val){keepScroll();const w=cfgOf(slot);if(!w)return;if(key==='up'&&slot==='weapon'){w.up=val;E('weapon').artefact=val>10;if(val<=10)w.holo=['','',''];}else w[key]=val;render();drawPick(curQ());restoreScroll();}
function cdia(slot,arr,i,v){keepScroll();const w=cfgOf(slot);w[arr][i]=v;render();restoreScroll();}
function cpierce(slot,i){keepScroll();const w=cfgOf(slot);const g=pierceGrades(pierceElDe(w,slot));
  const k=g.indexOf(w.pierce[i]);w.pierce[i]=(k<0)?(g[0]||null):(k+1<g.length?g[k+1]:null);
  render();drawPick(curQ());restoreScroll();}
function crlAdd(){keepScroll();const w=cfgOf('weapon');w.rlines=w.rlines||[];if(w.rlines.length<4){w.rlines.push('');drawPick(curQ());restoreScroll();}}
function crlDel(i){keepScroll();const w=cfgOf('weapon');w.rlines.splice(i,1);render();drawPick(curQ());restoreScroll();}
function crl(i,v){const w=cfgOf('weapon');w.rlines[i]=v;render();}
function curQ(){const s=document.querySelector('.srch');return s?s.value:'';}

/* ─── Personnages : une seule liste pour tout le site ────────────────────
   Le builder gardait ses persos dans son propre etat, la candidature et la
   page « Mes personnages » lisaient /api/characters : deux listes qui ne se
   parlaient pas. On les relie ici, dans les deux sens.                    */

/* Libelle affiche -> valeur de l'enum Prisma (majuscules, sans accent). */
function vgClsEnum(x){return String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();}
/* Valeur de l'enum -> libelle affiche (celui de CLASSES, accents compris). */
function vgClsLibelle(v){var t=vgClsEnum(v);for(var i=0;i<CLASSES.length;i++){if(vgClsEnum(CLASSES[i])===t)return CLASSES[i];}return CLASSES[0];}

/* Envoie au compte un perso cree dans le builder. Silencieux : en mode
   lecture seule / iframe / hors connexion, il n'y a rien a synchroniser. */
function vgPousserPersoCompte(c){
  if(window.__VIEW||window.__embed||!c||!c.name)return;
  try{
    fetch('/api/characters',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:c.name,class:vgClsEnum(c.cls),level:c.lvl||200,prestige:c.prestige||0,sex:c.sex==='F'?'F':'G',
        isMain:state.chars.length===1})}).catch(function(){});
  }catch(e){}
}

/* Etat vierge : un seul perso, nom par defaut, aucun equipement pose.
   C'est le seul cas ou on s'autorise a remplacer la liste locale. */
function vgEtatVierge(){
  if(!state.chars||state.chars.length!==1)return false;
  var c=state.chars[0];
  if(!/^Perso\s*1$/i.test(String(c.name||'')))return false;
  return !(c.stuffs||[]).some(function(s){return s.eq&&Object.keys(s.eq).length;});
}

/* Premier lancement : on reprend les persos du compte, et s'il n'y en a
   aucun on ouvre directement la creation — meme point de depart que la
   candidature (tes personnages, ou creation si aucun). */
function vgPremierPerso(){
  if(window.__VIEW||window.__embed||window.__refSave)return;
  if(!vgEtatVierge())return;
  fetch('/api/characters').then(function(r){return r.ok?r.json():[];}).then(function(list){
    if(!vgEtatVierge())return;                      /* l'utilisateur a agi entre-temps */
    if(Array.isArray(list)&&list.length){
      state.chars=list.map(function(p){
        var c=newChar(p.name);
        c.cls=vgClsLibelle(p.class);
        c.sex=p.sex==='F'?'F':'G';
        c.lvl=p.level||200;
        c.prestige=typeof p.prestige==='number'?p.prestige:3;
        return c;
      });
      state.cur=0;render();
      agToast(list.length+' personnage'+(list.length>1?'s':'')+' repris de ton compte.',true);
    }else{
      charForm();                                   /* aucun perso : on le cree d'abord */
    }
  }).catch(function(){});
}

/* Une adresse peut designer un perso et un stuff precis, et demander l'ouverture
   directe de « Acheter un objet ». C'est ainsi que « Mes personnages » et la
   boutique renvoient ici. Le moteur n'avait jamais lu l'URL : ces liens
   existaient depuis le debut et ne faisaient rien.
   La comparaison se fait sans accent ni casse — le nom vient d'un formulaire. */
function vgOuvrirDepuisURL(){
  if(window.__vgURLFaite)return;
  try{
    var p=new URLSearchParams(location.search);
    var nom=p.get('perso'),st=p.get('stuff'),ach=p.get('acheter');
    if(!nom&&!st&&!ach)return;
    var norm=function(x){return String(x==null?'':x).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
    var bouge=false;
    if(nom){var i=state.chars.findIndex(function(c){return norm(c.name)===norm(nom);});
      if(i>=0&&i!==state.cur){state.cur=i;bouge=true;}}
    if(st){ST();var c=C();var j=(c.stuffs||[]).findIndex(function(x){return norm(x.name)===norm(st);});
      if(j>=0&&j!==c.curStuff){c.curStuff=j;bouge=true;}}
    if(bouge){render();save();}
    /* On n'ouvre « Acheter un objet » que s'il y a quelque chose a acheter :
       sur un stuff vide, la fenetre s'ouvrirait sur une liste vide. */
    if(ach==='1'&&Object.keys(ST().eq||{}).some(function(k){var e=ST().eq[k];return e&&e.item;}))vgAcheterPiece();
    window.__vgURLFaite=1;
  }catch(e){}
}
window.vgOuvrirDepuisURL=vgOuvrirDepuisURL;

render();
vgPremierPerso();
vgOuvrirDepuisURL();
window.addEventListener('beforeunload',function(){try{save();}catch(e){}});
;
window.__APP='airbuilder';
// Auto-réparation : si le conteneur AirBuilder est recréé vide (re-clic sur le lien nav / navigation vers la même route), on relance render() automatiquement.
(function(){try{var _heal=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var ns=muts[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(n.nodeType!==1)continue;var s=(n.id==='setup')?n:(n.querySelector?n.querySelector('#setup'):null);if(s&&!s.innerHTML.trim()){try{render();}catch(e){}return;}}}});_heal.observe(document.body,{childList:true,subtree:true});}catch(e){}})();