"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { EnteteVolet, VoletSections, type SectionVolet } from "@/components/VoletSections";
import { Anges } from "./Anges";
import { Cartes } from "./Cartes";
import { Karma } from "./Karma";
import { Maitrise } from "./Maitrise";
import { Succes } from "./Succes";
import { Titres } from "./Titres";
import { nb, type Collections as TCollections } from "./donnees";

/**
 * SIX SYSTÈMES, UNE PAGE.
 *
 * Titres, succès, anges, maîtrise d'arme, carnets de cartes, karma PK : six
 * choses dont le site ne disait rien, et qui posent toutes la même question —
 * « qu'est-ce qu'il me reste à décrocher ? ». Six pages auraient éparpillé la
 * réponse ; une page à six volets la garde d'un seul endroit, et le rail dit
 * ce qu'il y a dedans SANS l'ouvrir.
 *
 * Les données arrivent par un seul appel à `/wiki/collections.json` (43 Ko),
 * pas par un import : un import statique de JSON part dans le paquet JS de la
 * page et se télécharge même quand on n'ouvre aucun volet.
 */
export function Collections() {
  useCardFx();
  const [d, setD] = useState<TCollections | null>(null);
  const [rate, setRate] = useState(false);

  useEffect(() => {
    let vivant = true;
    fetch("/wiki/collections.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((x: TCollections) => { if (vivant) setD(x); })
      .catch(() => { if (vivant) setRate(true); });
    return () => { vivant = false; };
  }, []);

  if (rate) {
    return (
      <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
        <Icon name="alert" size={22} style={{ color: "var(--red)" }} />
        <p style={{ margin: "9px 0 0" }}>Le relevé du client n&apos;a pas pu être chargé. Recharge la page ; s&apos;il manque toujours, le fichier <code>public/wiki/collections.json</code> n&apos;est pas en place.</p>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
        Chargement du relevé du client…
      </div>
    );
  }

  const nbTitres = d.titres.length;
  const anges = d.anges.filter((a) => a.montable);
  const cumul = anges[0]?.cumul ?? 0;

  const sections: SectionVolet[] = [
    {
      clef: "titres", titre: "Titres d'honneur", sous: "Lequel tu peux viser maintenant",
      icon: "trophy", compte: nbTitres,
      contenu: <Titres titres={d.titres} source={d.sources.titres} />,
    },
    {
      // Le client compte 22 familles, mais sa famille « CHASSE » à elle seule
      // pèse 82 marches sur onze régions : on la redécoupe par région, d'où un
      // nombre de cartes supérieur au nombre de familles du client. Le
      // sous-titre annonce donc les MARCHES, qui elles ne bougent pas.
      clef: "succes", titre: "Succès", sous: "Les 192 marches, rangées par famille",
      icon: "medal", compte: d.nbSucces,
      contenu: <Succes familles={d.succesFamilles} nbSucces={d.nbSucces} source={d.sources.succes} />,
    },
    {
      clef: "anges", titre: "Anges", sous: "Combien de poudre féerique, du niveau X au Y",
      icon: "fairy", compte: d.anges.length,
      contenu: <Anges anges={d.anges} poudre={d.poudre} source={d.sources.anges} />,
    },
    {
      clef: "maitrise", titre: "Maîtrise d'arme", sous: "Ce que le niveau 100 demande",
      icon: "sword", compte: d.maitrise.armes.length,
      contenu: <Maitrise m={d.maitrise} source={d.sources.maitrise} />,
    },
    {
      clef: "cartes", titre: "Carnets de cartes", sous: "Les bonus, avec les illustrations",
      icon: "card", compte: d.decks.length,
      contenu: <Cartes decks={d.decks} definies={d.nbCartesDefinies} placees={d.nbCartesPlacees} source={d.sources.decks} />,
    },
    {
      clef: "karma", titre: "Karma PK", sous: "Ce que coûte une mauvaise réputation",
      icon: "skull", compte: d.karma.length,
      contenu: <Karma grades={d.karma} source={d.sources.karma} />,
    },
  ];

  return (
    <VoletSections
      defaut="titres"
      sections={sections}
      entete={
        <EnteteVolet
          icon="trophy"
          titre="Ce qu'il te reste à décrocher"
          marque={{ texte: `relevé du ${new Date(d.genere).toLocaleDateString("fr-FR")}`, couleur: "var(--blue)" }}
          sous={<>
            {nb(nbTitres)} titres, {nb(d.nbSucces)} succès, {d.anges.length} anges et {d.maitrise.armes.length} maîtrises d&apos;arme,
            relevés dans le client du jeu. {cumul > 0 && <>Le chiffre qui remet les idées en place : <b style={{ color: "var(--gold)" }}>{nb(cumul)} poudres féeriques</b> pour monter un seul ange au bout.</>}
          </>}
        />
      }
    />
  );
}
