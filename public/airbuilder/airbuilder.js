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
const FASHION=['fhead','ftop','fhand','ffoot'];

/* ══════════════════ LA PANOPLIE, EN UN GESTE ══════════════════════════════
 *
 * Le besoin, mot pour mot : « quand on integre par exemple botte Yggdrasil,
 * mettre la panoplie entierement pour eviter de perdre du temps ». Composer un
 * stuff complet, c'etait ouvrir quatre fois la meme fenetre et rechercher
 * quatre fois la meme lignee.
 *
 * IL N'Y A PAS DE CHAMP « PANOPLIE » DANS LE RELEVE. La signature d'un
 * ensemble est l'accord de TROIS champs : `tier` (la lignee), `cls` (la classe)
 * et `sex`. Verifie sur le releve avant d'etre ecrit : les quatre emplacements
 * portent 64 armures chacun, ces trois champs produisent 64 signatures, et LES
 * 64 couvrent les quatre emplacements — exactement une piece par emplacement,
 * jamais deux. Une signature qui rendrait deux casques signalerait une regle
 * fausse ; ce n'est pas le cas.
 *
 * `sex` FAIT PARTIE DE LA SIGNATURE et ce n'est pas un detail : « Souliers des
 * eternels (F) » est la version feminine de « Chaussures des eternels (G) ».
 * Les confondre proposerait une piece que le joueur ne peut pas porter.
 *
 * L'ARME ET LE BOUCLIER N'EN FONT PAS PARTIE. Ils portent bien un `tier`, mais
 * leur lignee ne se complete pas en quatre pieces — et « Yggdrasil » est
 * justement une lignee d'ARMES, pas une panoplie d'armure. Les ajouter
 * remplacerait l'arme du joueur sans qu'il l'ait demande.
 *
 * Meme mecanique pour le COSTUME, avec sa propre signature : `set` + `sex`, et
 * la un fait s'y ajoute — aucune des pieces ne paie seule, c'est le set qui
 * paie, et il ne paie qu'aux quatre pieces portees (cf. /mecaniques).
 * D'ou le bonus de set compte dans le resume UNIQUEMENT a 4/4.
 * Cote serveur, `src/lib/panoplie.ts` fait le meme travail sur la CLE du
 * client (II_ARM_M_MER_BOOTS_SET_01 et ses trois soeurs) : deux relevés, deux
 * chemins, meme resultat.
 */

/** La signature d'une armure, ou `null` si la piece n'est rattachable a aucun
 *  ensemble (un `tier` ou une `cls` manquants). */
function panSig(it){
  if(!it||!it.tier||!it.cls)return null;
  return 'A|'+it.tier+'|'+it.cls+'|'+(it.sex||'');
}
/** La signature d'une piece de costume : le set et le genre. */
function panSigMode(it){
  if(!it||!it.set)return null;
  return 'M|'+it.set+'|'+(it.sex||'');
}
/** Les emplacements couverts par une famille de signature. */
function panSlots(sig){return (sig&&sig.charAt(0)==='M')?FASHION:ARMOR;}
/** La fonction de signature qui va avec l'emplacement. */
function panSigDe(slot,it){return FASHION.indexOf(slot)>=0?panSigMode(it):panSig(it);}

/** Les pieces d'un ensemble, dans l'ordre ou l'on s'equipe (de la tete aux
 *  pieds) : c'est celui de ARMOR et de FASHION, pas celui du fichier. */
function panPieces(sig){
  const out=[];if(!sig)return out;
  panSlots(sig).forEach(function(s){
    const arr=(s==='fhead'||s==='ftop'||s==='fhand'||s==='ffoot')?(ITEMS.fashion||[]):(ITEMS[s]||[]);
    for(let i=0;i<arr.length;i++){
      const it=arr[i];
      if(FASHION.indexOf(s)>=0&&it.piece!==s)continue;
      if(panSigDe(s,it)===sig){out.push({slot:s,item:it});break;}
    }
  });
  return out;
}

/**
 * L'etat d'une panoplie dans le stuff courant.
 *
 * @param mode `true` pour le costume, sinon l'armure.
 * @param sigVoulue signature imposee (celle de la piece qu'on regarde dans la
 *   fenetre de choix) ; sinon on prend la signature LA PLUS PORTEE — c'est
 *   celle que le joueur est en train de monter.
 * Rend `null` s'il n'y a rien a proposer : aucune piece rattachable, ou un
 * ensemble d'une seule piece. Mieux vaut pas de bouton qu'un bouton qui
 * n'ajouterait rien.
 */
function panEtat(mode,sigVoulue){
  const st=ST();const slots=mode?FASHION:ARMOR;
  const cnt={},sigDe={};
  slots.forEach(function(s){
    const e=st.eq[s];const g=e&&e.item&&panSigDe(s,e.item);
    if(!g)return;cnt[g]=(cnt[g]||0)+1;sigDe[s]=g;
  });
  let sig=sigVoulue||null;
  if(!sig)Object.keys(cnt).forEach(function(g){if(!sig||cnt[g]>cnt[sig])sig=g;});
  if(!sig)return null;
  const pieces=panPieces(sig);
  if(pieces.length<2)return null;
  const manquantes=pieces.filter(function(p){return sigDe[p.slot]!==sig;});
  /* DEUX SORTES DE « MANQUANTES », et la difference coute cher.
   *
   * Un emplacement qui n'appartient pas a l'ensemble est soit VIDE, soit OCCUPE
   * par une piece d'une autre lignee. Le geste n'est pas le meme : remplir un
   * trou ne perd rien, ecraser un casque Eternel perd la piece ET tous ses
   * reglages (upgrade, cartes de percage, eveil), et le builder n'a PAS
   * d'annulation — sa propre pastille de sauvegarde le dit.
   *
   * Le compte etait fondu en un seul jusqu'ici : le bouton annonçait
   * « Completer (3) » sur un stuff ou une seule piece manquait vraiment, et les
   * deux autres partaient a la poubelle sans un mot. Le nombre est desormais
   * separe, et c'est le libelle du bouton qui change quand il y a du
   * remplacement dans le lot. */
  const occupees=manquantes.filter(function(p){const e=st.eq[p.slot];return !!(e&&e.item);});
  const vides=manquantes.filter(function(p){const e=st.eq[p.slot];return !(e&&e.item);});
  const accessible=function(p){return C().prestige>=(p.item.pr||0);};
  const bloquees=manquantes.filter(function(p){return !accessible(p);});
  return {sig:sig,mode:!!mode,
    nom:panNom(pieces,sig),
    pieces:pieces,portees:pieces.length-manquantes.length,
    manquantes:manquantes,bloquees:bloquees,
    /** Les trous a remplir, et les pieces d'une autre lignee qui sauteraient. */
    aPoser:vides.filter(accessible),aRemplacer:occupees.filter(accessible),
    porte:function(slot){return sigDe[slot]===sig;},
    /** `true` si cet emplacement porte une piece, mais d'un autre ensemble. */
    occupe:function(slot){const e=st.eq[slot];return !!(e&&e.item)&&sigDe[slot]!==sig;}};
}

/** Le nom de l'ensemble : le `tier` pour une armure — il EST la lignee, et il
 *  s'affiche deja partout ailleurs avec sa couleur —, le nom de set pour un
 *  costume. Les deux occupent la meme place dans la signature, d'ou la lecture
 *  unique. On ne recalcule pas de suffixe commun comme cote serveur : ici le
 *  nom est deja dans la donnee. */
function panNom(pieces,sig){
  return sig.split('|')[1];
}

/** La couleur de l'ensemble : celle que ses pieces portent deja.
 *
 *  RENDUE EN HEXA, jamais en variable CSS : l'appelant y colle une opacite
 *  (« …55 »), et `var(--gold)55` n'est pas une couleur — la declaration entiere
 *  est jetee par le navigateur, silencieusement. Les pieces de costume n'ont pas
 *  de champ `col`, d'ou le repli ecrit en clair. */
function panCouleur(p){
  const un=p&&p.pieces&&p.pieces[0]&&p.pieces[0].item;
  return (un&&un.col)||'#FFD24A';
}

/**
 * Poser la panoplie. Le besoin est celui de Maxime, mot pour mot : « quand on
 * integre par exemple botte Yggdrasil, mettre la panoplie ENTIEREMENT pour
 * eviter de perdre du temps ». Le geste pose donc AUSSI les emplacements deja
 * occupes par une autre lignee — sinon il ne ferait pas ce qu'on lui demande.
 *
 * CE QUI A ETE CORRIGE ICI : ce commentaire affirmait l'inverse (« ce qui est
 * deja equipe n'est PAS remplace »), et le code, lui, remplaçait. Verifie : avec
 * des bottes Yggdrasil et un heaume des Eternels aux pieds et sur la tete, un
 * clic changeait le heaume sans le dire. Ce n'est plus le libelle qui mentait :
 * quand du remplacement est dans le lot, le bouton s'appelle « Tout poser » et
 * non « Completer », le nombre de pieces ecrasees est ecrit a cote, et le
 * message de retour le redit. Le builder n'a pas d'annulation — sa pastille de
 * sauvegarde le dit elle-meme —, donc le joueur doit le savoir AVANT de cliquer.
 *
 * Une piece hors de portee de prestige est LAISSEE et nommee : l'equiper
 * afficherait un stuff que le personnage ne peut pas porter.
 */
function panCompleter(mode,sigVoulue){
  if(_ro())return;
  const p=panEtat(mode,sigVoulue);
  if(!p||!p.manquantes.length)return;
  const st=ST();let mis=0,ecrasees=0;
  p.manquantes.forEach(function(m){
    if(C().prestige<(m.item.pr||0))return;
    if(st.eq[m.slot]&&st.eq[m.slot].item)ecrasees++;
    st.eq[m.slot]={item:m.item,cfg:defCfg(m.slot)};
    defaultCfg(m.slot,m.item.tier,C().cls);
    mis++;
  });
  render();
  try{if(pickSlot)drawPick(curQ());}catch(x){}
  if(!mis)return agToast('Prestige '+(p.bloquees[0]&&p.bloquees[0].item.pr)+' requis pour le reste de la panoplie '+p.nom+'.',false);
  agToast('Panoplie '+p.nom+' : '+mis+' piece'+(mis>1?'s':'')+' equipee'+(mis>1?'s':'')
    +(ecrasees?' · '+ecrasees+' remplacee'+(ecrasees>1?'s':''):'')
    +(p.bloquees.length?' · '+p.bloquees.length+' hors prestige':''),true);
}

/**
 * LE BLOC PANOPLIE de la fenetre de choix : les quatre pieces en IMAGE, celles
 * qu'on porte allumees, et un seul bouton pour poser le reste.
 *
 * Les images plutot qu'une liste de noms : on reconnait un casque a son dessin
 * avant d'avoir lu « Casque des eternels », et les quatre dessins cote a cote
 * disent d'un coup d'oeil ce qui manque.
 */
