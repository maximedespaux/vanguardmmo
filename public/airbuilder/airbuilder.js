const DB=JSON.parse(document.getElementById('DATA').textContent);
const {ITEMS,CARNETS,GEMU,GEMC,IC,FAM,RANKS,LVLMAX,TYPES,MAXB,SLOTIC,MECH,ELEMENTS,DIASTATS,HOLOSTATS,EVSTATS,FAIRYMAX}=DB;
const esc=s=>(s||'').toString().replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const imgT=(f,s)=>f&&IC[f]?`<img src="${IC[f]}" width="${s}" height="${s}">`:'';
const CLASSES=['Templier','Spadassin','Arcaniste','Envouteur','Arbaletrier','Sylphide','Primat','Chanoine'];
const CKEY={Templier:'templier',Spadassin:'spada',Arcaniste:'arcaniste',Envouteur:'envouteur',Arbaletrier:'arbaletrier',Sylphide:'sylphide',Primat:'primat',Chanoine:'chanoine'};
const SIL={Templier:'🛡️',Spadassin:'⚔️',Arcaniste:'🔮',Envouteur:'🌀',Arbaletrier:'🏹',Sylphide:'🎯',Primat:'✨',Chanoine:'👊'};
const CHARIMG={"Arcaniste|G":"/airbuilder/icons/emb_024.png","Arcaniste|F":"/airbuilder/icons/emb_025.png","Spadassin|G":"/airbuilder/icons/emb_026.png","Spadassin|F":"/airbuilder/icons/emb_027.png","Templier|G":"/airbuilder/icons/emb_028.png","Templier|F":"/airbuilder/icons/emb_029.png","Envouteur|G":"/airbuilder/icons/emb_030.png","Envouteur|F":"/airbuilder/icons/emb_031.png","Arbaletrier|G":"/airbuilder/icons/emb_032.png","Arbaletrier|F":"/airbuilder/icons/emb_033.png","Sylphide|G":"/airbuilder/icons/emb_034.png","Sylphide|F":"/airbuilder/icons/emb_035.png","Primat|G":"/airbuilder/icons/emb_036.png","Primat|F":"/airbuilder/icons/emb_037.png","Chanoine|G":"/airbuilder/icons/emb_038.png","Chanoine|F":"/airbuilder/icons/emb_039.png"};

// slots config (mirrors WndQueryEquipdark)
const SLOTS={
 weapon:{lbl:'Arme',ico:'⚔️'}, weapon2:{lbl:'Arme 2',ico:'⚔️',pool:'weapon'}, shield:{lbl:'Bouclier',ico:'🛡️'}, mantra:{lbl:'Mantra',ico:'📜'}, cape:{lbl:'Cape',ico:'🧥'}, masque:{lbl:'Masque',ico:'🎭'},
 helmet:{lbl:'Casque',ico:'🪖'}, suit:{lbl:'Tenue',ico:'👕'}, gauntlet:{lbl:'Gants',ico:'🧤'}, boots:{lbl:'Bottes',ico:'🥾'},
 fhead:{lbl:'Tête (fashion)',ico:'🎩',pool:'fashion'}, ftop:{lbl:'Haut (fashion)',ico:'👘',pool:'fashion'}, fhand:{lbl:'Gants (fashion)',ico:'🧤',pool:'fashion'}, ffoot:{lbl:'Bottes (fashion)',ico:'👢',pool:'fashion'},
 ramasseur:{lbl:'Ramasseur',ico:'🐾'}, familier:{lbl:'Familier',ico:'🦊'}, fairy:{lbl:'Fée',ico:'🧚'},
 necklace:{lbl:'Collier',ico:'📿'}, ring1:{lbl:'Anneau 1',ico:'💍',pool:'ring'}, ring2:{lbl:'Anneau 2',ico:'💍',pool:'ring'}, earring1:{lbl:'Boucle 1',ico:'👂',pool:'earring'}, earring2:{lbl:'Boucle 2',ico:'👂',pool:'earring'}};
const LAYOUT={top:['ring1','earring1','necklace','earring2','ring2'],right:['helmet','suit','gauntlet','boots'],bottom:['fhead','ftop','fhand','ffoot'],pets:['ramasseur','familier','fairy']};
function leftCol(){const cls=C().cls;let second='shield';if(cls==='Arbaletrier'||cls==='Sylphide')second=null;else if(cls==='Spadassin')second='weapon2';return ['weapon',second,'mantra','cape','masque'].filter(Boolean);}
const ARMOR=['helmet','suit','gauntlet','boots'];
function pool(s){if(s==='weapon2')return 'weapon';if(SLOTS[s]&&SLOTS[s].pool)return SLOTS[s].pool;if(s==='mantra')return 'mantra';if(s==='masque')return 'masque';if(s==='ramasseur')return 'ramasseur';return s.replace(/[0-9]/g,'');}

function newStuff(n){return {name:n||'Stuff',eq:{}};}
function newChar(n){return {name:n||'Perso '+(state.chars.length+1),cls:'Arcaniste',sex:'G',lvl:200,prestige:3,carnets:[],carnetsFull:[],stuffs:[newStuff('DPS'),newStuff('Tank'),newStuff('Hybride')],curStuff:0};}
const state={chars:[],cur:0};
(function(){try{const s=JSON.parse(localStorage.getItem('vg_air_e1')||'null');if(s&&s.chars&&s.chars.length)Object.assign(state,s);}catch(e){}if(!state.chars.length)state.chars=[newChar('Daiisuke')];})();
const C=()=>state.chars[state.cur];
function ST(){const c=C();
  if(!c.stuffs){c.carnets=c.carnets||[];c.carnetsFull=c.carnetsFull||[];c.stuffs=[{name:'DPS',eq:c.eq||{}},newStuff('Tank'),newStuff('Hybride')];c.curStuff=0;delete c.eq;}
  // migration: si d'anciens carnets sont stockés dans un stuff, les remonter au personnage
  if(c.carnets==null){c.carnets=[];c.carnetsFull=[];}
  c.stuffs.forEach(s=>{if(s.carnets&&s.carnets.length){s.carnets.forEach(x=>{if(!c.carnets.includes(x))c.carnets.push(x);});}if(s.carnetsFull&&s.carnetsFull.length){s.carnetsFull.forEach(x=>{if(!c.carnetsFull.includes(x))c.carnetsFull.push(x);});}delete s.carnets;delete s.carnetsFull;});
  if(c.curStuff==null||c.curStuff>=c.stuffs.length)c.curStuff=0;return c.stuffs[c.curStuff];}
const E=s=>ST().eq[s];
function save(){try{localStorage.setItem('vg_air_e1',JSON.stringify(state));}catch(e){}}
function listFor(slot){const c=C();const ck=CKEY[c.cls];
  if(['fhead','ftop','fhand','ffoot'].includes(slot)){return (ITEMS.fashion||[]).filter(it=>it.piece===slot&&(!it.sex||it.sex===c.sex));}
  if(slot==='mantra')return ITEMS.mantra||[];
  if(slot==='masque')return ITEMS.masque||[];
  if(slot==='ramasseur')return ITEMS.ramasseur||[];
  const arr=ITEMS[pool(slot)]||[];
  return arr.filter(it=>{if(it.classes&&it.classes.length){if(!it.classes.includes(ck))return false;}else if(it.cls&&it.cls!==ck)return false;if(it.sex&&c.sex&&it.sex!==c.sex)return false;return true;});}

