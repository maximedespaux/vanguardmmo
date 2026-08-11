"use client";
import { Suspense, useRef } from "react";
import Link from "next/link";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";
import { AvisAcces } from "@/components/accueil/AvisAcces";
import { BandeauCartes } from "@/components/accueil/BandeauCartes";
import { ClassesHeros } from "@/components/accueil/ClassesHeros";
import { PortesSite } from "@/components/accueil/PortesSite";

/**
 * L'accueil du site.
 *
 * Il n'existait pas : `/` renvoyait directement sur `/histoire`, la page qui
 * raconte la guilde. Deux ennuis de cette redirection, que cette page corrige.
 * D'abord la première impression ne montrait rien du JEU alors qu'on dispose
 * maintenant de son imagerie officielle. Ensuite le `?error=` posé par le
 * middleware quand une page se refuse partait à la poubelle avec la redirection.
 *
 * Elle ne remplace pas `/histoire` et n'en recopie rien : ici c'est AirFlyff et
 * ce que le site en sait ; là-bas c'est qui on est et ce qu'on attend. Le lien y
 * mène, deux fois.
 *
 * Elle est PUBLIQUE : aucune donnée de session, aucun compteur de membres, aucun
 * nom de joueur. Tout ce qu'elle affiche est soit un fichier du client du jeu,
 * soit un chiffre lisible dans les données déjà versées au dépôt.
 */

/** Chiffres du site, tous vérifiables dans le dépôt — pas des slogans. */
const CHIFFRES: [IconName, string, string][] = [
  ["users", "8", "spécialisations de fin de partie"],
  ["skull", "23", "instances documentées"],
  ["package", "4 970", "objets dont on sait la provenance"],
  ["tower", "52", "paliers de la Tour Infernale"],
];

/** Les 20 logos de cape que le jeu propose aux guildes (24×24 dans le client). */
const CAPES = Array.from({ length: 20 }, (_, i) => `cape-logo-${String(i + 1).padStart(2, "0")}.webp`);

