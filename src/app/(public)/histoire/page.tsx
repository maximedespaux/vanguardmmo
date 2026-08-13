"use client";
import { useRef } from "react";
import Link from "next/link";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";
import { Verrou } from "@/components/guides/Briques";

/** Pastille d'icône à la charte (carré arrondi, dégradé orange, icône orange). */
function IconBadge({ name, size = 56, icon = 26 }: { name: IconName; size?: number; icon?: number }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 14, color: "var(--orange)",
      background: "linear-gradient(180deg,rgba(255,140,26,.22),rgba(255,140,26,.05))",
      border: "1px solid rgba(255,140,26,.32)", boxShadow: "0 0 16px rgba(255,140,26,.14)",
    }}>
      <Icon name={name} size={icon} strokeWidth={1.9} />
    </div>
  );
}

/**
 * DEUX BLOCS ONT QUITTÉ CETTE PAGE, et les deux étaient des doublons de l'accueil.
 *
 * 1. LE BANDEAU DE QUATRE CHIFFRES (« 8 classes jouables », « 23 donjons
 *    référencés », « P3 → P10 », « 1 coffre commun »). Les deux premiers étaient
 *    comptés sur les mêmes données que les chiffres de l'accueil, donc affichés
 *    deux fois sur deux pages voisines ; les deux autres sont déjà dits, en
 *    phrases, dans les objectifs juste dessous — « Du prestige 3 au 10, on avance
 *    ensemble » et « Le stock de la guilde est là pour équiper les membres ». Un
 *    bandeau qui répète le paragraphe qu'il surplombe ne renseigne personne.
 *
 * 2. LES HUIT CARTES « LES FONCTIONNALITÉS DU SITE » sont parties sur l'ACCUEIL,
 *    où elles sont devenues des portes (components/accueil/PortesSite.tsx). Elles
 *    n'ont pas été supprimées : ce que le SITE sait faire est le sujet de la page
 *    qu'un visiteur voit en premier, pas de celle qui raconte la guilde. Quatre
 *    des huit menaient d'ailleurs déjà aux quatre mêmes destinations que les
 *    portes de l'accueil — le doublon était exact.
 *
 * Ce qui reste ici est ce que cette page est seule à porter : qui on est, ce qu'on
 * attend, et comment postuler.
 *
 * LES QUATRE DESCRIPTIONS ONT MAIGRI DE MOITIÉ. Chacune est posée sous une image
 * du jeu choisie pour ce qu'elle raconte : l'image donne l'ambiance, le texte n'a
 * plus qu'à donner le fait. Dix-huit mots pour dire « on joue en vocal » étaient
 * dix-sept de trop.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *  ET TROIS DES QUATRE MÈNENT MAINTENANT QUELQUE PART.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Règle de la maison : sur une page qui n'est PAS propriétaire d'un sujet, une phrase et
 * un LIEN. Or ces quatre promesses parlaient de trois sujets qui ont chacun leur page
 * propriétaire — les Chambres Secrètes (/compositions), la progression palier par palier
 * (/astuces) et le stock commun (/boutique) — et AUCUNE ne menait ailleurs. Un visiteur à
 * qui on promet « des compositions préparées » devait retourner au menu pour vérifier
 * qu'elles existent. C'était le dernier cul-de-sac de cette page.
 *
 * La compensation est prise sur place : deux slogans sont partis pour laisser la place aux
 * liens — « On y va pour réussir » et « Tu demandes, on répond » ne disaient rien qu'un
 * clic ne montre mieux.
 *
 * LE CADENAS EST DIT AVANT LE CLIC, et les trois marches ne sont pas les mêmes :
 * /compositions vit dans le groupe (guild), donc « membres » ; /astuces est publique,
 * donc rien ; /boutique est en mode VITRINE — un visiteur y voit le vrai stock et les
 * vrais prix, et seule la commande se refuse — donc pas de cadenas non plus, ce serait un
 * mur imaginaire devant une porte ouverte.
 */
