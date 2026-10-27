"use client";
import { Suspense, useRef } from "react";
import Link from "next/link";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";
import { AvisAcces } from "@/components/accueil/AvisAcces";
import { ClassesHeros } from "@/components/accueil/ClassesHeros";
import { LaGuilde } from "@/components/accueil/LaGuilde";
import { MesPersonnages } from "@/components/accueil/MesPersonnages";
import { avecComptes, PORTES_PUBLIQUES, PortesSite } from "@/components/accueil/PortesSite";
import { PlanDuSite } from "@/components/accueil/PlanDuSite";
// `import type` et rien d'autre : `chiffres.ts` lit le disque avec `fs`, et ce
// fichier-ci est un composant client. Un import de type est effacé à la
// compilation — le module serveur ne suit donc jamais jusqu'au navigateur.
import type { ChiffreAccueil } from "@/components/accueil/chiffres";

/**
 * L'ACCUEIL — LA MÊME VITRINE POUR TOUS, visiteur, candidat, membre ou bras droit
 * (Maxime, 2026-10-21 : « une page uniquement pour le public », « quelque chose de
 * neutre »).
 *
 * C'est l'ancien accueil public, augmenté de ce que portait /histoire : la section
 * « La guilde » (#la-guilde) et l'appel à rejoindre, fusionné avec le sien. /histoire
 * redirige ici. Dans l'ordre : « Mes personnages » (seulement pour qui en a), le hero,
 * ce que le site fait (avec les quatre chiffres du jeu), les huit classes, la guilde,
 * rejoindre, le plan du site.
 *
 * PAS DE RECHERCHE. Le bandeau « On a ouvert le jeu » portait le champ du wiki :
 * Maxime ne veut « pas de registre de recherche » sur l'accueil. Le bandeau est parti
 * avec lui ; sa phrase (« tout est lu dans le client, sans compte ») est passée sous le
 * titre « Ce que le site fait », et ses quatre chiffres juste dessous. Le wiki reste à
 * une porte de là.
 *
 * Elle est PUBLIQUE et c'est elle que lit un moteur de recherche : aucune donnée de
 * session, aucun compteur de membres, aucun nom de joueur. Tout ce qu'elle affiche est
 * un fichier du client du jeu, ou un chiffre lu dans les données versées au dépôt. La
 * seule donnée personnelle, « Mes personnages », est lue dans le navigateur par une
 * route gardée. Elle n'appelle pas `useReglages` : la route des réglages exige la
 * guilde, et chaque visite d'un inconnu aurait produit un 401.
 */

/**
 * L'icône de chaque chiffre. Les chiffres eux-mêmes sont COMPTÉS côté serveur et
 * arrivent en props — voir `components/accueil/chiffres.ts`. La correspondance se fait
 * sur le début du libellé ; un libellé imprévu prend une icône neutre plutôt que de
 * faire disparaître sa carte.
 */
const ICONE_CHIFFRE: [string, IconName][] = [
  ["spécialisations", "users"],
  ["instances", "skull"],
  ["objets", "package"],
  ["vagues", "tower"],
];
const iconeDe = (libelle: string): IconName =>
  ICONE_CHIFFRE.find(([d]) => libelle.startsWith(d))?.[1] ?? "sparkles";

/** Les 20 logos de cape que le jeu propose aux guildes (24×24 dans le client). */
const CAPES = Array.from({ length: 20 }, (_, i) => `cape-logo-${String(i + 1).padStart(2, "0")}.webp`);

/**
 * Combien de portes, et combien sous cadenas — COMPTÉ sur la liste, jamais écrit. Taper
 * ces nombres à la main les rendrait faux à la première porte ajoutée.
 */
const NB_PORTES = PORTES_PUBLIQUES.length;
const NB_VERROU = PORTES_PUBLIQUES.filter((p) => p.verrou).length;

/** Un titre de section de la vitrine : le h2 de l'ancien accueil public, tel quel. */
function TitreVitrine({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "46px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
      <Icon name={icon} framed frameSize={34} tone="orange" /> <span className="vg-h2">{children}</span>
    </h2>
  );
}

const SOUS: React.CSSProperties = { fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 };

