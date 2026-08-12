"use client";
import { useRef } from "react";
import Link from "next/link";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";
import { CLASS_NAMES } from "@/data/classes";
import dungeons from "@/data/dungeons.json";

const DONJONS = dungeons as unknown[];

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
 * Les chiffres se COMPTENT.
 *
 * « 8 classes jouables » et « 23 donjons référencés » étaient écrits à la main,
 * ici et sur l'accueil — quatre nombres recopiés dans deux fichiers, qui
 * n'avaient aucun moyen de rester d'accord. Ils se lisent maintenant dans les
 * mêmes données que les pages qui les affichent en détail : `data/classes.ts` et
 * `data/dungeons.json`. Ce sont les deux seuls chiffres comptables de la liste ;
 * « P3 → P10 » et « 1 coffre » ne se comptent pas, ils se décident.
 */
const stats: [IconName, string, string][] = [
  ["users", String(CLASS_NAMES.length), "classes jouables"],
  ["map", String(DONJONS.length), "donjons référencés"],
  ["trending-up", "P3 → P10", "accompagnement"],
  ["vault", "1", "coffre commun"],
];

const objectifs: [IconName, string, string][] = [
  ["message", "Vocal avant tout", "Discord obligatoire, vocal pendant les runs. C'est là que les Chambres Secrètes se jouent — et que le groupe devient une équipe."],
  ["trending-up", "Personne ne reste bloqué", "Du prestige 3 au 10, on avance ensemble : guide par palier, conseils de stuff, et quelqu'un pour répondre."],
  ["key", "Chambres Secrètes sérieuses", "Des compositions préparées à l'avance, des présences annoncées. On y va pour réussir, pas pour tenter."],
  ["vault", "Un coffre qui sert", "Le stock de la guilde est là pour équiper les membres, pas pour dormir. Tu demandes, on répond."],
];

/**
 * Les fonctionnalités du site — et, depuis peu, un LIEN pour chacune.
 *
 * Huit cartes qui décrivaient huit outils sans mener à aucun : la page qui doit
 * donner envie d'entrer était un cul-de-sac, et il fallait repasser par le menu
 * pour essayer ce qu'on venait de lire.
 *
 * `membres` marque ce qui exige d'être de la guilde. Ces pages vivent dans le
 * groupe (guild) et passent par `requireGuild()` : en production, un visiteur qui
 * clique atterrit sur `/login`, pas sur la page. Le dire avant le clic, c'est la
 * différence entre une promesse et un mur.
 *
 * Le libellé « Compositions » a disparu : la page s'appelle CHAMBRES SECRÈTES
 * depuis la refonte (son adresse, elle, n'a pas bougé). Le menu et la page
 * disaient déjà le nouveau nom ; celle-ci était la dernière à garder l'ancien.
 */
