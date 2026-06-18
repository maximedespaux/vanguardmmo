"use client";
import { useState, useEffect } from "react";
import { QUIZ } from "@/data/quiz";
import { PageHeader } from "@/components/PageHeader";

const CLASSES = ["Spadassin","Templier","Arcaniste","Envouteur","Arbalétrier","Sylphide","Primat","Chanoine"];
const SPECS = [{k:"PVE",l:"🌾 PvE / Farm"},{k:"PVP",l:"🏆 PvP & Boss"},{k:"CS",l:"🗝️ Chambres Secrètes"}];
const STEP_NAMES = ["Profil","Spés","Stuff","Quiz","Récap"];
const WIKI_URL = "https://wiki.airflyff.com"; // ⚠️ à remplacer par le vrai wiki du serveur

type Char = { name: string; cls: string; prestige: number };

export default function CandidaturePage() {
  const [step, setStep] = useState(1);
  const [chars, setChars] = useState<Char[]>([{ name: "", cls: "Spadassin", prestige: 3 }]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [csChars, setCsChars] = useState(1);              // 1 ou 2 persos en CS
  const [favClasses, setFavClasses] = useState<string[]>([]); // classes à mettre en avant
  const [interests, setInterests] = useState("");
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [buildExport, setBuildExport] = useState<any>(null);
  // Reprend automatiquement le dernier build exporté depuis le Stuff Builder (localStorage)
  useEffect(() => {
    try { setBuildExport(JSON.parse(localStorage.getItem("vg_build_export") || "null")); } catch { /* ignore */ }
  }, [showBuilder]);
  // Capture instantanée du build validé depuis l'iframe AirBuilder (postMessage).
  useEffect(() => {
    const h = (e: MessageEvent) => { if (e.data && e.data.type === "vg_build" && e.data.data) setBuildExport(e.data.data); };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);
  // Quiz — doit être 100% juste
  const [qa, setQa] = useState<(number | null)[]>(Array(QUIZ.length).fill(null));
  const [qFeedback, setQFeedback] = useState<string | null>(null);
  const [quizOk, setQuizOk] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { fetch("/api/characters").then((r) => setAuthed(r.ok)).catch(() => setAuthed(false)); }, []);

  // Build réellement exporté depuis le Stuff Builder (la case à cocher seule ne suffit plus).
  const stuffOk = !!buildExport;
  const valid = chars.every(c => c.name.trim()) && specs.length > 0 && interests.trim() && motivation.trim() && experience.trim() && stuffOk && quizOk;

  const toggleSpec = (k: string) => setSpecs(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  const toggleFav = (c: string) => setFavClasses(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);

  function validateQuiz() {
    if (qa.includes(null)) { setQFeedback("⚠️ Réponds à toutes les questions."); return; }
    const wrong = qa.map((a, i) => a === QUIZ[i].a ? -1 : i).filter(i => i >= 0);
    if (wrong.length === 0) { setQuizOk(true); setQFeedback(null); return; }
    // reset les mauvaises réponses, on recommence jusqu'à 100%
    setQa(prev => prev.map((a, i) => wrong.includes(i) ? null : a));
    setQFeedback(`❌ ${wrong.length} réponse(s) fausse(s). Recommence les questions effacées — besoin d'aide ? Consulte le wiki du serveur.`);
  }

  async function submit() {
    setError(""); setSending(true);
    try {
      const r = await fetch("/api/application", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chars, specs, csChars, favClasses, interests, motivation, experience, stuffMode: "build", build: buildExport, quizScore: QUIZ.length, quizTotal: QUIZ.length }) });
      if (!r.ok) {
        setError(r.status === 401 ? "Tu dois être connecté avec Discord pour postuler." : "Échec de l'envoi — réessaie dans un instant.");
        return;
      }
      setSent(true);
    } catch {
      setError("Erreur réseau — vérifie ta connexion et réessaie.");
    } finally {
      setSending(false);
    }
  }

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 };
  const btnG: React.CSSProperties = { padding: "11px 22px", borderRadius: 8, background: "var(--bg-3)", color: "var(--text)", border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer" };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 13px", color: "var(--text)", width: "100%" };
  const canNext = (s: number) => s === 1 ? chars.every(c => c.name.trim()) : s === 2 ? specs.length > 0 && interests.trim() && motivation.trim() && experience.trim() && (!specs.includes("CS") || favClasses.length > 0) : s === 3 ? stuffOk : s === 4 ? quizOk : true;

  // ── Connexion Discord d'abord (la soumission l'exige de toute façon) ──
  if (authed === null) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Vérification de ta connexion…</div>;
  if (authed === false) return (
    <div style={{ padding: 40, maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <h1 className="font-heading" style={{ fontSize: 30, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Candidature 📋</h1>
      <div className="glass-card" style={{ padding: 28, marginTop: 20 }}>
        <p style={{ color: "var(--text)", marginBottom: 18 }}>Connecte-toi avec Discord pour postuler — c'est la première étape.</p>
        <a href="/login" className="vg-btn">Se connecter avec Discord</a>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-candidature.png" icon="📋" title="Candidature" subtitle="Tout est obligatoire. Ta candidature sera transmise au staff sur Discord avec ton profil, ton stuff et tes objectifs." />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {STEP_NAMES.map((n, i) => (
          <div key={n} style={{ flex: 1, textAlign: "center", padding: "9px 8px", borderRadius: 9, fontFamily: "'Rajdhani',sans-serif", fontSize: 12.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", border: `1px solid ${step === i + 1 ? "var(--orange)" : "var(--border)"}`, background: step === i + 1 ? "rgba(255,140,26,0.12)" : "var(--bg-3)", color: step > i + 1 ? "var(--green)" : step === i + 1 ? "var(--orange)" : "var(--text-muted)" }}>{step > i + 1 ? "✓ " : ""}{i + 1}. {n}</div>
        ))}
      </div>

      {step === 1 && (
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", marginBottom: 12 }}>👤 Tes personnages</h2>
          {chars.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input placeholder="Nom du perso" value={c.name} onChange={e => { const n = [...chars]; n[i].name = e.target.value; setChars(n); }} style={{ ...inp, flex: 2 }} />
              <select value={c.cls} onChange={e => { const n = [...chars]; n[i].cls = e.target.value; setChars(n); }} className="vg-select" style={{ flex: 1 }}>{CLASSES.map(cl => <option key={cl}>{cl}</option>)}</select>
              <select value={c.prestige} onChange={e => { const n = [...chars]; n[i].prestige = +e.target.value; setChars(n); }} className="vg-select" style={{ width: 90 }}>{[1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>P{p}</option>)}</select>
              {chars.length > 1 && <button onClick={() => setChars(chars.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 18 }}>✕</button>}
            </div>
          ))}
          <button onClick={() => setChars([...chars, { name: "", cls: "Chanoine", prestige: 3 }])} style={{ ...btnG, marginTop: 10 }}>+ Ajouter un personnage</button>
          <div style={{ marginTop: 18, textAlign: "right" }}><button onClick={() => setStep(2)} disabled={!canNext(1)} className="vg-btn" style={{ opacity: canNext(1) ? 1 : 0.4 }}>Suivant →</button></div>
        </div>
      )}

      {step === 2 && (
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", marginBottom: 12 }}>⚡ Spécialisations</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {SPECS.map(s => { const sel = specs.includes(s.k); return <button key={s.k} onClick={() => toggleSpec(s.k)} style={{ padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, border: `1px solid ${sel ? "var(--orange)" : "var(--border)"}`, background: sel ? "rgba(255,140,26,0.12)" : "var(--bg-3)", color: sel ? "var(--orange)" : "var(--text)" }}>{s.l}</button>; })}
          </div>
          {specs.includes("CS") && (
            <div style={{ background: "var(--bg-3)", borderRadius: 10, padding: 16, marginBottom: 18, borderLeft: "3px solid var(--orange)" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Combien de personnages souhaites-tu jouer en Chambre Secrète ?</label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {[1, 2].map(n => <button key={n} onClick={() => setCsChars(n)} style={{ padding: "8px 20px", borderRadius: 8, cursor: "pointer", border: `1px solid ${csChars === n ? "var(--orange)" : "var(--border)"}`, background: csChars === n ? "rgba(255,140,26,0.12)" : "var(--bg-2)", color: csChars === n ? "var(--orange)" : "var(--text)", fontWeight: 600 }}>{n} perso{n > 1 ? "s" : ""}</button>)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Quelles classes veux-tu mettre en avant ?</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {CLASSES.map(c => { const sel = favClasses.includes(c); return <button key={c} onClick={() => toggleFav(c)} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, border: `1px solid ${sel ? "var(--orange)" : "var(--border)"}`, background: sel ? "rgba(255,140,26,0.12)" : "var(--bg-2)", color: sel ? "var(--orange)" : "var(--text)" }}>{c}</button>; })}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>ℹ️ Selon les besoins de la guilde, on pourra te demander une autre classe pour compléter/compenser la composition.</div>
              </div>
            </div>
          )}
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", marginBottom: 8 }}>🎯 Intérêts & objectifs</h2>
          <textarea rows={2} value={interests} onChange={e => setInterests(e.target.value)} style={inp} placeholder="Ce que tu cherches dans la guilde..." />
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", margin: "16px 0 8px" }}>🔥 Motivation</h2>
          <textarea rows={2} value={motivation} onChange={e => setMotivation(e.target.value)} style={inp} placeholder="Pourquoi rejoindre Vanguard ?" />
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", margin: "16px 0 8px" }}>📜 Expérience</h2>
          <textarea rows={2} value={experience} onChange={e => setExperience(e.target.value)} style={inp} placeholder="Ton parcours sur AirFlyff..." />
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}><button onClick={() => setStep(1)} style={btnG}>← Retour</button><button onClick={() => setStep(3)} disabled={!canNext(2)} className="vg-btn" style={{ opacity: canNext(2) ? 1 : 0.4 }}>Suivant →</button></div>
        </div>
      )}

      {step === 3 && (
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", marginBottom: 12 }}>⚔️ Construis ton build</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>Ouvre le Stuff Builder, configure ton équipement (arme, armures, bijoux, éveil, cartes…), puis clique « Exporter » dans le builder — ton build sera repris ici automatiquement.</p>
          <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
            <button onClick={() => setShowBuilder(true)} className="vg-btn">⚔️ Ouvrir le Stuff Builder</button>
          </div>
          {buildExport && (
            <div style={{ padding: 12, background: "rgba(74,222,128,0.08)", border: "1px solid var(--green)", borderRadius: 10, fontSize: 13, marginBottom: 10 }}>
              ✅ Build détecté : <b>{buildExport.name || "Perso"}</b> — {buildExport.cls || buildExport.className || "?"} (P{buildExport.prestige})
              {buildExport.stats && Object.keys(buildExport.stats).length > 0 && (
                <span style={{ color: "var(--text-muted)" }}> · {Object.entries(buildExport.stats).slice(0, 3).map(([k, v]) => `${k} +${v}`).join(" · ")}</span>
              )}
              <span style={{ color: "var(--text-muted)" }}> — il sera joint à ta candidature.</span>
            </div>
          )}
          {!buildExport && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", fontSize: 13.5, padding: 14, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)" }}>
              ⚠️ Aucun build détecté. Configure ton équipement dans le builder, puis clique « Exporter » pour pouvoir continuer.
            </div>
          )}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}><button onClick={() => setStep(2)} style={btnG}>← Retour</button><button onClick={() => setStep(4)} disabled={!canNext(3)} className="vg-btn" style={{ opacity: canNext(3) ? 1 : 0.4 }}>Suivant →</button></div>
        </div>
      )}

      {step === 4 && (
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", marginBottom: 6 }}>🧠 Quiz serveur (obligatoire)</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Toutes les réponses doivent être justes pour valider. Les mauvaises réponses sont effacées pour que tu recommences.</p>
          {QUIZ.map((item, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: i < QUIZ.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{i + 1}. {item.q} {qa[i] === null && qFeedback ? <span style={{ color: "var(--red)", fontSize: 12 }}>↻ à refaire</span> : qa[i] === item.a ? <span style={{ color: "var(--green)", fontSize: 12 }}>✓</span> : null}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {item.opts.map((o, j) => { const sel = qa[i] === j; return <button key={j} disabled={quizOk} onClick={() => { const n = [...qa]; n[i] = j; setQa(n); }} style={{ padding: "7px 12px", borderRadius: 7, cursor: quizOk ? "default" : "pointer", fontSize: 12.5, border: `1px solid ${sel ? "var(--orange)" : "var(--border)"}`, background: sel ? "rgba(255,140,26,0.12)" : "var(--bg-3)", color: sel ? "var(--orange)" : "var(--text)" }}>{o}</button>; })}
              </div>
            </div>
          ))}
          {qFeedback && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid var(--red)", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>{qFeedback} <a href={WIKI_URL} target="_blank" style={{ color: "var(--orange)" }}>📖 Ouvrir le wiki du serveur</a></div>}
          {quizOk ? (
            <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid var(--green)", borderRadius: 10, padding: 14 }}><span className="font-heading" style={{ fontWeight: 700, color: "var(--green)" }}>✅ Quiz validé à 100% !</span></div>
          ) : (
            <button onClick={validateQuiz} className="vg-btn">Valider mes réponses</button>
          )}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}><button onClick={() => setStep(3)} style={btnG}>← Retour</button><button onClick={() => setStep(5)} disabled={!quizOk} className="vg-btn" style={{ opacity: quizOk ? 1 : 0.4 }}>Récap →</button></div>
        </div>
      )}

      {step === 5 && (
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", marginBottom: 12 }}>📋 Récapitulatif</h2>
          <div style={{ background: "var(--bg-3)", borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.9 }}>
            <div><b>👥 Personnages :</b> {chars.map(c => `${c.name || "(sans nom)"} — ${c.cls} P${c.prestige}`).join(", ")}</div>
            <div><b>⚡ Spés :</b> {specs.join(", ") || "—"}{specs.includes("CS") ? ` · ${csChars} perso(s) CS · classes : ${favClasses.join(", ") || "—"}` : ""}</div>
            <div><b>🎯 Intérêts :</b> {interests || "—"}</div>
            <div><b>🔥 Motivation :</b> {motivation || "—"}</div>
            <div><b>📜 Expérience :</b> {experience || "—"}</div>
            <div><b>⚔️ Stuff :</b> build configuré ✅</div>
            <div><b>🧠 Quiz :</b> 100% ✅</div>
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(4)} style={btnG}>← Retour</button>
            <button onClick={submit} disabled={!valid || sending || sent} className="vg-btn" style={{ opacity: valid && !sending && !sent ? 1 : 0.4 }}>{sending ? "Envoi…" : "📤 Soumettre sur Discord"}</button>
          </div>
          {error && <div style={{ marginTop: 14, background: "rgba(248,113,113,0.1)", border: "1px solid var(--red)", borderRadius: 10, padding: 14, color: "var(--red)", fontSize: 13 }}>⚠️ {error}</div>}
          {sent && <div style={{ marginTop: 14, background: "rgba(74,222,128,0.1)", border: "1px solid var(--green)", borderRadius: 10, padding: 16 }}><span className="font-heading" style={{ fontWeight: 700, color: "var(--green)" }}>✅ Candidature envoyée !</span><div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>Elle est enregistrée. Le staff la verra dans <b>#decisions</b> d'ici une à deux minutes.</div></div>}
        </div>
      )}

      {/* MODAL BUILDER */}
      {showBuilder && (
        <div onClick={() => setShowBuilder(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", flexDirection: "column", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--orange)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", maxWidth: 1300, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
              <span className="font-heading" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--orange)" }}>⚔️ Stuff Builder</span>
              <button onClick={() => setShowBuilder(false)} className="vg-btn" style={{ marginLeft: "auto" }}>✓ J'ai exporté</button>
              <button onClick={() => setShowBuilder(false)} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <iframe src="/builder.html" style={{ flex: 1, border: "none", width: "100%" }} title="Stuff Builder" />
          </div>
        </div>
      )}
    </div>
  );
}
