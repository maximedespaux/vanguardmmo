"use client";
import { useEffect, useRef } from "react";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";

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
  ["trending-up", "Progression collective", "Accompagner chaque membre du P3 au P10 avec un guide pas-à-pas et de l'entraide."],
  ["key", "Chambres Secrètes optimisées", "Monter des compositions optimales pour farmer efficacement le end-game."],
  ["swords", "Guild Siege (PvP)", "Représenter Vanguard lors des affrontements de guilde, dans la cohésion."],
  ["vault", "Entraide & partage", "Un coffre de guilde commun pour aider les membres à s'équiper."],
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
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".vg-reveal"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ paddingBottom: 60 }}>
      <HeroFlyff />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
        {/* Intro */}
        <div className="glass-card vg-reveal" style={{ padding: 28, marginTop: 32, borderLeft: "3px solid var(--orange)" }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
            Que tu sois nouveau au niveau 200 prestige 3 ou un vétéran prestige 10, tu trouveras ici un cadre clair,
            de l'entraide et des outils pour avancer <b style={{ color: "var(--orange)" }}>sans t'éparpiller</b>. Vanguard, c'est avant tout une équipe soudée.
          </p>
        </div>

        {/* Bandeau de stats */}
        <div className="vg-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 18 }}>
          {stats.map(([ic, n, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
              <IconBadge name={ic} size={42} icon={20} />
              <div>
                <div className="font-heading" style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{n}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>{l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Objectifs */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "40px 0 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "var(--orange)" }}><Icon name="target" size={26} /></span> Nos objectifs
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {objectifs.map(([ic, t, d], i) => (
            <div key={t} className="glass-card vg-reveal" style={{ padding: 22, position: "relative", overflow: "hidden", transitionDelay: `${i * 60}ms` }}>
              <div style={{ marginBottom: 12 }}><IconBadge name={ic} /></div>
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* Fonctionnalités */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "44px 0 6px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "var(--orange)" }}><Icon name="settings" size={26} /></span> Les fonctionnalités du site
        </h2>
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px", letterSpacing: ".2px" }}>
          Un site et un bot Discord qui partagent la même base — ce qui se passe ici se retrouve sur Discord, et inversement.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          {features.map(([ic, t, d], i) => (
            <div key={t} className="vg-reveal" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, transition: "border-color .15s, transform .15s", transitionDelay: `${i * 45}ms` }}>
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
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>Dépose ta candidature avec tes persos, ton stuff et tes objectifs.</p>
          <a href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler maintenant</a>
        </div>
      </div>
    </div>
  );
}
