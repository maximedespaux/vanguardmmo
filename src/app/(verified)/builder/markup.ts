// Markup du Stuff Builder (moteur vanilla d'iBeats). Source unique, partagée entre
// /builder (édition) et /builder/[user] (lecture seule) pour éviter toute divergence de layout.
// Les icônes viennent de src/lib/vg-icon-paths.ts (même source que <Icon> et window.VGI).
import { vgIconHtml as ico } from "@/lib/vgIconHtml";

export const BUILDER_MARKUP = `<div class="wrap">
  <div class="topbar"><div class="brand">Air<span>Builder</span></div><div class="step">Crée, équipe et compare tes builds</div><div class="savechip" id="vgSaveChip" title="Tes changements sont enregistrés automatiquement. Chaque changement écrase l'état précédent (pas d'annulation) — clique « Publier » pour garder une version restaurable.">${ico("check", { size: 13 })} Sauvegarde &amp; publication auto</div>
    <div class="ptabs" id="ptabs" style="margin-left:auto"></div></div>

  <!-- Les actions en TÊTE : vider un stuff et partager son build sont des
       gestes qu'on cherche avant de faire défiler, pas après. -->
  <div class="actions actions-top">
    <button class="btn ghost" onclick="resetChar()">${ico("rotate-ccw", { size: 16 })} Vider ce stuff</button>
    <button class="btn" onclick="vgPartager()">${ico("link", { size: 16 })} Partager le build</button>
    <button class="btn ghost" onclick="vgSaveHelp()">${ico("info", { size: 16 })} Comment ça marche ?</button>
  </div>

  <div class="buildhead">
    <div class="buildhead-main">
      <div class="setup" id="setup"></div>
      <div class="stuffbar" id="stuffbar"></div>
    </div>
  </div>

  <div class="doll">
    <div class="dollttl" id="dollttl">Équipement</div>
    <div class="rowT" id="rowT"></div>
    <div class="colL" id="colL"></div>
    <div class="center"><div class="silwrap"><div class="silhead"><div class="cn" id="cn"></div><div class="cc" id="cc"></div></div><img class="charimg" id="charimg" alt=""></div></div>
    <div class="colR" id="colR"></div>
    <div class="rowB" id="rowB"></div>
    <div class="petbar" id="petbar"></div>
  </div>
  <button type="button" class="legend vg-scrollhint" onclick="var p=document.getElementById('carnetsPanel');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});">${ico("chevron-down", { size: 14 })} <b>Carnets des Arcanes</b> — clique ici pour remplir tes carnets plus bas ${ico("chevron-down", { size: 14 })}</button>

  <div class="note" id="famnote" style="display:none"></div>
  <div class="stats" id="stats"></div>
  <div class="panel" id="carnetsPanel"></div>
</div>
<div id="modalRoot"></div>`;