function slotHTML(slot){const e=E(slot),cfg=SLOTS[slot]||{lbl:slot};const small=LAYOUT.top.includes(slot)||LAYOUT.bottom.includes(slot);
  let empty=SLOTIC[slot]?`<img class="phimg" src="${SLOTIC[slot]}" width="${small?30:38}" height="${small?30:38}">`:`<span class="ico">${cfg.ico}</span>`;
  let inner=e?(e.item.ic&&IC[e.item.ic]?imgT(e.item.ic,small?34:42):empty):empty;
  let badge='';const cf=e&&e.cfg;
  const up=cf&&cf.up; if(e&&(up||(cf&&cf.evL)))badge=`<span class="pl ${cf&&cf.up>10?'art':''}">+${up||0}</span>`;
  let rk='';
  if(slot==='familier'&&e&&e.rank)rk=`<span class="rk">${e.rank}</span>`;
  else if(slot==='fairy'&&cf&&cf.lvl)rk=`<span class="rk">${cf.lvl}</span>`;
  else if(cf&&cf.rune)rk=`<span class="rk" style="background:var(--green)" title="Rune ${cf.rune}">R</span>`;
  else if((slot==='mantra'||slot==='masque')&&e&&e.item.cat)rk=`<span class="rk" style="background:var(--blue);color:#001">${e.item.cat[0]}</span>`;
  return `<div class="slot ${small?'small':''}" onclick="openPick('${slot}')" onmouseenter="itipSlot(event,'${slot}')" onmousemove="itipMove(event)" onmouseleave="itipHide()" title="${esc(cfg.lbl)}">${badge}${rk}${inner}<span class="lbl">${esc(cfg.lbl)}</span></div>`;}

function render(){
  document.getElementById('ptabs').innerHTML=state.chars.map((c,i)=>`<div class="ptab ${i===state.cur?'on':''}" onclick="switchChar(${i})">${IC['class_'+c.cls.toLowerCase()]?`<img src="${IC['class_'+c.cls.toLowerCase()]}">`:(SIL[c.cls]||'🧍')} ${esc(c.name)} ${state.chars.length>1?`<span class="x" onclick="event.stopPropagation();delChar(${i})">✕</span>`:''}</div>`).join('')+`<div class="addp" onclick="addChar()">+ Perso</div>`;
  const c=C();
  document.getElementById('setup').innerHTML=`
   <div class="f"><label>Nom</label><input value="${esc(c.name)}" style="width:130px" onchange="C().name=this.value;render()"></div>
   <div class="f"><label>Classe</label><div class="clssel">${CLASSES.map(x=>`<div class="ci ${x===c.cls?'on':''}" title="${x}" onclick="setCls('${x}')">${IC['class_'+x.toLowerCase()]?`<img src="${IC['class_'+x.toLowerCase()]}">`:x[0]}</div>`).join('')}</div></div>
   <div class="f"><label>Sexe</label><select onchange="C().sex=this.value;render()">${['G','F'].map(s=>`<option ${s===c.sex?'selected':''}>${s}</option>`).join('')}</select></div>
   <div class="f"><label>Niveau</label><span style="display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg3)"><button type="button" onclick="setLvl(C().lvl-1)" style="width:26px;height:32px;border:none;background:var(--bg2);color:var(--mut);cursor:pointer;font-size:15px">−</button><input type="text" inputmode="numeric" value="${c.lvl}" onchange="setLvl(this.value)" style="width:48px;height:32px;border:none;background:transparent;color:var(--text);text-align:center;font-size:14px;outline:none"><button type="button" onclick="setLvl(C().lvl+1)" style="width:26px;height:32px;border:none;background:var(--bg2);color:var(--mut);cursor:pointer;font-size:15px">＋</button></span></div>
   <div class="f"><label>Prestige</label><select onchange="C().prestige=+this.value;render()">${[1,2,3,4,5,6,7,8,9,10].map(p=>`<option ${p===c.prestige?'selected':''}>${p}</option>`).join('')}</select></div>`;
  document.getElementById('stuffbar').innerHTML='<span class="slabel">Stuffs :</span>'+(C().stuffs||[]).map((s,i)=>`<div class="stab ${i===C().curStuff?'on':''}" onclick="switchStuff(${i})">${esc(s.name)}${(C().stuffs.length>1)?` <span class="x" onclick="event.stopPropagation();delStuff(${i})">✕</span>`:''}</div>`).join('')+'<div class="saddp" onclick="addStuff()">+ Stuff</div>';
  document.getElementById('rowT').innerHTML=LAYOUT.top.map(slotHTML).join('');
  document.getElementById('colL').innerHTML=leftCol().map(slotHTML).join('');
  document.getElementById('colR').innerHTML=LAYOUT.right.map(slotHTML).join('');
  document.getElementById('rowB').innerHTML=LAYOUT.bottom.map(slotHTML).join('');
  document.getElementById('petbar').innerHTML=LAYOUT.pets.map(slotHTML).join('');
  const _ci=CHARIMG[c.cls+'|'+c.sex]||CHARIMG[c.cls+'|G']||'';const _im=document.getElementById('charimg');if(_im){_im.src=_ci;_im.style.display=_ci?'block':'none';}
  document.getElementById('cn').textContent=c.name;document.getElementById('cc').textContent=`${c.cls} · Niv ${c.lvl} · P${c.prestige}`;
  renderFamNote();renderCarnets();save();
}
function renderFamNote(){const e=E('familier');const n=document.getElementById('famnote');
  if(!e){n.style.display='none';return;}
  const type=guessType(e.item.n);const stat=TYPES[type]||'—';const rank=e.rank||'D';const max=MAXB[stat]||0;
  // bonus simplifié = max * (lvlmax(rank)/9) arrondi
  const ratio=(LVLMAX[rank]||1)/9;const bonus=Math.round(max*ratio);
  n.style.display='block';
  n.innerHTML=`🦊 <b>${esc(e.item.n)}</b> — rang <b style="color:var(--gold)">${rank}</b> (niveau max ${LVLMAX[rank]}). Type ${esc(type)} → <b style="color:var(--green)">${esc(stat)} +${bonus}</b>. Rune : <b>${e.rune?'Oui':'Non'}</b>.`;}
function guessType(name){const n=(name||'').toLowerCase();
  if(n.includes('tigre'))return 'Tigre blanc';if(n.includes('lion'))return 'Lion';if(n.includes('lapin'))return 'Lapin';
  if(n.includes('renard'))return 'Renard à neuf queues';if(n.includes('dragon'))return 'Dragon';if(n.includes('licorne'))return 'Licorne';return 'Licorne';}