const features: { icon: IconName; titre: string; desc: string; href: string; membres?: boolean }[] = [
  { icon: "clipboard", titre: "Candidature en ligne", desc: "Profil, spés, stuff et objectifs — transmis automatiquement au staff sur Discord.", href: "/candidature" },
  { icon: "sword", titre: "AirBuilder", desc: "Compose ton équipement complet (perçage, sertissage, runes, sets, fées, familiers).", href: "/builder" },
  { icon: "star", titre: "Calculateur de prestige", desc: "Suis ton farm palier par palier, ressources cumulées entre deux prestiges.", href: "/prestige" },
  { icon: "map", titre: `Wiki des ${DONJONS.length} donjons`, desc: "Drops, PV, prestige et élément, la Tour Oubliée et les vagues de l'Oasis.", href: "/donjons" },
  { icon: "graduation", titre: "Guide de progression", desc: "Le guide complet par palier de prestige pour ne jamais rester bloqué.", href: "/astuces" },
  { icon: "puzzle", titre: "Chambres Secrètes", desc: "Des compositions préparées avec les présences, et le Guild Siege en équipe libre.", href: "/compositions", membres: true },
  { icon: "vault", titre: "Coffre & boutique", desc: "Parcours le coffre, demande un objet, et discute-en directement avec le staff.", href: "/boutique", membres: true },
  { icon: "users", titre: "Suivi de guilde", desc: "Tableau de bord : membres, persos, builds publiés et activité.", href: "/dashboard", membres: true },
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
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
            On ne cherche pas à être nombreux. On cherche des joueurs <b style={{ color: "var(--orange)" }}>présents</b> :
            qui viennent en vocal, qui préviennent quand ils ne peuvent pas, et sur qui on peut compter en Chambre Secrète.
            Le <b style={{ color: "var(--orange)" }}>Discord et le vocal sont obligatoires</b> — c'est ce qui sépare une guilde
            d'une simple liste de pseudos. Que tu arrives au prestige 3 ou que tu sois déjà P10, tu trouveras ici un cadre clair
            et de quoi progresser <b style={{ color: "var(--orange)" }}>sans t'éparpiller</b>.
          </p>
        </div>

        {/* Bandeau de stats */}
        <div className="vg-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 18 }}>
          {stats.map(([ic, n, l]) => (
            <div key={l} className="fx-stat fx-card">
              <IconBadge name={ic} size={42} icon={20} />
              <div>
                <div className="n">{n}</div>
                <div className="l">{l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Objectifs */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "40px 0 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="target" framed frameSize={34} tone="orange" /> <span className="vg-h2">Nos objectifs</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, alignItems: "stretch", maxWidth: 760, margin: "0 auto" }}>
          {objectifs.map(([ic, t, d], i) => (
            <div key={t} className="glass-card vg-reveal fx-card" style={{ padding: 22, overflow: "hidden", transitionDelay: `${i * 60}ms` }}>
              <div style={{ marginBottom: 12 }}><IconBadge name={ic} /></div>
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* Fonctionnalités */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "44px 0 6px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="settings" framed frameSize={34} tone="orange" /> <span className="vg-h2">Les fonctionnalités du site</span>
        </h2>
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px", letterSpacing: ".2px" }}>
          Un site et un bot Discord qui partagent la même base — ce qui se passe ici se retrouve sur Discord, et inversement.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          {features.map((f, i) => (
            <Link key={f.titre} href={f.href} className="vg-reveal fx-card hi-feat" style={{ transitionDelay: `${i * 45}ms` }}>
              <IconBadge name={f.icon} size={44} icon={22} />
              <div style={{ minWidth: 0 }}>
                <div className="font-heading" style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  {f.titre}
                  {/* Le cadenas du client (lock.webp) plutôt qu'une icône maison : le
                      jeu s'en sert exactement pour ça — ce qui n'est pas encore
                      ouvert — et un joueur le reconnaît sans légende. */}
                  {f.membres && (
                    <span className="hi-verrou" title="Réservé aux membres de la guilde">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/jeu/interface/lock.webp" alt="" width={10} height={12} />
                      membres
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
              <Icon name="arrow-right" size={15} className="hi-feat-fl" />
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="vg-reveal" style={{ textAlign: "center", marginTop: 46, padding: 34, background: "radial-gradient(circle at 50% 50%, rgba(255,140,26,0.10), transparent 70%)", borderRadius: 16, border: "1px solid var(--orange-dark)" }}>
          <div className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Prêt à nous rejoindre ?</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
            Présente-nous tes personnages, ton stuff et ce que tu cherches. On lit tout, et on répond — même quand c&apos;est non.
            Une seule condition ferme : être joignable en vocal sur Discord.
          </p>
          <a href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler maintenant</a>
        </div>
      </div>

      <style>{`
        /* L'illustration flotte a gauche du paragraphe et le texte l'epouse : en
           bloc au-dessus, elle aurait repousse la phrase d'accroche sous la ligne
           de flottaison. Sous 560 px elle passe au-dessus, centree — un texte a
           moins de 200 px de large ne se lit plus. */
        .hi-intro{overflow:hidden}
        .hi-siege{float:left;margin:0 18px 10px 0;border-radius:12px;border:1px solid var(--border);
          object-fit:cover;box-shadow:0 4px 16px rgba(0,0,0,.4)}
        @media(max-width:560px){.hi-siege{float:none;display:block;margin:0 auto 16px}}

        /* Les huit cartes de fonctionnalite sont devenues des LIENS : couleur et
           soulignement explicites, sinon les huit titres passent en bleu souligne. */
        .hi-feat{display:flex;gap:14px;align-items:flex-start;background:var(--bg-2);
          border:1px solid var(--border);border-radius:12px;padding:16px;
          text-decoration:none;color:var(--text);transition:border-color .18s,transform .18s}
        .hi-feat:hover{border-color:rgba(255,140,26,.45);transform:translateY(-2px)}
        /* La fleche ne bouge qu'au survol : affichee en permanence, huit fleches
           immobiles ajoutent du bruit sans rien dire de plus que le curseur. */
        .hi-feat-fl{margin-left:auto;flex-shrink:0;align-self:center;color:var(--orange);
          opacity:0;transform:translateX(-4px);transition:opacity .18s,transform .18s}
        .hi-feat:hover .hi-feat-fl{opacity:1;transform:none}
        .hi-verrou{display:inline-flex;align-items:center;gap:3px;font-size:10px;text-transform:uppercase;
          letter-spacing:.6px;color:var(--text-muted);font-family:'Alef',sans-serif;font-weight:400}
        .hi-verrou img{width:10px;height:12px;object-fit:contain;image-rendering:pixelated;opacity:.85}
      `}</style>
    </div>
  );
}