export function PageAccueil() {
  const ref = useRef<HTMLDivElement>(null);
  // Révélation au défilement, avec le repli de useReveal : sans lui, un élément
  // raté par l'observateur reste invisible pour de bon.
  useReveal(ref);
  // Halo au curseur sur les .fx-card (cartes de classe et portes).
  useCardFx();

  return (
    <div ref={ref} style={{ paddingBottom: 64 }}>
      <HeroFlyff />

      <div className="acc-wrap">
        {/* useSearchParams force le rendu dynamique s'il n'est pas isolé : sous
            Suspense, le reste de l'accueil reste prérendu en statique. */}
        <Suspense fallback={null}><AvisAcces /></Suspense>

        {/* ── Le jeu, avec ses propres images en fond ── */}
        <BandeauCartes>
          <div className="vg-reveal">
            <div className="font-heading" style={{ fontSize: 13, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--orange)" }}>
              Serveur privé AirFlyff
            </div>
            <h2 className="font-heading" style={{ fontSize: "clamp(22px,3.4vw,30px)", margin: "8px 0 12px", letterSpacing: .5 }}>
              On a ouvert le jeu, et on a tout mis ici
            </h2>
            <p style={{ margin: 0, maxWidth: 620, fontSize: 15, lineHeight: 1.75, color: "#d9d9e2" }}>
              Les instances, leurs butins, la provenance de chaque objet, le coût des paliers de prestige :
              tout vient des fichiers du client d&apos;AirFlyff, pas d&apos;un forum recopié.
              Tu peux <b style={{ color: "var(--orange)" }}>tout consulter sans compte</b> — la connexion Discord
              ne sert qu&apos;à ce qui t&apos;appartient : tes persos, tes builds, tes commandes.
            </p>
            {/* Une réserve qu'on ne cache pas : le butin ordinaire des monstres est
                calculé par le serveur, il n'est pas dans le client. Ne pas le dire
                laisserait croire qu'une absence de source veut dire « ça ne tombe pas ». */}
            <p style={{ margin: "12px 0 0", maxWidth: 620, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", fontFamily: "'Alef',sans-serif" }}>
              Une limite honnête : le butin ordinaire des monstres est calculé par le serveur et n&apos;est pas
              dans le client. Quand une source manque, ça ne veut pas dire que l&apos;objet ne tombe pas.
            </p>
          </div>
        </BandeauCartes>

        <div className="vg-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 14 }}>
          {CHIFFRES.map(([ic, n, l]) => (
            <div key={l} className="fx-stat fx-card">
              <span style={{
                width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 12, color: "var(--orange)", border: "1px solid rgba(255,140,26,.32)",
                background: "linear-gradient(180deg,rgba(255,140,26,.22),rgba(255,140,26,.05))",
              }}>
                <Icon name={ic} size={19} />
              </span>
              <div>
                {/* tabular-nums : « 4 970 » et « 8 » côte à côte sautaient d'un pixel
                    au survol quand les chiffres n'ont pas la même largeur. */}
                <div className="n" style={{ fontVariantNumeric: "tabular-nums" }}>{n}</div>
                <div className="l">{l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Les huit classes, avec l'emblème du jeu ── */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "46px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="swords" framed frameSize={34} tone="orange" /> <span className="vg-h2">Les huit fins de partie</span>
        </h2>
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 }}>
          Chaque classe a son emblème de héros dans le jeu. Ce sont ceux-là, tels que le client les affiche —
          avec l&apos;arme qu&apos;AirFlyff leur autorise et la classe dont elles viennent.
        </p>
        <ClassesHeros />

        {/* ── Par où entrer ── */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "46px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="compass-rose" framed frameSize={34} tone="orange" /> <span className="vg-h2">Par où commencer</span>
        </h2>
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 }}>
          Quatre portes ouvertes à tout le monde, membre ou pas.
        </p>
        <PortesSite />

        {/* ── Rejoindre ── */}
        <div className="vg-reveal" style={{
          marginTop: 46, padding: "34px 28px", borderRadius: 16, textAlign: "center",
          border: "1px solid var(--orange-dark)",
          background: "radial-gradient(circle at 50% 30%, rgba(255,140,26,.11), transparent 70%)",
        }}>
          {/* Les logos de cape du jeu : la seule image que le client donne d'une
              GUILDE. Purement décoratifs, donc masqués aux lecteurs d'écran, et
              enfermés dans un conteneur qui coupe le dépassement. */}
          {/* 20 logos de 24 px + 8 px d'écart = 640 px : à 480 la frise cassait en
              15 + 5, ce qui ressemblait à un oubli plutôt qu'à une frise. */}
          <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", maxWidth: 660, margin: "0 auto 22px", opacity: .55 }}>
            {CAPES.map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c} src={`/jeu/mecaniques/${c}`} alt="" width={24} height={24} loading="lazy" style={{ imageRendering: "pixelated" }} />
            ))}
          </div>
          <div className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Vanguard, c&apos;est une de ces capes
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 auto 22px", maxWidth: 560, lineHeight: 1.7 }}>
            Peu de membres, mais présents. Discord et vocal obligatoires — c&apos;est la seule condition ferme.
            Lis d&apos;abord ce qu&apos;on attend, puis présente-nous tes personnages.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler</Link>
            <Link href="/histoire" className="acc-lien-2"><Icon name="book" size={16} /> La guilde et ses règles</Link>
          </div>
        </div>
      </div>

      <style>{`
        .acc-wrap{max-width:1040px;margin:0 auto;padding:0 32px}
        .acc-lien-2{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:10px;
          font-family:'Rubik',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:13px;
          text-decoration:none;color:var(--text);background:var(--bg-3);border:1px solid var(--border)}
        .acc-lien-2:hover{border-color:rgba(255,140,26,.45);color:var(--orange)}
        /* Les 32px de marge du conteneur ne laissaient que 296px de contenu sur un
           écran de 360 : les cartes de classe en demandent 215 minimum, la grille
           tentait deux colonnes et débordait. On rend la marge à la page. */
        @media(max-width:640px){.acc-wrap{padding:0 16px}}
      `}</style>
    </div>
  );
}