const objectifs: { icon: IconName; titre: string; desc: string; vue: string;
  lien?: { href: string; mot: string; verrou?: "membres" | "compte" | "en partie" } }[] = [
  {
    icon: "message", titre: "Vocal avant tout",
    /* « Discord obligatoire » A SAUTÉ D'ICI, et c'était sa TROISIÈME apparition sur ce
       seul écran : le hero l'annonce en haut (« Discord et vocal obligatoires ») et l'appel
       à candidature la repose comme la seule condition ferme, juste avant le bouton. Cette
       carte n'était pas la bonne des trois — on ne lit pas une règle d'engagement au
       milieu d'une grille d'ambiance. Ce qui reste est ce qu'elle est SEULE à dire :
       quand le vocal sert, et à quoi. */
    desc: "Vocal pendant les runs : c'est là que les Chambres Secrètes se jouent.",
    // Une ville la nuit, fenêtres allumées : des gens rassemblés au même endroit.
    vue: "shotcredit16",
    // Pas de lien : celui des Chambres Secrètes est sur la carte qui leur est consacrée,
    // deux cases plus loin. Deux liens vers /compositions sur le même écran, ce serait le
    // défaut qu'on vient de corriger sur l'accueil — dix chemins vers /classes.
  },
  {
    icon: "trending-up", titre: "Personne ne reste bloqué",
    desc: "Du prestige 3 au 10 : un guide par palier, et quelqu'un pour répondre.",
    // Un escalier interminable vers une citadelle : la montée, exactement.
    vue: "shotcredit12",
    lien: { href: "/astuces", mot: "Le guide" },
  },
  {
    icon: "key", titre: "Chambres Secrètes sérieuses",
    desc: "Compositions préparées, présences annoncées.",
    // Des ruines à colonnes, et une meute qui attend au milieu : une salle.
    vue: "shotcredit11",
    lien: { href: "/compositions", mot: "Les compositions", verrou: "membres" },
  },
  {
    icon: "vault", titre: "Un coffre qui sert",
    desc: "Le stock commun sert à équiper les membres.",
    // Un champ de récolte : d'où vient ce qu'il y a dans le coffre.
    vue: "shotcredit13",
    lien: { href: "/boutique", mot: "Le stock, à regarder sans compte" },
  },
];