export function AccueilVisiteur({ chiffres, comptes = {}, connecte = false, membre = false }: {
  chiffres: ChiffreAccueil[];
  /** Ce que pèse chaque porte, compté côté serveur (voir `comptesPortes`). */
  comptes?: Record<string, string>;
  /** Quelqu'un de connecté : pas de bouton de connexion, « Postuler » en tête. */
  connecte?: boolean;
  /** Déjà de la guilde : ni « Postuler » ni « Rejoindre » — la règle de `appel`
   *  (config/nav.ts). Rien d'autre ne change : c'est la même vitrine. */
  membre?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Révélation au défilement, avec le repli de useReveal : sans lui, un élément
  // raté par l'observateur reste invisible pour de bon.
  useReveal(ref);
  // Halo au curseur sur les .fx-card (cartes de classe et portes).
  useCardFx();

  return (
    <div ref={ref} style={{ paddingBottom: 64 }}>
      {/* L'AVIS D'ACCÈS PASSE AU-DESSUS DU HERO. Posé dessous, il tombait sous la ligne
          de flottaison — le hero occupe tout l'écran — et un visiteur renvoyé ici par
          une page réservée ne lisait jamais pourquoi. useSearchParams sous Suspense,
          comme avant. */}
      <div className="acc-wrap">
        <Suspense fallback={null}><AvisAcces /></Suspense>
        {/* ── Mes personnages, EN TÊTE ── la seule exception à la vitrine : rien pour un
            visiteur, rien pour qui n'a pas de perso, et rien dans le HTML — le bloc se
            lit dans le navigateur (/api/characters, gardée). */}
        <MesPersonnages />
      </div>

      <HeroFlyff connecte={connecte} membre={membre} />

      <div className="acc-wrap">
        {/* ── Ce que le site fait ── ce que le site sait faire, et ce qui s'ouvre en
            étant MEMBRE (et non « en se connectant » : les adresses sous cadenas
            excluent le rang RECRUE). Les deux nombres sont comptés sur la liste. La
            phrase et les quatre chiffres viennent du bandeau « On a ouvert le jeu »,
            parti avec sa recherche. */}
        <TitreVitrine icon="compass-rose">Ce que le site fait</TitreVitrine>
        <p className="vg-reveal" style={SOUS}>
          Tout est lu dans les fichiers du client d&apos;Airborn :{" "}
          {NB_PORTES - NB_VERROU} portes ouvertes sans compte, {NB_VERROU} réservées aux membres.
        </p>

        <div className="vg-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, margin: "0 0 18px" }}>
          {chiffres.map((c) => (
            <div key={c.libelle} className="fx-stat fx-card">
              <span style={{
                width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 12, color: "var(--gn-accent)", border: "1px solid rgba(var(--gn-or-rgb),.32)",
                background: "linear-gradient(180deg,rgba(var(--gn-lueur-rgb),.22),rgba(var(--gn-lueur-rgb),.05))",
              }}>
                <Icon name={iconeDe(c.libelle)} size={19} />
              </span>
              <div>
                {/* tabular-nums : « 4 970 » et « 8 » côte à côte sautaient d'un pixel
                    au survol quand les chiffres n'ont pas la même largeur. */}
                <div className="n" style={{ fontVariantNumeric: "tabular-nums" }}>{c.n.toLocaleString("fr-FR")}</div>
                <div className="l">{c.libelle}</div>
              </div>
            </div>
          ))}
        </div>

        <PortesSite portes={avecComptes(PORTES_PUBLIQUES, comptes)} />

        {/* ── Les huit classes, avec l'emblème du jeu ── l'accueil donne l'envie et LA
            porte : les cartes mènent à /classes, une ligne dit où est le détail. */}
        <TitreVitrine icon="swords">Les huit fins de partie</TitreVitrine>
        <p className="vg-reveal" style={SOUS}>
          Compétences, paliers et coûts : sur <Link href="/classes" className="acc-lien-t">la page des classes</Link>.
        </p>
        <ClassesHeros />

        {/* ── La guilde ── l'ancienne page /histoire, en entier. */}
        <LaGuilde titre={<TitreVitrine icon="shield">La guilde</TitreVitrine>} />

        {/* ── Rejoindre ── UN SEUL appel, là où l'accueil et /histoire en avaient chacun
            un : l'illustration et les capes de l'accueil, la phrase et le bouton de
            /histoire. LA CONDITION FERME est dite ici et seulement ici : c'est la
            dernière phrase avant le bouton, donc celle qu'on lit vraiment ; le hero la
            dit en une formule, la section « La guilde » la détaille. Absent pour qui
            est déjà de la guilde : on ne propose pas d'entrer à qui est entré. */}
        {!membre && <div className="vg-reveal acc-join">
          {/* L'ILLUSTRATION OFFICIELLE DU SERVEUR — `accueil/login_screen_01.webp`.
              FAIT VÉRIFIÉ SUR LES PIXELS : le logo peint est l'ANCIEN, « AIRFLYFF » ;
              le texte de remplacement transcrit le logo tel qu'il est peint. C'est la
              seule des sept images de `public/jeu/accueil/` exploitable telle quelle :
              aucun logo d'éditeur, aucune barre de chargement incrustée. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="acc-join-art"
            src="/jeu/accueil/login_screen_01.webp"
            alt="L'illustration officielle du serveur : quatre aventuriers face à un colosse de pierre en flammes, sous le logo AIRFLYFF — l'ancien nom, tel qu'il est peint dans l'image — et la devise « L'air se raréfie »."
            width={1400}
            height={785}
            loading="lazy"
            decoding="async"
          />
          <div className="acc-join-in">
            {/* Les logos de cape du jeu : la seule image que le client donne d'une
                GUILDE. Décoratifs, donc masqués aux lecteurs d'écran. 20 × 24 px + 8 px
                d'écart = 640 px : à 480 la frise cassait en 15 + 5. */}
            <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", maxWidth: 660, margin: "0 auto 22px", opacity: .55 }}>
              {CAPES.map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c} src={`/jeu/mecaniques/${c}`} alt="" width={24} height={24} loading="lazy" style={{ imageRendering: "pixelated" }} />
              ))}
            </div>
            <div className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              GENESIS, c&apos;est une de ces capes
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 auto 22px", maxWidth: 560, lineHeight: 1.7 }}>
              Présente-nous tes personnages et ce que tu cherches. On répond, même quand c&apos;est non.
              Une seule condition ferme : être joignable en vocal.
            </p>
            <Link href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler maintenant</Link>
          </div>
        </div>}

        {/* ── Le plan du site, replié : l'index qui était /sommaire ── */}
        <PlanDuSite />
      </div>

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ──
          .acc-join — overflow:hidden sur le bloc : l'illustration fait 1 400 px de large
          et déborderait des coins arrondis ; c'est la PAGE qui gagnerait une barre
          horizontale.

          .acc-join-art — LE CADRAGE EST CALCULÉ, parce qu'il décide si le nom du serveur
          est dans l'image ou coupé. L'illustration fait 1 400x785 ; à la largeur du bloc
          (976 px) elle ferait 547 px de haut, on en garde 300. Calé EN BAS, la bande
          visible court de 45 % à 100 % : le nom tombe au tiers bas du cadre, les quatre
          aventuriers dans le haut.

          .acc-join::after — le dégradé de raccord est un calque posé SUR l'image (en
          background du conteneur il passerait derrière). 60 px, opacité pleine au
          dernier pixel seulement : il n'éteint que la prairie, pas le nom.

          .acc-lien-t — un lien AU FIL DU TEXTE, pas un bouton.

          Le repli à 640 px rend sa marge à la page : les 32 px du conteneur ne
          laissaient que 296 px de contenu sur un écran de 360, et les cartes de classe
          en demandent 215 minimum. */}
      <style>{`
        .acc-wrap{max-width:1040px;margin:0 auto;padding:0 32px}
        .acc-join{position:relative;overflow:hidden;margin-top:46px;border-radius:16px;text-align:center;
          border:1px solid var(--gn-or-sombre);background:#08080b}
        .acc-join-art{display:block;width:100%;height:300px;object-fit:cover;object-position:center bottom}
        .acc-join::after{content:"";position:absolute;left:0;right:0;top:240px;height:60px;pointer-events:none;
          background:linear-gradient(180deg,transparent,#08080b)}
        .acc-join-in{position:relative;z-index:1;padding:30px 28px 34px;
          background:radial-gradient(circle at 50% 0%, rgba(var(--gn-lueur-rgb),.13), transparent 68%)}
        @media(max-width:640px){.acc-join-art{height:190px}.acc-join::after{top:145px;height:45px}}
        .acc-lien-t{color:var(--gn-accent);text-decoration:none;font-weight:600;border-bottom:1px dotted currentColor}
        .acc-lien-t:hover{color:var(--text)}
        @media(max-width:640px){.acc-wrap{padding:0 16px}}
      `}</style>
    </div>
  );
}