function renderCarnets(){const c=C();ST();
  document.getElementById('carnetsPanel').innerHTML=`<h3>📖 Carnets des Arcanes — ${esc(c.name)} <span style="color:var(--mut);font-weight:400;font-size:11px;text-transform:none">(liés au personnage · partagés entre tous ses stuffs · ★ complet = toutes les pages · ☆ base = 1 carte de chaque · Étui gris/bleu/rouge = Commun/Rare/Épique-Lég.)</span></h3>
   <div class="carnets">${CARNETS.map((cn,i)=>{const on=(c.carnets||[]).includes(i);const full=(c.carnetsFull||[]).includes(i);const bonus=full?cn.complet:cn.base;
     return `<div class="carn ${on?'on':''}" style="${on?'border-color:'+cn.col:''}">
         <div class="cn" onclick="toggleCarnet(${i})"><span class="dot" style="background:${cn.col}" title="Étui ${esc(cn.etui_couleur)}"></span>${esc(cn.nom)}</div>
         <div style="font-size:9px;color:var(--mut);margin-bottom:4px">Étui ${esc(cn.etui_couleur)} · ${esc(cn.rarete)} · ${cn.tier===1?'1 carte de chaque (set complet)':cn.copies+' carte(s) de chaque'}</div>
         <div class="cc-cards">${cn.cartes.map(ca=>`<span class="cc-card r-${(ca.rarete||'').toLowerCase()}">${esc(ca.nom)}</span>`).join('')}</div>
         ${on&&cn.tier>1?`<div class="seg"><div class="sg ${!full?'on':''}" onclick="setMode(${i},false)">☆ Base</div><div class="sg ${full?'on':''}" onclick="setMode(${i},true)">★ Complet</div></div>`:''}
         <div class="cb">${bonus.map(b=>esc(b[0])+' +'+b[1]).join(' · ')}</div></div>`;}).join('')}</div>`;}
function totals(){const c=C();const acc={};const add=(k,v)=>{if(v)acc[k]=(acc[k]||0)+v;};
  const st=ST();for(const s in st.eq){const e=st.eq[s];if(!e||s==='familier')continue;(e.item.b||[]).forEach(b=>add(b[0],b[1]));if(s==='weapon'){weaponTotals(add,e);}}
  const _c=C();(_c.carnets||[]).forEach(ci=>{const cn=CARNETS[ci];if(!cn)return;((_c.carnetsFull||[]).includes(ci)?cn.complet:cn.base).forEach(b=>add(b[0],b[1]));});
  return acc;}
function renderStats(){const t=Object.entries(totals()).sort((a,b)=>b[1]-a[1]);
  document.getElementById('stats').innerHTML='<h3>📊 Statistiques (objets + carnets — mécaniques détaillées en étape 2)</h3>'+
   (t.length?t.map(([k,v])=>`<div class="l"><span>${esc(k)}</span><b>+${(+v).toLocaleString('fr-FR')}</b></div>`).join(''):'<div style="color:var(--mut);font-size:12px">Équipe des pièces…</div>');}

