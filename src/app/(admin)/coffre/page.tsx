import "./airguild.css";
import { AirGuildRunner } from "./AirGuildRunner";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/config/roles";

// AirGuild — app fournie par iBeats (vanilla JS), intégrée nativement (CSS scopé .agx)
// et branchée sur la base : l'état du coffre est partagé par toute la guilde.
const MARKUP = `<div class="wrap">
  <div class="top">
    <div class="brand"><div class="owl"><i class=vgi-owl></i></div><div><div class="t">Air<b>Guild</b></div><div class="s">Coffre · Crafts · Base des objets — Guilde Vanguard</div></div></div>
    <div class="spacer"></div><div class="savechip"><span class="savedot"></span> Sauvegarde auto · partagée</div>
  </div>
  <div class="tabs" id="tabs"></div>
  <div id="view"></div>
  <div class="foot">Données recoupées depuis les .air d'Airborn + le coffre Excel. 1 slot = 9 999 unités (médailles &amp; reliques : à l'unité). Tout est enregistré et partagé pour toute la guilde.</div>
</div>
<div class="modal" id="modal"><div class="sheet" id="sheet"></div></div>`;

export default async function AirGuildPage() {
  // Roster Discord → coffres membres auto-créés (F2). Coffres réservés aux admins (Direction/Vanguard/Général/Officier).
  const members = await prisma.user
    .findMany({ where: { role: { in: ADMIN_ROLES } }, select: { username: true, discordId: true }, orderBy: { username: "asc" } })
    .catch(() => [] as { username: string; discordId: string }[]);
  const roster = Array.from(new Set(members.map((m) => m.username).filter(Boolean)));
  /* Le pseudo ne suffit plus a designer quelqu'un : un coffre s'attache a son
     IDENTIFIANT Discord, qui ne change pas quand le pseudo change. On passe donc
     la table pseudo -> identifiant, la seule facon d'attribuer un coffre a un
     membre en le nommant. */
  const identifiants = Object.fromEntries(
    members.filter((m) => m.username && m.discordId).map((m) => [m.username, m.discordId]),
  );
  return (
    <div className="agx">
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
      <AirGuildRunner roster={roster} identifiants={identifiants} />
    </div>
  );
}
