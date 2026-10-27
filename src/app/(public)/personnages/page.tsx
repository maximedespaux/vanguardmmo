"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ClassLogo } from "@/components/ClassLogo";
import { renduPerso } from "@/data/charRenders";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { EtatMesures, chiffresEnClair } from "@/components/staff/MesuresStuff";
import { regardDe } from "@/config/nav";
import { ROLE_LIBELLE, nomClasse } from "@/lib/mesures";
import { aMesurer, apresPublication, lienBuilder, versVue, type PersoBrut, type PersoVue, type StuffVue } from "@/lib/mesPersos";

/**
 * Mes personnages — LE REFLET DE L'AIRBUILDER, rien d'autre (Maxime, 2026-10-21 :
 * « les modifications se feront uniquement via l'AirBuilder (suppression etc… tout
 * passe par l'AirBuilder) »).
 *
 * LE DÉFAUT QUI A FAIT CHANGER LA PAGE. Elle créait, modifiait, rendait principal et
 * supprimait des persos directement dans la table `Character` (POST /api/characters,
 * PATCH et DELETE /api/characters/[id]). Or l'AirBuilder publie ses persos par
 * /api/characters/sync, qui EFFACE puis recrée tout le compte à chaque changement :
 * tout ce que faisait la page était défait au changement suivant du builder, et un
 * perso créé ici n'existait pas dans le builder. Ces trois routes sont parties.
 *
 * La page ne fait donc plus que LIRE (GET /api/characters, la personne connectée) :
 * chaque perso — classe, niveau, prestige, principal — et chacun de ses stuffs — rôle,
 * chiffres déclarés, état des mesures —, chacun avec « Ouvrir dans l'AirBuilder », le
 * lien profond vers CE perso et CE stuff (lib/mesPersos, `lienBuilder`). Créer,
 * renommer, rendre principal, supprimer : dans l'AirBuilder, bouton « Mes
 * personnages ».
 *
 * Les stuffs vides sont montrés, en retrait : chaque perso naît avec trois stuffs dans
 * le builder, et c'est ce que le builder contient. Un stuff vide n'exige aucune mesure.
 *
 * La page est ouverte à tous : un candidat a ses persos, un visiteur est invité à se
 * connecter.
 */
export default function PersonnagesPage() {
  useCardFx();
  const { data: session, status } = useSession();
  const { connecte } = regardDe(session);
  const anonyme = status !== "loading" && !connecte;

  const [persos, setPersos] = useState<PersoVue[] | null>(null);
  const [panne, setPanne] = useState(false);

  useEffect(() => {
    if (!connecte || status === "loading") return;
    let vivant = true;
    /* On arrive souvent DU builder (« Voir sur le site », la barre) : sa dernière
       publication peut être encore en vol, et la page la montrerait sinon d'avant. */
    apresPublication()
      .then(() => fetch("/api/characters"))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: PersoBrut[]) => { if (vivant) setPersos(versVue(Array.isArray(j) ? j : [])); })
      .catch(() => { if (vivant) setPanne(true); });
    return () => { vivant = false; };
  }, [connecte, status]);

  const manque = persos ? aMesurer(persos) : 0;

  return (
    <div style={{ padding: "24px 22px 60px", maxWidth: 940, margin: "0 auto" }}>
      <PageHeader icon="users" title="Mes Personnages"
        subtitle="Tes persos et leurs stuffs, tels que l'AirBuilder les publie à la guilde." />

      {/* Rien tant que la session se lit : le rendu serveur ne la connaît pas, et un
          visiteur voyait passer « Cette page se lit » avant son invitation. */}
      {status === "loading" ? null : anonyme ? (
        <div className="glass-card" style={{ padding: 18, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 260px", fontSize: 13.5, lineHeight: 1.55 }}>
            Tes personnages sont rattachés à ton compte. <b>Connecte-toi</b>, puis monte-les dans
            l&apos;AirBuilder : ils apparaîtront ici, et ta candidature les reprendra.
          </span>
          <a href="/login" className="vg-btn" style={{ flexShrink: 0 }}>Se connecter</a>
        </div>
      ) : (
        /* Ce que la page ne fait plus, dit une fois en tête : sans cette ligne, on
           cherche le bouton « Modifier » qui était là hier. */
        <div className="glass-card" style={{ padding: 18, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Icon name="shirt" size={18} style={{ color: "var(--gn-accent)", flexShrink: 0 }} />
          <span style={{ flex: "1 1 260px", fontSize: 13.5, lineHeight: 1.55 }}>
            Cette page se lit. <b>Créer</b> un perso, le <b>renommer</b>, le rendre <b>principal</b> ou
            le <b>supprimer</b> : tout se fait dans l&apos;AirBuilder (bouton « Mes personnages »), et
            la page suit toute seule.
          </span>
          <Link href="/builder" className="vg-btn" style={{ flexShrink: 0, fontSize: 12.5, padding: "9px 16px" }}>
            <Icon name="shirt" size={15} />Ouvrir l&apos;AirBuilder
          </Link>
        </div>
      )}

      {!anonyme && manque > 0 && (
        <div className="gn-panne" role="status" style={{ marginBottom: 14 }}>
          <Icon name="alert" size={14} style={{ flexShrink: 0 }} />
          {manque} stuff{manque > 1 ? "s" : ""} à mesurer ou à remesurer : les dégâts et les PV se déclarent dans
          l&apos;AirBuilder, sous le personnage. Un clic sur le stuff l&apos;y ouvre.
        </div>
      )}

      {anonyme ? null : panne ? (
        <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Tes personnages n&apos;ont pas pu être lus. Réessaie dans un instant.</div>
      ) : !persos ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 26, textAlign: "center" }}>Chargement…</div>
      ) : persos.length === 0 ? (
        <div className="gn-pp-carte fx-card" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          Aucun personnage publié pour l&apos;instant. Crée le premier dans l&apos;AirBuilder : il apparaît ici dès
          qu&apos;il est enregistré, et c&apos;est lui qu&apos;on retrouvera partout.
          <div style={{ marginTop: 14 }}>
            <Link href="/builder" className="vg-btn" style={{ fontSize: 12.5 }}><Icon name="user-plus" size={15} />Créer mon perso</Link>
          </div>
        </div>
      ) : persos.map((p) => <CartePerso key={p.id} p={p} />)}
    </div>
  );
}