window.C=C;
function switchChar(i){state.cur=i;render();}
function switchStuff(i){C().curStuff=i;render();}
function setLvl(v){C().lvl=Math.min(200,Math.max(1,Math.round(+v||1)));save();render();}
function addStuff(){const dn='Stuff '+((C().stuffs||[]).length+1);const n=prompt('Nom du nouveau stuff ?',dn);if(n===null)return;C().stuffs.push(newStuff(n.trim()||dn));C().curStuff=C().stuffs.length-1;render();}
function agConfirm(msg,onYes){window.__agYes=onYes;document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:430px;padding:22px"><div style="font-size:14px;line-height:1.55;margin-bottom:20px;white-space:pre-line">'+esc(msg)+'</div><div style="display:flex;gap:10px;justify-content:flex-end"><span class="pill" onclick="agClose(0)">Annuler</span><span class="pill" style="background:var(--orange,#ff8c1a);color:#0A0A0C;font-weight:700" onclick="agClose(1)">Confirmer</span></div></div></div>';}
function agClose(go){var f=window.__agYes;window.__agYes=null;document.getElementById('modalRoot').innerHTML='';if(go&&f)f();}
function delStuff(i){if(C().stuffs.length<=1)return;agConfirm('Supprimer ce stuff ?',function(){C().stuffs.splice(i,1);if(C().curStuff>=C().stuffs.length)C().curStuff=C().stuffs.length-1;render();});}
function addChar(){state.chars.push(newChar());state.cur=state.chars.length-1;render();}
function delChar(i){if(state.chars.length<=1)return;agConfirm('Supprimer ce personnage ?',function(){state.chars.splice(i,1);state.cur=0;render();});}
function setCls(v){if(C().cls===v)return;const hasGear=(C().stuffs||[]).some(s=>s.eq&&Object.keys(s.eq).length);const apply=function(){C().cls=v;(C().stuffs||[]).forEach(s=>s.eq={});render();};if(hasGear)agConfirm('⚠️ Changer de classe va vider tout l\'équipement de ce personnage (sur tous ses stuffs).\n\nCette action est irréversible. Continuer ?',apply);else apply();}
function toggleCarnet(i){const c=C();c.carnets=c.carnets||[];c.carnetsFull=c.carnetsFull||[];const k=c.carnets.indexOf(i);if(k>=0){c.carnets.splice(k,1);const f=c.carnetsFull.indexOf(i);if(f>=0)c.carnetsFull.splice(f,1);}else c.carnets.push(i);render();}
function toggleFull(i){const c=C();c.carnetsFull=c.carnetsFull||[];const k=c.carnetsFull.indexOf(i);if(k>=0)c.carnetsFull.splice(k,1);else c.carnetsFull.push(i);render();}
function setMode(i,full){const c=C();c.carnetsFull=c.carnetsFull||[];const k=c.carnetsFull.indexOf(i);if(full&&k<0)c.carnetsFull.push(i);if(!full&&k>=0)c.carnetsFull.splice(k,1);render();}
function resetChar(){agConfirm('Vider l\'équipement de ce stuff ? (les carnets du personnage sont conservés)',function(){const s=ST();s.eq={};render();});}

let pickSlot=null;
function openPick(s){pickSlot=s;drawPick('');}
function closePick(){document.getElementById('modalRoot').innerHTML='';pickSlot=null;itipHide();}
let _itipEl=null;
function _itip(){if(!_itipEl){_itipEl=document.createElement('div');_itipEl.className='itip';document.body.appendChild(_itipEl);}return _itipEl;}
function clsLabel(it){if(it.classes&&it.classes.length)return it.classes.map(c=>Object.keys(CKEY).find(k=>CKEY[k]===c)||c).join(', ');if(it.cls)return Object.keys(CKEY).find(k=>CKEY[k]===it.cls)||it.cls;return 'Toutes classes';}
function itipBuild(it,cfg,slot,e){const col=it.col||'#cfd2dc';const icon=(it.ic&&IC[it.ic])?`<img src="${IC[it.ic]}">`:'';
  const isW=(slot==='weapon'||slot==='weapon2');
  const up=(cfg&&cfg.up)?` <span style="color:var(--gold)">+${cfg.up}</span>`:'';
  const stars=(isW&&cfg&&cfg.stars)?` <span style="color:var(--gold)">${'★'.repeat(cfg.stars)}</span>`:'';
  let h=`<div class="t" style="color:${col}">${icon}<span>${esc(it.n)}${it.sex?' ('+it.sex+')':''}${up}${stars}</span></div>`;
  const tags=[];
  if(isW&&cfg&&cfg.tier&&cfg.tier!=='Commun')tags.push(`<span class="tag" style="background:#ffffff10;color:var(--gold);border:1px solid #ffffff2a">${esc(cfg.tier)}</span>`);
  if(tags.length)h+=`<div style="margin:-1px 0 4px;display:flex;gap:4px;flex-wrap:wrap">${tags.join('')}</div>`;
  if(it.atk)h+=`<div class="meta"><span>Attaque</span><b>${it.atk[0]} ~ ${it.atk[1]}</b></div>`;
  const setb=it.setb&&it.setb.length,bonus=setb?it.setb:(it.b||[]);
  const configured=!!(cfg||(slot==='familier'&&e));
  if(bonus.length&&!configured){h+=`<div class="sec">${setb?'Bonus de set':'Bonus'}</div>`+bonus.map(b=>`<div class="bl"><span>${esc(b[0])}</span><span>+${b[1]}</span></div>`).join('');}
  // --- Schéma de configuration (pièce équipée) ---
  if(configured){let cf='';const chips=[];
    if(isW&&cfg)chips.push(`<span class="chip" style="${cfg.rune?'color:var(--green);border-color:#4ADE8055':'color:var(--mut)'}">${cfg.rune?'🟢':'⚪'} ${esc(runeName(it.tier))}</span>`);
    else if(cfg&&typeof cfg.rune==='string'&&cfg.rune)chips.push(`<span class="chip" style="color:var(--green);border-color:#4ADE8055">🟢 ${esc(cfg.rune)}</span>`);
    if(isW&&cfg&&cfg.mastery)chips.push(`<span class="chip" style="color:var(--gold);border-color:#FFD24A55">🎯 ${cfg.mastery}/100</span>`);
    if(slot==='familier'&&e){chips.push(`<span class="chip" style="color:var(--gold);border-color:#FFD24A55">🏅 Rang ${e.rank||'D'}</span>`);if(typeof e.rune==='string'&&e.rune)chips.push(`<span class="chip" style="color:var(--green);border-color:#4ADE8055">🟢 ${esc(e.rune)}</span>`);}
    if(chips.length)cf+=`<div class="chips">${chips.join('')}</div>`;
    if(cfg&&cfg.dia){const gems=cfg.dia.map(d=>`<span class="gem ${d?'f':'e'}"></span>`).join('');const holos=(cfg.holo||[]).map(d=>`<span class="gem ${d?'h':'e'}"></span>`).join('');cf+=`<div class="crow"><span class="lab">Sertissage</span><div class="gems">${gems}${holos?'<span class="sep"></span>'+holos:''}</div></div>`;}
    if(cfg&&cfg.gems){const gems=cfg.gems.map(d=>`<span class="gem ${d?'f':'e'}"></span>`).join('');cf+=`<div class="crow"><span class="lab">Gemmes</span><div class="gems">${gems}</div></div>`;}
    if(cfg&&cfg.pierce){const SC={Fulgur:'#FFD24A',Volcano:'#F87171','Océane':'#4EA8FF'};const pcard=PIERCECARD[cfg.pierceEl];const ecol=pcard?pcard.col:(SC[cfg.pierceEl]||'#9a9aa8');const open=(cfg.pn!=null)?cfg.pn:cfg.pierce.filter(x=>x).length;
      if(cfg.pierceEl||open){const pips=Array.from({length:open},(_,i)=>{const v=cfg.pierce[i];const st=v==='S'?`background:${ecol};border-color:${ecol}`:v==='A'?`background:${ecol}55;border-color:${ecol}`:'';return `<span class="pip" style="${st}"></span>`;}).join('');
        let pc=`<div class="crow" style="align-items:flex-start"><span class="lab">Perçage</span><div style="flex:1;min-width:0">`;
        pc+=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">${cfg.pierceEl?`<span class="chip" style="color:${ecol};border-color:${ecol}66;background:${ecol}1a">${pcard?pcard.ic+' ':''}${esc(cfg.pierceEl)}</span>`:''}<div class="pips">${pips||'<span class="mini">—</span>'}</div></div>`;
        if(pcard){const t=pierceTotals(cfg);if(t&&t.lines.length)pc+=`<div style="font-size:11px;color:${ecol};font-weight:700">${t.lines.map(l=>esc(l[0])+' '+l[1]).join(' · ')}</div>`;}
        pc+=`</div></div>`;cf+=pc;}}
    if(cfg&&cfg.evL)cf+=`<div class="crow"><span class="lab">Éveil</span><b style="font-size:11px">${cfg.evL}${cfg.evS?' · '+esc(cfg.evS):''}</b></div>`;
    if(cfg&&cfg.scrS)cf+=`<div class="crow"><span class="lab">Scroll</span><b style="font-size:11px">${esc(cfg.scrS)} +${cfg.scrL||0}</b></div>`;
    if(slot==='fairy'&&cfg&&cfg.lvl)cf+=`<div class="crow"><span class="lab">Niveau fée</span><b style="font-size:11px">${cfg.lvl}</b></div>`;
    if(cf)h+=`<div class="sec">Configuration</div>${cf}`;}
  h+=`<hr><div class="meta"><span>Classe</span><b>${esc(clsLabel(it))}</b></div>`;
  if(it.lv)h+=`<div class="meta"><span>Niveau requis</span><b>${it.lv}</b></div>`;
  if(it.pr)h+=`<div class="meta"><span>Prestige</span><b>P${it.pr}</b></div>`;
  return h;}
function itipShow(ev,idRaw){if(!pickSlot)return;const id=String(idRaw);const it=(listFor(pickSlot)||[]).find(x=>String(x.id)===id);if(!it){itipHide();return;}const el=_itip();el.innerHTML=itipBuild(it);el.style.display='block';itipMove(ev);}
function itipSlot(ev,slot){const e=E(slot);if(!e||!e.item){itipHide();return;}const el=_itip();el.innerHTML=itipBuild(e.item,e.cfg,slot,e);el.style.display='block';itipMove(ev);}
function itipMove(ev){if(!_itipEl||_itipEl.style.display!=='block')return;const pad=14,w=_itipEl.offsetWidth,h=_itipEl.offsetHeight;let x=ev.clientX+pad,y=ev.clientY+pad;if(x+w>window.innerWidth-8)x=ev.clientX-w-pad;if(x<8)x=8;if(y+h>window.innerHeight-8)y=window.innerHeight-h-8;if(y<8)y=8;_itipEl.style.left=x+'px';_itipEl.style.top=y+'px';}
function itipHide(){if(_itipEl)_itipEl.style.display='none';}
function drawPick(q){itipHide();const slot=pickSlot,e=E(slot),cfg=SLOTS[slot]||{lbl:slot};
  let body='';
  // familier : sections + rang
  if(slot==='familier'){
    let pk='';
    if(e){const rank=e.rank||'D';pk+=`<div class="sec"><div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Rang du familier (apparence change en B puis S)</div>
      <div class="rankpick">${RANKS.map(r=>`<div class="rp ${rank===r?'on':''}" onclick="setRank('${r}')">${r}<div style="font-size:9px;color:var(--mut);font-weight:400">niv ${LVLMAX[r]}</div></div>`).join('')}</div>
      <div style="font-size:11px;color:var(--mut);margin-bottom:4px">Rune (bonus)</div><div class="seg2" style="flex-wrap:wrap;max-width:340px">${['Force','Endurance','Dextérité','Intelligence'].map(o=>statS2(o,(typeof e.rune==='string'&&e.rune===o),`famRune('${o}')`)).join('')}<div class="s2 ${(typeof e.rune!=='string'||!e.rune)?'on':''}" onclick="famRune('')">—</div></div><div class="gemlbl">💠 Gemmes</div></div>`;}
    for(const sec of Object.keys(FAM)){const arr=FAM[sec].filter(x=>!q||x.n.toLowerCase().includes(q.toLowerCase()));if(!arr.length)continue;
      pk+=`<div style="font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">${esc(sec)} ${sec==='Doré'?'(œufs dorés)':''}</div>`+arr.map(x=>`<div class="itl" onclick="equipFam('${x.id}','${esc(x.n)}')">${IC[x.id]?`<img src="${IC[x.id]}">`:'🦊'}<div class="n">${esc(x.n)}</div></div>`).join('');}
    document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3>Familier</h3>${e?'<div class="sec"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div>':''}<input class="srch" placeholder="🔍 Familier…" oninput="drawPick(this.value)" ${q?`value="${esc(q)}"`:''}>${pk}<div style="text-align:right;margin-top:10px"><span class="pill" onclick="closePick()">Fermer</span></div></div></div>`;return;}
  if(e){try{body=panelFor(slot,e);}catch(err){body=`<div class="sec"><div class="mini" style="color:var(--red)">Réinitialise cette pièce (ancienne sauvegarde).</div><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div>`;}}
  const items=listFor(slot).filter(it=>!q||it.n.toLowerCase().includes(q.toLowerCase()));
  const grpKey=(slot==='mantra'||slot==='masque')?'cat':(slot==='ramasseur'?null:(['fhead','ftop','fhand','ffoot'].includes(slot)?'cat':'tier'));
  const byTier={};items.forEach(it=>{const g=grpKey?(it[grpKey]||'—'):'';(byTier[g]=byTier[g]||[]).push(it);});
  const pick=`<input class="srch" placeholder="🔍 ${items.length} objet(s) pour ${esc(C().cls)} ${C().sex}…" oninput="drawPick(this.value)" ${q?`value="${esc(q)}"`:''}>
    <div style="max-height:300px;overflow:auto">${Object.entries(byTier).map(([t,arr])=>`<div style="font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">${esc(t)}</div>`+arr.slice(0,60).map(it=>{const lock=C().prestige<(it.pr||0);const _id=String(it.id).replace(/&/g,'&amp;').replace(/"/g,'&quot;');return `<div class="itl" onmouseenter="itipShow(event,&quot;${_id}&quot;)" onmousemove="itipMove(event)" onmouseleave="itipHide()" onclick="${lock?'':`equip(&quot;${_id}&quot;)`}" style="${lock?'opacity:.45':''}">${imgT(it.ic,32)||'<span style=width:32px></span>'}<div class="n" style="color:${it.col||'#cfd2dc'}">${esc(it.n)}${it.sex?' ('+it.sex+')':''}<div style="font-size:10px;color:var(--mut)">${it.setb&&it.setb.length?it.setb.slice(0,2).map(b=>b[0]+'+'+b[1]).join(' · '):(it.b&&it.b.length?it.b.slice(0,3).map(b=>b[0]+'+'+b[1]).join(' · '):(it.atk?'Atk '+it.atk[0]+'~'+it.atk[1]:''))}</div></div>${it.pr?`<span style="font-size:10px;color:${lock?'var(--red)':'var(--gold)'}">${lock?'🔒':'🌟'}P${it.pr}</span>`:''}</div>`;}).join('')).join('')||'<div style="color:var(--mut);padding:10px">Aucun objet (à venir : ramasseur, masque, fashion en étape 2/3).</div>'}</div>`;
  document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3>${esc(cfg.lbl)} — ${esc(C().cls)} ${C().sex}</h3>${body}${pick}<div style="text-align:right;margin-top:10px"><span class="pill" onclick="closePick()">Fermer</span></div></div></div>`;}
function equip(id){const it=listFor(pickSlot).find(x=>String(x.id)===String(id));if(!it)return;const base={item:it};if(['weapon','weapon2','shield','suit','helmet','gauntlet','boots','ring1','ring2','earring1','earring2','necklace','fhead','ftop','fhand','ffoot','cape','ramasseur','fairy'].includes(pickSlot))base.cfg=defCfg(pickSlot);ST().eq[pickSlot]=base;render();drawPick('');}
function defWcfg(){return {rune:{stat:'',val:0},mode:'normal',plus:0,dia:['','','','',''],holo:['','',''],pierce:Array(12).fill(null),tier:'Commun',rlines:[],r1:{stat:'',val:0},r2:{stat:'',val:0},scroll:0,elem:0};}
function equipFam(id,n){const e=E('familier');ST().eq.familier={item:{id:id,n:n,ic:id,b:[]},rank:(e&&e.rank)||'S'};render();drawPick('');}
function setRank(r){const e=E('familier');if(e){e.rank=r;render();drawPick('');}}
function famRune(v){const e=E('familier');if(e){e.rune=v;render();drawPick('');}}
function removeItem(){delete ST().eq[pickSlot];render();closePick();}
function exportBuild(){const c=C();const st=ST();const data={name:c.name,stuff:st.name,cls:c.cls,sex:c.sex,lvl:c.lvl,prestige:c.prestige,equipped:Object.fromEntries(Object.entries(st.eq).map(([k,e])=>[k,{name:e.item.n,id:e.item.id,rank:e.rank}])),carnets:(c.carnets||[]).map(i=>CARNETS[i].nom),stats:totals()};
  try{localStorage.setItem('vg_build_export',JSON.stringify(data));}catch(e){}if(window.__embed){try{window.parent&&window.parent.postMessage({type:'vg_build',data:data},'*');}catch(e){}alert('Build validé ✓ — reviens à ta candidature.');return;}const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(c.name||'build')+'_'+(st.name||'stuff')+'.json';a.click();alert('Build exporté ✓');}
// ── Vanguard : sauvegarde de TOUS les persos du builder vers le site (base) ──
function vgCollectBuilds(){var oc=state.cur;var out=state.chars.map(function(c,ci){var os=c.curStuff;var stuffs=(c.stuffs||[]).map(function(s,si){state.cur=ci;c.curStuff=si;var stats={};try{stats=totals();}catch(e){}return {name:s.name,equipped:Object.fromEntries(Object.entries(s.eq||{}).map(function(p){var e=p[1];return [p[0],{name:e&&e.item&&e.item.n,id:e&&e.item&&e.item.id,rank:e&&e.rank}];})),stats:stats};});c.curStuff=os;return {name:c.name,cls:c.cls,sex:c.sex,lvl:c.lvl,prestige:c.prestige,carnets:(c.carnets||[]).map(function(i){return CARNETS[i]&&CARNETS[i].nom;}).filter(Boolean),stuffs:stuffs};});state.cur=oc;return out;}
function vgSavePersos(){agConfirm('💾 Sauvegarder TOUS tes persos sur le site ?\n\n⚠️ Ça remplace tes persos déjà enregistrés (tous les stuffs).',function(){fetch('/api/characters/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chars:vgCollectBuilds()})}).then(function(r){return r.ok?r.json():Promise.reject(r);}).then(function(d){alert('✅ '+((d&&d.count)||'Tes')+' perso(s) sauvegardé(s) ! Visibles dans GuildViewer / Compositions / Dashboard.');}).catch(function(){alert('❌ Erreur de sauvegarde. Es-tu bien connecté au site ?');});});}

/* ===================== VOLETS DE MÉCANIQUES ===================== */
let _scroll=0;
function keepScroll(){const s=document.querySelector('.sheet');if(s)_scroll=s.scrollTop;}
function restoreScroll(){requestAnimationFrame(()=>{const s=document.querySelector('.sheet');if(s)s.scrollTop=_scroll;});}
function cfgOf(slot){const e=E(slot);if(!e)return null;const d=defCfg(slot);e.cfg=Object.assign({},d,e.cfg||{});
  ['pierce','dia','holo','rlines','gems'].forEach(k=>{if(d[k]!==undefined&&!Array.isArray(e.cfg[k]))e.cfg[k]=Array.isArray(d[k])?d[k].slice():d[k];});
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
function upUI(slot,max){const w=cfgOf(slot);const v=w.up||0;const isW=(slot==='weapon'||slot==='weapon2');const art=(isW&&max>10&&v>10);
  let foot='';
  if(isW&&max>10)foot=`<div class="row" style="margin-top:5px"><span class="mini">Étoiles</span>${[0,1,2,3].map(s=>`<span class="tierbtn ${w.stars===s?'on':''}" onclick="cset('${slot}','stars',${s})">${s?'★'.repeat(s):'—'}</span>`).join('')}</div><div class="mini">0–10 = normale · 11–20 = artefact</div>`;
  else if(isW)foot='<div class="mini">Pas d\'artefact sur ce tier (max +10).</div>';
  else if(slot==='shield')foot='<div class="mini">Max +10 · pas d\'artefact</div>';
  else foot='<div class="mini">Max +10</div>';
  return `<div class="grp"><div class="gh">⬆️ Upgrade ${isW?`<span class="mini">(${art?'Artefact':'Normale'})</span>`:''}</div>
   <div class="lvl"><span class="mini">Niveau : <b>+${v}</b> / +${max}</span>
   <input type="range" min="0" max="${max}" value="${v}" oninput="upLive(this,'${slot}',${max})" onchange="cset('${slot}','up',+this.value)"></div>
   ${foot}</div>`;}
const PIERCECARD={
 Feu:{col:'#F87171',ic:'🔥',prim:'Force',sec:'Dégâts critiques',secU:'%',a:[7,2],s:[12,4]},
 Eau:{col:'#4EA8FF',ic:'💧',prim:'Intelligence',sec:"Temps d'incantation",secU:'%',a:[7,-2],s:[12,-4]},
 Terre:{col:'#4ADE80',ic:'🪨',prim:'Endurance',sec:'PV',secU:'',a:[7,0],s:[12,500]},
 Foudre:{col:'#FFD24A',ic:'⚡',prim:'Dextérité',sec:'Critique',secU:'%',a:[7,2],s:[12,4]}
};
function pierceTotals(cfg){const card=PIERCECARD[cfg.pierceEl];if(!card)return null;let a=0,s=0;(cfg.pierce||[]).forEach(x=>{if(x==='A')a++;else if(x==='S')s++;});const prim=a*card.a[0]+s*card.s[0];const sec=a*card.a[1]+s*card.s[1];const lines=[];if(prim)lines.push([card.prim,'+'+prim]);if(sec)lines.push([card.sec,(sec>0?'+':'')+sec+card.secU]);return{card:card,a:a,s:s,lines:lines};}
function pierceUI(slot,max){const w=cfgOf(slot);if(w.pn==null)w.pn=0;const n=w.pn;
  const isSuit=(slot==='suit');
  const ELEM=isSuit?[['Fulgur','#FFD24A'],['Volcano','#F87171'],['Océane','#4EA8FF']]:[['Feu','#F87171'],['Eau','#4EA8FF'],['Terre','#4ADE80'],['Foudre','#FFD24A']];
  const card=PIERCECARD[w.pierceEl];const elCol=(ELEM.find(x=>x[0]===w.pierceEl)||[,''])[1]||(card?card.col:'');
  let totalHtml;
  if(card){const t=pierceTotals(w);totalHtml=(t&&t.lines.length)?t.lines.map(l=>`<b style="color:${elCol}">${esc(l[0])} ${l[1]}</b>`).join(' · '):'<span class="mini">aucune carte posée</span>';}
  else{const pct=w.pierce.slice(0,n).reduce((a,x)=>a+(x==='A'?7:x==='S'?10:0),0);totalHtml=pct+'%';}
  let legend='';
  if(card){const fa=`${esc(card.prim)} +${card.a[0]}`+(card.a[1]?` · ${esc(card.sec)} ${card.a[1]>0?'+':''}${card.a[1]}${card.secU}`:'');const fs=`${esc(card.prim)} +${card.s[0]}`+(card.s[1]?` · ${esc(card.sec)} ${card.s[1]>0?'+':''}${card.s[1]}${card.secU}`:'');legend=`<div class="cardleg" style="border-color:${elCol}44"><div class="clh" style="color:${elCol}">${card.ic} Carte ${esc(w.pierceEl)}</div><div><span class="cg cgA">A</span> ${fa}</div><div><span class="cg cgS">S</span> ${fs}</div></div>`;}
  return `<div class="grp"><div class="gh">🃏 Perçage <span class="mini">(chaque niveau ouvre un emplacement)</span></div>
   <div class="mini" style="margin-bottom:3px">Carte / élément :</div>
   <div class="row" style="gap:4px;margin-bottom:5px">${ELEM.map(([nm,col])=>`<span class="tierbtn ${w.pierceEl===nm?'on':''}" style="${w.pierceEl===nm?`border-color:${col};color:${col};background:${col}22`:''}" onclick="cset('${slot}','pierceEl','${nm}')">${nm}</span>`).join('')}<span class="tierbtn ${!w.pierceEl?'on':''}" onclick="cset('${slot}','pierceEl','')">—</span></div>
   ${legend}
   <div class="lvl"><span class="mini">Niveau de perçage : <b>${n}</b> / ${max}</span><input type="range" min="0" max="${max}" value="${n}" oninput="pnLive(this,'${slot}')" onchange="cpn('${slot}',+this.value,${max})"></div>
   <div class="row" style="gap:4px;margin-top:6px">${Array.from({length:n},(_,i)=>{const v=w.pierce[i];const cs=elCol?(v==='S'?`border-color:${elCol};background:${elCol}33;color:${elCol}`:v==='A'?`border-color:${elCol};color:${elCol}`:''):'';return `<div class="cslot ${v||''}" style="${cs}" onclick="cpierce('${slot}',${i})">${v?((slot==='weapon'||slot==='weapon2'||slot==='shield')?v:(v==='A'?'7%':v==='S'?'10%':v)):'+'}</div>`;}).join('')||'<span class="mini">Monte le niveau pour ouvrir des emplacements.</span>'}</div>
   <div class="mini" style="margin-top:5px">Total : ${totalHtml} · clique une case → A → S</div></div>`;}
function pnLive(el,slot){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function cpn(slot,v,max){keepScroll();const w=cfgOf(slot);w.pn=Math.max(0,Math.min(v,max));render();drawPick(curQ());restoreScroll();}
function eveilUI(slot){const w=cfgOf(slot);
  return `<div class="grp"><div class="gh">🔵 Éveil (R1 ou R2)</div>
   <div class="row"><div class="seg2" style="max-width:150px"><div class="s2 ${w.evL==='R1'?'on':''}" onclick="cset('${slot}','evL','R1')">R1</div><div class="s2 ${w.evL==='R2'?'on':''}" onclick="cset('${slot}','evL','R2')">R2</div><div class="s2 ${!w.evL?'on':''}" onclick="cset('${slot}','evL','')">—</div></div>
   <select onchange="cset('${slot}','evS',this.value)"><option value="">— statistique —</option>${EVSTATS.map(s=>`<option ${w.evS===s?'selected':''}>${s}</option>`).join('')}</select></div></div>`;}
function scrollUI(slot){const w=cfgOf(slot);
  return `<div class="grp"><div class="gh">📜 Scroll stat</div><div class="row">
   <select onchange="cset('${slot}','scrS',this.value)"><option value="">— stat —</option>${['Force','Endurance','Dextérité','Intelligence'].map(s=>`<option ${w.scrS===s?'selected':''}>${s}</option>`).join('')}</select>
   <span class="mini">Niveau</span><select onchange="cset('${slot}','scrL',+this.value)">${[0,1,2,3,4].map(n=>`<option ${w.scrL===n?'selected':''}>+${n}</option>`).join('')}</select></div></div>`;}
function elemUI(slot,max){const w=cfgOf(slot);
  return `<div class="grp"><div class="gh">🔥 Élément</div><div class="row">
   <select onchange="cset('${slot}','elemType',this.value)"><option value="">— aucun —</option>${ELEMENTS.map(el=>`<option ${w.elemType===el?'selected':''}>${el}</option>`).join('')}</select>
   <div class="lvl"><span class="mini">Niveau : <b>+${w.elemLvl||0}</b>/+${max}</span><input type="range" min="0" max="${max}" value="${w.elemLvl||0}" oninput="elemLive(this,'${slot}')" onchange="cset('${slot}','elemLvl',+this.value)"></div></div></div>`;}

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
  if(slot==='mantra'||slot==='masque'){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="grp"><div class="gh">${slot==='mantra'?'📜 Mantra':'🎭 Masque'} ${esc(e.item.cat||'')}${e.item.lvl?' '+e.item.lvl:''}</div><div class="cb" style="color:var(--green);font-size:11px">${b||'—'}</div></div><div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div>`;}
  return `<div class="sec"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div>`;
}
function runeName(t){const m={'Éternel':'Rune Éternelle','Yggdrasil':'Rune Yggdrasil','Ancestral':'Rune Ancestrale','Lusaka':'Rune Lusaka'};return m[t]||'Rune';}
function weaponPanel2(slot,e){const _s=slot;return weaponPanelImpl(slot,e);}
function weaponPanel(e){return weaponPanelImpl('weapon',e);}
function weaponPanelImpl(SL,e){const w=cfgOf(SL);const artefactable=['Éternel','Yggdrasil'].includes(e.item.tier);const upMax=artefactable?20:10;const pMax=artefactable?12:10;if(!artefactable&&w.up>10)w.up=10;const art=artefactable&&w.up>10;
  return `<div class="wp">
   <div class="grp"><div class="gh">🟢 ${runeName(e.item.tier)}</div><div class="seg2" style="max-width:180px"><div class="s2 ${w.rune?'on':''}" onclick="cset('${SL}','rune',true)">Oui</div><div class="s2 ${!w.rune?'on':''}" onclick="cset('${SL}','rune',false)">Non</div></div></div>
   ${upUI(SL,upMax)}
   <div class="grp"><div class="gh">💎 Sertissage (5 diamants${art?' + 3 holographiques':''})</div>
     ${Array.from({length:5},(_,i)=>`<div class="dslot"><span class="mini" style="width:54px">Diamant ${i+1}</span><select onchange="cdia('${SL}','dia',${i},this.value)"><option value="">—</option>${DIASTATS.map(s=>`<option ${w.dia[i]===s?'selected':''}>${s}</option>`).join('')}</select></div>`).join('')}
     ${art?'<div class="mini" style="color:var(--purple);margin-top:5px">Diamants holographiques :</div>'+Array.from({length:3},(_,i)=>`<div class="dslot holo"><span class="mini" style="width:54px">Holo ${i+1}</span><select onchange="cdia('${SL}','holo',${i},this.value)"><option value="">—</option>${HOLOSTATS.map(d=>`<option value="${d[0]}" ${w.holo[i]===d[0]?'selected':''}>${d[0]} +${d[1]}</option>`).join('')}</select></div>`).join(''):'<div class="mini">Les 3 diamants holographiques se débloquent en Artefact (+11 à +20).</div>'}</div>
   ${pierceUI(SL,pMax)}
   <div class="grp"><div class="gh">✨ Rareté</div><div class="row">${MECH.arme.rarete_tiers.map(t=>`<span class="tierbtn ${t==='Mythique'?'myth':''} ${w.tier===t?'on':''}" onclick="cset('${SL}','tier','${t}')">${t}</span>`).join('')}</div>
     ${artefactable?masteryUI(SL):''}
     ${w.tier==='Mythique'?'<div class="mini" style="color:var(--gold)">Mythique = arme niveau 100.</div>':''}
     <div style="margin-top:6px">${(w.rlines||[]).map((l,i)=>`<div class="line"><select onchange="crl(${i},this.value)"><option value="">— ligne de bonus —</option>${MECH.arme.rarete_pool.map(b=>`<option ${l===b.stat?'selected':''}>${b.stat}</option>`).join('')}</select><span class="pill" onclick="crlDel(${i})">✕</span></div>`).join('')}</div>
     ${(w.rlines||[]).length<4?'<span class="pill" onclick="crlAdd()">+ ligne (max 4)</span>':''}<div class="mini">% variable selon la stat.</div></div>
   ${eveilUI(SL)}
   ${scrollUI(SL)}
   ${elemUI(SL,20)}
   <div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer l'arme</span></div></div>`;}
function shieldPanel(e){return `<div class="wp">${upUI('shield',10)}${pierceUI('shield',10)}${eveilUI('shield')}${elemUI('shield',20)}<div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function suitPanel(e){return `<div class="wp">${upUI('suit',10)}${pierceUI('suit',4)}${eveilUI('suit')}${scrollUI('suit')}${elemUI('suit',20)}<div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function armorPanel(slot,e){return `<div class="wp">${upUI(slot,10)}${eveilUI(slot)}${scrollUI(slot)}<div class="mini">Cette pièce n'a ni perçage ni élément.</div><div style="text-align:center;margin-top:6px"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function jewelPanel(slot,e){const w=cfgOf(slot);
  return `<div class="wp"><div class="grp"><div class="gh">⬆️ Upgrade</div><div class="lvl"><span class="mini">Niveau : <b>+${w.up||0}</b> / +30</span><input type="range" min="0" max="30" value="${w.up||0}" oninput="upLive(this,'${slot}',30)" onchange="cset('${slot}','up',+this.value)"></div><div class="mini">+20 (aProtect) · jusqu'à +30 (aProtect lunaire = stats plus fortes)</div></div>${eveilUI(slot)}<div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}

function capePanel(e){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh">🧥 ${esc(e.item.n)}</div><div class="cb" style="color:var(--green);font-size:11px">${b||'—'}</div></div>${runeUI('cape')}${eveilUI('cape')}<div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function ramasseurPanel(e){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh">🐾 ${esc(e.item.n)}</div><div class="cb" style="color:var(--green);font-size:11px">${b||'—'}</div></div>${runeUI('ramasseur')}<div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function fairyPanel(e){const w=cfgOf('fairy');return `<div class="wp"><div class="grp"><div class="gh">🧚 ${esc(e.item.n)}</div>
   <div class="lvl"><span class="mini">Niveau de la fée : <b>${w.lvl||0}</b> / ${FAIRYMAX}</span><input type="range" min="0" max="${FAIRYMAX}" value="${w.lvl||0}" oninput="flvLive(this)" onchange="cset('fairy','lvl',+this.value)"></div>
   <div class="mini">Le bonus dépend du niveau (voir wiki).</div></div><div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function flvLive(el){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function fashionPanel(slot,e){const w=cfgOf(slot);const setb=(e.item.setb||[]).map(b=>esc(b[0])+' +'+b[1]).join(' · ');
  return `<div class="wp">
   <div class="grp"><div class="gh">✨ ${esc(e.item.set||'Fashion')} <span class="mini">(${esc(e.item.cat||'')})</span></div><div class="cb" style="color:var(--green);font-size:11px">Bonus du set : ${setb||'—'}</div></div>
   <div class="grp"><div class="gh">⬆️ Upgrade</div><div class="lvl"><span class="mini">Niveau : <b>+${w.up||0}</b> / +10</span><input type="range" min="0" max="10" value="${w.up||0}" oninput="upLive(this,'${slot}',10)" onchange="cset('${slot}','up',+this.value)"></div></div>
   ${runeUI(slot)}
   <div class="grp"><div class="gh">💎 Gemmes costume (4)</div>
     ${Array.from({length:4},(_,i)=>`<div class="dslot"><span class="mini" style="width:54px">Gemme ${i+1}</span><select onchange="cdia('${slot}','gems',${i},this.value)"><option value="">—</option>${[...new Set(GEMC.map(g=>g.fr))].map(fr=>`<option value="${fr}" ${w.gems[i]===fr?'selected':''}>${fr}</option>`).join('')}</select></div>`).join('')}</div>
   <div style="text-align:center"><span class="pill" onclick="removeItem()">🗑️ Retirer</span></div></div>`;}
function runeUI(slot){const w=cfgOf(slot);return `<div class="grp"><div class="gh">🟢 Rune (bonus)</div>${seg2stat(slot,'rune',['Force','Endurance','Dextérité','Intelligence'])}</div>`;}
const STATCOL={Force:'#F87171',Endurance:'#4ADE80','Dextérité':'#FFD24A',Intelligence:'#4EA8FF'};
function statS2(o,on,onclk){const c=STATCOL[o];const st=c?(on?`background:${c};color:#0a0a0c;border-color:${c};font-weight:700`:`color:${c};border-color:${c}66`):'';return `<div class="s2 ${(!c&&on)?'on':''}" style="${st}" onclick="${onclk}">${o}</div>`;}
function seg2stat(slot,key,opts){const w=cfgOf(slot);return `<div class="seg2" style="flex-wrap:wrap;max-width:340px">${opts.map(o=>statS2(o,w[key]===o,`cset('${slot}','${key}','${o}')`)).join('')}<div class="s2 ${!w[key]?'on':''}" onclick="cset('${slot}','${key}','')">—</div></div><div class="gemlbl">💠 Gemmes</div>`;}
function upLive(el,slot,max){const lbl=el.parentNode.querySelector('.mini b');if(lbl)lbl.textContent='+'+el.value;}
function masteryUI(slot){const w=cfgOf(slot);const v=w.mastery||0;
  return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><div class="gh" style="font-size:11px;margin-bottom:4px">🎯 Maîtrise de l'arme <span class="mini">(0 à 100)</span></div>
   <div class="lvl"><span class="mini">Niveau : <b>${v}</b> / 100</span>
   <input type="range" min="0" max="100" value="${v}" oninput="masteryLive(this)" onchange="cset('${slot}','mastery',+this.value)">
   <input type="number" min="0" max="100" value="${v}" style="width:52px;margin-left:6px" onchange="cset('${slot}','mastery',Math.max(0,Math.min(100,parseInt(this.value)||0)))"></div></div>`;}
function masteryLive(el){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function elemLive(el,slot){const lbl=el.parentNode.querySelector('.mini b');if(lbl)lbl.textContent='+'+el.value;}
function cset(slot,key,val){keepScroll();const w=cfgOf(slot);if(!w)return;if(key==='up'&&slot==='weapon'){w.up=val;E('weapon').artefact=val>10;if(val<=10)w.holo=['','',''];}else w[key]=val;render();drawPick(curQ());restoreScroll();}
function cdia(slot,arr,i,v){keepScroll();const w=cfgOf(slot);w[arr][i]=v;render();restoreScroll();}
function cpierce(slot,i){keepScroll();const w=cfgOf(slot);const x=w.pierce[i];w.pierce[i]=(!x)?'A':x==='A'?'S':null;render();drawPick(curQ());restoreScroll();}
function crlAdd(){keepScroll();const w=cfgOf('weapon');w.rlines=w.rlines||[];if(w.rlines.length<4){w.rlines.push('');drawPick(curQ());restoreScroll();}}
function crlDel(i){keepScroll();const w=cfgOf('weapon');w.rlines.splice(i,1);render();drawPick(curQ());restoreScroll();}
function crl(i,v){const w=cfgOf('weapon');w.rlines[i]=v;render();}
function curQ(){const s=document.querySelector('.srch');return s?s.value:'';}

render();
window.addEventListener('beforeunload',function(){try{save();}catch(e){}});
;
window.__APP='airbuilder';