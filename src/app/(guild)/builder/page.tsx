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
  <div class="legend">Haut = bijoux · Gauche = arme, bouclier, mantra, cape, masque · Droite = équipement · Bas = fashion (tête, haut, gants, bottes) · Barre séparée = ramasseur &amp; familier.</div>

  <div class="note" id="famnote" style="display:none"></div>
  <div class="stats" id="stats"></div>
  <div class="panel" id="carnetsPanel"></div>
  <div class="actions"><button class="btn ghost" onclick="resetChar()">↺ Vider ce perso</button><button class="btn" onclick="exportBuild()">💾 Exporter</button></div>
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
