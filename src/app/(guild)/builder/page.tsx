import "./airbuilder.css";
import { BuilderRunner } from "./BuilderRunner";

// AirBuilder — moteur fourni par iBeats (vanilla JS), remis au propre + intégré
// nativement : icônes externalisées, CSS scopé sous .abx, chargé via BuilderRunner.
const MARKUP = `<div class="wrap">
  <div class="topbar"><div class="brand">Air<span>Builder</span></div><div class="step">Crée, équipe et compare tes builds</div>
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
  <div class="actions"><button class="btn ghost" onclick="resetChar()">↺ Vider ce stuff</button><button class="btn" onclick="vgSavePersos()">💾 Sauvegarder mes persos</button></div>
</div>
<div id="modalRoot"></div>`;

export default function BuilderPage() {
  return (
    <div className="abx">
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
      <BuilderRunner />
    </div>
  );
}
