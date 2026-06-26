import "./airguild.css";
import { AirGuildRunner } from "./AirGuildRunner";
import { prisma } from "@/lib/prisma";
import { GUILD_ROLES } from "@/config/roles";

// AirGuild — app fournie par iBeats (vanilla JS), intégrée nativement (CSS scopé .agx)
// et branchée sur la base : l'état du coffre est partagé par toute la guilde.
const MARKUP = `<div class="wrap">
  <div class="top">
    <div class="brand"><div class="owl">🦉</div><div><div class="t">Air<b>Guild</b></div><div class="s">Dépôt en Coffre de Guilde · Craft · Paramètres — Guilde Vanguard</div></div></div>
    <div class="spacer"></div><div class="savechip"><span class="savedot"></span> Sauvegarde auto · partagée</div>
  </div>
  <div class="tabs" id="tabs"></div>
  <div id="view"></div>
  <div class="foot">Données recoupées depuis les .air d'AirFlyff + le coffre Excel. 1 slot = 9 999 unités (médailles &amp; reliques : à l'unité). Tout est enregistré et partagé pour toute la guilde.</div>
</div>
<div class="modal" id="modal"><div class="sheet" id="sheet"></div></div>`;

export default async function AirGuildPage() {
  // Roster Discord → coffres membres auto-créés (F2). On ne lit que les pseudos des membres de guilde.
  const members = await prisma.user
    .findMany({ where: { role: { in: GUILD_ROLES } }, select: { username: true }, orderBy: { username: "asc" } })
    .catch(() => [] as { username: string }[]);
  const roster = Array.from(new Set(members.map((m) => m.username).filter(Boolean)));
  return (
    <div className="agx">
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
      <AirGuildRunner roster={roster} />
    </div>
  );
}
