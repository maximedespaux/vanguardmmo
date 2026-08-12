"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/Icon";
import type { Role } from "@prisma/client";
import { canParametrer } from "@/config/roles";
import { aEnregistrer, defauts, fusionner, type SchemaPage, type Valeurs } from "@/lib/reglages";

/**
 * LE PANNEAU DE RÉGLAGES D'UNE PAGE — demande de Maxime : « avoir la possibilité sur
 * chaque page de faire un paramétrage en tant que vanguard uniquement ».
 *
 * COMMENT ON S'EN SERT, dans une page cliente :
 *
 *   const SCHEMA = { page: "/donjons", titre: "…", quoi: "…", reglages: [ … ] };
 *   const { valeurs, bouton, panneau } = useReglages(SCHEMA);
 *   …
 *   {bouton}                        ← l'engrenage, invisible sauf pour Vanguard
 *   {valeurs.montrerLesCartes && <Cartes />}
 *   {panneau}                       ← le tiroir, rendu une seule fois
 *
 * TROIS PARTIS PRIS QUI ÉVITENT AUTANT DE PIÈGES :
 *
 * 1. LA PAGE REND AVANT LA RÉPONSE. `valeurs` vaut les défauts du schéma dès le
 *    premier rendu, pas `null`. Sans ça, chaque page devrait traiter un état de
 *    chargement pour un réglage qui ne change presque jamais — et la page
 *    clignoterait à chaque visite.
 * 2. LE BOUTON N'EXISTE PAS POUR LES AUTRES. Pas grisé, pas masqué en CSS : absent
 *    du rendu. Un engrenage visible qu'on ne peut pas actionner invite à cliquer, et
 *    un bouton masqué en CSS reste dans le DOM.
 * 3. LE CONTRÔLE RÉEL EST CÔTÉ SERVEUR. Ce composant lit le rôle de la session pour
 *    décider quoi AFFICHER ; c'est `/api/reglages` qui refuse une écriture. Un
 *    client peut mentir sur son rôle, une route non.
 */
