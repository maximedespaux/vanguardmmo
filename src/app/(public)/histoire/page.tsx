"use client";
import { useEffect, useRef } from "react";
import { HeroFlyff } from "@/components/HeroFlyff";

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

  const objectifs = [
    ["🚀", "Progression collective", "Accompagner chaque membre du P3 au P10 avec un guide pas-à-pas et de l'entraide."],
    ["🗝️", "Chambres Secrètes optimisées", "Monter des compositions optimales pour farmer efficacement le end-game."],
    ["⚔️", "Guild Siege (PvP)", "Représenter Vanguard lors des affrontements de guilde, dans la cohésion."],
    ["🏦", "Entraide & partage", "Un coffre de guilde commun pour aider les membres à s'équiper."],
  ];
  const features = [
    ["📋", "Candidature en ligne", "Profil, stuff et objectifs, soumis automatiquement sur Discord."],
    ["⚔️", "Stuff Builder", "Compose et partage ton équipement, avec rareté d'armes."],
    ["🌟", "Calculateur de prestige", "Suis ton farm palier par palier."],
    ["🗺️", "Wiki des 23 donjons", "Drops, PV, prestige + suivi quotidien de tes runs."],
    ["🎓", "Guide de progression", "Le guide complet par prestige (par Sugot)."],
    ["🧩", "Compositions", "CS optimale avec présences, et Guild Siege libre."],
  ];
  return (
    <div ref={ref} style={{ paddingBottom: 60 }}>
      <HeroFlyff />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
        {/* Intro */}
        <div className="glass-card vg-reveal" style={{ padding: 28, marginTop: 32, borderLeft: "3px solid var(--orange)" }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)" }}>
            Que tu sois nouveau au niveau 200 prestige 3 ou un vétéran prestige 10, tu trouveras ici un cadre clair,
            de l'entraide et des outils pour avancer <b style={{ color: "var(--orange)" }}>sans t'éparpiller</b>. Vanguard, c'est avant tout une équipe soudée.
          </p>
        </div>

        {/* Objectifs */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "40px 0 18px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "var(--orange)" }}>🎯</span> Nos objectifs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {objectifs.map(([ic, t, d], i) => (
            <div key={t} className="glass-card vg-reveal" style={{ padding: 22, transition: "all .15s", position: "relative", overflow: "hidden", transitionDelay: `${i * 60}ms` }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{ic}</div>
              <div className="font-heading" style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* Fonctionnalités */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "40px 0 18px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "var(--orange)" }}>⚙️</span> Les fonctionnalités du site</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          {features.map(([ic, t, d], i) => (
            <div key={t} className="vg-reveal" style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, transitionDelay: `${i * 55}ms` }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{ic}</div>
              <div><div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>{t}</div><div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>{d}</div></div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="vg-reveal" style={{ textAlign: "center", marginTop: 44, padding: 32, background: "radial-gradient(circle at 50% 50%, rgba(255,140,26,0.08), transparent 70%)", borderRadius: 16, border: "1px solid var(--orange-dark)" }}>
          <div className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Prêt à nous rejoindre ?</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18 }}>Dépose ta candidature avec tes persos, ton stuff et tes objectifs.</p>
          <a href="/candidature" className="vg-btn">📋 Postuler maintenant</a>
        </div>
      </div>
    </div>
  );
}