function CartePerso({ p }: { p: PersoVue }) {
  const rendu = renduPerso(p.classe, p.sexe);
  return (
    <div className="gn-pp-carte fx-card">
      <div className="gn-pp-tete">
        <div className="gn-pp-ill">
          {rendu
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={rendu} alt="" />
            : <ClassLogo name={p.classe} size={32} />}
        </div>

        <div className="gn-pp-id">
          <div className="font-heading gn-pp-nom">
            {p.nom}
            {p.principal && <span className="gn-pp-main"><Icon name="star" size={11} />principal</span>}
          </div>
          <div className="gn-pp-sous">
            <ClassLogo name={p.classe} size={15} />
            {nomClasse(p.classe)}
            <span style={{ opacity: .5 }}>·</span>Niveau {p.niveau}
            <span style={{ opacity: .5 }}>·</span>Prestige {p.prestige}
            <span style={{ opacity: .5 }}>·</span>{p.sexe === "F" ? "Fille" : "Garçon"}
          </div>
        </div>

        {/* Le bouton « Voir et modifier » de l'ancienne page, qui mène maintenant au
            builder plein écran, sur ce perso. */}
        <Link href={lienBuilder(p.nom)} className="vg-btn" style={{ flexShrink: 0, fontSize: 12, padding: "8px 14px" }}>
          <Icon name="shirt" size={14} />Ouvrir dans l&apos;AirBuilder
        </Link>
      </div>

      <div className="gn-pp-stuffs">
        <div className="gn-pp-stuffs-t">Ses stuffs</div>
        {p.stuffs.length === 0
          ? <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Aucun stuff publié.</span>
          : p.stuffs.map((s) => <LigneStuff key={s.id} perso={p} s={s} />)}
      </div>
    </div>
  );
}

/** Un stuff : la ligne de stuff du suivi (/suivi, `LigneStuff`), en lien vers le builder. */
function LigneStuff({ perso, s }: { perso: PersoVue; s: StuffVue }) {
  const vide = s.etat === "vide";
  const role = ROLE_LIBELLE[s.role];
  const chiffres = vide ? "" : chiffresEnClair(perso.classe, s.role, s.v);
  return (
    <Link href={lienBuilder(perso.nom, s.index)} className={`gn-pp-stuff${vide ? " vide" : ""}`}
      title={`Ouvrir « ${s.nom} » dans l'AirBuilder`}>
      {/* Un stuff vide n'a pas encore de rôle : celui qu'on lui DÉDUIRAIT (un Arcaniste
          ne tient que le DPS) se lisait « DPS Tank » sur le stuff « Tank » d'origine. */}
      {!vide && <span className="gn-pp-role">{role}</span>}
      {/* Le nom seulement s'il dit autre chose que le rôle (« DPS · DPS »). */}
      {(vide || s.nom.toLowerCase() !== role.toLowerCase()) && <span className="gn-pp-stuff-nom">{s.nom}</span>}
      {chiffres && <span className="gn-pp-chiffres">{chiffres}</span>}
      <span className="gn-pp-stuff-fin">
        {s.mesureLe && <span className="gn-pp-date">mesuré le {new Date(s.mesureLe).toLocaleDateString("fr-FR")}</span>}
        <EtatMesures etat={s.etat} />
        <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)" }} />
      </span>
    </Link>
  );
}
