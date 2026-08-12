"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, type SectionVolet } from "@/components/VoletSections";
import { useCardFx } from "@/components/VgFx";
import { Icon } from "@/components/Icon";
import { Catalogue } from "@/components/competences/Catalogue";
import { Budget, HorsClasseSection, Paliers, Reserves } from "@/components/competences/Sections";
import { fmt, type Catalogue as Cat } from "@/components/competences/donnees";

/**
 * LES COMPÉTENCES — ce que le site n'avait pas du tout.
 *
 * Le wiki de la guilde connaissait les objets, les donjons, le prestige et la
 * chaîne de promotion. Pas une seule compétence. La fouille du client en donne
 * 197 distinctes, toutes nommées en français, toutes décrites sauf une, chacune
 * avec sa progression chiffrée niveau par niveau.
 *
 * 197 et pas 202 : le fichier du client liste DEUX FOIS les cinq compétences
 * d'arc de l'Acrobate, avec des valeurs identiques. Le doublon n'était pas
 * qu'un problème d'affichage — il gonflait de 30 % le budget en points annoncé
 * pour la Sylphide et l'Arbalétrier. Tous les totaux de la page sont donc
 * recalculés depuis la liste dédoublonnée, et l'écart est expliqué à l'écran.
 *
 * Le découpage en cinq volets suit cinq QUESTIONS, pas cinq tables :
 *   1. « ma classe apprend quoi, et ça fait combien ? »   → le catalogue
 *   2. « je monte ça à quel niveau, pour quel prix ? »    → le budget
 *   3. « pourquoi ma compétence de Héros ne marche pas ? » → les paliers
 *   4. « et les buffs de groupe, de couple, du Souverain ? » → hors classe
 *   5. « je peux me fier à ces chiffres ? »                → les réserves
 *
 * Les données arrivent par `/api/competences` et non par un import : le fichier
 * réduit fait 200 Ko, il partirait dans le paquet JS de la page. La route rend
 * un index léger d'un côté, et la fiche complète d'une compétence au clic.
 */

export default function CompetencesPage() {
  useCardFx();
  const [cat, setCat] = useState<Cat | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let vivant = true;
    fetch("/api/competences")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Cat) => { if (vivant) setCat(d); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, []);

  const sections = useMemo<SectionVolet[]>(() => {
    if (!cat) return [];
    const h = cat.horsClasse;
    const nbHors = h.groupe.length + h.souverain.length + h.couple.length + h.runes.length;
    return [
      {
        clef: "catalogue", titre: "Le catalogue", icon: "list", compte: cat.entrees.length,
        sous: "Cherche par classe, par palier ou par nom",
        contenu: <Catalogue entrees={cat.entrees} lignees={cat.lignees} />,
      },
      {
        clef: "cout", titre: "Ce que ça coûte", icon: "coins", compte: null,
        sous: "Le prix d'un niveau, et le budget d'une classe",
        contenu: <Budget table={cat.xpCompetence} lignees={cat.lignees} />,
      },
      {
        clef: "paliers", titre: "Maître et Héros", icon: "medal",
        compte: cat.entrees.filter((e) => e.palier === "maitre" || e.palier === "heros").length,
        sous: "Les 16 compétences où seul le niveau 5 compte",
        contenu: <Paliers entrees={cat.entrees} />,
      },
      {
        clef: "hors", titre: "Hors classe", icon: "users", compte: nbHors,
        sous: "Groupe, Souverain, couple, runes baruna",
        contenu: <HorsClasseSection h={h} />,
      },
      {
        clef: "reserves", titre: "Ce qu'on ne sait pas", icon: "help", compte: null,
        sous: "Les limites de ce relevé, dites clairement",
        contenu: <Reserves entrees={cat.entrees} doublons={cat.doublons} />,
      },
    ];
  }, [cat]);

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader icon="sparkles" title="Les compétences"
        subtitle="Toutes les compétences d'AirFlyff relevées dans le client : ce qu'elles coûtent, ce qu'elles font à chaque niveau, et ce qu'il faut monter avant." />

      {erreur && (
        <div style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 34%, transparent)",
          borderRadius: 12, padding: "14px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 9 }}>
          <Icon name="alert" size={15} style={{ color: "var(--red)", flexShrink: 0 }} />
          Le relevé des compétences n&apos;a pas pu être lu. Recharge la page ; si ça persiste, dis-le sur Discord.
        </div>
      )}

      {!cat && !erreur && (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "18px 2px" }}>Lecture du relevé…</div>
      )}

      {cat && (
        <>
          <Bandeau cat={cat} />
          <VoletSections sections={sections} />
        </>
      )}
    </div>
  );
}

/**
 * Les quatre chiffres qui disent d'emblée de quoi on parle. Ils sont calculés
 * depuis les données reçues, jamais recopiés : le jour où le relevé change, la
 * page ne mentira pas.
 */
function Bandeau({ cat }: { cat: Cat }) {
  const chiffres = [
    { valeur: fmt(cat.entrees.length), quoi: "compétences de joueur" },
    { valeur: fmt(cat.entrees.filter((e) => e.aPrerequis).length), quoi: "ont un prérequis" },
    { valeur: fmt(cat.entrees.reduce((s, e) => s + e.nivMax, 0)), quoi: "niveaux à monter en tout" },
    { valeur: fmt(cat.lignees.length), quoi: "lignées de classe couvertes" },
  ];
  return (
    <div className="glass-card fx-card" style={{ padding: "15px 18px", marginBottom: 16, display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
      {chiffres.map((c) => (
        <div key={c.quoi} style={{ minWidth: 0 }}>
          <div className="font-heading" style={{ fontSize: 21, fontWeight: 700, color: "var(--orange)", fontVariantNumeric: "tabular-nums" }}>{c.valeur}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.quoi}</div>
        </div>
      ))}
    </div>
  );
}
