"use client";
import { Icon, type IconName } from "@/components/Icon";
import { Verrou } from "@/components/guides/Briques";

/**
 * LA GUILDE — ce qui était la page /histoire, devenu la section `#la-guilde` de l'accueil.
 *
 * Décision de Maxime : « je veux qu'une page accueil mais complète avec l'histoire ».
 * /histoire redirige ici pour toujours (308, next.config.js). La section est AFFICHÉE EN
 * ENTIER à deux endroits : sur l'accueil, où la ligne « La guilde » du menu d'un visiteur
 * vise cette ancre ; et en dernière section d'Information Guilde (/guilde#la-guilde),
 * la page des membres — ce sont les règles qu'ils ont acceptées en entrant, pas une
 * vitrine.
 *
 * Le texte de /histoire est conservé tel quel. Trois choses n'ont pas suivi :
 *  · son hero, doublon exact de celui de l'accueil ;
 *  · la phrase-renvoi « Le site et le bot Discord partagent la même base. Ce que le site
 *    sait faire, porte par porte » : elle menait d'une page à l'autre, et les portes sont
 *    désormais sur la même page ;
 *  · l'appel « Prêt à nous rejoindre ? », fusionné avec celui de l'accueil dans un seul
 *    bloc « Rejoindre », en bas de la vue visiteur — un membre n'a pas à postuler.
 *
 * `membre` (Information Guilde) : la phrase du hero (« Peu de membres, mais
 * présents… ») ouvre la section, puisque la page n'a pas de hero et que c'est la
 * présentation de la guilde ; et
 * le cadenas « membres » ne s'affiche plus sur un lien que le lecteur peut ouvrir.
 */

/** Pastille d'icône à la charte (carré arrondi, dégradé de lueur, icône d'accent). */
function IconBadge({ name, size = 56, icon = 26 }: { name: IconName; size?: number; icon?: number }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 14, color: "var(--gn-accent)",
      background: "linear-gradient(180deg,rgba(var(--gn-lueur-rgb),.22),rgba(var(--gn-lueur-rgb),.05))",
      border: "1px solid rgba(var(--gn-or-rgb),.32)", boxShadow: "0 0 16px rgba(var(--gn-lueur-rgb),.14)",
    }}>
      <Icon name={name} size={icon} strokeWidth={1.9} />
    </div>
  );
}

/**
 * Trois promesses, chacune avec une image du jeu qui la dit. La quatrième, « Un coffre qui
 * sert », est retirée le 2026-10-21 à la demande de Maxime : le site ne montre plus le coffre.
 *
 * Règle de la maison : sur une section qui n'est PAS propriétaire d'un sujet, une phrase
 * et un LIEN. Deux des trois mènent donc à la page qui tient leur sujet : le guide de
 * progression (/astuces) et les Chambres Secrètes (/compositions).
 *
 * LE CADENAS EST DIT AVANT LE CLIC : /compositions vit dans le groupe (guild), donc
 * « membres » ; /astuces est publique, donc rien.
 */