export function useReglages(schema: SchemaPage) {
  const { data: session } = useSession();
  const role = ((session?.user as { role?: Role } | undefined)?.role ?? "RECRUE") as Role;
  const DEV_TOUT = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const peutRegler = DEV_TOUT || canParametrer(role);

  const [valeurs, setValeurs] = useState<Valeurs>(() => defauts(schema));
  const [ouvert, setOuvert] = useState(false);
  const [brouillon, setBrouillon] = useState<Valeurs | null>(null);
  const [etat, setEtat] = useState<{ msg: string; ok: boolean } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [signe, setSigne] = useState<{ parQui: string | null; modifieLe: string | null } | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`/api/reglages?page=${encodeURIComponent(schema.page)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivant || !d) return;
        setValeurs(fusionner(schema, d.valeurs));
        setSigne({ parQui: d.parQui ?? null, modifieLe: d.modifieLe ?? null });
      })
      // Une erreur ici n'est pas grave et ne doit RIEN afficher : la page garde ses
      // défauts, qui sont son état d'origine. Un membre ne doit pas voir passer un
      // message d'erreur pour un réglage qu'il ne peut pas toucher.
      .catch(() => {});
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.page]);

  const enregistrer = useCallback(async () => {
    if (!brouillon) return;
    setEnCours(true);
    setEtat(null);
    try {
      const r = await fetch("/api/reglages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: schema.page, valeurs: aEnregistrer(schema, brouillon) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setEtat({ ok: false, msg: j.error ?? "L'enregistrement a échoué." }); return; }
      setValeurs(fusionner(schema, j.valeurs));
      setSigne({ parQui: j.parQui ?? null, modifieLe: j.modifieLe ?? null });
      setEtat({ ok: true, msg: "Réglages appliqués pour toute la guilde." });
      setBrouillon(null);
    } catch {
      setEtat({ ok: false, msg: "Le serveur n'a pas répondu." });
    } finally {
      setEnCours(false);
    }
  }, [brouillon, schema]);

  const bouton = peutRegler ? (
    <button
      type="button"
      onClick={() => { setBrouillon({ ...valeurs }); setOuvert(true); setEtat(null); }}
      title={`Régler cette page — ${schema.titre}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
        background: "var(--bg-3)", border: "1px dashed var(--orange)", borderRadius: 9,
        color: "var(--orange)", padding: "6px 11px", fontSize: 12, fontWeight: 600,
        fontFamily: "inherit",
      }}
    >
      <Icon name="settings" size={13} />Régler cette page
    </button>
  ) : null;

  const maj = (clef: string, v: boolean | number | string) =>
    setBrouillon((b) => ({ ...(b ?? valeurs), [clef]: v }));

  const panneau = peutRegler && ouvert ? (
    <div
      onClick={() => setOuvert(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto", padding: 22, borderRadius: 16 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--orange)" }}>
            <Icon name="settings" size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-heading" style={{ fontSize: 16, fontWeight: 700 }}>{schema.titre}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{schema.quoi}</div>
          </div>
          <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Dit d'emblée que ça ne concerne pas que soi : c'est la différence entre un
            réglage d'affichage personnel et celui-ci. */}
        <div style={{ fontSize: 11.5, color: "var(--gold)", background: "color-mix(in srgb, var(--gold) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--gold) 32%, transparent)", borderRadius: 8, padding: "7px 10px", margin: "10px 0 14px", lineHeight: 1.5 }}>
          <Icon name="info" size={12} style={{ display: "inline-block", marginRight: 5 }} />
          Ces réglages valent pour <b>toute la guilde</b>, pas seulement pour toi. Le rang Vanguard est le seul à pouvoir les changer.
          {signe?.parQui && <> Dernière modification par <b>{signe.parQui}</b>.</>}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {schema.reglages.map((r) => {
            const v = (brouillon ?? valeurs)[r.clef];
            return (
              <div key={r.clef} style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", paddingBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: r.type === "interrupteur" ? "pointer" : "default" }}>
                  {r.type === "interrupteur" && (
                    <input type="checkbox" checked={Boolean(v)} onChange={(e) => maj(r.clef, e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: "var(--orange)", cursor: "pointer", flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="font-heading" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                    {r.aide && <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>{r.aide}</span>}
                  </span>
                  {r.type === "nombre" && (
                    <input type="number" value={Number(v)} min={r.min} max={r.max}
                      onChange={(e) => maj(r.clef, Number(e.target.value))}
                      style={{ width: 92, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 9px", color: "var(--text)", fontFamily: "inherit", fontSize: 13, flexShrink: 0 }} />
                  )}
                  {r.type === "choix" && (
                    <select value={String(v)} onChange={(e) => maj(r.clef, e.target.value)}
                      style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 9px", color: "var(--text)", fontFamily: "inherit", fontSize: 13, flexShrink: 0 }}>
                      {r.options.map((o) => <option key={o.valeur} value={o.valeur}>{o.label}</option>)}
                    </select>
                  )}
                </label>
                {r.type === "texte" && (
                  r.long
                    ? <textarea value={String(v)} rows={3} onChange={(e) => maj(r.clef, e.target.value)}
                        style={{ width: "100%", marginTop: 7, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
                    : <input value={String(v)} onChange={(e) => maj(r.clef, e.target.value)}
                        style={{ width: "100%", marginTop: 7, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontFamily: "inherit", fontSize: 13 }} />
                )}
              </div>
            );
          })}
        </div>

        {etat && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: etat.ok ? "var(--green)" : "var(--red)" }}>
            <Icon name={etat.ok ? "check" : "alert"} size={13} style={{ display: "inline-block", marginRight: 5 }} />{etat.msg}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16, flexWrap: "wrap" }}>
          {/* « Revenir aux valeurs d'origine » et non « tout effacer » : ça remet les
              défauts du schéma, c'est-à-dire l'état de la page avant tout réglage. */}
          <button type="button" onClick={() => setBrouillon(defauts(schema))}
            style={{ padding: "8px 13px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>
            Revenir aux valeurs d&apos;origine
          </button>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setOuvert(false)}
              style={{ padding: "8px 13px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>
              Annuler
            </button>
            <button type="button" onClick={enregistrer} disabled={enCours}
              style={{ padding: "8px 15px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#0a0a0c", fontWeight: 700, cursor: enCours ? "wait" : "pointer", fontFamily: "inherit", fontSize: 12.5, opacity: enCours ? .6 : 1 }}>
              {enCours ? "Enregistrement…" : "Appliquer"}
            </button>
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return { valeurs, peutRegler, bouton, panneau };
}
