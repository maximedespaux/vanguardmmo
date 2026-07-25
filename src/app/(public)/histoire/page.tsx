"use client";
import { useRef } from "react";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";

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

const stats: [IconName, string, string][] = [
  ["users", "8", "classes jouables"],
  ["map", "23", "donjons référencés"],
  ["trending-up", "P3 → P10", "accompagnement"],
  ["vault", "1", "coffre commun"],
];

const objectifs: [IconName, string, string][] = [
  ["message", "Vocal avant tout", "Discord obligatoire, vocal pendant les runs. C'est là que les Chambres Secrètes se jouent — et que le groupe devient une équipe."],
  ["trending-up", "Personne ne reste bloqué", "Du prestige 3 au 10, on avance ensemble : guide par palier, conseils de stuff, et quelqu'un pour répondre."],
  ["key", "Chambres Secrètes sérieuses", "Des compositions préparées à l'avance, des présences annoncées. On y va pour réussir, pas pour tenter."],
  ["vault", "Un coffre qui sert", "Le stock de la guilde est là pour équiper les membres, pas pour dormir. Tu demandes, on répond."],
];

const features: [IconName, string, string][] = [
  ["clipboard", "Candidature en ligne", "Profil, spés, stuff et objectifs — transmis automatiquement au staff sur Discord."],
  ["sword", "AirBuilder", "Compose ton équipement complet (perçage, sertissage, runes, sets, fées, familiers)."],
  ["star", "Calculateur de prestige", "Suis ton farm palier par palier, ressources cumulées entre deux prestiges."],
  ["map", "Wiki des 23 donjons", "Drops, PV, prestige et élément + suivi quotidien de tes runs et world boss."],
  ["graduation", "Guide de progression", "Le guide complet par palier de prestige pour ne jamais rester bloqué."],
  ["puzzle", "Compositions", "Chambres Secrètes optimales avec présences, et Guild Siege en équipe libre."],
  ["vault", "Coffre & banque", "Parcours le coffre, demande un objet ou une dette, suis tes remboursements."],
  ["users", "Suivi de guilde", "Dashboard temps réel : membres, persos, builds publiés, dettes et activité."],
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
        {/* Intro */}
        <div className="glass-card vg-reveal" style={{ padding: 28, marginTop: 32, borderLeft: "3px solid var(--orange)" }}>
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
          <Icon name="target" framed frameSize={34} tone="gold" /> <span className="vg-h2">Nos objectifs</span>
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
          <Icon name="settings" framed frameSize={34} tone="gold" /> <span className="vg-h2">Les fonctionnalités du site</span>
        </h2>
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px", letterSpacing: ".2px" }}>
          Un site et un bot Discord qui partagent la même base — ce qui se passe ici se retrouve sur Discord, et inversement.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          {features.map(([ic, t, d], i) => (
            <div key={t} className="vg-reveal fx-card" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, transitionDelay: `${i * 45}ms` }}>
              <IconBadge name={ic} size={44} icon={22} />
              <div>
                <div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>{t}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{d}</div>
              </div>
            </div>
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
    </div>
  );
}