function panBloc(slot){
  const e=E(slot);if(!e||!e.item)return '';
  const mode=FASHION.indexOf(slot)>=0;
  const sig=panSigDe(slot,e.item);
  const p=panEtat(mode,sig);
  if(!p)return '';
  const col=panCouleur(p);
  const cases=p.pieces.map(function(x){
    const on=p.porte(x.slot);
    const bloq=!on&&C().prestige<(x.item.pr||0);
    /* Troisieme etat, et il n'existait pas : l'emplacement porte deja une piece,
       mais d'une autre lignee. Sans lui, la case se dessinait exactement comme un
       trou — et c'est justement celle qui va se faire ecraser. */
    const occ=!on&&!bloq&&p.occupe(x.slot);
    const lbl=(SLOTS[x.slot]||{}).lbl||x.slot;
    return '<span class="pancase'+(on?' on':'')+(bloq?' bloq':'')+(occ?' occ':'')+'" title="'+esc(x.item.n)
      +(bloq?' — prestige '+x.item.pr:'')+(occ?' — remplacerait la piece portee':'')+'">'
      +(x.item.ic&&IC[x.item.ic]?'<img src="'+IC[x.item.ic]+'" alt="">':'<i class=vgi-'+((SLOTS[x.slot]||{}).ico||'shirt-armor')+'></i>')
      +'<b>'+esc(lbl)+'</b></span>';
  }).join('');
  /* Le bouton dit ce qu'il fait. « Completer » quand il ne remplit que des
     trous ; « Tout poser » des qu'il ecrase, avec le compte a cote. */
  const reste=p.aPoser.length+p.aRemplacer.length;
  const act=reste
    ? '<span class="pill on" onclick="panCompleter('+(mode?'true':'false')+',\''+esc(p.sig).replace(/'/g,"\\'")+'\')">'
      +'<i class=vgi-plus></i> '+(p.aRemplacer.length?'Tout poser':'Completer')+' ('+reste+')</span>'
      +(p.aRemplacer.length?'<span class="mini" style="color:var(--gold)">dont '+p.aRemplacer.length
        +' piece'+(p.aRemplacer.length>1?'s':'')+' remplacee'+(p.aRemplacer.length>1?'s':'')+' — sans annulation</span>':'')
    : (p.manquantes.length
      ? '<span class="mini">Prestige '+(p.bloquees[0]&&p.bloquees[0].item.pr)+' requis pour le reste</span>'
      : '<span class="mini" style="color:var(--green)"><i class=vgi-check></i> Panoplie complete</span>');
  return '<div class="grp panbloc" style="border-color:'+col+'55">'
    +'<div class="gh" style="color:'+col+'"><i class=vgi-shirt-armor></i> Panoplie '+esc(p.nom)
    +' <span class="mini" style="color:var(--mut)">'+p.portees+'/'+p.pieces.length+'</span></div>'
    +'<div class="pancases">'+cases+'</div>'
    /* LA MISE EN GARDE AU MOMENT DU GESTE. Le bandeau du resume la porte aussi,
       mais c'est ICI qu'on clique « Tout poser » : la ligne negative de
       l'ensemble doit se lire avant, pas apres. */
    +panMalus(mode,sig)
    +'<div class="row" style="margin-top:8px">'+act+'</div></div>';
}

function pool(s){if(s==='weapon2')return 'weapon';if(SLOTS[s]&&SLOTS[s].pool)return SLOTS[s].pool;if(s==='mantra')return 'mantra';if(s==='masque')return 'masque';if(s==='ramasseur')return 'ramasseur';return s.replace(/[0-9]/g,'');}

function newStuff(n){return {name:n||'Stuff',eq:{}};}
function newChar(n){return {name:n||'Perso '+(state.chars.length+1),cls:'Arcaniste',sex:'G',lvl:200,prestige:3,carnets:[],carnetsFull:[],stuffs:[newStuff('DPS'),newStuff('Tank'),newStuff('Hybride')],curStuff:0};}
const state={chars:[],cur:0};
(function(){try{const s=(window.__VIEW_BLOB&&window.__VIEW_BLOB.chars&&window.__VIEW_BLOB.chars.length)?window.__VIEW_BLOB:JSON.parse(localStorage.getItem('vg_air_e1')||'null');if(s&&s.chars&&s.chars.length)Object.assign(state,s);}catch(e){}try{var _seed=JSON.parse(localStorage.getItem('vg_air_seed')||'null');if(_seed&&_seed.length){localStorage.removeItem('vg_air_seed');var _norm=function(x){return (x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');};var _mcls=function(x){var n=_norm(x);for(var i=0;i<CLASSES.length;i++){if(_norm(CLASSES[i])===n)return CLASSES[i];}return 'Arcaniste';};state.chars=_seed.slice(0,20).map(function(sc){var nc=newChar(sc&&sc.name);nc.name=(sc&&sc.name)||nc.name;nc.cls=_mcls(sc&&sc.cls);if(sc&&sc.prestige!=null)nc.prestige=+sc.prestige;return nc;});state.cur=0;}}catch(e){}if(!state.chars||!state.chars.length)state.chars=[newChar('Perso 1')];state.chars.forEach(function(c){if(!c||typeof c!=='object')return;if(!c.cls||CLASSES.indexOf(c.cls)<0)c.cls='Arcaniste';if(c.sex!=='F')c.sex='G';if(!c.name)c.name='Perso';if(c.lvl==null)c.lvl=200;if(c.prestige==null)c.prestige=1;});state.chars=state.chars.filter(function(c){return c&&typeof c==='object';});if(!state.chars.length)state.chars=[newChar('Perso 1')];if(!(state.cur>=0&&state.cur<state.chars.length))state.cur=0;})();
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
  agConfirm('Pour '+quoi+', il faut avoir rejoint le Discord de GENESIS et t\'y être connecté.\n\nTon build reste dans ce navigateur en attendant : tu le retrouveras en revenant.\n\nConfirmer pour aller à la connexion.',
    function(){location.href='/login';});
}
/* UN ETAT VIERGE NE PART PAS AU COMPTE (2026-10-21). Le moteur demarre sur un perso
   d'exemple sans aucune piece, et le premier rendu enregistre : la synchro effacait
   alors les persos du compte pour publier l'exemple a leur place — c'est ainsi que des
   comptes se retrouvaient avec un « Daiisuke » qu'ils n'avaient jamais cree, et que
   « Mes personnages » perdait ses persos. Rien a publier tant que rien n'est fait :
   `vgPremierPerso` reprend entre-temps les persos du compte, s'il en a. */
function vgPushCloud(){if(window.__embed||window.__VIEW||vgAnon())return;if(_vgPushT)clearTimeout(_vgPushT);_vgPushT=setTimeout(function(){vgPublierMaintenant(false);},1500);}
/* PUBLIER TOUT DE SUITE CE QUI ATTEND (2026-10-21). La publication attend 1,5 s qu'on
   ait fini de cliquer ; mais quitter le builder dans ce delai la PERDAIT : une page
   qui se recharge (« Voir sur le site », une adresse tapee, le build d'un autre
   membre) tue le minuteur, et « Mes personnages » montrait l'etat d'avant — un perso
   rendu principal ou supprime a l'instant n'y etait pas, jusqu'a la prochaine
   ouverture du builder. En navigation interne, la page d'arrivee lisait
   /api/characters avant meme que la synchro ne parte.
   `depart` : la page se ferme. `keepalive` laisse alors la requete partir apres elle,
   dans une limite de 64 Ko pour toutes a la fois : la synchro, que lit le site, passe
   la premiere ; l'etat complet, s'il ne tient pas, reste dans ce navigateur, plus
   recent que celui du compte, et repart a la prochaine ouverture.
   La promesse reste sur `window.__vgPublication` : « Mes personnages » (la page et le
   bloc de l'accueil) l'attend avant de lire (src/lib/mesPersos.ts, `apresPublication`). */
function vgPublierMaintenant(depart){
  if(!_vgPushT)return window.__vgPublication||Promise.resolve();
  clearTimeout(_vgPushT);_vgPushT=null;
  /* Revu au depart, pas seulement a la programmation : entre-temps, le moteur a pu
     passer en lecture (le build d'un autre membre). */
  if(window.__embed||window.__VIEW||vgAnon()||vgEtatVierge())return Promise.resolve();
  try{
    var snap=(Date.now()-(window.__lastSnap||0)>600000);if(snap)window.__lastSnap=Date.now();
    var corpsSync=JSON.stringify({chars:vgCollectBuilds()}),corpsEtat=JSON.stringify({blob:state,snapshot:snap});
    var octets=function(s){try{return new Blob([s]).size;}catch(e){return s.length*3;}};
    var tSync=octets(corpsSync),tEtat=octets(corpsEtat);
    var envoi=function(url,corps,ka){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:corps,keepalive:ka}).catch(function(){});};
    var p=Promise.all([
      envoi('/api/characters/sync',corpsSync,!!depart&&tSync<60000),
      envoi('/api/builder-state',corpsEtat,!!depart&&tSync+tEtat<60000)]);
    window.__vgPublication=p;return p;
  }catch(e){return Promise.resolve();}
}
window.vgPublierMaintenant=vgPublierMaintenant;
// ── Dropdown maison : remplace les <select> natifs moches par une liste stylée ──
function vgDD(){if(!document.getElementById('vgdd-css')){var _st=document.createElement('style');_st.id='vgdd-css';_st.textContent='.vgdd{position:relative;display:inline-block;vertical-align:bottom}.vgdd-b{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:var(--bg3,#1e1e27);border:1px solid var(--border,#2c2c36);border-radius:8px;color:var(--text,#e8e8ee);padding:7px 11px;font:600 13px Rajdhani,sans-serif;cursor:pointer;transition:border-color .14s,box-shadow .14s}.vgdd-b:hover{border-color:rgba(var(--gn-or-rgb),.53)}.vgdd.open .vgdd-b{border-color:var(--gn-accent);box-shadow:0 0 0 3px rgba(var(--gn-or-rgb),.16)}.vgdd-b i{color:var(--gn-accent);font-style:normal;font-size:11px;transition:transform .16s}.vgdd.open .vgdd-b i{transform:rotate(180deg)}.vgdd-l{display:none;position:absolute;top:calc(100% + 5px);left:0;min-width:100%;z-index:99999;background:var(--bg2,#16161d);border:1px solid var(--border,#2c2c36);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.6);padding:5px;max-height:260px;overflow-y:auto}.vgdd.open .vgdd-l{display:block;animation:vgddin .14s ease}.vgdd-o{padding:7px 12px;border-radius:7px;font-size:13px;cursor:pointer;white-space:nowrap;color:var(--text,#e8e8ee);transition:background .12s}.vgdd-o:hover{background:rgba(255,255,255,.07)}.vgdd-o.on{background:rgba(var(--gn-lueur-rgb),.14);color:var(--gn-accent);font-weight:700}@keyframes vgddin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}';document.head.appendChild(_st);}document.querySelectorAll('.abx select:not([data-dd])').forEach(function(sel){sel.setAttribute('data-dd','1');var wrap=document.createElement('span');wrap.className='vgdd';sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);sel.style.display='none';var btn=document.createElement('button');btn.type='button';btn.className='vgdd-b';wrap.appendChild(btn);var list=document.createElement('div');list.className='vgdd-l';wrap.appendChild(list);function sync(){btn.innerHTML='';var o=sel.options[sel.selectedIndex];var t=document.createElement('span');t.textContent=(o&&o.textContent)||'';var a=document.createElement('i');a.className='vgi-chevron-down';a.style.width='13px';a.style.height='13px';btn.appendChild(t);btn.appendChild(a);}function close(){wrap.classList.remove('open');list.style.cssText='';document.removeEventListener('mousedown',onOut);window.removeEventListener('scroll',place,true);window.removeEventListener('resize',place);}function onOut(e){if(!wrap.contains(e.target))close();}function place(){var r=btn.getBoundingClientRect();list.style.position='fixed';list.style.left=r.left+'px';list.style.minWidth=r.width+'px';var below=window.innerHeight-r.bottom,lh=Math.min(list.scrollHeight,260);if(below<lh+14&&r.top>below){list.style.top=(r.top-lh-4)+'px';}else{list.style.top=(r.bottom+4)+'px';}}function openList(){list.innerHTML='';Array.prototype.forEach.call(sel.options,function(o){var d=document.createElement('div');d.className='vgdd-o'+(o.selected?' on':'');d.textContent=o.textContent;d.addEventListener('mousedown',function(e){e.preventDefault();e.stopPropagation();sel.value=o.value;sync();sel.dispatchEvent(new Event('change',{bubbles:true}));close();});list.appendChild(d);});wrap.classList.add('open');place();setTimeout(function(){document.addEventListener('mousedown',onOut);window.addEventListener('scroll',place,true);window.addEventListener('resize',place);},0);}btn.addEventListener('click',function(e){e.stopPropagation();wrap.classList.contains('open')?close():openList();});sync();});}
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
  /* La panoplie s'ALLUME sur la silhouette : les pieces qui appartiennent a
     l'ensemble le plus porte gardent un liseré dore. C'est ce qui fait qu'on voit
     « il m'en manque une » sans lire un compte. */
  const pan=(e&&e.item&&_panSigActive(slot)&&_panSigActive(slot)===panSigDe(slot,e.item))?' panon':'';
  return `<div class="slot ${small?'small':''}${e?' plein':''}${pan}"${teinte} onclick="openPick('${slot}')" onmouseenter="itipSlot(event,'${slot}')" onmousemove="itipMove(event)" onmouseleave="itipHide()" aria-label="${esc(cfg.lbl)}">${badge}${rk}${inner}<span class="lbl">${esc(cfg.lbl)}</span></div>`;}catch(_e){const cf2=SLOTS[slot]||{lbl:slot};return `<div class="slot" onclick="openPick('${slot}')" aria-label="${esc(cf2.lbl)}"><span class="ico"><i class=vgi-alert></i></span><span class="lbl">${esc(cf2.lbl)}</span></div>`;}}

/* La signature de l'ensemble le plus porte, calculee UNE fois par rendu.
   `slotHTML` est appele vingt fois : sans ce cache, on rebalayait les 256
   armures du releve a chaque emplacement. Le jeton est remis a zero en tete de
   `render()`. */
var _panJeton=null,_panVu={};
function _panSigActive(slot){
  const mode=FASHION.indexOf(slot)>=0;const k=mode?'M':'A';
  if(_panVu.jeton!==_panJeton){_panVu={jeton:_panJeton};}
  if(_panVu[k]===undefined){
    let p=null;try{p=panEtat(mode);}catch(x){}
    _panVu[k]=(p&&p.portees>=2)?p.sig:'';
  }
  return _panVu[k];
}

function render(){
  var _pt=document.getElementById('ptabs');if(!_pt){if((render._n=(render._n||0)+1)<90)requestAnimationFrame(render);return;}render._n=0;vgSyncChip();
  _panJeton=(_panJeton||0)+1;
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
  /* Sous le pantin : les MESURES du stuff, obligatoires. Elles remplacent le
     resume du build, retire a la demande de Maxime. */
  renderMesures();mesPastilles();
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
/* ═══ LES DESSINS DES CARTES, DANS LE CARNET DES ARCANES ═════════════════════
   MESURE AVANT : le builder servait ZERO illustration de carte. Quinze carnets,
   soixante-trois listes de noms — pour un objet qu'on reconnait en jeu a son
   dessin, jamais a son intitule.

   LE JOINT EST DEJA FAIT, ET IL EST FAIT PAR SIGNATURE. Chaque carte du releve
   porte son champ `art` (data.json ▸ CARNETS), pose en amont par
   src/data/carnets-arcanes.json — « par la signature des cartes, PAS par
   l'index : les deux numerotations different, le carnet 5 du fait-main est le
   15e du client ». On LIT donc ce champ ; on ne recalcule ni ne devine un nom de
   fichier ici, et surtout pas une position dans le dossier.

   LES 63 CARTES ONT LEUR DESSIN, ET LES QUATRE DERNIERES ONT ETE RETROUVEES
   TARD. Le client nomme ses dessins par rang de paquet
   (`couleur_ii_sys_sys_monsterdeck_37.webp`), et c'est ce nom que `decks` porte ;
   quatre cartes n'ont pas de rang, leur fichier etant nomme d'apres la carte
   elle-meme (`couleur_sasha_bck.webp`). Le client ne les rattachait a rien, donc
   `art` restait nul et le carnet servait quatre cadres vides — une consigne
   avait meme conclu a tort qu'elles n'avaient pas de dessin.
   `scripts/fusionner-carnets.mjs` porte maintenant un REPLI PAR NOM DE CARTE qui
   ne s'applique QUE si le fichier est sur le disque : on ne devine jamais une
   adresse, et une carte sans dessin resterait sans dessin. Le cadre vide et son
   survol restent en place pour ce cas-la.
   ON NE PRETE PAS le dessin d'une voisine : ce serait un mensonge muet, comme le
   bouquet de fleurs servi sur 265 fiches de monstre.

   UN SEUL FICHIER PAR DESSIN. Le dossier porte aussi les 59 memes dessins en
   noir et blanc (`nb_…`), verifies a l'ecran : c'est le meme dessin desature et
   assombri. Une carte d'un carnet qu'on ne possede pas est donc grisee PAR LA
   CSS — pas par un second telechargement du meme dessin sous un autre nom.

   `loading="lazy"` N'EST PAS UNE PRECAUTION DE STYLE, ET LE CHIFFRE EST CELUI DES
   FICHIERS SERVIS. Les 59 illustrations de public/jeu/cartes pesent 443 826
   octets en tout — 7 522 o en moyenne, 10 236 o pour la plus lourde. Soit 433 ko
   demandes d'avance pour un carnet qui est EN BAS DE PAGE, a comparer aux 440 ko
   de airbuilder.js, data.json et la CSS reunis : on doublerait le poids du
   builder pour des dessins que la plupart des visiteurs ne feront jamais
   defiler. Le navigateur ne les demande qu'en approchant.
   MESURE PRISE SUR LES .webp DU DEPOT, PAS SUR UNE CONVERSION : ouvrir une de
   ces cartes en PNG pour la regarder donne ~50 ko, sept fois le poids du fichier
   reellement telecharge. C'est le .webp qui part sur le reseau. */
function carteArts(cn){
  var l=(cn&&cn.cartes)||[];
  if(!l.length)return '';
  return '<div class="cc-arts">'+l.map(function(ca){
    var t=(ca.nom||'')+(ca.rarete?' · '+ca.rarete:'')
      +(ca.art?'':' — aucun dessin dans le relevé du client');
    return '<span class="cc-a r-'+String(ca.rarete||'').toLowerCase()+'" title="'+escA(t)+'">'
      +(ca.art?'<img src="/jeu/cartes/'+encodeURIComponent(ca.art)+'" alt=""'
          +' width="110" height="250" loading="lazy" decoding="async" onerror="this.remove()">'
        :'')+'</span>';
  }).join('')+'</div>';
}
function renderCarnets(){const c=C();ST();
  document.getElementById('carnetsPanel').innerHTML=`<h3><i class=vgi-book></i> Carnets des Arcanes — ${esc(c.name)} <span style="color:var(--mut);font-weight:400;font-size:12px;text-transform:none">liés au personnage, partagés entre ses stuffs</span></h3>
   <div class="carnets">${CARNETS.map((cn,i)=>{const on=(c.carnets||[]).includes(i);const full=(c.carnetsFull||[]).includes(i);
     /* LE CARNET DONNE TOUTES SES LIGNES. Cinq carnets du releve donnent de
        l'Experience, du Taux de butin ou des Penyas gagnes, et un filtre pose
        ici les effacait — 14 lignes. Deux d'entre eux — « Jour de chance » et
        « Clefs de la reussite » — N'ONT QUE ça : ils s'affichaient donc comme ne
        donnant rien, alors que c'est tout leur interet. Ces lignes sont l'EFFET
        du carnet equipe, pas un butin qu'on ramasse : voir la distinction ecrite
        dans le bloc « CE QU'ON RAMASSE ≠ CE QUE L'EQUIPEMENT DONNE ». */
     const bonus=(full?cn.complet:cn.base);
     return `<div class="carn ${on?'on':''}" style="border-left:3px solid ${cn.col};box-shadow:inset 14px 0 22px -16px ${cn.col}">
         <div class="cn" onclick="toggleCarnet(${i})">${etuiHtml(cn.etui_couleur,cn.col)}${esc(cn.nom)}</div>
         <div style="font-size:11px;color:var(--mut);margin-bottom:4px">Étui ${esc(cn.etui_couleur)} · ${esc(cn.rarete)} · ${cn.tier===1?'1 carte de chaque (set complet)':cn.copies+' carte(s) de chaque'}</div>
         ${carteArts(cn)}
         <div class="cc-cards">${cn.cartes.map(ca=>`<span class="cc-card r-${(ca.rarete||'').toLowerCase()}">${esc(ca.nom)}</span>`).join('')}</div>
         ${on&&cn.tier>1?`<div class="seg"><div class="sg ${!full?'on':''}" onclick="setMode(${i},false)"><i class=vgi-star></i> Base</div><div class="sg ${full?'on':''}" onclick="setMode(${i},true)"><i class=vgi-star></i> Complet</div></div>`:''}
         ${bonus.length?`<div class="cb">${bonus.map(b=>esc(b[0])+' +'+b[1]).join(' · ')}</div>`:''}</div>`;}).join('')}</div>`;}
/**
 * LE TOTAL DU BUILD — ce qui s'additionne vraiment.
 *
 * Il ne s'affiche plus : le resume du build a ete retire le 2026-10-20 (Maxime :
 * « inutile »), remplace par les MESURES du stuff. Mais il part toujours vers
 * /api/characters/sync (GuildViewer, Compositions, Dashboard), d'ou le soin
 * qui suit. Cette fonction appelait `weaponTotals()`, QUI N'A JAMAIS EXISTE
 * dans le moteur : le perçage a remplace l'appel fantome.
 *
 * CE QUI EST COMPTE, et rien d'autre :
 *   · les bonus propres de chaque piece (`b` du releve) ;
 *   · les cartes de perçage, dont la table de valeurs est dans ce moteur
 *     (PIERCECARD) — sur les QUATRE emplacements qui se percent, pas la seule
 *     arme comme le voulait l'appel d'origine ;
 *   · le bonus de set du costume, une seule fois, aux quatre pieces portees ;
 *   · les carnets des arcanes.
 * L'eveil, le scroll et le sertissage ne le sont PAS : le builder retient la
 * STATISTIQUE choisie, jamais la valeur obtenue, et un total invente se
 * comparerait entre deux builds comme s'il etait mesure. Le panneau porte donc
 * sa legende, qui dit ce que le nombre couvre.
 */
/* ═══════════════ LES PALIERS D'ACCESSOIRE, CHARGES A LA DEMANDE ═══════════════
   Le builder laissait les bijoux hors du total : un anneau a +30 ne comptait pour
   rien, alors que le client ECRIT ce qu'il donne a chaque palier. Le releve fait
   131 Ko, donc il ne part PAS dans data.json (qui, lui, est inline dans la page) :
   on le va chercher au premier bijou ameliore, une fois, et on redessine.

   POURQUOI UN SEUL RENDU DE PLUS, et pas un par appel : `_palP` retient la
   promesse. Sans elle, un stuff a cinq bijoux lancait cinq requetes et cinq
   rendus, et le panneau clignotait. */
var _pal=null,_palP=null;
function paliersBijoux(){
  if(_pal)return _pal;
  if(!_palP){_palP=fetch('/airbuilder/paliers.json').then(function(r){return r.json();})
    /* LE PANNEAU SE REDESSINE, ET LE TOTAL PUBLIE SE REFAIT AUSSI. Redessiner ne
       suffisait pas : `totals()` part aussi vers /api/characters/sync (GuildViewer,
       Compositions, Dashboard) par vgPushCloud, et le premier appel — celui qui
       lance cette requete — rend un total AMPUTE de tous les paliers de bijou.
       Mesure : Boucles d'Oreille Harpe +30 seules, 1500 au premier appel contre
       2500 apres. Sans ce rappel, c'est l'amputation qui restait en base jusqu'a
       la prochaine modification du build. */
    .then(function(d){_pal=d||{bijoux:{}};
      try{if(typeof vgPushCloud==='function')vgPushCloud();}catch(x2){}
      /* LE PANNEAU DU BIJOU AUSSI. Il lit maintenant ce releve pour trois choses
         que rien d'autre ne donne — le plafond de CET objet, ce que le palier
         atteint rapporte, et les plateaux. Rien d'autre ne redessine la
         fenetre de choix : sans ce rappel, le panneau ouvert au moment de la
         requete restait sur le plafond par defaut. Limite aux emplacements de
         bijou pour ne pas redessiner sous les doigts d'une recherche en cours
         ailleurs. */
      try{if(pickSlot&&BIJOUX.indexOf(pickSlot)>=0)drawPick(curQ());}catch(x3){}
      /* LA BULLE AUSSI : c'est elle qui montre le palier du bijou, et elle vit
         hors du panneau que `drawPick` vient de refaire. Ouverte avant l'arrivee
         du releve, elle afficherait le bonus de base seul — le defaut meme qu'on
         repare deux fonctions plus bas. */
      try{itipRefresh();}catch(x4){}
      return _pal;})
    /* Un releve injoignable ne doit pas vider le panneau : on retient un objet
       vide, le terme part en « non compte » et le reste du total tient. */
    .catch(function(){_pal={bijoux:{}};return _pal;});}
  return null;
}
/* LES CINQ EMPLACEMENTS DE BIJOU, ECRITS UNE FOIS. La liste etait recopiee a
   l'identique a SEPT endroits — le total, le panneau, les valeurs par defaut,
   le rappel de `paliersBijoux()` — et un emplacement ajoute a six d'entre eux
   serait passe inapercu dans le septieme. Meme raison que les nombres : ce qui
   est ecrit deux fois finit par diverger. */
const BIJOUX=['ring1','ring2','earring1','earring2','necklace'];
/** Les bonus qu'un bijou donne AU PALIER ATTEINT. Le palier REMPLACE, il ne
 *  s'additionne pas : on lit la seule case du rang, jamais la somme des rangs.
 *  La preuve est dans le releve — 78 paliers y recopient a l'identique le
 *  precedent, ce qu'un cumul rendrait absurde. */
function bonusDePalier(item,up){
  if(!item||!up)return null;
  var p=paliersBijoux();if(!p)return null;
  var b=p.bijoux&&p.bijoux[String(item.id)];if(!b||!b.rangs)return null;
  var r=b.rangs[Math.min(up,b.plafond||up)];
  return (r&&r.length)?{lignes:r,plafond:b.plafond,cle:b.cle}:null;
}

/**
 * CE QUE LE PALIER D'UN BIJOU DONNE — et les deux choses que le jeu ne dit pas.
 *
 * `bonusDePalier` rend la valeur pour le total. Celle-ci rend ce qu'il faut pour
 * l'AFFICHER honnetement, et rien n'y est ecrit a la main :
 *
 *  · `plafond` — 20 pour la plupart, 30 pour quelques-uns. C'est une propriete
 *    DE L'OBJET : le curseur d'un bijou a +20 ne doit pas proposer +30, sinon on
 *    croit avoir pose un palier qui n'existe pas pour lui.
 *  · `plateau` — le palier atteint recopie A L'IDENTIQUE le precedent. Monter
 *    d'un cran ne rapporte alors RIEN, et c'est le renseignement qui evite une
 *    depense. `suivant` dit ou se trouve le prochain palier qui change vraiment.
 *  · `vide` — le client n'ecrit aucun palier pour ce bijou : l'ameliorer ne lui
 *    ajoute rien du tout dans le releve.
 *
 * `combienAuPlafond` compte les bijoux de CHAQUE plafond sur le releve entier :
 * « 6 montent a 30 » est un nombre lu, pas un nombre recopie.
 */
function bijouPaliers(item,up){
  var p=paliersBijoux();if(!p||!p.bijoux)return null;
  var b=p.bijoux[String(item&&item.id)];if(!b||!b.rangs)return null;
  var plaf=b.plafond||(b.rangs.length-1);
  var cle=function(i){return JSON.stringify(b.rangs[i]||[]);};
  /* UN PLATEAU EST UN RANG QUI RECOPIE LE PRECEDENT — PAS DEUX TROUS DE SUITE.
     Le relevé compte les siens avec cette réserve (scripts/completer-airbuilder-
     data.mjs : `if (lignes.length && sig === precedent)`), et c'est de là que
     sort le 78 affiché dans la même phrase. Sans la réserve, les trois bijoux
     « de débutant » — dont les vingt rangs sont VIDES — annonçaient « 20 paliers
     de ce bijou recopient à l'identique le précédent » deux lignes au-dessus de
     « le client n'écrit AUCUN palier pour ce bijou ». Deux définitions dans une
     seule phrase : ici on suit celle du relevé. */
  var plein=function(i){var r=b.rangs[i];return !!(r&&r.length);};
  var estPlateau=function(i){return i>0&&plein(i)&&cle(i)===cle(i-1);};
  var n=Math.max(0,Math.min(up|0,plaf));
  var suivant=0;for(var i=n+1;i<=plaf;i++){if(cle(i)!==cle(n)){suivant=i;break;}}
  var np=0;for(var j=1;j<=plaf;j++)if(estPlateau(j))np++;
  return {plafond:plaf,n:n,lignes:b.rangs[n]||[],
    vide:b.rangs.every(function(r){return !r||!r.length;}),
    plateau:estPlateau(n),suivant:suivant,plateaux:np};
}
/** Le nombre de plateaux de TOUT le releve, tel que le releve le porte
 *  lui-meme. Zero si le fichier n'est pas encore la — la phrase se passe alors
 *  du nombre plutot que d'en inventer un. */
function totalPlateaux(){
  var p=paliersBijoux();
  return (p&&p.plateaux&&p.plateaux.combien)||0;
}
/** Combien de bijoux du releve s'arretent a chaque plafond. */
function combienAuPlafond(){
  var p=paliersBijoux();if(!p||!p.bijoux)return null;
  var r={};for(var k in p.bijoux){var f=p.bijoux[k].plafond||0;r[f]=(r[f]||0)+1;}
  return r;
}

/* ═════════════ LES DESSINS DU JEU ════════════════════════════════════════════
   `MECH` porte exactement les concepts que le dossier d'assets dessine —
   percage, sertissage, artefact, rarete, eveil, upgrade, panoplies — et le
   moteur n'en montrait aucun : un joueur qui posait une carte d'element lisait
   le mot « Feu » au lieu de voir la carte qu'il doit acheter.

   LA TABLE SE CHARGE A PART, ET C'EST UNE CONTRAINTE, PAS UN GOUT. `data.json`
   est injecte EN LIGNE dans le document (BuilderRunner.tsx) : tout ce qu'on y
   ajoute est paye par chaque visiteur avant le premier affichage. Meme modele
   que `paliersBijoux()` — promesse memorisee, repli sur un objet vide si le
   fichier est injoignable, et LE RENDU EST RAPPELE A L'ARRIVEE, sans quoi les
   panneaux deja dessines restent sans image.

   CE QUI N'EST PAS RAPPELE, ET POURQUOI : `vgPushCloud()`. Le rappel de
   publication existe sur `paliersBijoux()` parce que cette table-la CHANGE LE
   TOTAL — un total ampute partait en base. Celle-ci ne porte que des dessins et
   des phrases : aucun nombre n'en depend, republier ne corrigerait rien et
   enverrait un POST de plus a chaque premiere visite.

   LA REQUETE PART AU DEMARRAGE (voir l'appel en fin de fichier) : le premier
   panneau ouvert a deja ses images, et le rappel ne sert plus que de filet. */
var _meca=null,_mecaP=null;
function mecaniques(){
  if(_meca)return _meca;
  if(!_mecaP){_mecaP=fetch('/airbuilder/mecaniques.json').then(function(r){return r.json();})
    .then(function(d){_meca=d||{};
      try{render();}catch(x){}
      /* La fenetre de choix ne se redessine pas avec `render()` : c'est
         pourtant elle qui porte les panneaux de configuration, donc la
         quasi-totalite des images de cette table. */
      try{if(pickSlot)drawPick(curQ());}catch(x2){}
      /* La bulle porte desormais la maitrise, l'eveil chiffre et le parchemin
         d'ascension : elle depend de cette table autant que les panneaux. */
      try{itipRefresh();}catch(x3){}
      return _meca;})
    .catch(function(){_meca={};return _meca;});}
  return null;
}
/** Un attribut HTML : `esc` ne touche pas aux guillemets, et les phrases du
 *  client sont recopiees telles quelles dans des `title`. */
function escA(s){return esc(s).replace(/"/g,'&quot;');}
/** Le libelle d'un objet du jeu : son nom, et la phrase du client dessous. */
function mecaTitre(o){return o?((o.n||'')+(o.d?' — '+o.d:'')):'';}
/**
 * Une entree de la table en image — ou RIEN.
 *
 * Rien du tout, et pas une image cassee : sur une planche de mecaniques un
 * dessin manquant se lit comme un objet qui n'existe pas dans le jeu. Le moteur
 * garde donc partout son repli d'avant (une icone de trait) quand la table n'a
 * pas la ligne.
 */
function mecaIc(o,cls){
  if(!o||!o.f)return '';
  var t=mecaTitre(o);
  return '<img class="'+(cls||'ghic')+'" src="'+o.f+'" alt=""'+(t?' title="'+escA(t)+'"':'')+'>';
}
/** La table, ou un objet vide tant qu'elle n'est pas arrivee. */
function meca(){return mecaniques()||{};}
/** Les faits releves sur le client. Meme contrat que `meca()` : un objet vide
 *  tant que la table n'est pas la, jamais `undefined` a dereferencer. */
function faits(){return meca().faits||{};}
/* LE PLAFOND DE MAITRISE SE LIT, IL NE S'ECRIT PAS. Le « 100 » etait pose a la
   main a DEUX endroits — la pastille de la bulle et le curseur du panneau — et
   le repli du panneau visait `maitrise.niveauMax`, une cle qui N'EXISTE PAS :
   le releve range le nombre sous `maitrise.niveau.max`. Les deux ecrans
   affichaient donc la constante du fichier, jamais celle du client, et un
   plafond deplace dans le relevé ne serait apparu nulle part.
   Le repli a 100 reste pour l'instant ou la table n'est pas encore arrivee —
   sans lui le curseur afficherait « 50/ » pendant le chargement.
   CE MAXIMUM EST CELUI DE LA COURSE DU CURSEUR, PAS CELUI D'UNE ARME. Le niveau
   qu'une arme peut reellement atteindre depend de sa rarete : c'est
   `maitrisePlafond(tier)`, et c'est lui que la pastille de la bulle affiche. */
function maitriseMax(){
  var M=faits().maitrise;
  return (M&&M.niveau&&M.niveau.max)||100;
}

/* ═════════ LE JOINT : UNE ARME DU CATALOGUE -> LES TABLES DU CLIENT ═════════
   `data.json ▸ ITEMS.weapon` ne porte qu'un id numerique. Tout le reste du
   client est range par CLE (II_WEA_SWO_LUZA) ou par TYPE (WEAPON_ONESWORD) :
   sans table de correspondance, une arme du builder ne peut etre reliee ni a sa
   maitrise, ni a son vivier de rarete, ni a son parchemin d'ascension.
   `faits.armes` est cette table, et elle couvre 43 des 45 armes du catalogue.

   LES DEUX QUI MANQUENT RENDENT `null`, ET C'EST VOULU. L'Arc de Luzaka oublie
   DPS et TANK portent un identifiant invente par le builder, que le releve du
   client ne connait pas. L'ecran doit alors ecrire « non renseigne » : leur
   preter la maitrise ou la famille de l'arme voisine serait une invention. */
function armeFait(item){
  var A=faits().armes;
  return (A&&item&&item.id!=null)?(A[String(item.id)]||null):null;
}

/* ═════════ L'ORDRE DES RARETES, LU ET NON RECOPIE ═══════════════════════════
   `MECH.arme.rarete_tiers` porte les six paliers dans l'ordre, et
   `faits.rarete.codes` fait le pont avec les codes du client (Commun -> NONE
   ... Mythique -> MYTHIC). Comparer deux raretes revient donc a comparer deux
   rangs DANS CETTE LISTE : aucune echelle n'est ecrite ici, et en ajouter un
   palier au releve suffit a la deplacer. */
function rangRarete(tier){return (MECH.arme.rarete_tiers||[]).indexOf(tier);}
function rareteDuCode(code){
  var C=(faits().rarete||{}).codes||{};
  for(var t in C)if(C[t]===code)return t;
  return '';
}

/* ═════════ LA MAITRISE D'ARME — UN GAIN PAR PALIER, PLAFONNE PAR LA RARETE ══
   CE BLOC A DIT LE CONTRAIRE DE LA VERITE, ET VOICI CE QUI MANQUAIT.

   Il lisait le `4` du client comme LE TOTAL de la ligne et en concluait « la
   rarete allume, elle ne fait pas monter ». Ce `4` est un GAIN PAR PALIER DE DIX
   NIVEAUX, il se CUMULE, et c'est la rarete qui plafonne le niveau de maitrise —
   donc le nombre de paliers qu'on peut franchir. La progression que l'ecran
   niait est celle-la : 0 · 16 · 24 · 32 · ? · 40 pour une ligne a 4.

   TROIS FAITS DU RELEVE QUE L'ECRAN NE DOIT PAS DEBORDER :

   1. RIEN NE SE MULTIPLIE ICI QUI PUISSE SE LIRE AILLEURS. `faits.maitrise`
      porte `pas` (dix), `plafondNiveau` par rarete et `echelle` — le total
      atteignable, deja calcule, par gain par palier et par rarete. L'ecran lit
      ces nombres ; il n'en fabrique aucun.
   2. LE PRE-MYTHIQUE N'A PAS DE PLAFOND PUBLIE. Le wiki nomme cinq plafonds et
      saute celui-la, alors que ses propres pages et `MECH.arme.rarete_tiers` en
      declarent SIX. `plafondNiveau.PREMYTHIC` vaut donc `null` et l'ecran ecrit
      « non renseigne » : interpoler entre 80 et 100 serait une invention.
   3. LA LIGNE NOMMEE L'EMPORTE SUR LA LIGNE DE TYPE, elle ne s'y ajoute pas.
      Treize armes recoivent une ligne a leur nom TOUT EN AYANT une ligne de
      type ; `faits.armes[].mai` ne retient que celle qui s'applique et nomme
      l'ecartee a cote. Les additionner donnerait a l'Epee eternelle des degats
      critiques que le client ne lui accorde pas. */
function maitriseFaits(){return faits().maitrise||{};}
/** Le pas du palier : un versement tous les N niveaux. Lu, jamais pose ici — un
 *  pas absent rend 0, et tout le bloc retombe alors a zero au lieu d'inventer. */
function maitrisePas(){var p=maitriseFaits().pas;return (p>0)?p:0;}
/** Le code du client pour un palier du builder (« Mythique » -> MYTHIC). */
function maitriseCode(tier){return (((faits().rarete||{}).codes)||{})[tier];}
/** Le plafond de NIVEAU de maitrise qu'accorde une rarete, ou `null` quand il
 *  n'est pas publie (Pre-Mythique). */
function maitrisePlafond(tier){
  var p=(maitriseFaits().plafondNiveau||{})[maitriseCode(tier)];
  return (typeof p==='number')?p:null;
}
/** Les paliers FRANCHIS a ce niveau et a cette rarete, ou `null` quand la rarete
 *  n'a pas de plafond publie : sans plafond, on ne sait pas si le niveau regle
 *  est seulement atteignable, et le compter reviendrait a interpoler. */
function maitrisePaliers(niveau,tier){
  var pas=maitrisePas(),pl=maitrisePlafond(tier);
  if(!pas||pl==null)return null;
  return Math.floor(Math.min(Math.max(0,niveau|0),pl)/pas);
}
/** Le gain d'une ligne, au niveau et a la rarete regles.
 *  `0` quand la rarete ne l'allume pas — une arme commune franchit bien un
 *  palier, le client lui donne 0 par palier. `null` quand le plafond de la
 *  rarete n'est pas publie : un trou, pas un zero. */
function maitriseGain(l,niveau,tier){
  if(!l||!l.pp)return 0;
  var n=maitrisePaliers(niveau,tier);
  if(n==null)return null;
  return maitriseAllumee(l,tier)?(l.pp*n):0;
}
/** Le gain d'une ligne, ecrit : « +32 », « — » ou « ? ». */
function maitriseTexte(g){return (g==null)?'?':(g?'+'+g:'—');}
/** Le total ATTEIGNABLE d'une ligne a une rarete donnee, LU dans l'echelle du
 *  releve. `null` quand la rarete n'a pas de plafond publie. */
function maitriseAtteignable(l,tier){
  var e=(maitriseFaits().echelle||{})[String(l&&l.pp)];
  var v=e?e[maitriseCode(tier)]:undefined;
  return (typeof v==='number')?v:null;
}
function maitriseDe(item){
  var M=faits().maitrise,j=armeFait(item);
  if(!M||!j||!j.mai)return null;
  var nomme=(j.mai[0]==='o');
  var lignes=((nomme?M.parObjet:M.parType)||{})[j.mai[1]]||[];
  if(!lignes.length)return null;
  /* L'ECARTEE SE DIT EN FRANCAIS, PAS EN CODE MACHINE. `mai[2]` porte la cle du
     TYPE (WEAPON_ONESWORD) ; ce qui interesse le joueur, c'est la ligne que ce
     type lui aurait donnee. On la resout donc dans `parType` — et si elle n'y
     est pas, on ne montre rien plutot qu'un identifiant. */
  var ec=nomme?(((M.parType||{})[j.mai[2]])||[]):[];
  return {lignes:lignes,nomme:nomme,ecartee:ec,dit:M.dit||''};
}
/** Les libelles d'une liste de lignes de maitrise, avec CE QU'ELLES VALENT au
 *  niveau et a la rarete regles — et non le gain d'un seul palier, qui se
 *  lisait comme un total. */
function maitriseMots(lignes,niveau,tier){
  return (lignes||[]).map(function(l){return l.fr+' '+maitriseTexte(maitriseGain(l,niveau,tier));}).join(' · ');
}
/** Une ligne de maitrise est-elle allumee au palier choisi ? Le seuil vient de
 *  la ligne elle-meme (`des`), pas d'une constante posee ici. */
function maitriseAllumee(l,tier){
  var seuil=rangRarete(rareteDuCode(l&&l.des)),ici=rangRarete(tier);
  return (seuil>=0&&ici>=0&&ici>=seuil);
}
/** L'ECHELLE D'UNE LIGNE, RARETE PAR RARETE : ce que chacune permet d'atteindre.
 *  C'est la progression que l'ecran doit montrer, et elle est LUE. */
function maitriseEchelle(l){
  return ((MECH.arme&&MECH.arme.rarete_tiers)||[]).map(function(t){
    return {tier:t,max:maitriseAtteignable(l,t),niveau:maitrisePlafond(t)};});
}
/** La phrase du plafond, pour la rarete reglee. Elle protege d'un geste couteux :
 *  monter la maitrise au-dela du plafond de sa rarete ne rapporte rien. */
function maitrisePhrasePlafond(niveau,tier){
  var pl=maitrisePlafond(tier),pas=maitrisePas();
  /* LE PRE-MYTHIQUE : LE SEUL TROU, ET IL EST DIT. Le wiki nomme cinq plafonds
     et saute celui-la, alors que sa page « Rareté de l'arme » et
     `MECH.arme.rarete_tiers` en declarent SIX. Interpoler entre 80 et 100 pour
     boucher le trou donnerait un nombre qu'aucune source n'ecrit. */
  /* LE COMPTE DES SOURCES EST SORTI DE LA PHRASE. « Le wiki en nomme cinq et
     saute celui-la, alors que le client declare bien six raretes » explique d'ou
     vient le trou ; le tableau juste en dessous le MONTRE deja, ligne
     Pre-Mythique, colonne « non renseigne ». Reste le fait, et lui seul. */
  if(pl==null)return esc(tier)+' : aucune source ne publie son plafond de maîtrise — le gain reste <b>non renseigné</b> ici.';
  /* DEUX COMPTES QU'ON NE CONFOND PAS, ET LA CONFUSION A ETE VUE A L'ECRAN.
     `na` = les paliers QUE LA RARETE ACCORDE ; `nf` = ceux DEJA FRANCHIS au
     niveau regle. La phrase annonce un PLAFOND : c'est `na` qui doit y figurer.
     Elle portait `nf`, et disait donc « Rare plafonne la maîtrise à 40 — 2
     paliers » a maitrise 25, en contradiction directe avec le tableau juste en
     dessous qui accorde +16 a Rare, soit quatre paliers. Le franchi se dit a
     part, apres la virgule, tant qu'il reste du chemin.
     `na` est LU dans la table (`paliersAtteignables`, calcule sur le plafond) :
     aucun compte n'est refait ici. */
  var na=(maitriseFaits().paliersAtteignables||{})[maitriseCode(tier)];
  var nf=maitrisePaliers(niveau,tier);
  return esc(tier)+' plafonne la maîtrise à <b>'+pl+'</b> — '+na+' palier'+(na>1?'s':'')+' de '+pas+' niveaux'
    +(((niveau|0)>pl)?', et le niveau réglé les dépasse déjà : au-delà, rien de plus.'
      :((nf<na)?', dont <b>'+nf+'</b> franchi'+(nf>1?'s':'')+'.':'.'));
}

/* ═════════ L'EVEIL CHIFFRE — DEUX SERIES QU'ON NE MELANGE PAS ═══════════════
   Le builder retient LA LIGNE (R1 ou R2) et LA STATISTIQUE. Il ne retient ni la
   valeur obtenue, ni LA VOIE empruntee — et le client en a deux, qui ne donnent
   pas les memes nombres :

     · le parchemin ORDINAIRE tire au sort, et le client ecrit sur le parchemin
       lui-meme que « les proprietes peuvent etre negatives ». Le seul chiffre
       disponible est alors un PLAFOND par statistique (MECH.arme.eveil : Force
       15), pas un gain.
     · les parchemins d'eveil FIXE chiffrent le gain — Force R1 30, R2 60 — et
       leur R2 vaut exactement le double du R1 sur les 11 lignes, sans exception.

   Le fixe vaut DEUX A QUATRE FOIS le plafond du tirage. Poser un nombre nu a
   cote de la statistique reviendrait donc a choisir une voie a la place du
   joueur : chaque serie est NOMMEE, ou elle ne s'affiche pas. C'est la meme
   reserve que `totalsDetail`, qui range l'eveil parmi les termes non comptes. */
function eveilChiffre(stat){
  if(!stat)return null;
  var E=faits().eveil||{},L=(E.fixe&&E.fixe.lignes)||[],fixe=null;
  for(var i=0;i<L.length;i++)if(L[i].fr===stat){fixe=L[i];break;}
  var plaf=(MECH.arme.eveil||{})[stat];
  return (fixe||plaf!=null)?{fixe:fixe,plafond:(plaf!=null?plaf:null)}:null;
}

/* ═════════ L'ESPRIT DE LA FEE — UN CURSEUR QUI NE PRODUIT RIEN ══════════════
   Le builder pose un curseur 0 -> 50 sur une piece dont le tableau de bonus est
   VIDE : le niveau ne rapporte rien au total, et rien ne le disait. Le client,
   lui, chiffre cinq paliers par esprit.

   L'APPARIEMENT N'EST PAS UNE DEVINETTE : la piece du catalogue s'appelle
   « Elerina, Esprit de la vigueur et de la magie » et le releve range ses
   paliers sous « Elerina ». On compare donc le nom AVANT la virgule a la cle du
   releve — egalite stricte, pas un prefixe. LES CINQ FEES DU CATALOGUE SONT
   TOUTES DANS LE RELEVE, Goldea comprise : le repli `null` existe pour une
   piece que le client ne nommerait pas, il ne sert aujourd'hui a aucune. */
function espritDe(item){
  var L=(faits().esprit||{}).esprits;
  if(!L||!item||!item.n)return null;
  var nom=String(item.n).split(',')[0].trim();
  for(var i=0;i<L.length;i++)if(L[i].n===nom)return L[i];
  return null;
}
/** Le palier atteint par un niveau de fee : le DERNIER seuil franchi, pas la
 *  somme des precedents — meme regle que les paliers de bijou. */
function espritPalier(esp,niv){
  var p=(esp&&esp.paliers)||[],at=null;
  for(var i=0;i<p.length;i++)if((niv|0)>=p[i][0])at=p[i];
  return at;
}
/** Le PROCHAIN seuil, celui qu'on n'a pas encore franchi, ou `null` au bout. */
function espritSuivant(esp,niv){
  var p=(esp&&esp.paliers)||[];
  for(var i=0;i<p.length;i++)if((niv|0)<p[i][0])return p[i];
  return null;
}
/* ═══ CE QUE COUTE LE PROCHAIN PALIER — LA SEULE QUESTION QUI COMPTE ═════════
   « J'en suis au 27, il me faut combien pour aller au 40. » La page Craft et
   Collections repond a ca avec un calculateur (src/components/collections/
   Anges.tsx) ; ce fichier est du JS nu et ne peut pas importer le composant, il
   reprend donc la MEME LECTURE DE LA GRILLE, celle qui compte :

   `couts[i]` PAIE LE PASSAGE DU NIVEAU i+1 AU NIVEAU i+2. La grille porte 49
   entrees pour 50 niveaux — un niveau de plus que de passages — et leur somme
   vaut exactement le `cumul` que le releve donne par esprit. Se tromper d'un
   cran ici afficherait un prix faux sans que rien ne le signale, d'ou le
   garde-fou : on ne sort jamais de la grille.

   LE NIVEAU 0 EST UNE PIECE NON MONTEE, pas un niveau du client : la grille
   commence au 1. On part donc du 1 dans ce cas — le trajet complet, ce que le
   joueur a effectivement a payer. */
function espritCout(de,a){
  var G=(faits().esprit||{}).couts;if(!G||!G.length)return null;
  var d=Math.max(1,de|0),t=Math.min(a|0,G.length+1),s=0;
  if(t<=d)return 0;
  for(var i=d-1;i<t-1;i++)s+=G[i]||0;
  return s;
}
/** Le cumul depuis le niveau 1, comme la colonne du tableau de Craft. */
function espritCumul(niv){return espritCout(1,niv);}
/** Le nombre en francais, sans dependance : 82132 -> « 82 132 ». */
function nbFr(n){return (n==null)?'':Number(n).toLocaleString('fr-FR');}
/* UN PRIX, SA MONNAIE ET SON DESSIN — jamais un nombre nu. « 3 080 » seul ne dit
   pas en quoi ca se paie, et la poudre feerique ne s'achete pas comme les penyas.
   Le fichier d'icone est celui que la page Craft et Collections sert deja, sous
   le meme nom : pas une seconde copie renommee du meme sac de poudre.
   `onerror` retire l'image plutot que de laisser un cadre casse — le prix, lui,
   reste lisible sans son dessin. */
function poudreHtml(n){
  var E=faits().esprit||{};
  /* PAS de `loading="lazy"` ici, contrairement aux illustrations de cartes : la
     bulle est fabriquee AU SURVOL et l'icone pese deux kilo-octets. Differer sa
     demande la ferait apparaitre apres coup, sous les yeux du joueur, pour
     economiser un aller-retour qui ne se voit pas. Le differe se justifie pour
     les 433 ko de dessins de carte en bas de page, pas pour ce sac de poudre :
     itm_poudre_feerique.webp pese 2 284 octets, mesure sur le fichier. */
  return (E.poudreIc?'<img class="poudic" src="/jeu/icones/'+E.poudreIc+'" alt=""'
      +' width="16" height="16" decoding="async" onerror="this.remove()">':'')
    +'<b>'+nbFr(n)+'</b>'+(E.poudre?' '+esc(E.poudre):'');
}
/* ═══ LES CRANS QUI NE RAPPORTENT RIEN, DIT AVANT LA DEPENSE ═════════════════
   Un palier se franchit tous les dix niveaux. ENTRE DEUX PALIERS, MONTER NE
   CHANGE RIEN A L'EFFET : le curseur bouge, la pastille change, et le joueur
   paie une poudre qui coute jusqu'a 9 999 le cran pour aucun gain.
   C'est la meme famille de mise en garde que les plateaux de palier de bijou —
   celle qui change le GESTE — et elle reste donc a l'ecran (regle 3).
   Elle NE S'AFFICHE PAS quand le cran suivant fait basculer le palier : la, le
   niveau suivant rapporte, et l'avertissement serait faux. */
function espritPlateau(esp,niv){
  var s=espritSuivant(esp,niv);if(!s)return null;
  var de=(niv|0)+1,a=s[0]-1;
  if(a<de)return null;
  return {de:de,a:a,seuil:s[0],cout:espritCout(niv,a)};
}
/* ═══ L'ESPRIT DE LA FEE ARRIVE EN PROSE, ET IL ARRIVE EN ENTIER ═════════════
   Le client n'ecrit pas les paliers d'esprit en couples [nom, valeur] : il ecrit
   « Exp +25% / PvE +1% / Depla +5% / All Stat +10 » d'un seul tenant, et le
   palier 50 de Goldea vaut « Drop +1 / Penyas 35% ». On decoupait donc sur le
   « / » du client pour retirer les segments qui parlent d'experience, de butin
   ou de penyas.

   C'ETAIT LA MEME CONFUSION QU'AILLEURS DANS CE FICHIER, sous une autre forme.
   Ces segments ne decrivent PAS ce qu'un monstre lache : ils decrivent CE QUE
   L'ESPRIT EQUIPE DONNE. Goldea n'a que ça — quatre de ses cinq paliers
   perdaient leur « Exp », et le cinquieme, « Drop +1 / Penyas 35% », se vidait
   ENTIEREMENT. Le seul esprit qu'on monte pour farmer s'affichait comme montant
   vers rien. C'est precisement le geste qu'une omission ne doit pas provoquer.
   Voir la distinction ecrite au long dans le bloc « CE QU'ON RAMASSE ≠ CE QUE L'EQUIPEMENT DONNE ».

   IL RESTE UN TRAITEMENT, ET IL NE RETIRE RIEN : on normalise les espaces autour
   du separateur du client, pour que « Exp +25%/PvE +1% » et « Exp +25% / PvE
   +1% » s'ecrivent pareil a l'ecran. Un segment vide — un « / » final du releve
   — disparait : il n'apporte aucun renseignement. */
function espritTexte(p){
  return String((p&&p[1])||'').split('/')
    .map(function(seg){return seg.trim();})
    .filter(function(seg){return seg;}).join(' / ');
}

/* ═════════════ LE REPERE « INVISIBLE EN JEU » ═══════════════════════════════
   Trois faits de ce panneau ne se voient NULLE PART dans le client : la ligne
   negative d'une panoplie (la fenetre du jeu n'affiche que ce que l'ensemble
   ajoute), le fait qu'un palier de bijou REMPLACE au lieu de s'additionner, et
   les paliers qui recopient le precedent. Ils portent donc une marque commune.

   Le detail s'ouvre AU SURVOL (title) ET AU CLIC : `title` ne s'ouvre pas au
   doigt, et ces trois faits sont ceux qu'un joueur sur telephone a le plus
   besoin de lire avant de depenser.

   La cle est STABLE et non un compteur : `render()` repasse ici a chaque frappe,
   et un compteur ferait grossir la table sans fin. */
var _inv={};
function invisible(cle,texte){
  /* La cle passe dans un attribut `onclick` : tout ce qui n'est pas alphanumerique
     en sort. Une signature de panoplie (« A|Éternel|templier| ») y entre telle
     quelle sans casser l'attribut. */
  var k=String(cle).replace(/[^A-Za-z0-9_-]+/g,'-');
  _inv[k]=texte;
  return '<span class="vginv" role="button" tabindex="0" title="'+escA(texte)
    +'" onclick="event.stopPropagation();invOuvrir(\''+k+'\')"'
    +' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();invOuvrir(\''+k+'\')}">'
    +'<i class=vgi-eye></i> invisible en jeu</span>';
}
function invOuvrir(k){var t=_inv[k];if(t)agInfo(t);}

/**
 * LE RESUME DU BUILD — ce qui s'additionne, ET D'OU CHAQUE POINT VIENT.
 *
 * Cette fonction ne rendait qu'un total par statistique. Un total ne se verifie
 * pas : on ne peut ni le contester, ni retrouver la piece a changer. Elle rend
 * maintenant, pour chaque statistique, la LISTE DE SES APPORTS — la piece qui
 * donne, combien, et le fichier du client d'ou sort le nombre.
 *
 * `totals()` garde sa signature d'avant (statistique → nombre) parce que
 * `exportBuild()` et `vgCollectBuilds()` l'envoient telle quelle a
 * /api/characters/sync : changer sa forme casserait le GuildViewer.
 *
 * CE QUI EST COMPTE, et rien d'autre :
 *   · les bonus propres de chaque piece (`b` du releve) ;
 *   · les cartes de percage, sur les quatre emplacements qui se percent ;
 *   · LE PALIER D'UN BIJOU (nouveau) : le client ecrit ce que chaque palier
 *     donne, et le palier remplace ;
 *   · le bonus de set du costume, une seule fois, aux quatre pieces portees ;
 *   · le bonus de panoplie d'armure a 4/4, LIGNES NEGATIVES COMPRISES ;
 *   · les carnets des arcanes.
 *
 * CE QUI NE L'EST PAS SE DIT A VOIX HAUTE. `absents` rassemble les termes qu'on
 * refuse de chiffrer : le +N d'une arme ou d'une armure (propEnchant.inc ne donne
 * que des coefficients, sans dire ce qu'ils multiplient), l'eveil, le scroll, le
 * sertissage, les gemmes de costume — le builder retient la STATISTIQUE choisie,
 * jamais la valeur obtenue. Un total ampute en silence se compare entre deux
 * builds comme s'il etait complet.
 */
function totalsDetail(){
  var acc={},ordre=[],absents=[];
  function add(stat,v,de,src,cert){
    if(!v||!stat)return;
    if(!acc[stat]){acc[stat]=[];ordre.push(stat);}
    acc[stat].push({de:de,v:v,src:src,cert:cert||'client'});
  }
  function absent(quoi,pourquoi){absents.push({quoi:quoi,pourquoi:pourquoi});}

  var st=ST(),lbl=function(s){return (SLOTS[s]&&SLOTS[s].lbl)||s;};
  for(var s in st.eq){
    var e=st.eq[s];if(!e||!e.item||s==='familier')continue;
    var nom=e.item.n||lbl(s);
    (e.item.b||[]).forEach(function(b){
      add(b[0],b[1],nom,'Bonus propre de la piece — Spec_Item.txt du client, champ b du releve d\'objets.','client');});
    var c=e.cfg;
    if(c&&c.pierce){try{var pt=pierceTotals(c,s);if(pt&&pt.brut)pt.brut.forEach(function(b){
      add(b[0],b[1],nom+' — percage '+(pt.el||''),'Carte de percage posee : la table de valeurs vient du client (cartes '+(pt.el||'')+').','client');});}catch(x){}}
    /* ═══ LA MAITRISE D'ARME ENTRE DANS LE TOTAL, ET C'EST NOUVEAU ═════════
       Elle en etait absente — pas meme rangee parmi les termes non comptes —
       tant qu'on prenait le `4` du client pour un plat sans interet. Le modele
       par palier donne un nombre EXACT : le gain par palier vient du client, le
       nombre de paliers du plafond de niveau publie par le wiki, et le libelle
       est celui que le builder emploie deja pour les bonus propres des pieces
       (« Degats critiques », « PV max % »), donc les points se rejoignent sur la
       meme ligne du resume.
       UN GAIN NUL N'EST PAS UN TERME MANQUANT. Une arme commune, ou une maitrise
       qui n'a pas franchi son premier palier, vaut zero : ajouter zero ne change
       rien et le ranger parmi les « termes non comptes » ferait passer un fait
       connu pour un trou. Le panneau et la bulle disent deja pourquoi.
       LE VRAI TROU, LUI, EST DIT : les deux armes que le releve du client ne
       connait pas n'ont aucune ligne de maitrise, et leur bonus manque
       reellement au total. */
    if(c&&(s==='weapon'||s==='weapon2')){var mzT=maitriseDe(e.item);
      if(mzT)mzT.lignes.forEach(function(l){
        var niv=c.mastery||0,g=maitriseGain(l,niv,c.tier),np=maitrisePaliers(niv,c.tier),pl=maitrisePlafond(c.tier);
        if(g)add(l.fr,g,nom+' — maitrise '+niv,'Maitrise d\'arme : '+l.pp+' par palier de '+maitrisePas()+' niveaux (propweaponleveling.inc du client) x '+np+' paliers franchis, la rarete '+c.tier+' plafonnant la maitrise a '+pl+' (wiki officiel).','client');
        else if(g==null)absent(nom+' — maitrise '+l.fr,'Aucune source ne publie le plafond de maitrise du '+c.tier+' : sans lui le nombre de paliers franchis ne se compte pas, et l\'interpoler depuis les raretes voisines serait une invention.');});
      else if(c.mastery&&!armeFait(e.item))
        absent(nom+' — maitrise '+c.mastery,'Le releve du client ne connait pas cette arme : sa ligne de maitrise est inconnue, et lui preter celle d\'une voisine serait une invention.');}
    /* Le palier d'un bijou : la seule valeur du rang atteint. */
    if(c&&c.up&&BIJOUX.indexOf(s)>=0){
      var bp=bonusDePalier(e.item,c.up);
      if(bp){bp.lignes.forEach(function(l){
        add(l[0],l[1],nom+' +'+c.up,'accessory.inc du client, palier '+c.up+' sur '+(bp.plafond||c.up)+'. Le palier REMPLACE : cette valeur ne s\'ajoute pas aux precedentes.','client');});}
      else if(_pal)absent(nom+' +'+c.up,'Le client n\'ecrit aucun palier pour ce bijou : sa valeur de base s\'applique seule.');
    }
    /* Le +N d'une arme ou d'une armure : le terme existe, sa valeur non. */
    if(c&&c.up&&BIJOUX.indexOf(s)<0)
      absent(nom+' +'+c.up,'propEnchant.inc ne donne que des coefficients, sans dire ce qu\'ils multiplient. Un gain affiche ici serait une invention.');
    if(c&&c.evS)absent(nom+' — eveil '+(c.evL||'R1')+' '+c.evS,'Le builder retient la statistique choisie, pas la valeur obtenue.');
    if(c&&c.scrL&&c.scrS)absent(nom+' — scroll '+c.scrS+' +'+c.scrL,'Le builder retient la statistique, le client ne donne pas le gain par niveau de scroll.');
    if(c&&c.dia)c.dia.concat(c.holo||[]).forEach(function(d){if(d)absent(nom+' — sertissage '+d,'Le plafond de la statistique est connu (MECH.arme.sertissage), le gain du palier pose ne l\'est pas.');});
    if(c&&c.gems)c.gems.forEach(function(g){if(g)absent(nom+' — gemme de costume '+g,'Le builder retient la statistique, pas le palier de la gemme.');});
    if(c&&c.elemLvl)absent(nom+' — element '+(c.elemType||'')+' +'+c.elemLvl,'Le bonus d\'element est un plafond de 20 dans MECH.arme, pas une valeur par palier.');
  }

  /* Le costume : aucune piece ne paie seule, c'est le SET qui paie — et il ne
     paie qu'aux quatre pieces portees. Les quatre pieces d'un set portent le
     MEME tableau `setb` dans le releve : on l'ajoute donc une fois, pas quatre. */
  var mode=panEtat(true);
  if(mode&&!mode.manquantes.length){
    var un=st.eq[FASHION[0]];
    ((un&&un.item&&un.item.setb)||[]).forEach(function(b){
      add(b[0],b[1],'Costume '+((mode.nom)||'')+' 4/4','Bonus de SET : il ne tombe qu\'aux quatre pieces portees, et une seule fois.','client');});
  }
  /* ═══ LA PANOPLIE D'ARMURE, AU SEUIL DE PIECES ATTEINT ═══════════════════
     Le bonus d'une panoplie d'armure n'est PAS dans `setb` de la piece — les 256
     armures du releve n'en portent aucun — il est dans `PANO`, range par
     SIGNATURE, et chaque ligne y porte SON SEUIL de pieces : les 64 signatures
     n'emploient que deux seuils, 1 et 4. Une ligne a 4 ne tombe donc qu'a
     l'ensemble complet, une ligne a 1 des la premiere piece.

     LES 64 SIGNATURES PORTENT CHACUNE UNE LIGNE NEGATIVE. Aucune exception. La
     fenetre de panoplie du jeu n'affiche que ce que l'ensemble AJOUTE : celle-la
     ne se voit nulle part en jouant, et elle RETIRE — les eternels perdent 200
     de degats JcJ en pourcentage a l'ensemble complet. C'est le fait le plus
     invisible du panneau, et c'est pour ca qu'il compte. */
  /* `DB.PANO` et non `PANO` : la ligne de destructuration en tete du fichier ne
     nomme pas PANO, et ce panneau est le premier a s'en servir. On lit la source
     directement plutot que d'ajouter un nom global qu'un seul bloc emploie.
     LA CLE DE PANO N'EST PAS LA SIGNATURE : `panSig` prefixe 'A|' pour distinguer
     l'armure du costume, PANO range sous « tier|classe|sexe ». D'ou le `slice(2)`,
     et sans lui le bonus de panoplie ne tombait jamais. */
  var arm=panEtat(false),PANOD=(typeof DB!=='undefined'&&DB.PANO)||null;
  if(arm&&PANOD){
    var pn=PANOD[arm.sig.slice(2)];
    ((pn&&pn.lignes)||[]).forEach(function(l){
      var seuil=l[0];if(arm.portees<seuil)return;
      add(l[1],l[2],'Panoplie '+(arm.nom||'')+' '+arm.portees+'/'+arm.pieces.length,
        'propItemEtc.inc du client : cette ligne tombe a '+seuil+' piece'+(seuil>1?'s':'')+' portee'+(seuil>1?'s':'')+'.'
        +(l[2]<0?' ELLE RETIRE : la fenetre de panoplie du jeu ne l\'affiche pas.':''),'client');});
    /* Ce que l'ensemble donnerait EN PLUS s'il etait complet : ce n'est pas un
       total, c'est le geste qui reste a faire, et il se dit sans etre compte. */
    ((pn&&pn.lignes)||[]).forEach(function(l){
      if(arm.portees>=l[0])return;
      absent('Panoplie '+(arm.nom||'')+' a '+l[0]+'/'+arm.pieces.length+' : '+l[1]+' '+(l[2]>0?'+':'')+l[2],
        'Il manque '+(l[0]-arm.portees)+' piece(s) : ce bonus n\'est pas encore acquis.');});
  }
  var _c=C();(_c.carnets||[]).forEach(function(ci){var cn=CARNETS[ci];if(!cn)return;
    ((_c.carnetsFull||[]).indexOf(ci)>=0?cn.complet:cn.base).forEach(function(b){
      add(b[0],b[1],'Carnet '+cn.nom,'Carnet des Arcanes, bonus '+((_c.carnetsFull||[]).indexOf(ci)>=0?'du set complet':'de base')+'.','client');});});

  return {acc:acc,ordre:ordre,absents:absents};
}

/** Le total par statistique, forme d'origine. `exportBuild()` et
 *  `vgCollectBuilds()` l'envoient a /api/characters/sync : cette signature ne
 *  bouge pas. */
function totals(){
  var d=totalsDetail().acc,out={};
  for(var k in d){var t=0;d[k].forEach(function(a){t+=a.v;});if(t)out[k]=t;}
  return out;}

/* ═══ CE QU'ON RAMASSE ≠ CE QUE L'EQUIPEMENT DONNE ═══════════════════════════
   DEUX CHOSES PORTENT LES MEMES MOTS — « butin », « experience », « penyas » —
   et une seule est interdite d'ecran. Ce fichier a longtemps confondu les deux.

   UNE RECOMPENSE QU'ON RAMASSE NE VA PAS A L'ECRAN. « Ce monstre lache X dans
   25 % des cas », « ce donjon rapporte N penyas », « ce monstre donne tant
   d'experience » : ces nombres NE CHANGENT AUCUN GESTE. On tue le monstre de
   toute facon, on fait le donjon de toute facon. C'est la regle de la maison, et
   son bon usage est `RECOMPENSES_TAIRE` dans
   src/components/donjons/PageDonjons.tsx : il retire « Penya » d'une liste de
   BUTIN, c'est-a-dire d'une liste de choses qu'on ramasse.

   UN BONUS QUE L'EQUIPEMENT DONNE VA A L'ECRAN. « Taux de butin % +10 » au
   palier 30 d'un Collier d'Ange, « Experience % +40 » sur le carnet
   Predestination, « Penyas gagnes % +20 » sur la Cape Farmeur : c'est L'EFFET
   DE LA PIECE, et c'est precisement ce qui fait choisir de l'equiper plutot
   qu'une autre. Le geste change, donc la ligne s'affiche — comme n'importe quel
   autre bonus.

   CE QUE LA CONFUSION COUTAIT, compte sur les deux releves reunis : 25 lignes de
   bonus effacees. 10 rangs du Collier d'Ange (de +21 a +30, son « Taux de
   butin % » de 1 a 10, alors que son « Attaque » plafonne a 1 000 des +20 : les
   dix derniers crans paraissaient donc ne rien rapporter), 14 lignes sur 5
   carnets, 1 sur la Cape Farmeur. Deux carnets — « Jour de chance » et « Clefs
   de la reussite » — N'ONT QUE ces lignes : ils s'affichaient comme ne donnant
   rien du tout. Meme cause en prose sur l'esprit de la fee : voir `espritTexte`.

   IL N'Y A DONC AUCUN FILTRE DANS CE FICHIER, et ce n'est pas un oubli. Le builder ne
   connait AUCUNE table de butin, AUCUNE penya gagnee en tuant, AUCUNE experience
   de monstre : tout ce qu'il affiche est un bonus d'equipement. Il n'y a rien a
   retirer. Si une donnee de butin entre un jour dans ce fichier, elle se filtre
   a SA source d'affichage, pas sur un libelle de statistique.

   UN COUT en penyas n'a jamais ete concerne : la regle vise les recompenses, pas
   les prix d'operation.

   `totals()` et `totalsDetail()` ne filtrent rien : leur total part tel quel
   vers /api/characters/sync (GuildViewer, Compositions, Dashboard). */

/**
 * LES LIGNES DE LA PANOPLIE D'ARMURE, TRIEES PAR CE QU'ELLES FONT.
 *
 * `PANO` range chaque ensemble par signature, et chaque ligne y porte SON seuil
 * de pieces. Le fait qui compte : LES 64 SIGNATURES PORTENT CHACUNE UNE LIGNE
 * NEGATIVE — porter les eternels au complet COUTE 200 de degats JcJ en
 * pourcentage — et LA FENETRE DE PANOPLIE DU JEU N'AFFICHE QUE CE QUE
 * L'ENSEMBLE AJOUTE. C'est le fait le plus invisible du panneau : il ne se voit
 * ni en jouant, ni dans le total, ou il se noie dans une somme.
 *
 * Meme cle que `totalsDetail` — `panSig` prefixe 'A|' pour distinguer l'armure
 * du costume, PANO range sous « tier|classe|sexe », d'ou le `slice(2)`.
 * Le costume n'a pas de PANO (son bonus est dans `setb` de la piece) : la
 * fonction rend `null` pour lui plutot que de chercher une cle qui n'existe pas.
 */
function panLignes(mode,sigVoulue){
  if(mode)return null;
  /* `sigVoulue` est passee par `panBloc`, qui parle d'un ensemble PRECIS — celui
     de la piece qu'on regarde. Sans elle, la fonction retomberait sur l'ensemble
     MAJORITAIRE du stuff et annoncerait le malus d'une autre panoplie. */
  const p=panEtat(false,sigVoulue);if(!p)return null;
  const PANOD=(typeof DB!=='undefined'&&DB.PANO)||null;if(!PANOD)return null;
  const pn=PANOD[p.sig.slice(2)];if(!pn||!pn.lignes)return null;
  const negAcquises=[],negAVenir=[];
  pn.lignes.forEach(function(l){
    if(l[2]>=0)return;
    (p.portees>=l[0]?negAcquises:negAVenir).push({seuil:l[0],stat:l[1],v:l[2]});
  });
  return {p:p,negAcquises:negAcquises,negAVenir:negAVenir,lignes:pn.lignes.length};
}
/** La mise en garde d'une panoplie, ou rien. Elle protege d'une erreur
 *  couteuse — completer un ensemble en croyant n'y gagner que du bon — donc
 *  elle reste meme quand elle alourdit le bandeau. */
function panMalus(mode,sigVoulue){
  const L=panLignes(mode,sigVoulue);if(!L)return '';
  /* « retire Degats JcJ % -200 » se lisait comme une double negation. Le verbe
     porte deja le signe : la valeur s'ecrit en positif derriere lui. */
  const dit=function(l){return '<b>'+Math.abs(l.v)+'</b> de '+esc(l.stat);};
  /* LE COMPTE SE FAIT SUR LA TABLE, il n'est pas recopie : « les 64 panoplies en
     portent chacune une » deviendrait faux au prochain versement du client sans
     que personne s'en aperçoive. On compte les signatures, et parmi elles celles
     qui portent au moins une ligne negative. */
  const P=(typeof DB!=='undefined'&&DB.PANO)||{};
  let nSig=0,nNeg=0;
  for(const k in P){nSig++;if(((P[k]||{}).lignes||[]).some(function(l){return l[2]<0;}))nNeg++;}
  const combien=(nSig&&nNeg===nSig)?('les '+nSig+' panoplies du relevé en portent chacune une')
    :(nNeg?(nNeg+' des '+nSig+' panoplies du relevé en portent une'):'');
  const detail='La fenêtre de panoplie du jeu n\'affiche QUE ce que l\'ensemble ajoute.\n\n'
    +'Les lignes négatives, elles, ne s\'y voient nulle part'+(combien?' — et '+combien:'')+'. '
    +'Sur celle-ci : '+[].concat(L.negAcquises,L.negAVenir).map(function(l){return l.stat+' '+l.v+' à '+l.seuil+' pièce'+(l.seuil>1?'s':'');}).join(' · ')+'.\n\n'
    +'Elles sont comptées dans le résumé, au même titre que le reste : c\'est pour ça qu\'une statistique peut y descendre.';
  if(L.negAcquises.length)
    return '<div class="panneg"><i class=vgi-alert></i><span>Cet ensemble <u>retire</u> '
      +L.negAcquises.map(dit).join(' · ')+' — compté dans le résumé. '+invisible('pano-neg-'+L.p.sig,detail)+'</span></div>';
  if(L.negAVenir.length)
    return '<div class="panneg avenir"><i class=vgi-alert></i><span>À '+L.negAVenir[0].seuil+'/'+L.p.pieces.length+' pièces, cet ensemble <u>retirera</u> '
      +L.negAVenir.map(dit).join(' · ')+'. '+invisible('pano-neg-'+L.p.sig,detail)+'</span></div>';
  return '';
}
/* ═════════════ LES MESURES DU STUFF — obligatoires ═════════════════════════
   Le resume du build additionnait des bonus d'equipement ; il ne disait pas ce
   que le stuff FAIT. Maxime l'a retire (« inutile ») et demande a la place ce
   que le staff compare vraiment pour composer : les degats mesures sur le totem
   de l'Oasis pour un stuff DPS, les PV pour un stuff Tank ou Off tank — avec les
   conditions de la mesure, sans lesquelles deux chiffres ne se comparent pas.

   Ce qui se mesure depend de la CLASSE et du ROLE (noms du site ; Maxime dit
   « Elementaliste » pour l'Arcaniste et « Jester » pour la Sylphide) :
     DPS      · Arcaniste : degats par Bulle + DPS par seconde
              · Envouteur, Primat : degats par Boulette + DPS par seconde
              · Spadassin, Templier, Chanoine, Sylphide, Arbaletrier :
                DPS par seconde, minimum ET maximum
     Off tank · Primat seul : PV en sceptre
     Tank     · Primat : PV en poing · Templier : PV en doloire
                Chanoine : PV en poing
   Poudres facultatives : Orange (FOR %), Bleue (INT %), Rose (DEX %) en DPS —
   toutes trois avec degats PvE, cumulables ; Verte (END %) en Tank et Off tank.
   Buffs Ipuli et World Boss. Et la mesure se prend avec perles, consommables et
   meubles : on le DECLARE, c'est ce qui rend deux stuffs comparables.

   Tout vit dans `stuff.mesures` : la sauvegarde du builder l'emporte telle
   quelle, et `vgCollectBuilds` l'envoie au GuildViewer et aux Compositions. */
var MES_ROLES={dps:'DPS',offtank:'Off tank',tank:'Tank'};
function mesRoles(cls){var r=['dps'];
  if(cls==='Primat')r.push('offtank');
  if(cls==='Primat'||cls==='Templier'||cls==='Chanoine')r.push('tank');
  return r;}
/* Le role se DEDUIT du nom tant qu'on ne l'a pas choisi : les persos existants
   portent deja des stuffs « DPS », « Tank », « Hybride ». Un role que la classe
   n'a pas (un Tank Spadassin) retombe sur DPS au lieu d'exiger des PV qu'aucun
   joueur de cette classe ne mesure. */
function mesRole(s,cls){var ok=mesRoles(cls),m=(s&&s.mesures)||{};
  if(m.role&&ok.indexOf(m.role)>=0)return m.role;
  var n=((s&&s.name)||'').toLowerCase();
  if((n.indexOf('off')>=0||n.indexOf('hybrid')>=0)&&ok.indexOf('offtank')>=0)return 'offtank';
  if(n.indexOf('tank')>=0&&ok.indexOf('tank')>=0)return 'tank';
  return 'dps';}
/* Les chiffres que la classe et le role demandent : [cle, libelle, exemple, facultatif].
   LE PRIMAT, CAS A PART (Maxime, 2026-10-21) : trois Primats tiennent la Chambre.
   Off Tank : ses PV en sceptre, et ses degats S'IL veut aussi frapper (facultatif).
   Tank : il fait office d'Off Tank PUIS de Tank — ses PV en poing ET en sceptre. */
function mesChamps(cls,role){
  if(cls==='Primat'&&role==='offtank')return [['pv','PV en sceptre','95 000'],['boulette','Dégâts par Boulette','45 000',1],['dps','DPS par seconde','180 000',1]];
  if(cls==='Primat'&&role==='tank')return [['pv','PV en poing','120 000'],['pvSceptre','PV en sceptre','95 000']];
  if(role==='dps'){
    if(cls==='Arcaniste')return [['bulle','Dégâts par Bulle','45 000'],['dps','DPS par seconde','180 000']];
    if(cls==='Envouteur'||cls==='Primat')return [['boulette','Dégâts par Boulette','45 000'],['dps','DPS par seconde','180 000']];
    return [['dpsMin','DPS par seconde — minimum','150 000'],['dpsMax','DPS par seconde — maximum','210 000']];}
  if(role==='offtank')return [['pv','PV en sceptre','95 000']];
  return [['pv',cls==='Templier'?'PV en doloire':'PV en poing','120 000']];}
var MES_POUDRES={
  dps:[['orange','Poudre Orange','FOR % · dégâts PvE'],['bleue','Poudre Bleue','INT % · dégâts PvE'],['rose','Poudre Rose','DEX % · dégâts PvE']],
  tank:[['verte','Poudre Verte','END %']]};
MES_POUDRES.offtank=MES_POUDRES.tank;
var MES_BUFFS=[['ipuli','Ipuli',''],['wb','World Boss','']];
var MES_COND=[['perles','Perles',''],['conso','Consommables',''],['meubles','Meubles','']];
/* UN STUFF VIDE N'EXIGE RIEN. Chaque perso nait avec trois stuffs (DPS, Tank,
   Hybride) : un Arcaniste, qui ne tanke pas, se voyait reclamer des mesures pour
   deux stuffs qu'il n'a jamais montes. L'obligation commence a la premiere piece. */
function mesVide(s){return !Object.keys((s&&s.eq)||{}).length;}
/* Ce qui manque pour que la mesure compte : chaque chiffre exige, et un minimum
   qui ne depasse pas le maximum. */
function mesManque(s,cls){if(mesVide(s))return [];var role=mesRole(s,cls),v=(((s&&s.mesures)||{}).v)||{},out=[];
  mesChamps(cls,role).forEach(function(f){if(!f[3]&&!(+v[f[0]]>0))out.push(f[1]);});
  if(role==='dps'&&+v.dpsMin>0&&+v.dpsMax>0&&+v.dpsMin>+v.dpsMax)out.push('le minimum dépasse le maximum');
  return out;}
/* Ce qui part vers /api/characters/sync : la mesure telle que saisie, le role
   resolu (meme deduit du nom) et le verdict, pour que le staff n'ait pas a le
   recalculer. */
function mesExport(s,cls){var m=(s&&s.mesures)||{};
  return {role:mesRole(s,cls),v:m.v||{},poudres:m.poudres||{},buffs:m.buffs||{},cond:m.cond||{},
    maj:m.maj||null,mesureLe:m.mesureLe||null,complet:mesVide(s)?null:!mesManque(s,cls).length};}
/* LES NOMBRES COMME ON LES TAPE SUR DISCORD : « 9,4M », « 1.2 m », « 850k »,
   « 9 400 000 ». Repris du bot de recensement des Chambres (lire_nombre) : un
   joueur recopie ce qu'il lit en jeu, et le jeu ecrit les PV en millions. Sans
   suffixe, points et virgules sont des separateurs de milliers ; avec un
   suffixe, la virgule est decimale. 0 ou illisible -> 0 (le champ se vide). */
function mesLire(t){var x=String(t||'').toLowerCase().replace(/[\s\u00a0\u202f]/g,'');var mult=1;
  if(/m$/.test(x)){x=x.slice(0,-1);mult=1e6;}else if(/k$/.test(x)){x=x.slice(0,-1);mult=1e3;}
  x=mult===1?x.replace(/[.,]/g,''):x.replace(',','.');
  var n=Math.round(parseFloat(x)*mult);return isFinite(n)&&n>0?n:0;}
/* « 9,4 M », « 850 k » : la forme courte, pour les tableaux (recensement, compo). */
function mesCourt(n){n=+n||0;if(!n)return '—';
  if(n>=1e6)return (n/1e6).toFixed(2).replace(/\.?0+$/,'').replace('.',',')+' M';
  if(n>=1e3)return (n/1e3).toFixed(1).replace(/\.?0+$/,'').replace('.',',')+' k';return String(n);}
/* UNE MESURE VIEILLIT. Au-dela de 30 jours le stuff a bouge (une piece, un +N, un
   prestige) : la mesure reste affichee mais marquee « a remesurer ». La date est
   celle des CHIFFRES (`mesureLe`), pas celle d'une case cochee. */
var MES_VIEILLE=30*864e5;
function mesVieille(s){var m=(s&&s.mesures)||{};return !mesVide(s)&&!mesManque(s,C().cls).length&&!!m.mesureLe&&(Date.now()-m.mesureLe>MES_VIEILLE);}
function mesObj(){var s=ST();if(!s.mesures)s.mesures={};var m=s.mesures;
  m.v=m.v||{};m.poudres=m.poudres||{};m.buffs=m.buffs||{};m.cond=m.cond||{};return m;}
function mesSetRole(r){if(_ro())return;var m=mesObj();m.role=r;m.maj=Date.now();render();}
function mesToggle(grp,k){if(_ro())return;var m=mesObj();m[grp][k]=!m[grp][k];m.maj=Date.now();render();}
/* Un chiffre saisi NE redessine PAS le panneau : on tabule d'un champ au suivant,
   et un redessin au `change` arracherait le focus du champ ou l'on arrive. On
   met donc a jour l'etat, la sauvegarde et les seuls temoins. */
function mesSetVal(k,el){if(_ro())return;var m=mesObj();
  var n=mesLire(el.value);
  if(n>0)m.v[k]=n;else delete m.v[k];
  el.value=n>0?n.toLocaleString('fr-FR'):'';
  m.maj=m.mesureLe=Date.now();save();mesStatut();mesPastilles();}
function mesEtat(manque,vide,vieille,le){
  if(vide)return '<span class="mes-etat">Stuff vide — rien à mesurer</span>';
  if(!manque.length&&vieille)return '<span class="mes-etat ko" title="Mesuré le '+new Date(le).toLocaleDateString('fr-FR')+'"><i class=vgi-alert></i> À remesurer</span>';
  return manque.length
    ?'<span class="mes-etat ko" title="'+esc('Manque : '+manque.join(', '))+'"><i class=vgi-alert></i> À renseigner</span>'
    :'<span class="mes-etat ok"><i class=vgi-check></i> Complet</span>';}
function mesStatut(){var n=document.getElementById('stats');if(!n)return;
  var s=ST(),manque=mesManque(s,C().cls),v=((s.mesures||{}).v)||{};
  var vide=mesVide(s);
  n.querySelectorAll('.mes-f').forEach(function(l){l.classList.toggle('ko',!vide&&!l.hasAttribute('data-facultatif')&&!(+v[l.getAttribute('data-k')]>0));});
  var e=n.querySelector('.mes-etat');if(e)e.outerHTML=mesEtat(manque,mesVide(s),mesVieille(s),(s.mesures||{}).mesureLe);}
/* Un stuff incomplet se voit depuis la barre des stuffs, sans l'ouvrir. */
function mesPastilles(){var c=C(),tabs=document.querySelectorAll('#stuffbar .stab');
  (c.stuffs||[]).forEach(function(s,i){var t=tabs[i];if(!t)return;
    var ko=mesManque(s,c.cls).length>0||mesVieille(s);t.classList.toggle('mes-manque',ko);
    if(ko)t.setAttribute('title',(mesManque(s,c.cls).length?'Mesures à renseigner':'Mesures à refaire (plus de 30 jours)')+' · Clic : ouvrir · Double-clic : renommer');});}
function mesCases(titre,grp,liste,etat,ro){
  return '<div class="mes-l"><span class="mes-lab">'+titre+'</span><div class="mes-cases">'+liste.map(function(p){
    return '<span class="tierbtn mes-c'+(etat[p[0]]?' on':'')+'"'+(ro?'':' onclick="mesToggle(\''+grp+'\',\''+p[0]+'\')"')+'>'
      +(etat[p[0]]?'<i class=vgi-check></i> ':'')+p[1]+(p[2]?' <small>'+p[2]+'</small>':'')+'</span>';}).join('')+'</div></div>';}
function renderMesures(){var n=document.getElementById('stats');if(!n)return;
  var c=C(),s=ST();if(!s){n.innerHTML='';return;}
  var cls=c.cls,role=mesRole(s,cls),m=s.mesures||{},v=m.v||{},ro=!!window.__VIEW; // pas _ro() : il affiche un toast, et on redessine a chaque piece
  var html='<h3><i class=vgi-target></i> Mesures du stuff '+mesEtat(mesManque(s,cls),mesVide(s),mesVieille(s),m.mesureLe)+'</h3>'
    +'<p class="mes-intro">Obligatoires pour chaque stuff : c\'est ce que le staff compare pour composer les groupes. '
    +(role==='dps'?'Mesure tes dégâts sur le <b>totem de l\'Oasis</b>, ':'Relève tes <b>PV</b> dans la fenêtre du personnage, ')
    +'avec tes perles, tes consommables et tes meubles.</p>';
  html+='<div class="mes-l"><span class="mes-lab">Rôle du stuff</span><div class="mes-cases">'
    +mesRoles(cls).map(function(r){return '<span class="stab'+(r===role?' on':'')+'"'+(ro?'':' onclick="mesSetRole(\''+r+'\')"')+'>'+MES_ROLES[r]+'</span>';}).join('')
    +'</div></div>';
  html+='<div class="mes-champs">'+mesChamps(cls,role).map(function(f){var val=+v[f[0]]||0;
    return '<label class="mes-f'+(val||mesVide(s)||f[3]?'':' ko')+'" data-k="'+f[0]+'"'+(f[3]?' data-facultatif="1"':'')+'><span class="mes-lab">'+f[1]+(f[3]?' <i>facultatif</i>':' <i class="mes-req" title="obligatoire">*</i>')+'</span>'
      +'<input type="text" inputmode="numeric" autocomplete="off" value="'+(val?val.toLocaleString('fr-FR'):'')+'" placeholder="ex. '+f[2]+' ou '+mesCourt(mesLire(f[2])).replace(/\s/g,'')+'"'
      +(ro?' disabled':' onchange="mesSetVal(\''+f[0]+'\',this)"')+'></label>';}).join('')+'</div>';
  html+=mesCases('Poudres'+(role==='dps'?' — cumulables':'')+' <i>facultatif</i>','poudres',MES_POUDRES[role],m.poudres||{},ro);
  html+=mesCases('Buffs pendant la mesure <i>facultatif</i>','buffs',MES_BUFFS,m.buffs||{},ro);
  html+=mesCases('Mesuré avec','cond',MES_COND,m.cond||{},ro);
  n.innerHTML=html;}

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
  document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3><i class=vgi-puzzle></i> Modèles de stuff</h3><div class="mini" style="margin-bottom:10px">Applique un modèle sur le stuff actuel. Les pièces incompatibles avec ta classe/sexe sont ignorées.</div><div style="max-height:320px;overflow:auto">'+rows+'</div><div class="sheet-foot"><span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="saveTemplate()"><i class=vgi-save></i> Enregistrer le stuff actuel</span><span class="pill" onclick="closePick()">Fermer</span></div></div></div>';}
function agConfirm(msg,onYes){window.__agYes=onYes;document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:430px;padding:22px"><div style="font-size:14px;line-height:1.55;margin-bottom:20px;white-space:pre-line">'+esc(msg)+'</div><div style="display:flex;gap:10px;justify-content:flex-end"><span class="pill" onclick="agClose(0)">Annuler</span><span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="agClose(1)">Confirmer</span></div></div></div>';}
function agClose(go){var f=window.__agYes;window.__agYes=null;document.getElementById('modalRoot').innerHTML='';if(go&&f)f();}
function agInfo(msg){document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:470px;padding:22px"><div style="font-size:13.5px;line-height:1.6;white-space:pre-line;margin-bottom:18px">'+esc(msg)+'</div><div style="display:flex;justify-content:flex-end"><span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="agClose(0)">Compris <i class=vgi-check></i></span></div></div></div>';}
function agToast(msg,ok){var t=document.createElement('div');
  // Le statut est porté par une icône + la couleur du liseré (plus par un emoji
  // dans le texte). Le libellé reste en textContent : aucune injection possible.
  var ic=document.createElement('i');ic.className='vgi-'+(ok===false?'alert':'check');
  ic.style.cssText='width:15px;height:15px;flex:none;color:'+(ok===false?'#F87171':'#4ADE80');
  var tx=document.createElement('span');tx.textContent=msg;
  t.appendChild(ic);t.appendChild(tx);
  t.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);z-index:99999;display:flex;align-items:center;gap:9px;background:#16161c;color:#E8E8EC;border:1px solid '+(ok===false?'#F87171':'var(--gn-accent)')+';border-radius:10px;padding:11px 18px;font:600 13px/1.4 Rubik,system-ui,sans-serif;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.55);opacity:0;transition:opacity .25s,transform .25s';document.body.appendChild(t);requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';});setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(8px)';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},2800);}
function agPrompt(msg,def,onOk){window.__agP=onOk;document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agPClose(0)"><div class="sheet" style="max-width:400px;padding:22px"><div style="font-size:14px;margin-bottom:12px">'+esc(msg)+'</div><input id="__agPI" class="srch" style="width:100%" value="'+esc(def||'')+'"><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><span class="pill" onclick="agPClose(0)">Annuler</span><span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="agPClose(1)">OK</span></div></div></div>';var i=document.getElementById('__agPI');if(i){i.focus();i.select();i.onkeydown=function(e){if(e.key==="Enter")agPClose(1);else if(e.key==="Escape")agPClose(0);};}}
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
/* Les illustrations de perso, memes fichiers que le site (src/data/charRenders).
   La liste n'en montrait aucune : on choisissait entre trois lignes de texte
   alors que le builder dessine le personnage juste a cote. */
var VGRENDUS={Arcaniste:24,Spadassin:26,Templier:28,Envouteur:30,Arbaletrier:32,Sylphide:34,Primat:36,Chanoine:38};
function vgRendu(cls,sexe){
  var n=VGRENDUS[cls]; if(n==null)return '';
  return '/airbuilder/icons/emb_0'+(n+(sexe==='F'?1:0))+'.png';
}
var VGMODECOL={DPS:'var(--gn-accent)',Tank:'#4EA8FF',TANK:'#4EA8FF',Hybride:'#C77DFF',HYBRIDE:'#C77DFF'};

function vgMesPersos(){
  var lignes=state.chars.map(function(c,i){
    var stuffs=(c.stuffs||[]).filter(function(s){return s.eq&&Object.keys(s.eq).some(function(k){return s.eq[k]&&s.eq[k].item;});});
    var img=vgRendu(c.cls,c.sex);
    var actif=(i===state.cur);
    /* Les stuffs en pastilles colorees, pas en liste separee par des virgules :
       on cherche « est-ce que mon Tank est monte ? », et une couleur repond plus
       vite qu'une phrase. */
    var past=stuffs.length
      ? stuffs.map(function(s){var col=VGMODECOL[s.name]||'#8A8A95';
          return '<span style="display:inline-flex;align-items:center;border:1px solid '+col+';color:'+col
            +';border-radius:7px;padding:2px 8px;font-size:11px;font-weight:700">'+esc(s.name)+'</span>';}).join('')
      : '<span style="font-size:11.5px;color:var(--mut)">aucun stuff monte</span>';
    /* LE PREMIER EST LE PRINCIPAL : la synchro le publie en `isMain`. « Rendre
       principal » (l'etoile) le fait donc passer en tete ; le site n'a plus de
       bouton pour ca, tout se regle ici depuis le 2026-10-21. */
    var prin=(i===0);
    return '<div class="vgperso'+(actif?' on':'')+'" onclick="vgOuvrirPerso('+i+')">'
      +'<span class="ill">'+(img?'<img src="'+img+'" alt="">':'<i class=vgi-user></i>')+'</span>'
      +'<span class="txt">'
        +'<span class="nom">'+esc(c.name)+(prin?'<span class="ici prin" title="Personnage principal : c\'est lui qui te représente dans la guilde"><i class=vgi-star></i> principal</span>':'')+(actif?'<span class="ici">ouvert</span>':'')+'</span>'
        +'<span class="sous">'+esc(c.cls||'')+' &middot; niveau '+(c.lvl||200)+' &middot; prestige '+(c.prestige||0)+'</span>'
        +'<span class="past">'+past+'</span>'
      +'</span>'
      +'<span class="act">'
        +(!prin?'<span class="pill" onclick="event.stopPropagation();vgRendrePrincipal('+i+')" title="Rendre principal" aria-label="Rendre '+esc(c.name)+' principal"><i class=vgi-star></i></span>':'')
        +(state.chars.length>1?'<span class="pill rm" onclick="event.stopPropagation();vgSupprPerso('+i+')" title="Supprimer" aria-label="Supprimer '+esc(c.name)+'"><i class=vgi-trash></i></span>':'')
      +'</span>'
      +'</div>';
  }).join('');
  document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" style="max-width:560px;padding:22px">'
    +'<div style="font-weight:700;font-size:15px;margin-bottom:4px;display:flex;align-items:center;gap:8px">'+VGI('users',{size:16})+' Mes personnages</div>'
    +'<div class="mut" style="font-size:12px;margin-bottom:13px">Clique un perso pour l\'ouvrir. Ils partent à la guilde tout seuls, le premier en principal (l\'étoile pour en changer).</div>'
    +(lignes||'<div class="mut" style="font-size:13px;padding:8px 0">Aucun personnage pour l\'instant.</div>')
    +'<div class="sheet-foot vgpersos-foot" style="margin-top:14px">'
    +'<span class="pill" onclick="agClose(0);addChar()">'+VGI('plus',{size:13})+' Nouveau personnage</span>'
    /* « Gerer sur le site » est devenu « Voir sur le site » : la page ne fait plus que
       refleter ce qui se regle ici. */
    +'<a class="pill" href="/personnages" onclick="return vgVersLeSite(this.href)" style="text-decoration:none">'+VGI('eye',{size:13})+' Voir sur le site</a>'
    +'<span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="agClose(0)">Fermer</span></div>'
    +'</div></div>';
}
function vgOuvrirPerso(i){agClose(0);switchChar(i);}
/* « Voir sur le site » : le geste qu'on vient de faire (rendre principal, supprimer)
   part D'ABORD, puis on y va — sinon la page s'ouvrait sur l'etat d'avant. Deux
   secondes au plus : un reseau lent ne retient pas le clic. */
function vgVersLeSite(url){agClose(0);var fait=false,aller=function(){if(fait)return;fait=true;location.href=url;};
  vgPublierMaintenant().then(aller,aller);setTimeout(aller,2000);return false;}
function vgSupprPerso(i){agClose(0);delChar(i);}
/* Rendre principal = passer en tete de liste. Le perso ouvert reste celui qu'on
   regardait : il change seulement de place. Confirme, parce que ca deplace ce que
   la guilde voit de nous partout (Chambres Secretes, GuildViewer, recensement). */
function vgRendrePrincipal(i){
  if(_ro())return;
  if(!(i>0&&i<state.chars.length))return;
  agClose(0);
  var c=state.chars[i],avant=state.chars[0];
  agConfirm('Rendre « '+(c.name||'ce perso')+' » principal ?\n\nC\'est lui qui te représentera dans la guilde (Chambres Secrètes, GuildViewer, recensement). Il passe en tête de ta liste, devant « '+(avant.name||'l\'actuel')+' ».',function(){
    var ouvert=state.chars[state.cur];
    state.chars.splice(i,1);state.chars.unshift(c);
    state.cur=Math.max(0,state.chars.indexOf(ouvert));
    render();
    agToast('« '+(c.name||'Perso')+' » est ton personnage principal.',true);
  });
}
function charForm(){if(_ro())return;window.__cfCls='Arcaniste';window.__cfSex='G';document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet" id="cfSheet" style="width:620px;max-width:94vw;padding:22px"><style>#cfSheet input{width:100%;box-sizing:border-box;background:#0f0f15;border:1px solid rgba(255,255,255,.10);border-radius:9px;padding:10px 12px;color:#ece9f1;font-family:inherit;font-size:14px;font-weight:500;outline:none;box-shadow:none;-webkit-appearance:none;-moz-appearance:textfield;appearance:none;transition:border-color .14s,box-shadow .14s}#cfSheet input::placeholder{color:#6f6f78}#cfSheet input:focus{border-color:var(--gn-accent);background:#14141b;box-shadow:0 0 0 3px rgba(var(--gn-or-rgb),.15)}#cfSheet input[type=number]::-webkit-inner-spin-button,#cfSheet input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}#cfSheet label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#9a9aa3;margin-bottom:6px}#cfSheet .cfsx{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:8px 15px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0f0f15;color:#ededf2;font-size:14px;font-weight:700;cursor:pointer;transition:border-color .14s,background .14s,color .14s;user-select:none}#cfSheet .cfsx:hover{border-color:rgba(255,255,255,.25);color:#fff}#cfSheet .cfsx.on{background:var(--gn-action);border-color:rgba(var(--gn-or-rgb),.55);color:var(--gn-sur-action)}#cfSheet .cfsx .sx{display:inline-flex;align-items:center}#cfSheet .cfsx .sx svg{width:17px;height:17px;display:block}#cfSheet .cfsx[data-s="G"] .sx{color:#5fa8ee}#cfSheet .cfsx[data-s="F"] .sx{color:#ef8fc4}#cfSheet .cfsx.on .sx{color:var(--gn-sur-action)}#cfSheet .clssel{max-width:none;flex-wrap:nowrap}#cfSheet .ci{width:46px;height:46px;border-radius:9px;box-sizing:border-box;flex:none}#cfSheet .ci img{width:42px;height:42px}#cfSheet .cfbtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 18px;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:background .15s,border-color .15s,box-shadow .15s,transform .12s,filter .15s;user-select:none;font-family:inherit}#cfSheet .cfbtn svg{width:16px;height:16px}#cfSheet .cfbtn.ghost{background:#17171d;border-color:rgba(255,255,255,.14);color:#d2d2d9}#cfSheet .cfbtn.ghost:hover{background:#1e1e26;border-color:rgba(255,255,255,.3);color:#fff}#cfSheet .cfbtn.primary{background:var(--gn-action);color:var(--gn-sur-action);box-shadow:0 4px 14px rgba(var(--gn-lueur-rgb),.30)}#cfSheet .cfbtn.primary:hover{filter:brightness(1.05);box-shadow:0 7px 20px rgba(var(--gn-lueur-rgb),.45);transform:translateY(-1px)}#cfSheet .cfbtn.primary:active{transform:translateY(0)}</style><div style="font-weight:700;font-size:16px;margin-bottom:14px"><i class=vgi-orb></i> Nouveau personnage</div><div style="display:flex;gap:18px;flex-wrap:wrap"><div style="flex:1;min-width:395px"><div class="f" style="margin-bottom:10px"><label>Classe</label><div class="clssel" id="cfClsSel">${CLASSES.map(x=>`<div class="ci ${x==='Arcaniste'?'on':''}" data-c="${x}" title="${x}" onclick="cfPickCls('${x}')">${IC['class_'+x.toLowerCase()]?`<img src="${IC['class_'+x.toLowerCase()]}">`:x[0]}</div>`).join('')}</div><div id="cfClsRecap" style="font-size:11.5px;color:var(--gn-accent);margin-top:7px;font-weight:600"><i class=vgi-check></i> Classe : Arcaniste</div></div><div class="f" style="margin-bottom:12px"><label>Nom du personnage</label><input class="inp" id="cfName" placeholder="ex. Daiisuke" style="width:100%"></div><div class="f" style="margin-bottom:12px"><label>Sexe</label><div style="display:flex;gap:8px"><span class="cfsx on" data-s="G" onclick="cfPickSex('G')"><span class="sx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5.5"/><path d="M14 10L20 4M15 4H20V9"/></svg></span> Garçon</span><span class="cfsx" data-s="F" onclick="cfPickSex('F')"><span class="sx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5.5"/><path d="M12 13.5V22M8.5 18.5H15.5"/></svg></span> Fille</span></div></div><div style="display:flex;gap:12px;flex-wrap:wrap"><div class="f" style="flex:1;min-width:90px"><label>Niveau</label><input class="inp" id="cfLvl" type="number" value="200" min="1" max="200" style="width:100%"></div><div class="f" style="flex:1;min-width:90px"><label>Prestige</label><input class="inp" id="cfPrest" type="number" value="3" min="0" max="12" style="width:100%"></div></div></div><div style="width:155px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff06;border:1px solid #ffffff10;border-radius:10px;padding:8px;min-height:200px"><img id="cfRender" alt="" style="max-width:100%;max-height:210px;object-fit:contain"><div class="mut" style="font-size:11px;margin-top:4px;text-align:center">aperçu (classe + sexe)</div></div></div><div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.07)"><span class="cfbtn ghost" onclick="agClose(0)">Annuler</span><span class="cfbtn primary" onclick="doCharForm()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Créer le perso</span></div></div></div>`;var n=document.getElementById('cfName');if(n)n.focus();cfUpdateRender();}
function cfUpdateRender(){var cls=window.__cfCls||'Arcaniste',sex=window.__cfSex||'G';var im=document.getElementById('cfRender');if(im){var src=(typeof CHARIMG!=='undefined'&&(CHARIMG[cls+'|'+sex]||CHARIMG[cls+'|G']))||'';im.src=src;im.style.display=src?'block':'none';}var r=document.getElementById('cfClsRecap');if(r)r.innerHTML='<i class=vgi-check></i> Classe : '+esc(cls)+' '+(sex==='F'?'<i class=vgi-female></i>':'<i class=vgi-male></i>');}
function cfPickCls(x){window.__cfCls=x;var s=document.getElementById('cfClsSel');if(s)Array.prototype.forEach.call(s.children,function(d){d.classList.toggle('on',d.getAttribute('data-c')===x);});cfUpdateRender();}
function cfPickSex(x){window.__cfSex=x;Array.prototype.forEach.call(document.querySelectorAll('.cfsx'),function(d){d.classList.toggle('on',d.getAttribute('data-s')===x);});cfUpdateRender();}
function doCharForm(){var el=document.getElementById('cfName');var nm=((el&&el.value)||'').trim();if(!nm){if(el){el.style.borderColor='#f87171';el.focus();}return;}var c=newChar(nm);c.cls=window.__cfCls||'Arcaniste';c.sex=window.__cfSex||'G';c.lvl=Math.min(200,Math.max(1,parseInt((document.getElementById('cfLvl')||{}).value,10)||200));c.prestige=Math.min(12,Math.max(0,parseInt((document.getElementById('cfPrest')||{}).value,10)||0));/* Le premier vrai perso REMPLACE l'exemple vierge (« Perso 1 », sans piece) : sinon la synchro publiait l'exemple en principal, devant le perso qu'on venait de creer. */if(vgEtatVierge())state.chars=[c];else state.chars.push(c);state.cur=state.chars.length-1;agClose(0);render();}
/* Supprimer un perso : la confirmation le NOMME et dit ce qui part avec lui. Le site
   n'a plus de bouton de suppression (2026-10-21) : c'est ici que ca se passe, et la
   synchro le retire du compte. Le dernier perso ne se supprime pas (la croix et la
   corbeille ne s'affichent qu'a partir de deux). */
function delChar(i){if(_ro())return;if(state.chars.length<=1||!state.chars[i])return;
  var c=state.chars[i],n=(c.stuffs||[]).length;
  agConfirm('Supprimer « '+(c.name||'ce perso')+' » ?\n\n'+(n?'Ses '+n+' stuff'+(n>1?'s':'')+' partent avec lui. ':'')+'Il disparaît de ton compte et de la guilde (Mes personnages, Chambres Secrètes, GuildViewer). Il n\'y a pas d\'annulation.'+(i===0?'\n\nC\'est ton principal : « '+(state.chars[1].name||'le suivant')+' » le deviendra.':''),
    function(){var ouvert=state.chars[state.cur];state.chars.splice(i,1);var k=state.chars.indexOf(ouvert);state.cur=k>=0?k:0;render();});}
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
/* L'HOLOGRAPHIQUE N'EST PLUS UNE TEINTURE. Ce moteur dessinait « la meme pierre
   teintee, faute d'asset dedie » — le vrai Diamant holographique du client est
   dans la table (`meca().holo`), et il ne ressemble pas du tout au diamant
   ordinaire. Le repli teinte reste pour le temps du chargement. */
function diaImg(rempli,holo){
  if(!rempli)return '<span class="gem e"></span>';
  const h=holo?meca().holo:null;
  const src=h&&h.f?h.f:`/airbuilder/icons/sertissage/diamant${holo?'-holo':''}.png`;
  const nom=holo?(h&&h.n?h.n:'Diamant holographique'):'Diamant';
  return `<img class="gem img" src="${src}" alt="" title="${escA(nom+(typeof rempli==='string'?' · '+rempli:''))}">`;
}
/* LA RUNE D'ARME PORTAIT UNE PIERRE DE STATISTIQUE. Une arme « Eternelle »
   s'affichait avec le caillou de Force, une « Lusaka » avec celui d'Intelligence
   — des dessins qui n'ont rien a voir avec la rune qu'on grave. Les vraies runes
   du client sont dans la table, une par gamme (le releve verifie que les dix
   modeles d'une gamme partagent bien le meme dessin).

   LE REPLI PAR PIERRE DE STATISTIQUE A ETE RETIRE, pas remplace. Un palier sans
   rune connue montre desormais le glyphe neutre : mieux vaut pas de dessin qu'un
   dessin d'un autre objet, et c'est la regle de la maison sur les assets. Reste
   « Ancestral » dans ce cas — aucune gamme du releve ne porte ce nom (les runes
   du client se rangent en Eternelle, Luzaka oubliee, Vampirique et Yggdrasil), et
   lui preter la Vampirique par elimination serait une supposition. */
/* LE `title` NE PARLE PLUS DU DESSIN. Il annonçait « — le meme dessin pour les
   10 modeles d'arme de la gamme » : un fait sur L'ICONE, pas sur la rune. Que le
   client reutilise une image ne change ni ce qu'on achete ni ce qu'on gagne.
   Reste le nom de la rune, qui est le seul renseignement utile au survol. */
function runeImg(tier){
  const r=(meca().runeArme||{})[tier];
  if(r&&r.f)return `<img class="runeic" src="${r.f}" alt="" title="${escA(runeName(tier))}">`;
  return '<i class=vgi-rune></i>';
}
/* ═══ CE QUE LA FOURCHETTE `atk` COMPTE VRAIMENT ═════════════════════════════
   `data.json ▸ ITEMS` porte UN SEUL champ `atk` pour toutes les pieces, et la
   bulle l'annonçait « Attaque » partout. Le releve du client dit le contraire :
   la Coiffe des eternels vaut 800~802 de DEFENSE — objets-fiches ▸ dn/dx, sur
   une piece de famille « armure » — et pas d'attaque. La bulle ecrivait donc
   « Attaque » sur 194 pieces chiffrees du catalogue (192 armures et 2
   boucliers) ; seules les 45 armes etaient justes.

   LE GRIMOIRE N'EST PAS UNE EXCEPTION, ET LA CLE II_WEA_ NE SUFFIT PAS A EN
   FAIRE UNE. Une premiere version de cette fonction rendait « Attaque » des que
   la piece portait `offhand`, au motif que le « Grimoire en Yggdrasil Purifie »
   porte la cle II_WEA_BOOK_YGG. Le releve dit quatre fois le contraire :
     · sa famille est « armure », comme les six boucliers du catalogue ;
     · il s'equipe en PARTS_SHIELD, jamais en PARTS_RWEAPON — les 43 armes du
       catalogue presentes dans le releve sont toutes en PARTS_RWEAPON ;
     · il n'a AUCUNE vitesse d'attaque (`dwAttackSpeed`), que toute arme porte ;
     · ses 662~665 sont EXACTEMENT ceux du « Bouclier en Yggdrasil Purifie »,
       son jumeau de meme niveau — deux fois le meme chiffre de defense.
   Et sur les quinze grimoires du releve, DOUZE portent une cle II_ARM_ : le
   prefixe de la cle ne dit pas de quel cote tombe la colonne. La page /objets du
   site, elle, affiche deja « Defense 662 ~ 665 » sur cet objet
   (src/components/objets/vocabulaire.ts, `chiffreDeCombat`) : garder « Attaque »
   ici aurait mis deux pages du meme site en contradiction sur le meme objet.
   `offhand` reste lu — il NOMME la piece dans les etiquettes (« Grimoire »),
   ce qui est le seul renseignement que le releve lui donne vraiment. */
function abilLabel(slot,it){
  if(slot==='weapon'||slot==='weapon2')return 'Attaque';
  return 'Défense';
}
/** La chance de reussite du palier d'amelioration, en pourcentage, ou `null`.
 *  Le releve ne chiffre que les paliers Artefact : en dessous on n'ecrit rien
 *  plutot que de supposer une reussite garantie. */
function amelReussite(up){
  var R=(faits().amelioration||{}).reussite||[];
  for(var i=0;i<R.length;i++)if(R[i][0]===(up|0))return Math.round(R[i][1]*100);
  return null;
}
/* ═══ LE SERTISSAGE — DEUX MECANIQUES QU'ON NE MELANGE PAS ═══════════════════
   1. LE JOYAU ORDINAIRE : son palier est LE NOMBRE DE JOYAUX DE LA MEME
      STATISTIQUE, et la valeur du palier REMPLACE les precedentes. L'echelle du
      releve est cumulative par construction — l'additionner la compterait deux
      fois. Le client le dit a sa façon : « tout nouveau joyau du meme type
      ajoute augmente la meme statistique ».
   2. LE DIAMANT HOLOGRAPHIQUE : une valeur FIXE, hors echelle, qui elle
      S'AJOUTE. C'est un autre mecanisme, il se lit sur une autre ligne.
   Le joyau n'est PAS retenu par le builder (il retient la statistique de chaque
   logement) : on NOMME donc celui dont on lit l'echelle, comme les deux series
   de l'eveil sont nommees. Un nombre sans son joyau annoncerait un gain qui
   n'est peut-etre pas celui du joueur. */
function sertGemme(it){
  var T=(faits().sertissage||{}).tranches||[];if(!T.length||!it)return '';
  var lv=it.lv|0,g='';
  for(var i=0;i<T.length;i++)if(lv>=T[i].de)g=T[i].n;
  return g;
}
function sertValeur(stat,gemme,palier){
  var E=(faits().sertissage||{}).echelle||[];
  for(var i=0;i<E.length;i++){
    if(E[i].fr!==stat)continue;
    var G=E[i].gemmes||[];
    for(var j=0;j<G.length;j++)if(G[j].n===gemme)return (G[j].p||[])[(palier|0)-1]||null;
  }
  return null;
}
/** La valeur fixe d'un diamant holographique, lue dans la liste que le panneau
 *  propose deja — aucun nombre n'est recopie ici. */
function holoValeur(stat){
  var H=(typeof HOLOSTATS!=='undefined')?HOLOSTATS:[];
  for(var i=0;i<H.length;i++)if(H[i][0]===stat)return H[i][1];
  return null;
}
/** Le tri d'une liste de logements : chaque statistique et son NOMBRE de
 *  logements, dans l'ordre ou ils ont ete poses. C'est ce nombre qui EST le
 *  palier de sertissage. */
function sertGroupes(arr){
  var m={},o=[];(arr||[]).forEach(function(x){if(x){if(m[x]==null){m[x]=0;o.push(x);}m[x]++;}});
  return o.map(function(k){return [k,m[k]];});
}
/* ═══ LE VIVIER DE RARETE — CE QUE CETTE ARME PEUT REELLEMENT TIRER ══════════
   Le panneau propose les SEPT statistiques de `MECH.arme.rarete_pool` a toutes
   les armes. Le client, lui, donne a chaque arme SON vivier de quatre lignes, et
   les deux ne concordent pas : l'Arc eternel tire Endurance, PV max %, Blocage
   corps a corps et Blocage a distance — aucune des quatre que le panneau met en
   tete de liste. Choisir « Precision » sur cet arc decrit donc un objet qui
   n'existe pas, et rien ne le disait.
   La bulle lit le vivier de l'arme (`faits.rarete`, par objet ou par famille) et
   NOMME les lignes choisies qui n'y figurent pas. On ne touche pas aux choix du
   panneau : ils ne comptent pas dans le total, et les retirer sans l'accord de
   Maxime effacerait des reglages deja enregistres. */
function vivierDe(it){
  var R=faits().rarete||{},j=armeFait(it);
  if(!j||!j.viv)return null;
  var v=(j.viv[0]==='o')?((R.viviersParObjet||{})[j.viv[1]]):((R.viviers||{})[j.viv[1]]);
  return (v&&v.b&&v.b.length)?v.b:null;
}
/** La chance d'obtenir N lignes de rarete au tirage, en pourcentage, ou `null`. */
function rareteChance(n){
  var L=(MECH.arme&&MECH.arme.rarete_lignes)||[];
  for(var i=0;i<L.length;i++)if(L[i].amount===(n|0))return L[i].chance;
  return null;
}
/* ═══ POURQUOI LA BULLE NE REPETE PAS « NON COMPTE » SOUS CHAQUE BLOC ════════
   Une bonne moitie des mecaniques n'entre pas dans le total (`faits.nonCompte`
   les compte, et la maitrise vient d'en sortir),
   et une premiere version de ce chantier l'annonçait sous chacune. Mesure : six
   paragraphes, une trentaine de pixels chacun, sur une bulle qui frolait deja la
   hauteur de l'ecran — pour repeter six fois le meme fait.
   Le resume du build en faisait un depliant (« N termes non comptes ») ; il a
   ete retire le 2026-10-20, et avec lui le seul total affiche : il n'y a plus
   de chiffre a l'ecran que cette absence pourrait fausser.
   IL RESTE DEUX ENDROITS OU LA BULLE LE DIT, et pour la meme raison dans les
   deux cas : c'est l'ABSENCE D'UN NOMBRE qui se lit comme un defaut du site. Le
   « +20 » d'une arme, ecrit en or a cote du nom et suivi de rien ; et le niveau
   de fee, dont le curseur ne produit aucun bonus. Partout ailleurs la bulle
   montre desormais un chiffre, donc il n'y a plus de trou a expliquer. */
/* ═══ LE BANDEAU DE PANOPLIE, EN TETE DU CADRE ═══════════════════════════════
   Demande de Maxime, mot pour mot : « le rendre esthetique, visible uniquement
   sur la partie bulle informative en haut du cadre, c'est pas un element
   important ». C'etait une etiquette « Panoplie · 4 pieces » perdue au milieu
   des autres, qui donnait le NOMBRE DE PIECES DE L'ENSEMBLE — jamais celles
   qu'on porte. Quatre petits carres, allumes ou eteints, disent « 3 sur 4 »
   mieux qu'une phrase, et sans une ligne de texte.

   CE QUI RESTE ECRIT, PARCE QUE C'EST UNE MISE EN GARDE ET NON UNE DECORATION :
   les signatures du releve portent CHACUNE une ligne NEGATIVE, et la fenetre de
   panoplie du jeu n'affiche que ce que l'ensemble AJOUTE. Porter les eternels au
   complet COUTE des degats JcJ. Le compte et le chiffre sont LUS dans la table,
   pas recopies dans cette phrase.

   MAIS ELLE NE PASSE PAS AVANT LE NOM DE LA PIECE. Une premiere version collait
   cette phrase rouge DANS le bandeau, donc au-dessus du titre : sur les 256
   armures du catalogue, la premiere ligne lue n'etait plus l'objet survole mais
   un avertissement. Maxime demande l'inverse de ce ton-la — « c'est pas un
   element important ». D'ou les DEUX morceaux : `quoi='bar'` rend le bandeau
   (dessin et compte, aucune phrase) qui passe avant le nom ; `quoi='w'` rend la
   mise en garde, posee plus bas avec les autres `.palw` de la bulle, la ou l'on
   lit deja « ce cran ne rapporte rien » et « +N non compte ». Rien n'est perdu :
   la meme phrase, le meme chiffre, quatre lignes plus bas.

   `panBloc(slot)` de la fenetre de choix n'est pas touche : il rend un autre
   service — poser les quatre pieces en un geste — et il porte le bouton.

   LE SENS TIENT AU DESSIN ET AU COMPTE, PAS AU `title`. La bulle porte
   `pointer-events:none` et suit le curseur : aucun `title` pose dedans ne
   s'ouvre, ni a la souris ni au doigt. Les vignettes en gardent un quand meme,
   mais rien de ce qu'il faut lire n'y est enferme. */
function itipPano(slot,it,quoi){
  if(!slot||(ARMOR.indexOf(slot)<0&&FASHION.indexOf(slot)<0))return '';
  var sig=panSigDe(slot,it);if(!sig)return '';
  var mode=FASHION.indexOf(slot)>=0;
  var p=panEtat(mode,sig);if(!p)return '';
  if(quoi==='w'){
    var L=panLignes(mode,sig);
    if(!L||!(L.negAcquises.length||L.negAVenir.length))return '';
    var acq=L.negAcquises.length?L.negAcquises:L.negAVenir;
    var dit=acq.map(function(l){return Math.abs(l.v)+' de '+l.stat;}).join(' · ');
    return '<div class="panbarw">'+(L.negAcquises.length?'Retire ':'À '+acq[0].seuil+'/'+L.p.pieces.length+' : retirera ')
      +esc(dit)+' — la fenêtre du jeu ne le montre pas.</div>';
  }
  var col=panCouleur(p);
  var cases=p.pieces.map(function(x){
    var on=p.porte(x.slot);
    return '<span class="pc'+(on?' on':'')+'" title="'+escA(x.item.n)+'">'
      +((x.item.ic&&IC[x.item.ic])?'<img src="'+IC[x.item.ic]+'" alt="">':'')+'</span>';
  }).join('');
  return '<div class="panbar" style="--pcol:'+col+'">'
    +'<span class="pcs">'+cases+'</span>'
    +'<span class="pnm">'+esc(p.nom)+'</span>'
    +'<span class="pnn">'+p.portees+'/'+p.pieces.length+'</span></div>';
}
function itipBuild(it,cfg,slot,e){const col=couleurPiece(it,cfg);const icon=(it.ic&&IC[it.ic])?`<img src="${IC[it.ic]}">`:'';
  const isW=(slot==='weapon'||slot==='weapon2');
  const up=(cfg&&cfg.up)?` <span style="color:var(--gold)">+${cfg.up}</span>`:'';
  /* L'ASCENSION, AVEC LE DESSIN DE SA FAMILLE — la bulle etait en retard sur son
     propre panneau. Elle repetait une petite etoile generique tandis que `upUI`
     servait deja les vrais parchemins du client, un par famille d'arme et par
     rang (27 en tout). On sert donc le meme dessin au meme rang, pour que
     l'objet survole et l'objet regle se ressemblent.
     LE REPLI RESTE L'ETOILE : une arme hors du joint (les deux Arcs de Luzaka)
     ou une famille sans dessin garde ce qu'elle avait, plutot qu'un trou. */
  const asc=isW?ascensionDe(it):null;
  /* D'OU VIENT LA FAMILLE N'EST PAS L'AFFAIRE DU JOUEUR. Le `title` ajoutait
     « (famille donnee par le type d'arme : le client ne nomme pas cette piece) »
     — la provenance de la donnee, pas ce que l'ascension rapporte. Reste le nom
     de la famille et le rang, qui disent quel parchemin il faut. */
  const stars=(isW&&cfg&&cfg.stars)?` <span class="arts" title="${escA(asc?('Ascension '+asc.fam+' — rang '+cfg.stars):('Ascension — rang '+cfg.stars))}">${
    asc?Array.from({length:cfg.stars},(_,i)=>`<img src="${asc.img[Math.min(i,asc.img.length-1)]}" alt="">`).join('')
       :'<img src="/airbuilder/icons/sertissage/artefact.png" alt="">'.repeat(cfg.stars)}</span>`:'';
  /* Le jeu annonce d'abord CE QUE C'EST, puis SI ON PEUT LE PORTER, et enfin ce
     qu'il apporte. L'ordre comptait : le niveau requis etait relegue tout en bas,
     alors que c'est la premiere chose qu'on cherche devant une piece convoitee. */
  /* LE BANDEAU DE PANOPLIE PASSE AVANT LE NOM : « en haut du cadre », comme
     demande. L'etiquette qu'il remplace est retiree plus bas. Le bandeau SEUL :
     sa mise en garde est posee plus bas, avec les autres. */
  let h=itipPano(slot,it,'bar')
    +`<div class="t" style="color:${col}">${icon}<span>${nomPiece(it)}${up}${stars}</span></div>`;
  const tags=[];
  /* Le palier s'affichait pour les seules armes. Une armure Yggdrasil ou Lusaka
     en a un aussi, et il porte la couleur qui identifie la piece d'un coup d'oeil. */
  if(cfg&&cfg.tier&&RARCOL[cfg.tier])tags.push(`<span class="tag" style="background:${col}1a;color:${col};border:1px solid ${col}66">${esc(cfg.tier)}</span>`);
  if(it.tier)tags.push(`<span class="tag" style="background:${(it.col||'#cfd2dc')}14;color:${it.col||'var(--mut)'};border:1px solid ${(it.col||'#cfd2dc')}55">${esc(it.tier)}</span>`);
  if(it.set)tags.push(`<span class="tag" style="background:#ffffff0d;color:var(--mut);border:1px solid #ffffff24">Set ${esc(it.set)}</span>`);
  /* CE QU'EST LA PIECE, quand son emplacement ne suffit pas a le dire.
     · `offhand` nomme la piece de main gauche qui n'est pas un bouclier — un
       GRIMOIRE, et c'est aussi lui qui rend son « Attaque » a la fourchette.
     · `cat` et `lvl` sont TOUT ce qu'un mantra ou un masque possede en propre
       (« PvP 3 », « PvE 1 ») : le panneau les affichait, la bulle les taisait, et
       deux masques de categories differentes s'y lisaient a l'identique. */
  if(it.offhand){const _oh=String(it.offhand);
    tags.push(`<span class="tag" style="background:#ffffff0d;color:var(--mut);border:1px solid #ffffff24">${esc(_oh.charAt(0).toUpperCase()+_oh.slice(1))}</span>`);}
  if(it.cat&&(slot==='mantra'||slot==='masque'))tags.push(`<span class="tag" style="background:rgba(78,168,255,.12);color:var(--blue);border:1px solid rgba(78,168,255,.4)">${esc(it.cat)}${it.lvl?' '+it.lvl:''}</span>`);
  if(tags.length)h+=`<div class="tags">${tags.join('')}</div>`;
  /* Conditions pour equiper, juste sous le nom, comme en jeu. */
  const cond=[];
  if(it.lv)cond.push(`Niveau ${it.lv}`);
  if(it.pr)cond.push(`Prestige ${it.pr}`);
  const cl=clsLabel(it);
  if(cl&&cl!=='Toutes')cond.push(cl);
  if(cond.length)h+=`<div class="cond">${cond.map(c=>esc(c)).join(' · ')}</div>`;
  /* LE LIBELLE DE LA FOURCHETTE VIENT DE L'EMPLACEMENT — voir `abilLabel`. */
  if(it.atk)h+=`<div class="atk"><span>${abilLabel(slot,it)}</span><b>${it.atk[0]} ~ ${it.atk[1]}</b></div>`;
  /* CE QUE LE RELEVE NE CONNAIT PAS, DIT UNE FOIS. Le champ `manual` marque les
     deux pieces que le builder a saisies a la main : sans cle du client, elles
     n'ont ni maitrise, ni vivier de rarete, ni parchemin d'ascension. Le bloc de
     maitrise le disait, mais seulement une fois la maitrise reglee — devant une
     arme nue, les trois absences passaient pour un oubli du site. */
  if(it.manual)h+=`<div class="palw">Pièce saisie à la main : ni maîtrise, ni vivier de rareté, ni ascension dans le relevé du client.</div>`;
  const setb=it.setb&&it.setb.length,bonus=setb?it.setb:(it.b||[]);
  const configured=!!(cfg||(slot==='familier'&&e));
  /* Les bonus de base disparaissaient des qu'une piece etait configuree : on ne
     pouvait plus voir ce qu'elle apporte sans la desequiper. Ils restent.
     ET ILS RESTENT TOUS : la Cape Farmeur porte « Penyas gagnes % +20 », un
     filtre l'effacait, et c'est pourtant la seule raison de la porter. Un bonus
     d'equipement n'est pas un butin ramasse — voir dans le bloc « CE QU'ON RAMASSE ≠ CE QUE L'EQUIPEMENT DONNE ». */
  if(bonus.length){h+=`<div class="sec">${setb?'Bonus de set':'Bonus'}</div>`+bonus.map(b=>`<div class="bl"><span>${esc(b[0])}</span><span>${b[1]<0?'':'+'}${b[1]}</span></div>`).join('');}
  /* ═══ UNE ARMURE A ZERO N'EST PAS UN BUG D'AFFICHAGE ═════════════════════════
     Aucune armure du catalogue ne porte de bonus propre — le releve le compte —
     et la bulle n'ecrivait alors RIEN entre les conditions et la configuration.
     Un blanc a cet endroit se lit comme une piece cassee, et c'est le panneau de
     reglage, lui, qui portait deja l'explication. Le nombre est LU. */
  else if(slot&&ARMOR.indexOf(slot)>=0&&(MECH.armure||{}).bonusPropre){
    const _bp=MECH.armure.bonusPropre;
    h+=`<div class="palw">Aucun bonus propre — comme les ${_bp.objets} armures du catalogue. Sa valeur est dans la panoplie, le palier, le perçage et l'éveil.</div>`;
  }
  /* LA LIGNE NEGATIVE DE LA PANOPLIE, ICI ET PAS DANS LE BANDEAU. Elle appartient
     a cette rangee de mises en garde — celles qui pesent sur un chiffre affiche —
     et non au dessin d'en-tete, qui doit rester muet. Voir `itipPano`. */
  h+=itipPano(slot,it,'w');
  /* ═══ LE PALIER DU BIJOU — LE DEFAUT QUE CETTE BULLE AVAIT DEPUIS TOUJOURS ═══
     Elle n'affichait que `it.b`, les bonus DE BASE de la piece, et n'appelait
     jamais `bonusDePalier()`. Un Anneau Aile a +30 annoncait donc ce qu'il vaut
     a +0, pendant que le total, lui, comptait juste : le joueur lisait deux
     nombres inconciliables sur le meme objet.

     ELLE APPELLE MAINTENANT LA MEME FONCTION QUE LE TOTAL — `bonusDePalier`,
     celle de `totalsDetail` — et surtout pas une seconde lecture du releve. Une
     deuxieme implementation aurait fini par diverger de la premiere, et c'est
     precisement le defaut qu'on repare.

     LE PALIER S'AJOUTE AU BONUS DE BASE, mais NE S'AJOUTE PAS AUX PALIERS
     PRECEDENTS : `rangs[palier]` est la valeur totale au rang atteint. Les deux
     blocs sont donc distincts a l'ecran, comme ils le sont dans le total.

     LE COLLIER D'ANGE ETAIT LE CAS LE PLUS PARLANT DU FILTRE DE TROP. Son
     « Attaque » plafonne a 1 000 des le rang 20 ; ce sont ses dix derniers
     crans — « Taux de butin % » de 1 a 10 — qui font toute la difference entre
     un +20 et un +30, et c'est exactement ce qu'un filtre sur le libelle
     effacait. La bulle montrait dix rangs strictement identiques. */
  if(cfg&&cfg.up&&BIJOUX.indexOf(slot)>=0){
    const bp=bonusDePalier(it,cfg.up),bm=bijouPaliers(it,cfg.up);
    if(bp&&bp.lignes.length){
      h+=`<div class="sec">Palier +${cfg.up}${bp.plafond?' <span style="text-transform:none;letter-spacing:0">sur +'+bp.plafond+'</span>':''}</div>`
        +bp.lignes.map(l=>`<div class="bl pal"><span>${esc(l[0])}</span><span>${l[1]<0?'':'+'}${l[1]}</span></div>`).join('')
        +`<div class="palw" title="${escA('Le palier atteint REMPLACE les précédents : cette valeur est le total du rang '+cfg.up+', pas un gain qui s\'ajoute aux rangs d\'avant. Le jeu ne le dit nulle part.')}">Ce bloc remplace les paliers précédents, il ne s'y ajoute pas.</div>`;
    }
    /* LES DEUX RENSEIGNEMENTS QUI EVITENT UNE DEPENSE. Monter d'un cran peut ne
       RIEN rapporter — le releve compte 78 rangs qui recopient a l'identique le
       precedent — et le jeu ne le dit pas davantage. C'est le genre de mise en
       garde que la regle de la maison garde meme quand elle allonge la bulle :
       elle change le geste du joueur. */
    if(bm&&bm.vide)h+=`<div class="palw warn">Le client n'écrit aucun palier pour ce bijou : l'améliorer ne lui ajoute rien.</div>`;
    else if(bm&&bm.plateau)h+=`<div class="palw warn">+${bm.n} recopie +${bm.n-1} à l'identique : ce cran n'a rien rapporté.${bm.suivant?' Prochain palier qui change : +'+bm.suivant+'.':' Aucun palier au-dessus ne change quoi que ce soit.'}</div>`;
    /* UN SEUL CRAN MORT NE S'ECRIT PAS COMME UN INTERVALLE : « Les crans +3 a
       +3 ne changent rien » se lit comme une coquille et fait douter du reste
       de la bulle. Le cas est le plus frequent des trois — la plupart des
       trous du releve font un cran. */
    else if(bm&&bm.suivant&&bm.suivant>bm.n+1)h+=`<div class="palw">${bm.suivant===bm.n+2?`Le cran +${bm.n+1} ne change rien`:`Les crans +${bm.n+1} à +${bm.suivant-1} ne changent rien`}. Prochain palier utile : +${bm.suivant}.</div>`;
  }
  /* ═══ LE PALIER D'UNE ARME, D'UNE ARMURE OU D'UN COSTUME ═════════════════════
     Le +N s'affichait en or a cote du nom, et RIEN dessous. Le bijou, lui, a
     desormais son bloc chiffre : la meme bulle montrait donc un « +20 » qui
     rapporte sur un anneau et un « +20 » muet sur une arme, sans jamais dire que
     la difference vient du RELEVE et non du site. Un joueur y lit un oubli.
     LE FAIT EST ETABLI ET ON NE LE CONTOURNE PAS : `propEnchant.inc` ne porte
     que des coefficients, et ce qu'ils multiplient n'est ecrit dans aucun
     fichier. Le costume n'a meme pas de table. On l'ECRIT, on ne l'estime pas.
     LA REUSSITE, ELLE, EST CHIFFREE — et c'est le seul nombre de cette mecanique
     qui change le geste : a +20 il reste un essai sur dix. */
  else if(cfg&&cfg.up&&slot&&(isW||slot==='shield'||ARMOR.indexOf(slot)>=0||FASHION.indexOf(slot)>=0)){
    const _r=amelReussite(cfg.up);
    h+=`<div class="palw warn">+${cfg.up} non compté : le client ne chiffre pas ce gain.`
      +(_r!=null?` Réussite : ${_r} %.`:'')+`</div>`;
  }
  // --- Schéma de configuration (pièce équipée) ---
  if(configured){let cf='';const chips=[];
    if(isW&&cfg)chips.push(`<span class="chip" style="${cfg.rune?'color:var(--green);border-color:#4ADE8055':'color:var(--mut);opacity:.65'}">${runeImg(it.tier)} ${esc(runeName(it.tier))}</span>`);
    else if(cfg&&typeof cfg.rune==='string'&&cfg.rune){const _rc=STATCOL[cfg.rune]||'#4ADE80';chips.push(`<span class="chip" style="color:${_rc};border-color:${_rc}55">${runeBonusImg(cfg.rune)} ${esc(cfg.rune)}</span>`);}
    /* LA PASTILLE COMPTE SUR LE PLAFOND DE LA RARETE, pas sur le 100 global :
       « 100/100 » sur une arme Rare annonçait une maitrise pleine la ou la
       rarete l'arrete a 40. Et quand le plafond n'est pas publie, le
       denominateur DISPARAIT plutot que de retomber sur 100 — ce serait poser
       pour le Pre-Mythique un plafond qu'aucune source n'ecrit. */
    if(isW&&cfg&&cfg.mastery){const _pl=maitrisePlafond(cfg.tier);
      chips.push(`<span class="chip" style="color:var(--gold);border-color:#FFD24A55"><i class=vgi-target></i> ${_pl==null?cfg.mastery:(Math.min(cfg.mastery,_pl)+'/'+_pl)}</span>`);}
    if(slot==='familier'&&e){chips.push(`<span class="chip" style="color:var(--gold);border-color:#FFD24A55"><i class=vgi-medal></i> Rang ${e.rank||'D'}</span>`);if(typeof e.rune==='string'&&e.rune){const _rc=STATCOL[e.rune]||'#4ADE80';chips.push(`<span class="chip" style="color:${_rc};border-color:${_rc}55">${runeBonusImg(e.rune)} ${esc(e.rune)}</span>`);}}
    if(chips.length)cf+=`<div class="chips">${chips.join('')}</div>`;
    /* ═══ LE SERTISSAGE DIT ENFIN CE QU'IL VAUT ════════════════════════════════
       La bulle listait les statistiques choisies et leur nombre — « Attaque ×3 »
       — sans jamais le NOMBRE que ça donne, alors que le releve porte l'echelle
       complete : 9 statistiques, 5 joyaux, 8 paliers.
       LE « ×3 » ETAIT DEJA LE PALIER SANS LE DIRE : le palier de sertissage est
       le nombre de joyaux DE LA MEME STATISTIQUE, et sa valeur REMPLACE les
       precedentes. L'ecrire « palier 3 » plutot que « ×3 » evite la lecture
       naturelle et fausse — trois fois la valeur d'un joyau.
       LE JOYAU EST NOMME. Le builder retient la statistique de chaque logement,
       jamais le joyau pose : on lit l'echelle de celui que le niveau de la piece
       situe, et on l'ecrit, exactement comme l'eveil nomme ses deux series.
       L'HOLOGRAPHIQUE RESTE SUR SA LIGNE, avec sa valeur fixe et le mot qui dit
       qu'elle S'AJOUTE : c'est l'autre mecanique, et les confondre ferait
       additionner ce qui remplace. */
    if(cfg&&cfg.dia){const gems=cfg.dia.map(d=>diaImg(d,false)).join('');const holos=(cfg.holo||[]).map(d=>diaImg(d,true)).join('');
      const _gm=sertGemme(it);
      const dG=sertGroupes(cfg.dia),hG=sertGroupes(cfg.holo);
      const dT=dG.map(function(g){const v=_gm?sertValeur(g[0],_gm,g[1]):null;
        return esc(g[0])+(g[1]>1?' palier '+g[1]:'')+(v!=null?' <b>+'+v+'</b>':'');}).join(' · ');
      const hT=hG.map(function(g){const v=holoValeur(g[0]);
        return esc(g[0])+(g[1]>1?' ×'+g[1]:'')+(v!=null?' <b>+'+(v*g[1])+'</b>':'');}).join(' · ');
      cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Sertissage</span><div style="flex:1;min-width:0"><div class="gems">${gems}${holos?'<span class="sep"></span>'+holos:''}</div>${
        dT?`<div class="sertl dia">${dT}</div>`:''}${
        hT?`<div class="sertl holo">Holo : ${hT} <span class="sertn">fixe, s'ajoute</span></div>`:''}${
        dT&&_gm?`<div class="mnote">Échelle du ${esc(_gm)} · un palier remplace le précédent.</div>`:''}</div></div>`;}
    /* LES GEMMES DE COSTUME N'ONT PAS DE CHIFFRE, ET C'EST LA REGLE 3 QUI DECIDE.
       `GEMC` ne donne qu'un PLAFOND par statistique (Force 40, PV max 28 500) —
       le meme genre de nombre que `GEMU` pour l'arme, dont `faits.sertissage`
       precise qu'il est « le dernier palier numerote du Diamant, et rien
       d'autre ». Aucune table de paliers n'existe pour le costume. Poser 40 a
       cote de « Force » se lirait comme le gain du logement : on n'ecrit donc que
       la statistique, sur la meme grille de lecture que le sertissage d'arme. */
    if(cfg&&cfg.gems){const gems=cfg.gems.map(d=>gemmeCostume(slot,d)).join('');const gT=statTally(cfg.gems);cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Gemmes</span><div style="flex:1;min-width:0"><div class="gems">${gems}</div>${gT?`<div class="sertl dia">${gT}</div>`:''}</div></div>`;}
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
        if(pcard){const t=pierceTotals(cfg,slot);if(t&&t.lines.length)pc+=`<div class="sertl per">${t.lines.map(l=>esc(l[0])+' '+l[1]).join(' · ')}</div>`;}
        /* ═══ LES DEUX FAITS DU PERÇAGE QUI COUTENT DE L'ARGENT, EN UNE LIGNE ═══
           1. LES DERNIERS LOGEMENTS NE S'OUVRENT PAS A COUP SUR. Le releve chiffre
              la chance des emplacements 11 et 12 ; la bulle affichait « 12/12 »
              comme un etat acquis. Les rangs et les taux sont LUS dans
              `faits.percage.ouverture`, jamais recopies.
           2. ON NE RETIRE PAS LA CARTE QU'ON VEUT — le jeu previent, mot pour
              mot, que « la derniere carte sertie sera retiree (celle du bas) », et
              l'operation se paie. Une mise en garde qui evite une depense reste,
              c'est la regle ; les DEUX tiennent sur une seule ligne plutot que
              sur deux paragraphes, et c'est tout ce que la hauteur permet. */
        const _pf=faits().percage||{},_ouv=(_pf.ouverture||[]).filter(function(o){return open>=o[0];});
        const _pw=[];
        if(_ouv.length)_pw.push('ouverture des logements '+_ouv.map(function(o){return o[0]+' ('+Math.round(o[1]*100)+' %)';}).join(' et '));
        if(open&&_pf.retrait)_pw.push('retrait : la dernière carte, '+(_pf.cout?esc(String(_pf.cout).replace(/^Le coût est de /,'').replace(/\.$/,'')):'payant'));
        if(_pw.length)pc+=`<div class="mnote">${_pw.join(' · ')}.</div>`;
        pc+=`</div></div>`;cf+=pc;}}
    /* ═══ L'EVEIL DIT ENFIN SON CHIFFRE — ET DIT DE QUELLE SERIE IL VIENT ═══
       La bulle donnait la ligne et la statistique, jamais un nombre : « R2 ·
       Force » ne dit pas ce que R2 rapporte, et c'est la question qu'on se pose.

       POURQUOI PAS UN NOMBRE NU. Le builder retient la ligne et la statistique ;
       il ne retient NI la valeur obtenue, NI la voie empruntee. Or le client a
       deux voies aux chiffres inconciliables — le parchemin ordinaire TIRE AU
       SORT sous un plafond (Force 15) et previent que « les proprietes peuvent
       etre negatives », le parchemin d'eveil FIXE donne 30 en R1 et 60 en R2.
       Le fixe vaut deux a quatre fois le plafond du tirage. Poser « +60 » a cote
       de « Force » choisirait donc une voie a la place du joueur, et afficherait
       comme sien un chiffre qui n'est peut-etre pas le sien.
       Les deux series sont donc NOMMEES l'une et l'autre. C'est ce que le total
       dit deja de son cote, en rangeant l'eveil parmi les termes non comptes. */
    if(cfg&&cfg.evL){
      const ev=eveilChiffre(cfg.evS),pc=(ev&&ev.fixe&&ev.fixe.pourcent)?' %':'';
      let evd='';
      if(ev&&ev.fixe)evd+=`<span class="evs">Parchemin fixe <b>+${ev.fixe[cfg.evL]!=null?ev.fixe[cfg.evL]:ev.fixe.R1}${pc}</b></span>`;
      /* LES DEUX NOMBRES SONT LA MEME STATISTIQUE : ILS PORTENT LA MEME UNITE.
         Le plafond du tirage s'affichait NU pendant que le parchemin fixe
         portait son « % » — « Parchemin fixe +40 % » au-dessus de « Tirage au
         plus +10 » pour les MEMES Degats critiques. Les deux lignes n'existent
         que pour etre comparees, et deux unites differentes rendaient la
         comparaison fausse a l'oeil. `eveilChiffre` cherche les deux sous LA
         MEME cle de statistique : le « % » que le releve pose sur elle vaut
         donc pour l'un comme pour l'autre. La ou le releve ne le dit pas
         (aucune ligne fixe), on n'ajoute rien plutot que de le supposer. */
      /* LE MOT QUE LE PARCHEMIN PORTE LUI-MEME. « Tirage au plus +15 » se lit
         comme une fourchette de 0 a 15, alors que le client ecrit sur l'objet que
         « les proprietes peuvent etre negatives » : le plancher n'est pas zero.
         Le mot tient DANS la ligne existante — l'etiquette de gauche etait
         presque vide — donc il ne coute pas un pixel de hauteur, et il ne
         s'affiche que si le releve documente bien la voie du tirage. */
      if(ev&&ev.plafond!=null)evd+=`<span class="evs">Tirage${(faits().eveil||{}).tirage?', peut être négatif':''} <b>au plus +${ev.plafond}${pc}</b></span>`;
      /* LE PLUS LONG `title` DE TOUT LE PARAMETRAGE — 282 caracteres — EST PARTI.
         Il disait « Le builder retient la ligne et la statistique, pas la valeur
         obtenue ni la voie employee. Les deux series du client sont donc donnees
         telles quelles… ». La premiere phrase decrit CE QUE LE BUILDER GARDE EN
         MEMOIRE : le joueur ne s'en sert jamais. La seconde re-explique les deux
         lignes qui sont DEJA SOUS SES YEUX, chacune nommee et chiffree —
         « Parchemin fixe +30 » et « Tirage, peut etre negatif au plus +15 ». Le
         fait qui compte (deux voies, deux nombres, l'une pouvant sortir
         negative) est donc porte par l'affichage lui-meme, en clair, sans
         survol. Un `title` qui paraphrase le texte qu'il recouvre est du bruit. */
      cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Éveil</span><div style="flex:1;min-width:0"><b style="font-size:12px;color:var(--c-eveil)">${cfg.evL}${cfg.evS?' · '+esc(cfg.evS):''}</b>${
        evd?`<div class="evd">${evd}</div>`:''}</div></div>`;}
    /* LE SCROLL : LA PLAGE ICI, L'AVERTISSEMENT DANS LE PANNEAU.
       « Force +4 » ne disait pas que le niveau se TIRE AU SORT entre +1 et +4 :
       la plage du releve tient dans la ligne existante, elle ne coute rien.
       LA PHRASE QUI COUTE DE L'ARGENT — « Ceci remplace toute statistique
       existante sur l'arme » — est passee dans `scrollUI`, la ou l'on choisit le
       parchemin. Elle valait trente pixels de bulle pour un renseignement qui ne
       sert qu'au MOMENT du geste, et une bulle qui deborde de l'ecran ne le dirait
       a personne. Elle n'est pas retiree du service : elle a change de place. */
    if(cfg&&cfg.scrS){const _sc=faits().scroll||{};
      cf+=`<div class="crow"><span class="lab">Scroll</span><b style="font-size:12px;display:inline-flex;align-items:center;gap:5px"><img class="runeic" src="/airbuilder/icons/sertissage/statscroll.png" alt="">${esc(cfg.scrS)} +${cfg.scrL||0}${_sc.plage?` <span class="sertn">tiré ${esc(_sc.plage)}</span>`:''}</b></div>`;}
    /* ═══ L'ELEMENT — UN CURSEUR QUI N'APPARAISSAIT NULLE PART ═════════════════
       Le panneau propose cinq cartes et un niveau jusqu'a +20, et la bulle n'en
       montrait RIEN : une arme reglee « Feu +20 » se relisait sans element. La
       carte du client porte son dessin dans la table, donc on la sert — le meme
       dessin que l'en-tete du panneau, pas un symbole different. */
    if(cfg&&(cfg.elemType||cfg.elemLvl)){const _ec=(meca().element||{})[cfg.elemType];
      cf+=`<div class="crow"><span class="lab">Élément</span><b style="font-size:12px;display:inline-flex;align-items:center;gap:5px">${
        _ec&&_ec.f?`<img class="runeic" src="${_ec.f}" alt="">`:'<i class=vgi-flame></i>'}${esc(cfg.elemType||'—')} +${cfg.elemLvl||0}${
        (faits().element||{}).max?` <span class="sertn">sur +${faits().element.max}</span>`:''}</b></div>`;}
    /* ═══ LES LIGNES DE RARETE — « LES BONUS », DEMANDE PAR MAXIME ═════════════
       La bulle portait l'etiquette du palier de rarete et rien de ses LIGNES,
       qui sont pourtant tout ce que la rarete apporte. Trois faits du releve
       viennent avec, et ils changent le geste :
         · la fourchette de chaque ligne, prise dans le vivier de CETTE arme ;
         · la chance d'en obtenir autant — quatre lignes valent 2 % ;
         · le vivier lui-meme, quand la ligne choisie n'y figure pas. Le panneau
           propose les sept statistiques de `MECH.arme.rarete_pool` a toutes les
           armes, et le client, lui, n'en autorise que quatre par arme : l'Arc
           eternel tire Endurance, PV max %, Blocage corps a corps et Blocage a
           distance, aucune des quatre que le panneau met en tete. Le dire ici est
           le seul endroit ou ça se voit. */
    if(isW&&cfg&&(cfg.rlines||[]).filter(Boolean).length){
      const _rl=(cfg.rlines||[]).filter(Boolean),_vv=vivierDe(it);
      const _pool={};((MECH.arme&&MECH.arme.rarete_pool)||[]).forEach(function(b){_pool[b.stat]=[b.min,b.max];});
      (_vv||[]).forEach(function(b){_pool[b[0]]=[b[1],b[2]];});
      const _hors=_vv?_rl.filter(function(s){return !_vv.some(function(b){return b[0]===s;});}):[];
      const _ch=rareteChance(_rl.length);
      /* LA FOURCHETTE S'ECRIT UNE FOIS QUAND ELLE EST LA MEME POUR TOUTES. Quatre
         lignes alignees a droite coutaient quatre rangees pour repeter « +10 →
         +50 » quatre fois. On la sort du tableau des qu'elle est commune, et on
         ne la garde par ligne que si le releve en donne de differentes. */
      const _r0=_rl.map(function(s){return _pool[s];});
      const _un=_r0.every(function(r){return r&&_r0[0]&&r[0]===_r0[0][0]&&r[1]===_r0[0][1];})?_r0[0]:null;
      cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Rareté</span><div style="flex:1;min-width:0">`
        +`<div class="sertl rar">${_rl.map(function(s){const r=_pool[s];
            return esc(s)+((!_un&&r)?' <b>+'+r[0]+'→+'+r[1]+'</b>':'');}).join(' · ')}</div>`
        +`<div class="mnote">${_un?'+'+_un[0]+' → +'+_un[1]+' par ligne':'tiré au sort'}${
            _ch!=null?` · ${_rl.length} ligne${_rl.length>1?'s':''} = ${_ch} % au tirage`:''}.</div>`
        +(_hors.length?`<div class="mnote warn">${
            _hors.length===_rl.length?'Aucune n\'est dans le vivier'
              :esc(_hors.join(' · '))+' hors du vivier'
            } de l'arme, qui tire ${esc((_vv||[]).map(function(b){return b[0];}).join(' · '))}.</div>`:'')
        +`</div></div>`;
    }
    /* ═══ CE QUE LA MAITRISE RAPPORTE, LIGNE PAR LIGNE ═════════════════════
       La bulle affichait « +4 » sur une arme Mythique a maitrise 100 — le gain
       d'UN palier, pris pour le total — et ajoutait « le niveau ne change rien ».
       Les deux etaient faux : le gain tombe par palier de dix niveaux, il se
       cumule, et la rarete plafonne le niveau donc le nombre de paliers.
       ELLE MONTRE MAINTENANT LE GAIN ACQUIS, et le plafond qui le borne. Le
       maximum de la rarete reglee est dit a cote quand il reste a atteindre :
       c'est le geste qui reste a faire, pas un second total.
       ET ON N'ADDITIONNE PAS : quand une ligne est nommee pour cette arme, elle
       REMPLACE la ligne de son type ; l'ecartee est dite a part, en clair. */
    if(isW&&cfg){
      const mz=maitriseDe(it);
      if(mz){
        const _niv=cfg.mastery||0;
        cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Maîtrise</span><div style="flex:1;min-width:0">`
          +mz.lignes.map(l=>{const g=maitriseGain(l,_niv,cfg.tier),plein=maitriseAtteignable(l,cfg.tier);
            /* LE CODE DU CLIENT EST SORTI DU `title`. Il ouvrait sur
               « DST_CRITICAL_BONUS — 4 par palier… » : le nom de colonne du
               client, que le joueur ne cherche jamais et ne peut pas utiliser.
               Le libelle français est deja sur la ligne. Ce qui reste est le pas
               du palier et le seuil de rarete — la seule moitie qui evite une
               depense (monter la maitrise sous ce seuil ne rapporte rien). */
            return `<div class="mline${g?' on':''}" title="${escA(l.pp+' par palier de '+maitrisePas()+' niveaux'+(maitriseAllumee(l,cfg.tier)?'':(', et rien avant '+rareteDuCode(l.des))))}"><span>${esc(l.fr)}</span><span>${maitriseTexte(g)}${(g!=null&&plein!=null&&plein>g)?` <i style="opacity:.6;font-style:normal">/ ${plein}</i>`:''}</span></div>`;}).join('')
          /* UNE SEULE NOTE, ET C'EST CELLE QUI CHANGE LE GESTE : combien de
             paliers sont acquis, et a quel niveau la rarete arrete la maitrise.
             Elle remplace « allumee des Rare, sans monter » et « le niveau ne
             change rien », qui disaient tous deux le contraire de la verite. */
          +`<div class="mnote">${maitrisePhrasePlafond(_niv,cfg.tier)}</div>`
          +(mz.nomme&&mz.ecartee.length?`<div class="mnote"><b>Remplace</b> la ligne de type (${esc(maitriseMots(mz.ecartee,_niv,cfg.tier))}).</div>`:'')
          +`</div></div>`;
      } else if(cfg.mastery&&!armeFait(it)){
        cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Maîtrise</span><div style="flex:1;min-width:0"><span class="mnote">Non renseigné : le relevé du client ne connaît pas cette arme.</span></div></div>`;
      }
    }
    /* ═══ LA FEE : UN CURSEUR 0 -> 50 QUI NE PRODUISAIT RIEN ═══════════════
       Le tableau de bonus de la piece est VIDE : monter le niveau ne change pas
       le total, et rien ne le disait. Le client, lui, chiffre cinq paliers par
       esprit. On montre le palier ATTEINT — le dernier seuil franchi, pas la
       somme — et on dit franchement qu'il n'entre pas dans le total.

       CE QUE CE LOT AJOUTE, dans l'ordre ou ca sert : l'effet ATTEINT, l'effet
       du PALIER SUIVANT, CE QU'IL COUTE pour y aller, et les crans qui ne
       rapportent rien avant lui. C'est la lecture de la page Craft et
       Collections, la seule qui reponde a « j'en suis la, il me faut combien ».

       LE NIVEAU 0 N'EST PLUS UN SILENCE. La condition exigeait `cfg.lvl` : une
       fee posee et pas encore montee — le cas de depart de tout le monde — ne
       disait donc RIEN, ni ce qu'elle apporterait, ni a quel prix. C'est
       precisement l'ecran ou le renseignement decide d'une depense. */
    if(slot==='fairy'&&cfg){
      const niv=cfg.lvl|0,esp=espritDe(it),ES=faits().esprit||{};
      const pal=esp?espritPalier(esp,niv):null,suiv=esp?espritSuivant(esp,niv):null;
      const plat=esp?espritPlateau(esp,niv):null;
      const cout=suiv?espritCout(niv,suiv[0]):null;
      const tA=pal?espritTexte(pal):'',tB=suiv?espritTexte(suiv):'';
      cf+=`<div class="crow" style="align-items:flex-start"><span class="lab">Niveau fée</span><div style="flex:1;min-width:0"><b style="font-size:12px">${niv}${esp?' / '+(ES.max||niv):''}</b>${
        (pal||suiv)?`<div class="evd">${
          pal?`<span class="evs fee"><span>Palier ${pal[0]}${suiv?'':' <span class="sertn">· le dernier</span>'}</span><b>${tA?esc(tA):'non renseigné'}</b></span>`:''}${
          suiv?`<span class="evs fee next"><span>Suivant · ${suiv[0]}</span><b>${tB?esc(tB):'non renseigné'}</b></span>`:''}</div>`:''}${
        (cout!=null&&cout>0)?`<div class="sertl pou">${poudreHtml(cout)} <span class="sertn">du ${Math.max(1,niv)} au ${suiv[0]}</span></div>`:''}${
        plat?`<div class="mnote warn">Du ${plat.de} au ${plat.a}, rien ne change : l'effet monte au ${plat.seuil}.</div>`:''}${
        esp?`<div class="mnote">Non compté dans le total : le relevé chiffre l'effet, la pièce ne porte aucun bonus.</div>`
          :`<div class="mnote">Non renseigné : le relevé du client ne chiffre pas les paliers de cette fée.</div>`}</div></div>`;}
    if(cf)h+=`<div class="sec">Configuration</div>${cf}`;}
  return h;}
/* L'EMPLACEMENT EST LE QUATRIEME ARGUMENT, ET IL DECIDE DE TROIS CHOSES : le
   bandeau de panoplie (armure et costume seulement), le libelle de la fourchette
   `atk` — « Attaque » sur une arme, « Defense » ailleurs — et le bloc de palier
   (bijou chiffre, ou mention « non compte »). Sans lui, `itipBuild` ne saurait
   pas si l'objet survole est une piece d'armure ou une arme. */
/* ═══ LE PIEGE DU DIFFERE, COTE BULLE ════════════════════════════════════════
   `paliers.json` et `mecaniques.json` arrivent APRES le premier rendu. Une bulle
   ouverte pendant ce temps est construite sans eux : elle montre un bijou sans
   son palier et une arme sans sa maitrise, puis reste ainsi tant que la souris
   ne repart pas. `render()` ne la rattrape pas — elle vit hors du panneau.

   On retient donc de quoi la REFAIRE a l'identique, et les deux chargements la
   rappellent en arrivant, exactement comme ils rappellent deja le rendu et la
   fenetre de choix. La bulle n'est pas redessinee si elle est fermee : on ne
   fabrique pas du HTML pour un element invisible. */
var _itipArgs=null;
function itipRefresh(){
  if(!_itipEl||_itipEl.style.display!=='block'||!_itipArgs)return;
  var a=_itipArgs;
  try{_itipEl.innerHTML=itipBuild(a.it,a.cfg,a.slot,a.e);itipTeinte(_itipEl,a.it,a.cfg);}catch(x){}
}
function itipShow(ev,idRaw){if(!pickSlot)return;const id=String(idRaw);const it=(listFor(pickSlot)||[]).find(x=>String(x.id)===id);if(!it){itipHide();return;}const el=_itip();_itipArgs={it:it,cfg:null,slot:pickSlot,e:null};el.innerHTML=itipBuild(it,null,pickSlot);itipTeinte(el,it);el.style.display='block';itipMove(ev);}
function itipTeinte(el,it,cfg){const c=couleurPiece(it,cfg);el.style.borderColor=c?c+'88':'';el.style.boxShadow=c?`0 14px 36px #000d, 0 0 0 1px ${c}22 inset`:'';}
function itipSlot(ev,slot){const e=E(slot);if(!e||!e.item){itipHide();return;}const el=_itip();_itipArgs={it:e.item,cfg:e.cfg,slot:slot,e:e};el.innerHTML=itipBuild(e.item,e.cfg,slot,e);itipTeinte(el,e.item,e.cfg);el.style.display='block';itipMove(ev);}
function itipMove(ev){if(!_itipEl||_itipEl.style.display!=='block')return;const pad=14,w=_itipEl.offsetWidth,h=_itipEl.offsetHeight;let x=ev.clientX+pad,y=ev.clientY+pad;if(x+w>window.innerWidth-8)x=ev.clientX-w-pad;if(x<8)x=8;if(y+h>window.innerHeight-8)y=window.innerHeight-h-8;if(y<8)y=8;_itipEl.style.left=x+'px';_itipEl.style.top=y+'px';}
function itipHide(){if(_itipEl)_itipEl.style.display='none';_itipArgs=null;}
/* ═══ LA PIECE REGLEE, MONTREE EN TETE DE SON PANNEAU ════════════════════════
   On reglait une piece sans jamais la voir. Le panneau s'ouvrait droit sur
   « Rune Eternelle — Oui / Non », et le seul rappel de ce qu'on tenait etait le
   titre de l'emplacement : « ARME — ARCANISTE G ». La bulle, elle, sait tout
   montrer — mais elle ne s'ouvre qu'au survol de la LISTE, jamais au-dessus des
   reglages.

   On reprend donc ici la meme lecture que la bulle, et dans le meme ordre : le
   dessin, le nom a la couleur de la piece, le palier de rarete regle, l'attaque.
   MEMES SOURCES, PAS UNE COPIE D'AFFICHAGE : `couleurPiece` et `ascensionDe`
   sont celles de la bulle, si bien qu'une arme ne peut pas etre orange ici et
   rouge deux centimetres plus bas. */
/**
 * LE NOM D'UNE PIECE, AVEC SON SEXE UNE SEULE FOIS.
 *
 * Le moteur ajoutait ' (G)' des que l'objet portait un sexe — et le releve
 * ecrit deja la mention DANS le nom pour la quasi-totalite des pieces, d'ou
 * « Grande Tenue des eternels  (G) (G) » a l'ecran. La mention reste utile la
 * ou le nom se tait (les tenues de mode, qui n'ont que « — tete », « — torse »).
 *
 * LA CONDITION SE LIT SUR LE NOM DE CHAQUE OBJET, pas sur un compte ecrit ici :
 * si le releve cessait de porter la mention, le suffixe reviendrait tout seul.
 */
function nomPiece(it){
  if(!it||!it.n)return '';
  var n=esc(it.n);
  if(!it.sex)return n;
  return (it.n.indexOf('('+it.sex+')')>=0)?n:n+' ('+it.sex+')';
}
function pieceEntete(slot,e){
  if(!e||!e.item)return '';
  var it=e.item,cfg=e.cfg,col=couleurPiece(it,cfg);
  var isW=(slot==='weapon'||slot==='weapon2');
  var ic=(it.ic&&IC[it.ic])?'<img src="'+IC[it.ic]+'" alt="">':'<i class=vgi-package></i>';
  var asc=isW?ascensionDe(it):null;
  var etoiles=(isW&&cfg&&cfg.stars)?'<span class="arts">'+(asc
        ?Array.from({length:cfg.stars},function(_,i){return '<img src="'+asc.img[Math.min(i,asc.img.length-1)]+'" alt="">';}).join('')
        :new Array(cfg.stars+1).join('<img src="/airbuilder/icons/sertissage/artefact.png" alt="">'))+'</span>':'';
  var tg=[];
  if(cfg&&cfg.tier&&RARCOL[cfg.tier])tg.push('<span class="tag" style="background:'+col+'1a;color:'+col+';border:1px solid '+col+'66">'+esc(cfg.tier)+'</span>');
  if(it.tier)tg.push('<span class="tag" style="background:'+(it.col||'#cfd2dc')+'14;color:'+(it.col||'var(--mut)')+';border:1px solid '+(it.col||'#cfd2dc')+'55">'+esc(it.tier)+'</span>');
  var sous=[];
  if(it.lv)sous.push('Niveau '+it.lv);
  if(it.pr)sous.push('Prestige '+it.pr);
  if(it.atk)sous.push('Attaque '+it.atk[0]+' ~ '+it.atk[1]);
  return '<div class="pent" style="border-color:'+col+'44">'
    +'<span class="pent-ic" style="border-color:'+col+'55">'+ic+'</span>'
    +'<span class="pent-n"><b style="color:'+col+'">'+nomPiece(it)
      +((cfg&&cfg.up)?' <span style="color:var(--gold)">+'+cfg.up+'</span>':'')+etoiles+'</b>'
    +(tg.length?'<span class="pent-tags">'+tg.join('')+'</span>':'')
    +(sous.length?'<span class="pent-sub">'+esc(sous.join(' · '))+'</span>':'')
    +'</span></div>';
}
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
  /* LA PANOPLIE, AVANT les reglages de la piece : quand on vient d'equiper des
     bottes, le geste suivant n'est pas de les sertir, c'est de prendre les trois
     soeurs. Le bloc se place donc au-dessus, dans la meme fenetre. */
  if(e){try{const pb=panBloc(slot);if(pb)body='<div class="wp" style="margin-top:0">'+pb+'</div>'+body;}catch(err){}}
  const items=listFor(slot).filter(it=>!q||it.n.toLowerCase().includes(q.toLowerCase()));
  const grpKey=(slot==='mantra'||slot==='masque')?'cat':(slot==='ramasseur'?null:(['fhead','ftop','fhand','ffoot'].includes(slot)?'cat':'tier'));
  const byTier={};items.forEach(it=>{const g=grpKey?(it[grpKey]||'—'):'';(byTier[g]=byTier[g]||[]).push(it);});
  const pick=`<input class="srch" placeholder="${items.length} objet(s) pour ${esc(C().cls)} ${C().sex}…" oninput="drawPick(this.value)" ${q?`value="${esc(q)}"`:''}>
    <div style="max-height:300px;overflow:auto">${Object.entries(byTier).map(([t,arr])=>`<div style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">${esc(t)}</div>`+arr.slice(0,60).map(it=>{const lock=C().prestige<(it.pr||0);const _id=String(it.id).replace(/&/g,'&amp;').replace(/"/g,'&quot;');return `<div class="itl" onmouseenter="itipShow(event,&quot;${_id}&quot;)" onmousemove="itipMove(event)" onmouseleave="itipHide()" onclick="${lock?'':`equip(&quot;${_id}&quot;)`}" style="${lock?'opacity:.45;':''}${e&&e.item&&String(e.item.id)===String(it.id)?'border:2px solid var(--gn-accent);background:rgba(var(--gn-lueur-rgb),.10);box-shadow:0 0 0 2px rgba(var(--gn-lueur-rgb),.18)':''}">${imgT(it.ic,32)||'<span style=width:32px></span>'}<div class="n" style="color:${it.col||'#cfd2dc'}">${nomPiece(it)}<div style="font-size:11px;color:var(--mut)">${it.setb&&it.setb.length?it.setb.slice(0,2).map(b=>b[0]+'+'+b[1]).join(' · '):(it.b&&it.b.length?it.b.slice(0,3).map(b=>b[0]+'+'+b[1]).join(' · '):(it.atk?'Atk '+it.atk[0]+'~'+it.atk[1]:''))}</div></div>${it.pr?`<span style="font-size:11px;color:${lock?'var(--red)':'var(--gold)'}">${lock?'<i class=vgi-lock></i>':'<i class=vgi-star></i>'}P${it.pr}</span>`:''}</div>`;}).join('')).join('')||'<div style="color:var(--mut);padding:10px">Aucun objet (à venir : ramasseur, masque, fashion en étape 2/3).</div>'}</div>`;
  document.getElementById('modalRoot').innerHTML=`<div class="modal" onclick="if(event.target===this)closePick()"><div class="sheet"><h3>${esc(cfg.lbl)} — ${esc(C().cls)} ${C().sex}</h3>${pieceEntete(slot,e)}${body}${pick}<div class="sheet-foot">${e?'<span class="pill rm" onclick="removeItem()"><i class=vgi-trash></i> Retirer cet objet</span>':'<span></span>'}<span class="pill" onclick="closePick()">Fermer</span></div></div></div>`;vgDD();}
function equip(id){if(_ro())return;const it=listFor(pickSlot).find(x=>String(x.id)===String(id));if(!it)return;const base={item:it};if(['weapon','weapon2','shield','suit','helmet','gauntlet','boots','ring1','ring2','earring1','earring2','necklace','fhead','ftop','fhand','ffoot','cape','ramasseur','fairy'].includes(pickSlot))base.cfg=defCfg(pickSlot);ST().eq[pickSlot]=base;if(base.cfg)defaultCfg(pickSlot,it.tier,C().cls);render();drawPick('');}
function defWcfg(){return {rune:{stat:'',val:0},mode:'normal',plus:0,dia:['','','','',''],holo:['','',''],pierce:Array(12).fill(null),tier:'Commun',rlines:[],r1:{stat:'',val:0},r2:{stat:'',val:0},scroll:0,elem:0};}
function equipFam(id,n){if(_ro())return;const e=E('familier');ST().eq.familier={item:{id:id,n:n,ic:id,b:[]},rank:(e&&e.rank)||'S'};render();drawPick('');}
function setRank(r){if(_ro())return;const e=E('familier');if(e){e.rank=r;render();drawPick('');}}
function famRune(v){const e=E('familier');if(e){e.rune=v;render();drawPick('');}}
function removeItem(){delete ST().eq[pickSlot];render();closePick();}
function exportBuild(){try{const c=C();const st=ST();const data={name:c.name,stuff:st.name,cls:c.cls,sex:c.sex,lvl:c.lvl,prestige:c.prestige,equipped:Object.fromEntries(Object.entries(st.eq||{}).filter(([k,e])=>e&&e.item).map(([k,e])=>[k,{name:e.item.n,id:e.item.id,rank:e.rank}])),carnets:(c.carnets||[]).map(i=>CARNETS[i]&&CARNETS[i].nom).filter(Boolean),stats:(()=>{try{return totals();}catch(e){return {};}})()};
  try{localStorage.setItem('vg_build_export',JSON.stringify(data));}catch(e){}if(window.__embed){try{window.parent&&window.parent.postMessage({type:'vg_build',data:data},'*');}catch(e){}return;}const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(c.name||'build')+'_'+(st.name||'stuff')+'.json';a.click();agToast('Build exporté ',true);}catch(err){try{var cc=C()||{};if(window.__embed&&window.parent)window.parent.postMessage({type:'vg_build',data:{name:cc.name||'Perso',cls:cc.cls||'',prestige:cc.prestige||1,equipped:{},stats:{}}},'*');else agToast('Build validé (données partielles)',true);}catch(e){}}}
// ── Vanguard : sauvegarde de TOUS les persos du builder vers le site (base) ──
function vgCollectBuilds(){var oc=state.cur;var out=state.chars.map(function(c,ci){var os=c.curStuff;var stuffs=(c.stuffs||[]).map(function(s,si){state.cur=ci;c.curStuff=si;var stats={};try{stats=totals();}catch(e){}return {name:s.name,mesures:mesExport(s,c.cls),equipped:Object.fromEntries(Object.entries(s.eq||{}).map(function(p){var e=p[1];return [p[0],{name:e&&e.item&&e.item.n,id:e&&e.item&&e.item.id,rank:e&&e.rank}];})),stats:stats};});c.curStuff=os;return {name:c.name,cls:c.cls,sex:c.sex,lvl:c.lvl,prestige:c.prestige,carnets:(c.carnets||[]).map(function(i){return CARNETS[i]&&CARNETS[i].nom;}).filter(Boolean),stuffs:stuffs};});state.cur=oc;return out;}
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
  +`<div class="aidesub">Six points, et tu sais tout.</div>`
  +`<div class="aidesec">`+VGI('users',{size:17})+`<div><h4>Mes personnages</h4><p>Chaque perso a sa classe, son niveau et son prestige. Les onglets en haut à droite passent de l'un à l'autre ; <b>Mes personnages</b> les montre en détail. Ils sont publiés à la guilde tout seuls — GuildViewer, Compositions, Tableau de bord.</p></div></div>`
  +`<div class="aidesec">`+VGI('layers',{size:17})+`<div><h4>Les stuffs</h4><p>Un perso porte plusieurs stuffs (DPS, Tank, Hybride…), chacun avec son équipement. <b>+ Stuff</b> en crée un vide, <b>Dupliquer</b> en crée un identique au stuff ouvert — mêmes pièces, mêmes réglages — pour tester une variante sans rien perdre. <b>Vider</b> retire les pièces du stuff ouvert ; les carnets du perso, eux, restent.</p></div></div>`
  +`<div class="aidesec">`+VGI('sword-cross',{size:17})+`<div><h4>Équiper et régler</h4><p>Clique un emplacement : tu choisis l'objet, puis tu règles ce que le jeu permet dessus — rareté, +N, perçage, éveil, scroll, élément. Sous le pantin, renseigne les <b>mesures</b> du stuff — dégâts ou PV selon son rôle : elles sont obligatoires.</p></div></div>`
  +`<div class="aidesec">`+VGI('book',{size:17})+`<div><h4>Carnets des Arcanes</h4><p>Ils appartiennent au <b>personnage</b>, pas au stuff : ils comptent quel que soit le stuff ouvert. <b>Base</b> = une carte de chaque, <b>Complet</b> = toutes les pages.</p></div></div>`
  +`<div class="aidesec">`+VGI('link',{size:17})+`<div><h4>Partager le build</h4><p>Personne d'autre que le staff ne voit ton build tant que tu ne le partages pas. Dans <b>Partager</b>, coche un perso pour que la guilde voie son build dans Information Guilde — décoche pour le retirer. Le lien, lui, n'existe que si tu le demandes, et ne s'ouvre qu'aux membres du serveur Discord ; <b>Rendre privé</b> le désactive.</p></div></div>`
  +`<div class="aidesec">`+VGI('save',{size:17})+`<div><h4>Sauvegarde</h4><p>Tout est enregistré à chaque changement, sans bouton. Mais chaque changement <b>écrase</b> le précédent : il n'y a pas d'annulation. Un point de restauration est créé de temps en temps, et le staff peut en restaurer un depuis le GuildViewer.</p></div></div>`
  +`<div class="sheet-foot" style="margin-top:14px"><span></span><span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="agClose(0)">Compris</span></div>`
  +`</div></div>`;}
// ── Partage du build : un lien, créé au clic ──────────────────────────────
// Avant, l'encadré occupait 316 px en permanence et interrogeait l'API à chaque
// rendu. Le partage est pourtant un geste rare : on monte un stuff dix fois, on
// le montre une. Il vit donc dans une fenêtre, et RIEN n'est écrit en base tant
// que le joueur n'a pas demandé son lien.
// DEPUIS LE 2026-10-21, LA FENÊTRE PORTE DEUX PARTAGES, indépendants (SPEC-INFORMATION-
// GUILDE §5 — Maxime : « il est possible de partager le build du membre si le membre le
// souhaite, intervention par lui-même en partageant depuis l'AirBuilder ») :
//  · « Visible dans Information Guilde » : une case PAR PERSO. Cochée, la guilde voit
//    « Voir le build » pour ce perso dans /guilde (src/lib/guilde.ts, `lienBuildPartage`),
//    et pour lui seul ; décochée, c'est retiré. /api/builder-share, { persos: [...] }.
//  · le lien : à donner à qui on veut, tout le build, comme avant.
// La case passe en premier : c'est elle que la guilde verra.
function vgPartager(){
  if(vgAnon()){vgConnexion('partager ton build');return;}
  if(window.__VIEW||window.__embed){agToast('Mode lecture seule — build d\'un autre membre.',false);return;}
  if(window.__share){vgPartagerVue();return;}
  // Premier appel : on lit l'état (lecture seule, aucune écriture).
  vgPartagerVue(true);
  fetch('/api/builder-share').then(function(r){return r.ok?r.json():null;}).then(function(j){
    window.__share=j||{shareId:null,public:false,persos:[]};vgPartagerVue();
  }).catch(function(){window.__share={shareId:null,public:false,persos:[]};vgPartagerVue();});
}
// Un nom de perso tel que le site le range (40 signes, /api/characters/sync), comparé
// sans casse ni accent — la règle du lien profond (vgOuvrirDepuisURL).
function vgClePartage(x){return String(x==null?'':x).trim().slice(0,40).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function vgEstPartage(nom){var l=(window.__share&&window.__share.persos)||[];return l.some(function(p){return vgClePartage(p)===vgClePartage(nom);});}
function vgPartagerVue(chargement){
  var s=window.__share||{};var pub=!!s.public&&!!s.shareId;
  var lien=s.shareId?(location.origin+'/build/'+s.shareId):'';
  var corps;
  if(chargement){corps='<div class="mut" style="font-size:13px">Chargement…</div>';}
  else{
    /* Les cases de perso : celles des mesures du stuff (.tierbtn.mes-c sous un .mes-lab),
       le contrôle « coché / pas coché » de l'AirBuilder. */
    var nb=state.chars.filter(function(c){return vgEstPartage(c.name);}).length;
    corps='<div class="mes-l" style="margin-bottom:6px"><span class="mes-lab">Visible dans Information Guilde'+(nb?' · '+nb+' perso'+(nb>1?'s':''):'')+'</span>'
      +'<div class="mes-cases">'+state.chars.map(function(c,i){var on=vgEstPartage(c.name);
        return '<span class="tierbtn mes-c'+(on?' on':'')+'" role="checkbox" aria-checked="'+on+'" tabindex="0" onclick="vgSharePerso('+i+')" onkeydown="if(event.key===\' \'||event.key===\'Enter\'){event.preventDefault();vgSharePerso('+i+');}">'
          +(on?'<i class=vgi-check></i> ':'')+esc(c.name)+'</span>';}).join('')+'</div></div>'
      +'<div class="shmini" style="font-size:12px;color:var(--mut);line-height:1.5;margin-bottom:16px">Coche un perso : toute la guilde voit « Voir le build » pour lui dans Information Guilde — pour lui seul, tes autres persos restent privés. Décoche pour retirer le partage.</div>'
      +'<div class="mes-l" style="margin-bottom:6px"><span class="mes-lab">Par un lien</span></div>';
    if(pub){
      corps+='<div class="shmini" style="font-size:12px;color:var(--mut);line-height:1.5;margin-bottom:11px">Tout ton build est visible par les membres du serveur qui ont ce lien. Il reste en lecture seule.</div>'
        +'<div class="shrow" style="display:flex;gap:7px;align-items:center"><input class="shlink" id="__shlink" readonly value="'+esc(lien)+'" aria-label="Lien de partage">'
        +'<button type="button" class="shbtn" onclick="vgShareCopy()" aria-label="Copier le lien">'+VGI('clipboard',{size:14})+'</button></div>'
        +'<div class="vgshare-foot" style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">'
        +'<span class="pill" onclick="vgShareSet(0)">'+VGI('lock',{size:13})+' Rendre privé</span>'
        +'<span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="agClose(0)">Fermer</span></div>';
    } else {
      corps+='<div class="shmini" style="font-size:12px;color:var(--mut);line-height:1.5;margin-bottom:14px">Aucun lien. Génère-le quand tu veux montrer tout ton build à quelqu\'un — rien n\'est enregistré avant ton clic. Il reste réservé aux membres du serveur.</div>'
        +'<div class="vgshare-foot" style="display:flex;gap:10px;justify-content:flex-end">'
        +'<span class="pill" onclick="agClose(0)">Fermer</span>'
        +'<span class="pill" style="background:var(--gn-action);color:var(--gn-sur-action);font-weight:700" onclick="vgShareSet(1)">'+VGI('link',{size:13})+' Générer le lien</span></div>';
    }
  }
  document.getElementById('modalRoot').innerHTML='<div class="modal" onclick="if(event.target===this)agClose(0)"><div class="sheet vgshare" style="max-width:460px;padding:22px">'
    +'<div style="font-weight:700;font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">'+VGI('link',{size:16})+' Partager mon build</div>'
    +corps+'</div></div>';
}
/* Coche ou décoche un perso. On envoie la liste ENTIÈRE de ce qui est coché parmi les
   persos d'aujourd'hui : un nom resté d'un perso renommé ou supprimé tombe ainsi de
   lui-même. Rien n'est coché d'office ; le site ne montre que ce qui l'est. */
function vgSharePerso(i){if(window.__VIEW||vgAnon())return;var c=state.chars[i];if(!c)return;
  var on=vgEstPartage(c.name);
  var liste=state.chars.filter(function(x){return x!==c&&vgEstPartage(x.name);}).map(function(x){return x.name;});
  if(!on)liste.push(c.name);
  fetch('/api/builder-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persos:liste})})
   .then(function(r){return r.ok?r.json():null;}).then(function(s){
      if(!s)return agToast('Erreur : partage non modifié.',false);
      window.__share={shareId:s.shareId,public:!!s.public,persos:s.persos||[]};
      agToast(on?'« '+c.name+' » n\'est plus visible dans Information Guilde':'« '+c.name+' » est visible dans Information Guilde',true);
      vgPartagerVue();
   }).catch(function(){agToast('Erreur réseau : partage non modifié.',false);});}
// Bascule la visibilité. L'API génère le shareId au premier partage.
function vgShareSet(pub){if(window.__VIEW)return;pub=!!pub;
  fetch('/api/builder-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({public:pub})})
   .then(function(r){return r.ok?r.json():null;}).then(function(s){
      if(!s)return agToast('Erreur : partage non modifié.',false);
      window.__share={shareId:s.shareId,public:pub,persos:s.persos||((window.__share||{}).persos)||[]};
      agToast(pub?'Lien de partage créé':'Lien de partage désactivé',true);
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
  if(BIJOUX.includes(slot))return{up:0,evL:'',evS:''};
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
  /* LE PLAFOND D'UN BIJOU EST UNE PROPRIETE DE L'OBJET. « Maximiser » posait 30
     pour tout le monde alors que la plupart s'arretent a 20 : le total etait bon
     (`bonusDePalier` ramene au plafond) mais l'etat portait un palier qui
     n'existe pas, et il partait tel quel dans la sauvegarde. On demande donc son
     plafond a l'objet.

     TANT QUE `paliers.json` N'EST PAS ARRIVE, ON PREND LE MAXIMUM DU RELEVE, PAS
     LE PLAFOND LE PLUS COURANT. Les deux erreurs possibles ne coutent pas la
     meme chose, et c'est mesure :
       · trop haut (30 sur un bijou qui plafonne a 20) — le total ne bouge pas
         (`bonusDePalier` ramene au plafond) et la fenetre de choix redescend le
         niveau des qu'on l'ouvre ;
       · trop bas (20 sur l'Anneau Aile) — le total PERD ce que le bijou donne
         reellement : 20 points de Degats sur monstres % en moins, et c'est cet
         etat-la qui part en sauvegarde.
     Une seconde de reseau lent suffisait a produire la seconde. */
  else if(BIJOUX.indexOf(slot)>=0){
    var e=E(slot),P=e&&e.item?bijouPaliers(e.item,0):null;
    c.up=P?P.plafond:(MECH.bijou.upgrade.max||MECH.bijou.upgrade.courant||20);}
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
  else if(BIJOUX.indexOf(slot)>=0){c.up=20;setEv();}
  else if(['fhead','ftop','fhand','ffoot'].indexOf(slot)>=0){c.up=0;}
}
/* ═══ CE QUE L'AMELIORATION COUTE, PARCE QUE CE QU'ELLE RAPPORTE NE SE CALCULE
   PAS ═════════════════════════════════════════════════════════════════════════
   `MECH.arme.nonCalculable` le dit dans les donnees depuis toujours, et le
   panneau ne le disait nulle part : propEnchant.inc ne porte que des
   coefficients (NORMAL_SCAL, ALL_SCAL sur L1..L10) dont le MULTIPLICANDE n'est
   ecrit dans aucun fichier du client. Un gain chiffre ici serait une invention.
   Le curseur montait donc sans rien annoncer, et le total restait muet — ce qui
   se lit comme un oubli plutot que comme une limite du releve.

   Ce qui SE lit, en revanche, c'est la PIERRE du palier ou l'on se trouve et le
   parchemin qui evite de perdre la piece a l'echec. Les deux sortent de la
   description que le joueur a sous les yeux en jeu. C'est le seul renseignement
   chiffrable de cette mecanique, et c'est celui qui change le geste : on sait
   quoi acheter AVANT de monter. */
function echelleDe(famille,v){
  var l=((meca().upgrade)||{})[famille]||[];
  for(var i=0;i<l.length;i++)if(v>=l[i].de&&v<=l[i].a)return l[i];
  return null;
}
function coutDuPalier(famille,v){
  var e=echelleDe(famille,v);if(!e)return '';
  return '<div class="upcost">'+mecaIc(e,'upic')
    +'<span class="upl"><b>+'+e.de+' → +'+e.a+'</b> · '+esc(e.n)+'</span>'
    +(e.prot?'<span class="upl prot">'+mecaIc(e.prot,'upic')+esc(e.prot.n)+'</span>':'')
    +'</div>';
}
/** LA PHRASE QUI MANQUAIT : le palier n'est pas compte, et ce n'est pas un bug
 *  d'affichage. Elle est prise dans les donnees, pas reecrite.
 *
 *  LE POURQUOI EST PARTI, LE FAIT RESTE. La pastille « invisible en jeu » ouvrait
 *  les 240 caracteres de `MECH.arme.nonCalculable` : « propEnchant.inc ne donne
 *  que des coefficients ; CE QU'ILS MULTIPLIENT n'est ecrit dans aucun fichier du
 *  client ». C'est le nom d'un fichier du client et la raison pour laquelle LE
 *  BUILDER ne calcule pas — une explication de methode. Elle ne change aucun
 *  geste : le joueur monte son +N de toute façon, il a seulement besoin de savoir
 *  que le resume ne le comptera pas, et la phrase visible le dit deja en entier.
 *  Le champ reste LU (il commande l'affichage de la ligne) et reste dans
 *  data.json : rien n'est perdu, ce n'est plus a l'ecran. */
function nonCalculable(famille){
  var t=(MECH[famille]&&MECH[famille].nonCalculable)
    ||(MECH[famille]&&MECH[famille].upgrade&&MECH[famille].upgrade.nonCalculable)||'';
  if(!t)return '';
  /* Le texte et la pastille dans UN SEUL enfant : `.upnc` est en flex, et deux
     enfants separes envoyaient la pastille a l'autre bout de la ligne. */
  return '<div class="mini upnc"><i class=vgi-alert></i><span>Le gain du +N n\'est pas compté dans le résumé — '
    +'le client ne l\'écrit nulle part.</span></div>';
}
/* L'ASCENSION D'UNE ARME ARTEFACT — les « etoiles » etaient trois etoiles dorees
   identiques pour toutes les armes. Le client dessine un parchemin PAR FAMILLE
   D'ARME et par rang (27 en tout) : la famille se lit dans le premier mot du nom
   de la piece, et une arme qui n'appartient a aucune famille du releve garde ses
   etoiles plutot que d'emprunter le dessin d'une autre. */
/* LA FAMILLE SE LIT DESORMAIS, ELLE NE SE DEVINE PLUS.
   Elle etait cherchee dans le PREMIER MOT du nom francais de la piece. Le
   procede rend `null` sur « Arbalete en Yggdrasil Purifie » — verifie en direct
   sur cette page — parce que le nom ne commence par aucune famille, et il
   aurait donne la mauvaise a toute arme dont le nom commence par le mot d'une
   autre.

   Elle vient maintenant du NOM DU PARCHEMIN que le client attache a l'arme
   (`artefact.starUpgrade`), releve dans `faits.armes[].asc`. Le second element
   dit D'OU vient la famille : « objet » quand le client nomme l'arme, « type »
   quand il s'est tu et qu'elle vient du type d'arme — le seul cas est le Glaive
   eternel, au plafond de percage 12 mais sans parchemin a son nom.

   PAS DE REPLI PAR LE NOM. Une arme absente du joint garde ses etoiles : servir
   le dessin d'une autre famille serait exactement l'emprunt qu'on retire. */
function ascensionDe(item){
  var a=meca().ascension,j=armeFait(item);
  if(!a||!j||!j.asc)return null;
  var img=a[j.asc[0]];
  return (img&&img.length)?{fam:j.asc[0],img:img,par:j.asc[1]||''}:null;
}
function upUI(slot,max){const w=cfgOf(slot);const v=w.up||0;const isW=(slot==='weapon'||slot==='weapon2');const art=(isW&&max>10&&v>10);
  const it=(E(slot)||{}).item;
  let foot='';
  if(isW&&max>10){
    const asc=ascensionDe(it);
    const etoile=s=>{
      if(!asc||!asc.img)return s?'<i class=vgi-star></i>'.repeat(s):'—';
      if(!s)return '—';
      return Array.from({length:s},(_,i)=>`<img class="ascic" src="${asc.img[i]||asc.img[asc.img.length-1]}" alt="">`).join('');
    };
    foot=`<div class="row" style="margin-top:5px"><span class="mini">${asc?'Ascension':'Étoiles'}</span>${[0,1,2,3].map(s=>`<span class="tierbtn${asc?' ascbtn':''} ${w.stars===s?'on':''}" title="${escA(asc?('Parchemin d\'ascension '+asc.fam+' Artefact'+(s?' Niveau '+s:'')):'')}" onclick="cset('${slot}','stars',${s})">${etoile(s)}</span>`).join('')}</div><div class="mini">0–10 = normale · 11–20 = artefact</div>`;
  }
  else if(isW)foot='<div class="mini">Pas d\'artefact sur ce tier (max +10).</div>';
  else if(slot==='shield')foot='<div class="mini">Max +'+max+' · pas d\'artefact</div>';
  else foot='<div class="mini">Max +'+max+'</div>';
  const artIc=meca().artefact;
  const tete=art&&artIc&&artIc.f?mecaIc(artIc,'ghic')
    :`<img class="ghic" src="/airbuilder/icons/sertissage/${art?'artefact':'upgrade'}.png" alt="">`;
  return `<div class="grp"><div class="gh">${tete} Upgrade ${isW?`<span class="mini">(${art?'Artefact':'Normale'})</span>`:''}</div>
   <div class="lvl"><span class="mini">Niveau : <b>+${v}</b> / +${max}</span>
   <input type="range" min="0" max="${max}" value="${v}" oninput="upLive(this,'${slot}',${max})" onchange="cset('${slot}','up',+this.value)"></div>
   ${coutDuPalier('armeArmure',v)}
   ${foot}
   ${nonCalculable(isW||slot==='shield'?'arme':'armure')}</div>`;}
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
  /* `brut` : les memes lignes, en NOMBRES, pour le resume du build. Le libelle
     porte son unite (« Force » contre « PV 5 % »), parce que les bonus des
     pieces sont ecrits ainsi dans le releve — « PV max » et « PV max % » y sont
     deux lignes distinctes. Les fondre additionnerait des points et des
     pourcentages. */
  const brut=ordre.filter(function(o){return par[o[2]];}).map(function(o){return [o[0]+(o[1]?' '+o[1]:''),par[o[2]]];});
  return{card:card,el:el,cases:cases,lines:lines,brut:brut};}
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
   <div class="mini" style="margin-top:5px">Total : ${totalHtml}${grades.length?' · clique une case → '+grades.map(lib).join(' → '):''}</div>
   ${(function(){/* CE QUE LE JEU PREVIENT AU MOMENT DU RETRAIT. Le releve porte la
        phrase exacte — « la derniere carte sertie sera retiree (celle du bas) » —
        et son prix. La bulle en donne la version courte ; ici, la version du
        client, la ou l'on pose et retire les cartes. */
     var P=faits().percage||{},m=[P.retrait,P.cout].filter(Boolean);
     return m.length?'<div class="mini upnc"><i class=vgi-alert></i><span>'+m.map(function(x){return esc(x);}).join(' ')+'</span></div>':'';})()}</div>`;}
function pnLive(el,slot){const b=el.parentNode.querySelector('.mini b');if(b)b.textContent=el.value;}
function cpn(slot,v,max){keepScroll();const w=cfgOf(slot);w.pn=Math.max(0,Math.min(v,max));render();drawPick(curQ());restoreScroll();}
// Ordre des stats d'éveil par pièce (priorité iBeats en début de liste, le reste ensuite)
const EVORDER={ring1:['Intelligence','Dégâts critiques','Endurance','Force'],ring2:['Intelligence','Dégâts critiques','Endurance','Force'],earring1:['Intelligence','Dégâts critiques','Endurance','Force'],earring2:['Intelligence','Dégâts critiques','Endurance','Force'],necklace:['Intelligence','Dégâts critiques','Endurance','Force'],weapon:['Intelligence','Dégâts critiques','Endurance','Force'],weapon2:['Intelligence','Dégâts critiques','Endurance','Force'],shield:['Intelligence','Dégâts critiques','Endurance','Force'],cape:['Intelligence','Dégâts critiques','Endurance','Force'],masque:['Intelligence','Dégâts critiques','Endurance','Force'],fhead:['Intelligence','Dégâts critiques','Endurance','Force'],ftop:['Intelligence','Dégâts critiques','Endurance','Force'],fhand:['Intelligence','Dégâts critiques','Endurance','Force'],ffoot:['Intelligence','Dégâts critiques','Endurance','Force'],helmet:['Intelligence','Endurance','Force','Dextérité'],suit:['Intelligence','Dégâts critiques','Endurance','Force','MP max'],gauntlet:['Attaque','PV max','MP max'],boots:['Dégâts critiques','Attaque','PV max','MP max']};
function evStatsFor(slot){var pri=EVORDER[slot]||[];return pri.concat(EVSTATS.filter(function(s){return pri.indexOf(s)<0;}));}
/* L'EVEIL : LES DEUX CHIFFRES DANS LA BULLE, LE PRIX ET LE RISQUE ICI.
   La bulle nomme les deux series et leurs valeurs — c'est le renseignement qu'on
   cherche en regardant un objet. Ce panneau ajoute ce qu'on veut savoir AVANT de
   depenser : le prix de l'operation, et le mot que le client ecrit sur le
   parchemin lui-meme (« les proprietes peuvent etre negatives »). Les deux
   sortent de `faits.eveil.tirage`, aucun n'est recopie. */
/* ═══ LE RENDU DU REGLAGE, CHIFFRE, LA OU L'ON CLIQUE ═══════════════════════
   Ce panneau ne montrait QUE CE QU'ON AVAIT CHOISI : R1, R2 ou rien, et un nom
   de statistique. Les deux nombres de l'eveil n'existaient que dans la BULLE de
   l'objet — donc ailleurs, et apres le geste. Or R1 et R2 ne sont pas deux
   etiquettes a cocher : sur les onze lignes du releve, R2 vaut exactement le
   double de R1 (Force 30 / 60, Degats critiques 20 / 40 %). C'est le seul
   renseignement qui decide du clic, et il etait absent de l'ecran du clic.
   LES DEUX SONT DONC ECRITS COTE A COTE, AVANT DE CHOISIR : celui qui est regle
   en clair, l'autre en gris. On voit ce que le reglage donne ET ce que l'autre
   reglage donnerait — c'est la previsualisation demandee.
   LE TIRAGE GARDE SA LIGNE A PART. Ce sont DEUX VOIES d'obtention, jamais un
   intervalle : les fondre en « de +15 a +30 » inventerait une echelle continue
   qui n'existe pas. Meme lecture que la bulle, memes nombres, meme source
   (`eveilChiffre`) — aucun chiffre n'est recopie ici.
   RIEN NE S'AFFICHE TANT QU'AUCUNE STATISTIQUE N'EST CHOISIE, et rien non plus
   si le releve ne chiffre pas celle-la : un cadre vide vaudrait moins que pas de
   cadre (regle du renseignement incomplet). */
function eveilUI(slot){const w=cfgOf(slot);
  const p=meca().eveil;
  const tg=(faits().eveil||{}).tirage||{};
  const mots=[(tg.parchemin||{}).d,tg.cout].filter(Boolean);
  const ev=w.evS?eveilChiffre(w.evS):null;
  const pc=(ev&&ev.fixe&&ev.fixe.pourcent)?' %':'';
  let vu='';
  if(ev){
    const F=ev.fixe;
    /* La ligne reglee est en clair, l'autre en gris : la comparaison est le
       service rendu, mais on ne doit pas pouvoir confondre les deux. */
    const fx=F?['R1','R2'].filter(k=>F[k]!=null)
      .map(k=>`<b${(w.evL&&w.evL!==k)?' class="off"':''}>${k} +${F[k]}${pc}</b>`).join(' · '):'';
    const tir=(ev.plafond!=null)?`<div class="mini">Parchemin ordinaire, tiré au sort : au plus <b>+${ev.plafond}${pc}</b>.</div>`:'';
    if(fx||tir)vu=`<div class="palbloc ev">${fx?`<div class="pall">Parchemin fixe : ${fx}</div>`:''}${tir}</div>`;
  }
  return `<div class="grp"><div class="gh">${p&&p.f?mecaIc(p,'ghic'):'<img class="ghic" src="/airbuilder/icons/R1.png" alt="">'} Éveil (R1 ou R2)</div>
   <div class="row"><div class="seg2 seg-ev" style="max-width:186px"><div class="s2 ${w.evL==='R1'?'on':''}" onclick="cset('${slot}','evL','R1')"><img src="/airbuilder/icons/R1.png" alt="">R1</div><div class="s2 ${w.evL==='R2'?'on':''}" onclick="cset('${slot}','evL','R2')"><img src="/airbuilder/icons/R2.png" alt="">R2</div><div class="s2 ${!w.evL?'on':''}" onclick="cset('${slot}','evL','')">—</div></div>
   <select onchange="cset('${slot}','evS',this.value)"><option value="">— statistique —</option>${evStatsFor(slot).map(s=>`<option ${w.evS===s?'selected':''}>${s}</option>`).join('')}</select></div>
   ${vu}
   ${mots.length?`<div class="mini upnc"><i class=vgi-alert></i><span>${mots.map(m=>esc(m)).join(' ')}</span></div>`:''}</div>`;}
/* LE PARCHEMIN QUI EFFACE — LA PHRASE EST ICI, PAS DANS LA BULLE.
   Le client l'ecrit sur le parchemin lui-meme : « Ceci remplace toute statistique
   existante sur l'arme ». C'est la mise en garde la plus chere de la piece — un
   parchemin pose au mauvais moment supprime le travail d'avant — et elle se lit
   au MOMENT du choix, pas au survol de l'objet. Elle a donc sa place dans ce
   panneau, ou l'on clique, plutot que dans une bulle qui deborde de l'ecran.
   La phrase est LUE dans `faits.scroll.remplace`, jamais recopiee. */
function scrollUI(slot){const w=cfgOf(slot);const sc=faits().scroll||{};
  return `<div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/statscroll.png" alt=""> Scroll stat${sc.plage?` <span class="mini">(${esc(sc.plage)}, tiré au sort)</span>`:''}</div><div class="row">
   <select onchange="cset('${slot}','scrS',this.value)"><option value="">— stat —</option>${['Force','Endurance','Dextérité','Intelligence'].map(s=>`<option ${w.scrS===s?'selected':''}>${s}</option>`).join('')}</select>
   <span class="mini">Niveau</span><select onchange="cset('${slot}','scrL',+this.value)">${[0,1,2,3,4].map(n=>`<option ${w.scrL===n?'selected':''}>+${n}</option>`).join('')}</select></div>
   ${sc.remplace?`<div class="mini upnc"><i class=vgi-alert></i><span>${esc(sc.remplace)}</span></div>`:''}</div>`;}
// Icone de jeu par element. Un <select> ne sait pas afficher d'image : l'element
// se choisit donc sur une rangee de boutons, comme le percage juste au-dessus.
// Ne concerne QUE l'element de la piece, pas le percage (pierceEl).
const ELEMIC={'Feu':'FireSmall','Eau':'WaterSmall','Vent':'WindSmall','Terre':'EarthSmall','Électricité':'ElectricSmall'};
/** Le parchemin de rareté du palier, quand le client en dessine un. */
/* ═══ LA CHAINE DE RARETE, COMPTEE SUR LE RELEVE ═══════════════════════════
   Cette note portait un nombre ecrit a la main — « Mythique ... s'obtient sur une
   arme niveau 100 » — dont AUCUNE source n'a ete retrouvee dans le client. Le
   mot MYTHIC n'y apparait qu'a un seul endroit, la table de maitrise d'arme, et
   le seul « 100 » voisin est le niveau MAX de maitrise, qui est autre chose.
   La phrase tombe donc, et ce qui reste est ce que le releve etablit vraiment :
   la chaine des parchemins, comptee et non recopiee, et les paliers auxquels le
   client n'attache aucun parchemin.

   CE QUE LE CLIENT NE DIT PAS EST DIT COMME TEL. Sa chaine s'arrete a
   Pre-Mythique ; que le Mythique EXIGE le Pre-Mythique n'est ecrit nulle part.
   Un joueur qui vise ce palier doit savoir que le releve s'arrete la, plutot que
   de lire une regle inventee : c'est ce qui change son geste. */
/* LA NOTE PERMANENTE EST PARTIE, LA MISE EN GARDE RESTE.
   Elle s'affichait sous les six boutons, tout le temps : « Le parchemin dessine
   est celui qui fait monter a ce palier : 4 maillons, de Rare a Pre-Mythique.
   Commun et Mythique n'en ont pas — le client n'ecrit aucun parchemin pour ces
   deux paliers-la. » 190 caracteres qui decrivent LE CATALOGUE DE PARCHEMINS DU
   CLIENT, jamais ce que la rarete fait a l'arme. Le joueur qui clique « Epique »
   ne se demande pas combien de dessins existent ; ce que la rarete change, le
   tableau de maitrise juste en dessous le montre, rarete par rarete et chiffre.

   CE QUI RESTE EST LA SEULE PHRASE QUI CHANGE UN GESTE : quand le palier CHOISI
   est un de ceux sans parchemin, on previent qu'aucun moyen de l'atteindre n'est
   decrit. Elle porte donc encore, a elle seule, le fait que la chaine s'arrete —
   et elle le dit AU MOMENT ou l'on vise ce palier, pas en permanence. Le premier
   palier reste exclu : « Commun » est l'etat de depart, pas une cible. */
function rareteNote(tierChoisi){
  var R=faits().rarete||{},ch=R.chaine||[],sp=R.sansParchemin||[];
  if(!ch.length)return '';
  var dernier=ch[ch.length-1].vers;
  /* La mise en garde ne s'affiche qu'au palier concerne : hors de lui, elle
     n'est qu'une ligne de plus qui se bat pour la largeur. */
  if(tierChoisi&&sp.indexOf(tierChoisi)>=0&&tierChoisi!==(MECH.arme.rarete_tiers||[])[0])
    return '<div class="mini upnc"><i class=vgi-info></i> Le relevé ne décrit aucun moyen d\'atteindre '+esc(tierChoisi)
      +' : la chaîne de parchemins du client s\'arrête à '+esc(dernier)+'.</div>';
  return '';
}
/* ═══ LES TROIS PHRASES DU PANNEAU DE SERTISSAGE DU JEU ══════════════════════
   Le releve les porte mot pour mot et aucun ecran ne les servait : la condition
   d'entree (« une arme ultime +6 ou plus », 90 % de reussite), le tirage au sort
   de la statistique, et les deux qui coutent de l'argent — a l'echec « seul le
   joyau sera detruit », et « il sera impossible d'annuler apres la confirmation ».
   ELLES SONT ICI ET PAS DANS LA BULLE, ET C'EST DELIBERE : on lit une mise en
   garde AVANT de cliquer, et c'est dans ce panneau qu'on clique. La bulle, elle,
   porte les nombres — le palier atteint et ce qu'il vaut.
   LA TRANCHE DE NIVEAU EST CALCULEE SUR LA PIECE, pas recopiee : c'est le joyau
   dont la bulle lit l'echelle, et les deux ecrans doivent nommer le meme. */
function sertNote(item){
  var S=faits().sertissage||{};
  var mots=[S.condition,S.auHasard,S.echec,S.retrait].filter(Boolean);
  if(!mots.length)return '';
  var gm=sertGemme(item);
  return '<div class="mini upnc" style="margin-top:6px"><i class=vgi-alert></i><span>'
    +mots.map(function(m){return esc(m);}).join(' ')
    +(gm?' Au niveau de cette pièce, l\'échelle est celle du '+esc(gm)+'.':'')
    +'</span></div>';
}
/* ═══ CE QUE LES CINQ LOGEMENTS VALENT, SOUS LES CINQ LOGEMENTS ═════════════
   Le panneau posait cinq listes deroulantes de statistiques et n'ecrivait AUCUN
   nombre : on y choisissait « Force » cinq fois sans jamais savoir ce que ça
   rapporte. Le releve porte pourtant l'echelle complete — 9 statistiques, 5
   joyaux, 8 paliers — et LA BULLE s'en sert deja. Le chiffre existait donc, mais
   seulement sur l'ecran ou l'on ne regle rien.
   LE PALIER EST LE NOMBRE DE LOGEMENTS DE LA MEME STATISTIQUE, et sa valeur
   REMPLACE les precedentes. On ecrit donc « Force palier 3 +26 » et jamais
   « Force ×3 » : la seconde ecriture invite a multiplier, et c'est l'erreur la
   plus chere de cette mecanique (trois joyaux poses pour rien).
   LE JOYAU EST NOMME PAR `sertNote`, juste en dessous — « au niveau de cette
   piece, l'echelle est celle du Diamant » — donc on ne le repete pas ici.
   AUCUNE PHRASE N'EST AJOUTEE : ce bloc ne porte que des nombres, et rien du
   tout tant qu'aucun logement n'est rempli. Les fonctions employees sont celles
   de la bulle (`sertGroupes`, `sertValeur`, `holoValeur`) : les deux ecrans ne
   peuvent pas diverger. */
function sertApercu(slot,item){
  var w=cfgOf(slot);if(!w)return '';
  var gm=sertGemme(item);
  var dG=sertGroupes(w.dia||[]),hG=sertGroupes(w.holo||[]);
  var dT=dG.map(function(g){var v=gm?sertValeur(g[0],gm,g[1]):null;
    return esc(g[0])+(g[1]>1?' palier '+g[1]:'')+(v!=null?' <b>+'+v+'</b>':'');}).join(' · ');
  /* L'HOLOGRAPHIQUE EST L'AUTRE MECANIQUE : valeur fixe, et elle S'AJOUTE. Le
     mot est indispensable a cote d'un bloc ou tout le reste remplace. */
  var hT=hG.map(function(g){var v=holoValeur(g[0]);
    return esc(g[0])+(g[1]>1?' ×'+g[1]:'')+(v!=null?' <b>+'+(v*g[1])+'</b>':'');}).join(' · ');
  if(!dT&&!hT)return '';
  return '<div class="palbloc sert">'
    +(dT?'<div class="sertl dia">'+dT+'</div>':'')
    +(hT?'<div class="sertl holo">Holo : '+hT+' <span class="sertn">fixe, s\'ajoute</span></div>':'')
    +'</div>';
}
function rareteIc(tier){
  const r=(meca().rarete||{})[tier];
  return r?`<img class="ghic" src="${r}" alt="" title="${escA('Parchemin de rareté — '+tier)}">`
          :'<img class="ghic" src="/airbuilder/icons/sertissage/artefact.png" alt="">';
}
/* LA CARTE QU'ON POSE, ET NON LE SYMBOLE DE L'ELEMENT. Les boutons gardent leur
   petit symbole — c'est lui qui se lit dans une rangee de six — mais l'entete du
   groupe montre la CARTE du client, celle qu'il faut posseder, avec son nom et
   sa phrase au survol. La carte retenue est celle qui monte jusqu'a +20 : la
   carte obsolete plafonne a +5, et proposer son dessin ferait acheter la
   mauvaise. */
function elemUI(slot,max){const w=cfgOf(slot);
  const carte=(meca().element||{})[w.elemType];
  return `<div class="grp"><div class="gh">${carte?mecaIc(carte,'ghic'):'<i class=vgi-flame></i>'} Élément${carte?` <span class="mini">${esc(carte.n)}</span>`:''}</div>
   <div class="row" style="margin-bottom:5px">${ELEMENTS.map(el=>{const c=(meca().element||{})[el];return `<span class="elembtn ${w.elemType===el?'on':''}" title="${escA(c?mecaTitre(c):el)}" onclick="cset('${slot}','elemType','${w.elemType===el?'':el}')"><img src="/airbuilder/icons/elements/${ELEMIC[el]}.webp" alt="" width="16" height="16"><span>${el}</span></span>`;}).join('')}<span class="elembtn ${!w.elemType?'on':''}" title="Aucun élément" onclick="cset('${slot}','elemType','')">Aucun</span></div>
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
  if(BIJOUX.includes(slot))return jewelPanel(slot,e);
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
     ${art?'<div class="mini holohd" style="color:var(--purple);margin-top:5px">'+(meca().holo?mecaIc(meca().holo,'ghic'):'')+'Diamants holographiques :</div>'+Array.from({length:3},(_,i)=>`<div class="dslot holo"><span class="mini" style="width:54px">Holo ${i+1}</span><select onchange="cdia('${SL}','holo',${i},this.value)"><option value="">—</option>${HOLOSTATS.map(d=>`<option value="${d[0]}" ${w.holo[i]===d[0]?'selected':''}>${d[0]} +${d[1]}</option>`).join('')}</select></div>`).join(''):'<div class="mini">Les 3 diamants holographiques se débloquent en Artefact (+11 à +20).</div>'}
     ${sertApercu(SL,e.item)}
     ${sertNote(e.item)}</div>
   ${pierceUI(SL,pMax)}
   <div class="grp"><div class="gh">${rareteIc(w.tier)} Rareté</div><div class="row">${MECH.arme.rarete_tiers.map(t=>{const rc=RARCOL[t]||'';const ri=(meca().rarete||{})[t];return `<span class="tierbtn ${w.tier===t?'on':''}" style="${w.tier===t?`background:${rc};color:#0c0c11;border-color:${rc}`:`color:${rc};border-color:${rc}55`}" onclick="cset('${SL}','tier','${t}')">${ri?`<img class="raric" src="${ri}" alt="">`:''}${t}</span>`;}).join('')}</div>
     ${rareteNote(w.tier)}
     <div class="rlines">${(w.rlines||[]).map((l,i)=>`<div class="line"><select onchange="crl(${i},this.value)"><option value="">— ligne de bonus —</option>${MECH.arme.rarete_pool.map(b=>`<option ${l===b.stat?'selected':''}>${b.stat}</option>`).join('')}</select><span class="pill" onclick="crlDel(${i})"><i class=vgi-x></i></span></div>`).join('')}</div>
     <div class="row" style="justify-content:space-between;margin-top:6px">${(w.rlines||[]).length<4?'<span class="pill" onclick="crlAdd()">+ ligne (max 4)</span>':'<span></span>'}<span class="mini">% variable selon la stat.</span></div></div>
   ${artefactable?masteryUI(SL,e.item):''}
   ${eveilUI(SL)}
   ${scrollUI(SL)}
   ${elemUI(SL,20)}
   </div>`;}
function shieldPanel(e){return `<div class="wp">${upUI('shield',10)}${pierceUI('shield',10)}${eveilUI('shield')}${elemUI('shield',20)}</div>`;}
function suitPanel(e){return `<div class="wp">${upUI('suit',10)}${pierceUI('suit',4)}${eveilUI('suit')}${scrollUI('suit')}${elemUI('suit',20)}</div>`;}
/* UNE ARMURE A ZERO N'EST PAS UNE ERREUR — et le panneau ne le disait pas.
   `MECH.armure.bonusPropre` le compte : aucune des 256 armures du catalogue ne
   porte de bonus propre. Sa valeur est ailleurs (panoplie, upgrade, percage,
   eveil), et un joueur qui equipe un casque et voit le total ne pas bouger croit
   a un bug. Le nombre est LU dans les donnees, pas recopie. */
/* LA PASTILLE EN DOUBLE EST PARTIE. `bp.ou` — « Aucune armure du catalogue ne
   porte de bonus propre : sa valeur est dans sa PANOPLIE, son upgrade, son
   perçage et son eveil » — redisait la phrase visible juste au-dessus, puis
   nommait quatre mecaniques que le panneau AFFICHE deja, l'une sous l'autre, a
   l'endroit meme ou on lit le message. Le fait qui change le geste (« un total
   qui ne bouge pas n'est pas une erreur ») reste ecrit, et le compte reste LU. */
function armorPanel(slot,e){
  var bp=(MECH.armure&&MECH.armure.bonusPropre)||null;
  var mot=bp?('<div class="mini upnc"><i class=vgi-info></i> Aucune des '+bp.objets+' armures du catalogue ne porte de bonus propre'
    +(bp.avecBonus?' (sauf '+bp.avecBonus+')':'')+' : un total qui ne bouge pas en équipant cette pièce n\'est pas une erreur.</div>'):'';
  return `<div class="wp">${upUI(slot,10)}${eveilUI(slot)}${scrollUI(slot)}<div class="mini">Cette pièce n'a ni perçage ni élément.</div>${mot}</div>`;}
/**
 * LE BIJOU — trois faits que le jeu ne montre pas, et que ce panneau taisait.
 *
 *  1. LE PLAFOND EST UNE PROPRIETE DE L'OBJET. Le curseur allait a +30 pour tout
 *     le monde alors que la plupart des bijoux s'arretent a +20 : on posait un
 *     palier qui n'existe pas, et le total ne bougeait pas sans dire pourquoi
 *     (`bonusDePalier` ramene deja au plafond). Le curseur s'arrete maintenant
 *     ou le client s'arrete, et la repartition est COMPTEE sur le releve.
 *  2. LE PALIER REMPLACE, il ne s'additionne pas : `rangs[palier]` est la valeur
 *     TOTALE au rang atteint, pas un increment. Rien a l'ecran ne le disait, et
 *     c'est ce qui fait croire qu'un bijou +20 vaut la somme de ses vingt
 *     paliers.
 *  3. IL Y A DES PLATEAUX. Le releve en compte 78 : des paliers qui recopient a
 *     l'identique le precedent. Monter d'un cran peut ne RIEN rapporter, et le
 *     dire evite la depense. Le prochain palier qui change vraiment est indique.
 *
 * Tant que `paliers.json` n'est pas arrive, le panneau retombe sur le plafond
 * courant de `MECH.bijou` et ne raconte rien de plus : `mecaniques()` et
 * `paliersBijoux()` redessinent la fenetre a leur arrivee.
 */
/**
 * LA PREUVE A ETE RETIREE DE L'ECRAN, ET C'EST UNE COUPE VOLONTAIRE.
 *
 * `preuveDuRemplacement()` ajoutait au bout de la pastille « invisible en jeu »
 * du bloc de palier un paragraphe qui ARGUMENTAIT pour le site : « la preuve est
 * dans le relevé lui-même : 78 paliers y recopient à l'identique le précédent,
 * ce qu'un cumul rendrait absurde ». Mesure : la pastille pesait 429 caracteres
 * sur les Boucles d'Oreille Harpe, 405 sur l'Anneau Ailé — le plus long texte de
 * tous les panneaux de reglage, et les deux tiers etaient cette demonstration.
 *
 * Elle ne change aucun geste. Le joueur n'a pas a etre convaincu que le palier
 * remplace : il a besoin de LE SAVOIR, et la ligne visible du bloc le lui dit
 * (« Cette valeur remplace celle des paliers precedents, elle ne s'y ajoute
 * pas »), la pastille restante l'explique en deux phrases, et le RESULTAT est
 * chiffre juste au-dessus (« Au palier +30 : Attaque +1000 · Taux de butin %
 * +10 »).
 *
 * LE COMPTE DE 78 PLATEAUX N'EST PAS PERDU : il reste ecrit dans la pastille du
 * PALIER PLAT (`invisible('plateau-'+slot, …)` plus bas), c'est-a-dire a
 * l'endroit exact ou il change une depense — quand le cran qu'on s'apprete a
 * poser ne rapporte rien. Verifie a l'ecran sur l'Anneau Ailé : « Palier plat :
 * +6 → +7 ne rapporte rien, le prochain gain est a +9. »
 */
function jewelPanel(slot,e){const w=cfgOf(slot);
  const P=bijouPaliers(e.item,w.up||0);
  const max=P?P.plafond:(MECH.bijou.upgrade.courant||20);
  /* Une sauvegarde d'avant cette correction porte un +30 sur un bijou qui
     plafonne a +20. On le ramene : le total etait deja calcule au plafond, seul
     l'affichage mentait. */
  if(P&&(w.up||0)>P.plafond)w.up=P.plafond;
  const v=w.up||0;
  const rep=combienAuPlafond();
  const repTxt=rep?Object.keys(rep).sort(function(a,b){return a-b;})
    .map(function(k){return rep[k]+' bijou'+(rep[k]>1?'x':'')+' à +'+k;}).join(' · '):'';
  let dit='';
  if(P){
    const lignes=P.lignes.length
      ? P.lignes.map(function(l){return '<b>'+esc(l[0])+' '+(l[1]>0?'+':'')+l[1]+'</b>';}).join(' · ')
      : '<span class="mini">le client n\'écrit rien à ce rang</span>';
    dit='<div class="palbloc">'
      +'<div class="pall">Au palier <b>+'+v+'</b> : '+lignes+'</div>'
      +'<div class="mini">Cette valeur <b>remplace</b> celle des paliers précédents, elle ne s\'y ajoute pas. '
      +invisible('palier-remplace','Le palier d\'un bijou REMPLACE, il ne s\'additionne pas.\n\nLe client écrit, pour chaque rang, la valeur TOTALE atteinte — pas un gain. Un anneau +20 ne vaut donc pas la somme de ses vingt paliers : il vaut la seule ligne du rang 20.')
      +'</div>';
    if(P.vide)dit+='<div class="mini palerr"><i class=vgi-alert></i> Le client n\'écrit AUCUN palier pour ce bijou : l\'améliorer ne lui ajoute rien dans le relevé, seule sa valeur de base s\'applique.</div>';
    else if(P.plateau)dit+='<div class="mini palerr"><i class=vgi-alert></i> Palier plat : <b>+'+(v-1)+' → +'+v+' ne rapporte rien</b>'
      +(P.suivant?', le prochain gain est à <b>+'+P.suivant+'</b>.':', et plus rien ne change jusqu\'au plafond.')
      /* LE TOTAL DE PLATEAUX EST LU DANS LE RELEVE, pas ecrit ici : il change au
         prochain versement du client, et un nombre recopie serait faux sans que
         personne s'en aperçoive. */
      +' '+invisible('plateau-'+slot,'« Chaque palier est différent » est inexact.\n\n'
        +(totalPlateaux()?'Le relevé compte '+totalPlateaux()+' plateaux — ':'Il y a des plateaux — ')
        +'des rangs qui recopient à l\'identique le rang précédent. Sur ce bijou il y en a '+P.plateaux+'. Monter un cran y coûte des pierres et un risque d\'échec pour un gain nul.')+'</div>';
    else if(P.suivant&&P.suivant>v+1)dit+='<div class="mini">Rien ne change avant <b>+'+P.suivant+'</b>.</div>';
    dit+='</div>';
  }
  return `<div class="wp"><div class="grp"><div class="gh"><img class="ghic" src="/airbuilder/icons/sertissage/upgrade.png" alt=""> Upgrade</div>
   <div class="lvl"><span class="mini">Niveau : <b>+${v}</b> / +${max}</span><input type="range" min="0" max="${max}" value="${v}" oninput="upLive(this,'${slot}',${max})" onchange="cset('${slot}','up',+this.value)"></div>
   <div class="mini">Ce bijou plafonne à <b>+${max}</b>${repTxt?` — sur le relevé : ${repTxt}.`:'.'}</div>
   ${coutDuPalier('bijou',v)}
   ${dit}</div>${eveilUI(slot)}</div>`;}

function capePanel(e){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh"><i class=vgi-cape></i> ${esc(e.item.n)}</div><div class="cb" style="color:var(--green);font-size:12px">${b||'—'}</div></div>${runeUI('cape')}${eveilUI('cape')}</div>`;}
function ramasseurPanel(e){const b=(e.item.b||[]).map(x=>esc(x[0])+' +'+x[1]).join(' · ');return `<div class="wp"><div class="grp"><div class="gh"><i class=vgi-paw></i> ${esc(e.item.n)}</div><div class="cb" style="color:var(--green);font-size:12px">${b||'—'}</div></div>${runeUI('ramasseur')}</div>`;}
/* ═══ LA FEE : LE CURSEUR LE PLUS MUET DU BUILDER ═══════════════════════════
   « Le bonus depend du niveau (voir wiki) » renvoyait ailleurs un joueur qui
   avait la reponse sous les yeux — et le tableau de bonus de la piece etant
   VIDE, monter le curseur ne changeait rien au total sans que rien ne le dise.
   Le releve chiffre cinq paliers par esprit : on les montre, on marque celui qui
   est atteint, et on ecrit que le total ne les compte pas.
   LE PALIER ATTEINT EST LE DERNIER SEUIL FRANCHI, pas la somme des cinq — meme
   regle que les paliers de bijou, et pour la meme raison.

   CE QUE CE LOT AJOUTE — la demande de Maxime, « comme dans Craft et
   Collections ». La page /crafts pose la question a l'endroit
   (src/components/collections/Anges.tsx) : pas « voici 49 niveaux » mais « il te
   faut combien pour aller au 40 ». Trois choses manquaient ici :
     · CE QU'IL RESTE A PAYER pour le palier suivant, et ce que ce palier donne.
       En tete du panneau, avant le tableau : c'est la question du curseur.
     · LA POUDRE CUMULEE DEPUIS LE 1 a chaque palier — la troisieme colonne du
       tableau de Craft. Elle situe un palier dans la depense totale.
     · LES CRANS QUI NE RAPPORTENT RIEN. Un palier tous les dix niveaux : entre
       deux, le curseur bouge, la pastille change, et la poudre part pour rien.
       Meme mise en garde que les plateaux de palier de bijou, meme dessin
       (`.palerr`) — c'est le meme fait.
   LA GRILLE DE COUT EST ECRITE UNE FOIS. `memeCoutPourTous` dit que les esprits
   montables la partagent ; le nombre d'esprits et de crans est COMPTE, et le
   prix du trajet complet est CALCULE — pas le champ `cumul` recopie a cote. */
function fairyPanel(e){const w=cfgOf('fairy');const niv=w.lvl||0;
  const esp=espritDe(e.item),ES=faits().esprit||{};
  const max=ES.max||FAIRYMAX;
  const atteint=esp?espritPalier(esp,niv):null;
  const suiv=esp?espritSuivant(esp,niv):null;
  const plat=esp?espritPlateau(esp,niv):null;
  const G=ES.couts||[];
  let corps='';
  if(esp){
    /* ── CE QU'IL TE RESTE A PAYER, EN TETE ────────────────────────────────
       Le panneau donnait les cinq paliers et le prix du trajet complet. Aucun
       des deux ne repond a la question qu'on se pose la main sur le curseur :
       « j'en suis au 27, il me faut combien pour aller au 40 ». La page Craft et
       Collections y repond par un calculateur ; ici le niveau est deja connu, la
       reponse se calcule donc sans rien demander. */
    corps=`<div class="feepay">`
      +(suiv?`<div class="sertl pou">${poudreHtml(espritCout(niv,suiv[0]))}`
              +` <span class="sertn">du ${Math.max(1,niv)} au ${suiv[0]}</span></div>`
              +`<div class="mini">Pour le palier <b>${suiv[0]}</b> : ${espritTexte(suiv)?esc(espritTexte(suiv)):'effet non renseigné'}.</div>`
             :`<div class="mini">Palier <b>${max}</b> atteint : plus rien à payer.</div>`)
      +(plat?`<div class="mini palerr"><i class=vgi-alert></i> Du <b>${plat.de}</b> au <b>${plat.a}</b>, rien ne change : un palier tous les dix niveaux, et l'effet ne monte qu'au <b>${plat.seuil}</b>.</div>`:'')
      +`</div>`
    /* LE PALIER S'ECRIT ENTIER — « Exp +25% » et « Drop +1 / Penyas 35% »
       compris : c'est l'effet de l'esprit equipe, pas un butin ramasse. Voir
       `espritTexte`, et la distinction au long dans le bloc « CE QU'ON RAMASSE ≠ CE QUE L'EQUIPEMENT DONNE ».
       LA TROISIEME COLONNE EST LE CUMUL DEPUIS LE 1, comme la colonne du tableau
       de Craft et Collections : elle situe chaque palier dans la depense totale,
       et elle est CALCULEE sur la grille — jamais recopiee palier par palier. */
      +`<div class="mlist">`
      /* UNE COLONNE DE NOMBRES SANS EN-TETE NE SE LIT PAS : « 219 » posé seul a
         cote d'un palier ressemble a un bonus. L'en-tete coute une rangee et rend
         la colonne lisible ; sans lui il faudrait la retirer (regle du
         renseignement incomplet). Il ne s'affiche donc QUE si la grille est la. */
      +(G.length?`<div class="mline m3 mhead"><span>Palier</span><span>Effet</span><span>Poudre depuis le 1</span></div>`:'')
      +esp.paliers.map(p=>{const on=niv>=p[0];const T=espritTexte(p);
      return `<div class="mline m3${on?' on':''}"><span>Niveau ${p[0]}</span><span>${T?esc(T):'<span class="mini">non renseigné</span>'}</span><span>${G.length?nbFr(espritCumul(p[0])):''}</span></div>`;}).join('')+`</div>`
      /* « …mais la piece ne porte aucun bonus que le builder puisse
         additionner » decrit le mecanisme interne. Le fait utile tient en trois
         mots : le curseur ne fera pas bouger le total. */
      +`<div class="mini mnote">Ces paliers ne sont pas comptés dans le total du build.</div>`
    /* LA GRILLE DE COUT EST ECRITE UNE FOIS, PAS CINQ. Le releve porte
       `memeCoutPourTous` : les esprits montables partagent la meme grille, et le
       generateur ne pose ce drapeau que s'il n'a trouve QU'UNE suite de couts.
       Le nombre d'esprits et le nombre de crans sont COMPTES ici, et le prix du
       trajet est celui que `espritCout` calcule — pas le champ `cumul` recopie a
       cote, qui servirait a se croire d'accord avec soi-meme. */
      +(G.length?`<div class="mini mnote">Monter du 1 au ${G.length+1} coûte <b>${nbFr(espritCout(1,G.length+1))}</b> ${esc(ES.poudre||'')} en ${G.length} crans${
          ES.memeCoutPourTous&&(ES.esprits||[]).length>1?`, la même grille pour les ${(ES.esprits||[]).length} esprits`:''}. Le premier cran coûte ${nbFr(G[0])}, le dernier ${nbFr(G[G.length-1])}.</div>`:'');
  } else {
    corps=`<div class="mini mnote">Non renseigné : le relevé du client ne chiffre pas les paliers de cette fée.</div>`;
  }
  return `<div class="wp"><div class="grp"><div class="gh"><i class=vgi-fairy></i> ${esc(e.item.n)}</div>
   <div class="lvl"><span class="mini">Niveau de la fée : <b>${niv}</b> / ${max}${atteint?' · palier '+atteint[0]:''}</span><input type="range" min="0" max="${max}" value="${niv}" oninput="flvLive(this)" onchange="cset('fairy','lvl',+this.value)"></div>
   ${corps}</div></div>`;}
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
/* ═══ LA MAITRISE D'ARME : UN GROUPE A ELLE, ET CE QU'ELLE RAPPORTE ═════════
   ELLE ETAIT LOGEE AU MILIEU DU GROUPE « RARETE », entre la phrase des
   parchemins et les lignes de bonus tirees au sort. A l'ecran, « + ligne
   (max 4) » et « % variable selon la stat » — qui appartiennent a la RARETE —
   tombaient sous le titre « Maitrise de l'arme » et semblaient regler la
   maitrise. Deux mecaniques distinctes lues comme une seule : c'est le desordre
   que Maxime appelle chiffon, et il vient de l'ordre du HTML, pas du style.

   ELLE MONTRE MAINTENANT CE QUE L'ARME GAGNE, ET LA PROGRESSION QUI Y MENE. Le
   panneau ecrivait « +4 » et « la rarete allume la ligne, elle ne la fait plus
   monter ensuite » : c'etait le gain d'UN palier pris pour un total, et la
   negation d'une progression bien reelle. Le gain tombe par palier de dix
   niveaux et se CUMULE ; la rarete plafonne le NIVEAU, donc le nombre de paliers.

   NIVEAU ET RARETE RESTENT DEUX CHOSES, mais elles se multiplient : le curseur
   donne les paliers franchis, la rarete donne le plafond qui les borne. Le
   tableau des six raretes le montre d'un coup d'oeil — et la case du
   Pre-Mythique reste vide parce qu'aucune source ne publie son plafond.

   LE CURSEUR GARDE SA COURSE COMPLETE, exprès. Le brider au plafond de la rarete
   effacerait en silence un niveau deja enregistre des qu'on redescend d'un
   palier ; on ramene donc le CALCUL au plafond, et on ecrit ce qui est perdu. */
function masteryUI(slot,item){const w=cfgOf(slot);const v=w.mastery||0;
  const mz=maitriseDe(item),max=maitriseMax();
  let lig='';
  if(mz){
    /* LE TABLEAU DES SIX RARETES, sur la premiere ligne de l'arme. `.mline.m3`
       existe deja (niveau · effet · coût) et sert ici a rarete · gain · niveau
       de maitrise requis. La rangee de la rarete reglee est la seule allumee :
       marquer aussi celles d'en dessous laisserait croire qu'elles s'ajoutent. */
    const l0=mz.lignes[0];
    const ech=`<div class="mlist" style="margin-top:6px">`
      +`<div class="mline m3 mhead"><span>Rareté</span><span>${esc(l0.fr)}</span><span>Maîtrise</span></div>`
      +maitriseEchelle(l0).map(e=>`<div class="mline m3${e.tier===w.tier?' on':''}"><span>${esc(e.tier)}</span><span>${e.max==null?'non renseigné':maitriseTexte(e.max)}</span><span>${e.niveau==null?'—':e.niveau}</span></div>`).join('')
      +`</div>`;
    lig=`<div class="mlist">`+mz.lignes.map(l=>{const g=maitriseGain(l,v,w.tier),plein=maitriseAtteignable(l,w.tier);
      /* Meme coupe que dans la bulle : le code de colonne du client (`l.code`)
         sort du `title`, le pas du palier et le seuil de rarete restent. */
      return `<div class="mline${g?' on':''}" title="${escA(l.pp+' par palier de '+maitrisePas()+' niveaux'+(maitriseAllumee(l,w.tier)?'':(', et rien avant '+rareteDuCode(l.des))))}"><span>${esc(l.fr)}</span><span>${maitriseTexte(g)}${(g!=null&&plein!=null&&plein>g)?` <i style="opacity:.6;font-style:normal">/ ${plein}</i>`:''}</span></div>`;}).join('')+`</div>`
      +`<div class="mini mnote">${l0.pp} par palier de ${maitrisePas()} niveaux, <b>cumulé</b>. ${maitrisePhrasePlafond(v,w.tier)}</div>`
      +ech
      +(mz.nomme&&mz.ecartee.length?`<div class="mini mnote">Ligne propre à cette arme : elle <b>remplace</b> celle de son type (${esc(maitriseMots(mz.ecartee,v,w.tier))}), elle ne s'y ajoute pas — les additionner inventerait un bonus.</div>`:'');
  } else if(!armeFait(item)){
    /* « …et lui preter la maitrise d'une voisine serait une invention » disait
       pourquoi LE SITE se tait. Le joueur, lui, a sa reponse au premier mot. */
    lig=`<div class="mini mnote">Non renseigné : le relevé du client ne connaît pas cette arme.</div>`;
  }
  return `<div class="grp"><div class="gh"><i class=vgi-target></i> Maîtrise de l'arme</div>
   <div class="lvl lvlnum"><span class="mini">Niveau : <b>${v}</b> / ${max}</span>
   <span class="lvlrow"><input type="range" min="0" max="${max}" value="${v}" oninput="masteryLive(this)" onchange="cset('${slot}','mastery',+this.value)">
   <input type="number" min="0" max="${max}" value="${v}" onchange="cset('${slot}','mastery',Math.max(0,Math.min(${max},parseInt(this.value)||0)))"></span></div>
   ${lig}</div>`;}
/* Le curseur et son champ chiffre sont desormais dans une rangee a eux (pour
   qu'ils cessent de se casser l'un sous l'autre), donc le libelle vivant n'est
   plus dans le parent immediat : on remonte au bloc `.lvl` qui les contient. */
function masteryLive(el){const w=(el.closest&&el.closest('.lvl'))||el.parentNode;const b=w&&w.querySelector('.mini b');if(b)b.textContent=el.value;}
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

/* `vgPousserPersoCompte` est parti le 2026-10-21 avec POST /api/characters. Il
   envoyait au compte chaque perso cree ici, en double de la synchro : le rendu qui
   suit la creation enregistre, et /api/characters/sync recree tout le compte depuis
   cet etat. Une seule ecriture, une seule source : l'AirBuilder. */

/* Etat vierge : un seul perso, nom par defaut, aucun equipement pose.
   C'est le seul cas ou on s'autorise a remplacer la liste locale. */
function vgEtatVierge(){
  if(!state.chars||state.chars.length!==1)return false;
  var c=state.chars[0];
  if(!/^Perso\s*1$/i.test(String(c.name||'')))return false;
  /* L'EXEMPLE TEL QUE `newChar('Perso 1')` LE POSE, rien de plus. Une classe, un niveau,
     un prestige, un carnet ou une mesure saisis sur « Perso 1 » sont un vrai travail :
     sans piece equipee, ils ne partaient jamais au compte (la publication saute un etat
     vierge), et « Mes personnages » ne les montrait pas. */
  if(c.cls!=='Arcaniste'||c.sex!=='G'||+c.lvl!==200||+c.prestige!==3||(c.carnets||[]).length)return false;
  return !(c.stuffs||[]).some(function(s){return (s.eq&&Object.keys(s.eq).length)||Object.keys(((s.mesures||{}).v)||{}).length;});
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
      /* Un lien profond arrive avant cette liste : il n'avait rien trouve a ouvrir. */
      vgOuvrirDepuisURL();
    }else{
      charForm();                                   /* aucun perso : on le cree d'abord */
    }
  }).catch(function(){});
}

/* LE LIEN PROFOND — `/builder?perso=<nom>&stuff=<rang>` ouvre ce perso et ce stuff.
   C'est ainsi que « Mes personnages » (la page et le bloc de l'accueil) renvoie ici,
   un lien par perso et par stuff (src/lib/mesPersos.ts, `lienBuilder`).

   IL N'ECRIT RIEN. Il ne cree pas un perso qui manque, ne renomme rien, ne touche a
   aucune piece : il CHOISIT ce qui s'affiche, comme un clic sur l'onglet. Un perso
   introuvable ne fait rien du tout — surtout pas ouvrir le stuff demande sur le perso
   d'a cote. Le rendu qui suit retient seulement ce choix, comme tout clic d'onglet.

   `stuff` est un RANG (0 = le premier) : deux stuffs peuvent porter le meme nom
   (« Dupliquer » en fabrique), un rang n'est pas ambigu. Un `stuff` qui n'est pas un
   nombre est lu comme un NOM : les liens d'avant le 2026-10-21 le passaient ainsi.
   Le nom du perso se compare sans accent ni casse.

   PAS DE DRAPEAU « deja fait ». Il y en avait un, et il cassait le second lien d'une
   meme visite : l'AirBuilder reste charge quand on navigue dans le site, BuilderRunner
   rappelle cette fonction au retour, et elle ne faisait plus rien. Rejouer un lien est
   sans effet de bord : on rouvre ce qui est deja ouvert. */
function vgOuvrirDepuisURL(){
  try{
    var p=new URLSearchParams(location.search);
    var nom=p.get('perso'),st=p.get('stuff');
    if(!nom&&(st==null||st===''))return;
    var norm=function(x){return String(x==null?'':x).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
    /* Le nom du perso, coupe a 40 signes comme la synchro le range (/api/characters/sync) :
       le site ne connait que ces 40-la, et son lien ne retrouvait pas un nom plus long. */
    var cle=function(x){return norm(String(x==null?'':x).slice(0,40));};
    var bouge=false;
    if(nom){var i=state.chars.findIndex(function(c){return cle(c.name)===cle(nom);});
      if(i<0)return;
      if(i!==state.cur){state.cur=i;bouge=true;}}
    if(st!=null&&st!==''){ST();var c=C(),l=c.stuffs||[];
      var j=/^\d+$/.test(st)?parseInt(st,10):l.findIndex(function(x){return norm(x.name)===norm(st);});
      if(j>=0&&j<l.length&&j!==c.curStuff){c.curStuff=j;bouge=true;}}
    if(bouge)render();
  }catch(e){}
}
window.vgOuvrirDepuisURL=vgOuvrirDepuisURL;

/* LA TABLE DES DESSINS PART DES LE DEMARRAGE. Elle est chargee a part de
   `data.json` (voir `mecaniques()`) : la demander ici, avant le premier rendu,
   evite que le premier panneau ouvert s'affiche sans ses images. Le rappel de
   rendu a l'arrivee reste en place — c'est lui qui rattrape un reseau lent. */
mecaniques();

render();
vgPremierPerso();
vgOuvrirDepuisURL();
/* EN QUITTANT LA PAGE : l'etat local d'abord, puis la publication qui attendait
   (vgPublierMaintenant). `pagehide` plutot que `beforeunload`, qui ne part pas sur
   telephone. On ne publie que ce qui ATTENDAIT : `save()` en programme une autre, qui
   n'a rien de neuf a dire et meurt avec la page. */
window.addEventListener('pagehide',function(){try{var attendait=!!_vgPushT;save();if(attendait)vgPublierMaintenant(true);}catch(e){}});
;
window.__APP='airbuilder';
// Auto-réparation : si le conteneur AirBuilder est recréé vide (re-clic sur le lien nav / navigation vers la même route), on relance render() automatiquement.
(function(){try{var _heal=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var ns=muts[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(n.nodeType!==1)continue;var s=(n.id==='setup')?n:(n.querySelector?n.querySelector('#setup'):null);if(s&&!s.innerHTML.trim()){try{render();}catch(e){}return;}}}});_heal.observe(document.body,{childList:true,subtree:true});}catch(e){}})();