export default function HistoirePage() {
  const ref = useRef<HTMLDivElement>(null);
  // Revelation au scroll AVEC repli : l'ancien observateur (seuil 0.12 +
  // rootMargin -8%) laissait des elements a opacity:0 pour toujours quand il les
  // ratait — du contenu devenait invisible. Voir useReveal.
  useReveal(ref);
  // Halo qui suit le curseur + léger relief 3D sur les éléments .fx-card.
  // Pas de référence à passer : le hook écoute le document (voir VgFx).
  useCardFx();

  return (
    <div ref={ref} style={{ paddingBottom: 60 }}>
      <HeroFlyff />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
        {/* Intro.
            L'illustration est `guildsiege.webp`, prise dans l'interface du client
            (200×200). C'est la SEULE image que le jeu donne d'une guilde en train
            de se battre — huit personnages de classes différentes qui chargent
            ensemble — et c'est exactement le propos du paragraphe qu'elle
            accompagne. Elle n'est donc pas là pour décorer : elle montre ce que le
            jeu appelle une guilde. Marquée aria-hidden, le texte dit déjà tout. */}
        <div className="glass-card vg-reveal hi-intro" style={{ padding: 28, marginTop: 32, borderLeft: "3px solid var(--orange)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jeu/interface/guildsiege.webp" alt="" aria-hidden="true" width={104} height={104} className="hi-siege" />
          {/* « Le Discord et le vocal sont obligatoires » a été retiré de ce
              paragraphe, et sa formule gardée. La règle était dite QUATRE FOIS sur
              cet écran : dans le titre du hero juste au-dessus, ici, dans le premier
              objectif qui la détaille (« vocal pendant les runs »), et dans l'appel
              à candidature qui la pose comme la seule condition ferme. La dernière
              est la seule qui compte — c'est la phrase qu'on lit avant de cliquer.
              Ce qui reste ici, c'est ce que ce paragraphe est seul à dire : la
              comparaison avec une liste de pseudos. */}
          {/* LA SECONDE MOITIÉ DU PARAGRAPHE EST PARTIE — « Que tu arrives au
              prestige 3 ou que tu sois déjà P10, tu trouveras ici un cadre clair et
              de quoi progresser sans t'éparpiller ». C'était mot pour mot la
              promesse de l'objectif « Personne ne reste bloqué » qui suit à un écran
              d'ici, image comprise. Reste ce que ce paragraphe est seul à dire : la
              comparaison avec une liste de pseudos. */}
          {/* L'OUVERTURE DU PARAGRAPHE A SAUTÉ — « On ne cherche pas à être nombreux, mais
              présents ». C'était la paraphrase de la première phrase du hero, un écran plus
              haut : « Peu de membres, mais présents ». Même idée, même mot pivot, à deux
              centimètres de distance.
              Ce que ce paragraphe est SEUL à apporter, c'est la DÉFINITION du mot que le
              hero lance sans l'expliquer : trois gestes concrets, vérifiables, et la
              comparaison avec une liste de pseudos. Il ne répète donc plus le hero, il le
              complète — et c'est neuf mots de moins. */}
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
            <b style={{ color: "var(--orange)" }}>Présents</b>, ça veut dire : venir en vocal,
            prévenir quand on ne peut pas, et être là en Chambre Secrète.
            C&apos;est ce qui sépare une guilde d&apos;une liste de pseudos.
          </p>
        </div>

        {/* Objectifs — quatre promesses, chacune avec une image du jeu qui la dit.
            Les quatre vues viennent de `public/jeu/credits/`, le générique du
            client : ce sont des paysages propres, sans logo d'éditeur ni barre de
            chargement incrustés (vérifié fichier par fichier — c'est le piège des
            35 images de `chargement/`, qui portent le copyright dans leur tiers
            bas). Chacune a été choisie pour ce que la promesse raconte, pas pour
            décorer : le détail est noté sur chaque entrée du tableau.
            `alt=""` : le texte de la carte dit tout, l'image est l'ambiance. */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "40px 0 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="target" framed frameSize={34} tone="orange" /> <span className="vg-h2">Nos objectifs</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, alignItems: "stretch", maxWidth: 760, margin: "0 auto" }}>
          {objectifs.map((o, i) => (
            <div key={o.titre} className="glass-card vg-reveal fx-card hi-obj" style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="hi-obj-vue">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/jeu/credits/${o.vue}.webp`} alt="" aria-hidden="true" width={512} height={256} loading="lazy" decoding="async" />
                {/* Un div et non un span : IconBadge rend un div, et un div dans un
                    span est du HTML invalide — les navigateurs le tolèrent, mais le
                    rendu serveur et l'hydratation peuvent alors ne pas produire le
                    même arbre. */}
                <div className="hi-obj-badge"><IconBadge name={o.icon} size={44} icon={21} /></div>
              </div>
              <div className="hi-obj-txt">
                <div className="font-heading" style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{o.titre}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>{o.desc}</div>
                {/* Le lien est la DERNIÈRE ligne de la carte, et il pousse le texte vers
                    le haut (voir .hi-obj-txt) : les quatre cartes n'ont pas la même
                    longueur de description, et sans ça les liens se retrouvaient à trois
                    hauteurs différentes sur une même rangée. */}
                {o.lien && (
                  <a href={o.lien.href} className="hi-obj-lien">
                    {o.lien.mot}
                    {o.lien.verrou && <Verrou quoi={o.lien.verrou} />}
                    <Icon name="chevron-right" size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ce que le site fait : UNE phrase et UN lien, jamais un développement.
            Les huit cartes qui étaient ici sont devenues les portes de l'accueil. */}
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "30px 0 0", letterSpacing: ".2px", textAlign: "center" }}>
          Le site et le bot Discord partagent la même base.{" "}
          <Link href="/" className="hi-lien">Ce que le site sait faire, porte par porte</Link>.
        </p>

        {/* CTA — le vaisseau du générique du client, au mouillage sous un ciel
            orange : on embarque. Posé en fond du bloc et non à côté du texte, donc
            assombri et masqué aux lecteurs d'écran. */}
        <div className="vg-reveal hi-cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jeu/credits/shotcredit14.webp" alt="" aria-hidden="true" width={512} height={256} loading="lazy" decoding="async" />
          <div className="hi-cta-in">
            <div className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Prêt à nous rejoindre ?</div>
            {/* LA CONDITION FERME RESTE ICI, et seulement ici : c'est la dernière
                phrase avant le bouton, donc celle qu'on lit vraiment. L'accueil, qui
                la répétait une troisième fois sous ses capes de guilde, ne la porte
                plus — cette page est propriétaire des règles de la guilde. */}
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
              Présente-nous tes personnages et ce que tu cherches. On répond, même quand c&apos;est non.
              Une seule condition ferme : être joignable en vocal.
            </p>
            <a href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler maintenant</a>
          </div>
        </div>
      </div>

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ──
          Ces notes vivaient DANS le littéral de gabarit ci-dessous, c'est-à-dire
          dans le `<style>` servi au navigateur : 271 mots de raisonnement de
          développeur téléchargés par chaque visiteur. Sorties d'ici elles sont
          effacées à la compilation, et il n'y a plus à s'interdire l'accent grave
          qui referme le gabarit.

          .hi-siege — l'illustration flotte à gauche du paragraphe et le texte
          l'épouse : en bloc au-dessus, elle aurait repoussé la phrase d'accroche
          sous la ligne de flottaison. Sous 560 px elle passe au-dessus, centrée — un
          texte à moins de 200 px de large ne se lit plus.

          .hi-obj — une carte d'objectif : bande d'image en haut, pastille à cheval
          sur son bord bas, texte dessous. Le padding quitte la carte pour aller sur
          le texte seul, sinon l'image ne toucherait pas les bords. Et 30 px de
          padding en haut du texte : la pastille descend de 22 px sous l'image, le
          titre doit passer SOUS elle et non derrière.
          La carte est devenue une COLONNE FLEX, et son bloc de texte prend la hauteur qui
          reste : c'est la seule façon de coller les liens des quatre cartes sur la même
          ligne (margin-top:auto sur .hi-obj-lien). Les descriptions ne font pas la même
          longueur, et sans ça les quatre liens se posaient à quatre hauteurs — on ne
          voyait plus une rangée, mais un escalier. .hi-obj-vue garde son 2:1 grâce à
          flex-shrink:0, sinon la colonne l'écrasait pour faire tenir le texte.

          .hi-obj-vue — aspect-ratio 2/1 et non une hauteur fixe : les quatre vues
          employées ici (shotcredit11, 12, 13 et 16) font 512x256, donc exactement
          2:1, et une hauteur en pixels les aurait étirées dans une colonne qui se
          rétrécit. ATTENTION AVANT D'EN BRANCHER UNE AUTRE : le dossier n'est pas
          homogène — shotcredit00 à 10 font 1024x768 (4:3), seuls 11 à 16 sont en
          2:1. Une vue 4:3 posée ici serait recadrée d'un tiers par object-fit. Son voile ne décore pas :
          ces vues sont des paysages très colorés et la pastille orange s'y perdait —
          il éteint le bas de l'image, là où la pastille se pose.

          .hi-cta — le vaisseau du générique en fond du bloc « Prêt à nous
          rejoindre ». Deux voiles superposés, même raison qu'ailleurs sur le site :
          un aplat pour le contraste du texte, un halo orange pour rattacher à la
          charte. Sans l'aplat, aucun texte blanc ne tient sur un ciel orange. */}
      <style>{`
        .hi-intro{overflow:hidden}
        .hi-siege{float:left;margin:0 18px 10px 0;border-radius:12px;border:1px solid var(--border);
          object-fit:cover;box-shadow:0 4px 16px rgba(0,0,0,.4)}
        @media(max-width:560px){.hi-siege{float:none;display:block;margin:0 auto 16px}}
        .hi-obj{padding:0;overflow:hidden;display:flex;flex-direction:column}
        .hi-obj-vue{position:relative;aspect-ratio:2/1;overflow:hidden;flex-shrink:0}
        .hi-obj-vue img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.85) brightness(.78)}
        .hi-obj-vue::after{content:"";position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(180deg,rgba(10,10,12,.10) 0%,rgba(10,10,12,.30) 55%,rgba(10,10,12,.88) 100%)}
        .hi-obj-badge{position:absolute;left:16px;bottom:-22px;z-index:1;display:block}
        .hi-obj-txt{padding:30px 20px 20px;flex:1;display:flex;flex-direction:column}
        .hi-obj-lien{margin-top:auto;padding-top:12px;display:inline-flex;align-items:center;gap:6px;
          align-self:flex-start;text-decoration:none;color:var(--orange);font-family:'Rubik',sans-serif;
          font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.7px}
        .hi-obj-lien:hover{color:var(--text)}
        .hi-obj-lien svg{transition:transform .15s}
        .hi-obj-lien:hover svg{transform:translateX(3px)}
        .hi-cta{position:relative;overflow:hidden;text-align:center;margin-top:30px;border-radius:16px;
          border:1px solid var(--orange-dark);background:#0b0b0f}
        .hi-cta img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 62%;
          filter:saturate(.7) brightness(.5)}
        .hi-cta::after{content:"";position:absolute;inset:0;pointer-events:none;background:
          radial-gradient(ellipse 70% 100% at 50% 50%, rgba(255,140,26,.14), transparent 72%),
          linear-gradient(180deg,rgba(11,11,15,.82),rgba(11,11,15,.90))}
        .hi-cta-in{position:relative;z-index:1;padding:34px 24px}

        .hi-lien{color:var(--orange);text-decoration:none;font-weight:600;border-bottom:1px dotted currentColor}
        .hi-lien:hover{color:var(--text)}
      `}</style>
    </div>
  );
}
