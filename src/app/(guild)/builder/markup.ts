// Markup du Stuff Builder (moteur vanilla d'iBeats). Source unique, partagée entre
// /builder (édition) et /builder/[user] (lecture seule) pour éviter toute divergence de layout.
export const BUILDER_MARKUP = `<div class="wrap">
  <div class="topbar"><div class="brand">Air<span>Builder</span></div><div class="step">Crée, équipe et compare tes builds</div><div class="savechip" id="vgSaveChip" title="Tes changements sont enregistrés automatiquement. Chaque changement écrase l'état précédent (pas d'annulation) — clique « Publier » pour garder une version restaurable." style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--green,#4ade80);background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.28);border-radius:20px;padding:4px 11px;margin-left:14px;cursor:help"><span style="width:7px;height:7px;border-radius:50%;background:var(--green,#4ade80);box-shadow:0 0 6px var(--green,#4ade80)"></span> Sauvegarde auto</div>
    <div class="ptabs" id="ptabs" style="margin-left:auto"></div></div>
  <div class="setup" id="setup"></div>
  <div class="stuffbar" id="stuffbar"></div>

  <div class="doll">
    <div class="dollttl" id="dollttl">Équipement</div>
    <div class="rowT" id="rowT"></div>
    <div class="colL" id="colL"></div>
    <div class="center"><div class="silwrap"><div class="silhead"><div class="cn" id="cn"></div><div class="cc" id="cc"></div></div><img class="charimg" id="charimg" alt=""></div></div>
    <div class="colR" id="colR"></div>
    <div class="rowB" id="rowB"></div>
    <div class="petbar" id="petbar"></div>
  </div>
  <div class="legend vg-scrollhint" onclick="var p=document.getElementById('carnetsPanel');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});" style="cursor:pointer;text-align:center;user-select:none">▾ <b style="color:var(--orange,#ff8c1a)">Carnets des Arcanes</b> — clique ici pour remplir tes carnets plus bas ▾</div>

  <div class="note" id="famnote" style="display:none"></div>
  <div class="stats" id="stats"></div>
  <div class="panel" id="carnetsPanel"></div>
  <div class="actions"><button class="btn ghost" onclick="vgSaveHelp()">ℹ️ Comment ça marche ?</button><button class="btn ghost" onclick="resetChar()">↺ Vider ce stuff</button><button class="btn" onclick="vgSavePersos()">📤 Publier mes persos</button></div>
</div>
<div id="modalRoot"></div>`;