const objectifs: { icon: IconName; titre: string; desc: string; vue: string;
  lien?: { href: string; mot: string; verrou?: "membres" | "compte" | "en partie" } }[] = [
  {
    icon: "message", titre: "Vocal avant tout",
    desc: "Vocal pendant les runs : c'est là que les Chambres Secrètes se jouent.",
    // Une ville la nuit, fenêtres allumées : des gens rassemblés au même endroit.
    vue: "shotcredit16",
    // Pas de lien : celui des Chambres Secrètes est sur la carte qui leur est consacrée,
    // deux cases plus loin.
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
];

export function LaGuilde({ titre, membre = false }: { titre: React.ReactNode; membre?: boolean }) {
  return (
    // scrollMarginTop : le lien du menu et l'ancienne adresse /histoire arrivent ici ;
    // sans cette marge le titre se collait au bord haut de la zone qui défile.
    <section id="la-guilde" style={{ scrollMarginTop: 16 }}>
      {titre}

      {membre && (
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 0", letterSpacing: ".2px", maxWidth: 720 }}>
          Peu de membres, mais présents. Discord et vocal obligatoires — c&apos;est là qu&apos;on joue vraiment ensemble.
        </p>
      )}

      {/* L'illustration est `guildsiege.webp`, prise dans l'interface du client
          (200×200) : la SEULE image que le jeu donne d'une guilde en train de se battre
          — huit personnages de classes différentes qui chargent ensemble. Marquée
          aria-hidden, le texte dit déjà tout. */}
      <div className="glass-card vg-reveal hi-intro" style={{ padding: 28, marginTop: 18, borderLeft: "3px solid var(--gn-accent)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jeu/interface/guildsiege.webp" alt="" aria-hidden="true" width={104} height={104} className="hi-siege" />
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
          <b style={{ color: "var(--gn-accent)" }}>Présents</b>, ça veut dire : venir en vocal,
          prévenir quand on ne peut pas, et être là en Chambre Secrète.
          C&apos;est ce qui sépare une guilde d&apos;une liste de pseudos.
        </p>
      </div>

      {/* Les trois vues viennent de `public/jeu/credits/`, le générique du client : des
          paysages propres, sans logo d'éditeur ni barre de chargement incrustés.
          `alt=""` : le texte de la carte dit tout, l'image est l'ambiance. Le titre est
          un h3 : « Nos objectifs » était le h2 de /histoire, il est maintenant une partie
          de la section « La guilde ». */}
      <h3 className="font-heading vg-reveal" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", display: "flex", alignItems: "center", gap: 8, margin: "28px 0 14px" }}>
        <Icon name="target" size={16} />Nos objectifs
      </h3>
      <div className="hi-objs">
        {objectifs.map((o, i) => (
          <div key={o.titre} className="glass-card vg-reveal fx-card hi-obj" style={{ transitionDelay: `${i * 60}ms` }}>
            <div className="hi-obj-vue">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/jeu/credits/${o.vue}.webp`} alt="" aria-hidden="true" width={512} height={256} loading="lazy" decoding="async" />
              {/* Un div et non un span : IconBadge rend un div, et un div dans un span
                  est du HTML invalide — le rendu serveur et l'hydratation peuvent alors
                  ne pas produire le même arbre. */}
              <div className="hi-obj-badge"><IconBadge name={o.icon} size={44} icon={21} /></div>
            </div>
            <div className="hi-obj-txt">
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{o.titre}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>{o.desc}</div>
              {o.lien && (
                <a href={o.lien.href} className="hi-obj-lien">
                  {o.lien.mot}
                  {o.lien.verrou && !membre && <Verrou quoi={o.lien.verrou} />}
                  <Icon name="chevron-right" size={13} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ── (reprise de /histoire)

          .hi-siege — l'illustration flotte à gauche du paragraphe et le texte l'épouse :
          en bloc au-dessus, elle aurait repoussé la phrase d'accroche. Sous 560 px elle
          passe au-dessus, centrée — un texte à moins de 200 px de large ne se lit plus.

          .hi-obj — une carte d'objectif : bande d'image en haut, pastille à cheval sur
          son bord bas, texte dessous. Le padding quitte la carte pour aller sur le texte
          seul, sinon l'image ne toucherait pas les bords. 30 px de padding en haut du
          texte : la pastille descend de 22 px sous l'image, le titre passe SOUS elle.
          La carte est une COLONNE FLEX et son texte prend la hauteur qui reste : c'est la
          seule façon de coller les liens des cartes sur la même ligne
          (margin-top:auto sur .hi-obj-lien). .hi-obj-vue garde son 2:1 grâce à
          flex-shrink:0.

          .hi-obj-vue — SANS overflow:hidden : la pastille déborde de 22 px sous l'image,
          c'est voulu, et la bande la coupait de moitié (mesuré : pastille 1 658-1 702,
          image jusqu'à 1 680). L'image remplit sa bande au pixel, et ce sont les coins
          de la carte (.hi-obj) qui la rognent.
          Aspect-ratio 2/1 et non une hauteur fixe : les vues
          (shotcredit11, 12 et 16) font 454x256 — rognées le 2026-10-21 : le client
          les livrait en 512 de large avec 58 colonnes NOIRES à droite, qui faisaient une
          bande noire sur chaque carte. Le cover remplit la bande 2/1 sans elle. ATTENTION AVANT D'EN BRANCHER UNE
          AUTRE : shotcredit00 à 10 font 1024x768 (4:3), seuls 11 à 16 sont en 2:1. Le
          voile éteint le bas de l'image, là où la pastille se pose.

          .hi-objs — 940 px au plus, centrée : les trois cartes sur une ligne au bureau,
          une par ligne au téléphone. (À 760 px, deux colonnes laissaient la troisième seule.)
          Ses enfants portent min-width:0 : un enfant de grille ne descend pas sous la
          largeur de son contenu, et un titre un peu long élargissait la colonne. */}
      <style>{`
        .hi-intro{overflow:hidden}
        .hi-siege{float:left;margin:0 18px 10px 0;border-radius:12px;border:1px solid var(--border);
          object-fit:cover;box-shadow:0 4px 16px rgba(0,0,0,.4)}
        @media(max-width:560px){.hi-siege{float:none;display:block;margin:0 auto 16px}}
        .hi-objs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;align-items:stretch;max-width:940px;margin:0 auto}
        .hi-objs>*{min-width:0}
        .hi-obj{padding:0;overflow:hidden;display:flex;flex-direction:column}
        .hi-obj-vue{position:relative;aspect-ratio:2/1;flex-shrink:0}
        .hi-obj-vue img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.85) brightness(.78)}
        .hi-obj-vue::after{content:"";position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(180deg,rgba(10,10,12,.10) 0%,rgba(10,10,12,.30) 55%,rgba(10,10,12,.88) 100%)}
        .hi-obj-badge{position:absolute;left:16px;bottom:-22px;z-index:1;display:block}
        .hi-obj-txt{padding:30px 20px 20px;flex:1;display:flex;flex-direction:column}
        .hi-obj-lien{margin-top:auto;padding-top:12px;display:inline-flex;align-items:center;gap:6px;
          align-self:flex-start;text-decoration:none;color:var(--gn-accent);font-family:'Rubik',sans-serif;
          font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.7px}
        .hi-obj-lien:hover{color:var(--text)}
        .hi-obj-lien svg{transition:transform .15s}
        .hi-obj-lien:hover svg{transform:translateX(3px)}
      `}</style>
    </section>
  );
}
