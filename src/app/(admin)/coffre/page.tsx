import "./airguild.css";
import { AirGuildRunner } from "./AirGuildRunner";

// AirGuild — app fournie par iBeats (vanilla JS), intégrée nativement (CSS scopé .agx)
// et branchée sur la base : l'état du coffre est partagé par toute la guilde.
const MARKUP = `<div class="wrap">
  <div class="top">
    <div class="brand"><div class="owl">🦉</div><div><div class="t">Air<b>Guild</b></div><div class="s">Coffre · Craft · Boutique · Paramètres — Guilde Vanguard</div></div></div>
    <div class="spacer"></div><div class="savechip"><span class="savedot"></span> Sauvegarde auto · partagée</div>
  </div>
  <div class="tabs" id="tabs"></div>
  <div id="view"></div>
  <div class="foot">Données recoupées depuis les .air d'AirFlyff + le coffre Excel. 1 slot = 9 999 unités (médailles &amp; reliques : à l'unité). Tout est enregistré et partagé pour toute la guilde.</div>
</div>
<div class="modal" id="modal"><div class="sheet" id="sheet"></div></div>`;

export default function AirGuildPage() {
  return (
    <div className="agx">
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
      <AirGuildRunner />
    </div>
  );
}
