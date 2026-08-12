"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { BestiaireWorldBoss, BeteEnBref, BeteInconnue, monstreDeLEvenement } from "@/components/worldboss/Bestiaire";

/**
 * WORLD BOSS — le passage annoncé, ET la bête qu'on va prendre.
 *
 * Cette page n'était qu'un calendrier : le staff programmait un passage, les
 * membres cliquaient « présent ». Elle ne disait rien du monstre — ni ses points de
 * vie, ni ce qu'il frappe, ni son élément, ni ce que ça rapporte. On disait donc oui
 * sans savoir à quoi.
 *
 * Deux moitiés cohabitent maintenant :
 *  · l'agenda, qui vient de la base (le staff saisit le nom du boss à la main dans
 *    /gestion-worldboss — il n'y a pas de liste fermée à joindre) ;
 *  · le relevé du client, dans `components/worldboss/Bestiaire`, qui LIT les
 *    chiffres au lieu de les recopier.
 *
 * `monstreDeLEvenement` fait le rapprochement sur le nom normalisé. Quand il
 * échoue, la page le DIT (`BeteInconnue`) : afficher les points de vie d'un homonyme
 * serait plus nuisible que ne rien afficher.
 */
type Ev = { id: string; boss: { name: string; zone: string | null; recommendedLevel: number | null; strategy: string | null; rewards: string | null }; startAt: string; status: string; note: string | null; confirmed: number; declined: number; participants: string[]; myStatus: string | null };

export default function WorldBossPage() {
  // Halo curseur + leger relief sur les cartes (.fx-card), cf. VgFx.
  useCardFx();
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { const r = await fetch("/api/worldboss"); if (r.ok) setEvents(await r.json()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const participate = async (id: string, status: string) => {
    const r = await fetch(`/api/worldboss/${id}/participate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (r.ok) load();
  };
  const fmt = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const btn = (c: string, on: boolean): React.CSSProperties => ({ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, border: `1px solid ${c}`, background: on ? c : "transparent", color: on ? "#0A0A0C" : c, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* `art` plutot que `banner` : banner-pve.webp est un logo avec le mot « PvE »
          deja dessine dedans, donc l'en-tete d'une page qui s'appelle World Boss
          affichait un autre mot que son titre. Avec `art`, le titre reste du texte
          (et le h1 aussi) et l'image passe derriere. Celle-ci est l'ecran de
          chargement du Behemoth : le logo de l'editeur et la barre de progression
          sont dans son tiers bas, que .vg-pagehead-art recadre. */}
      <PageHeader
        art="/jeu/chargement/maploading_behemothboss.webp"
        icon="behemoth"
        title="World Boss"
        subtitle="Les prochains passages, et la bête qui va en face. Confirme ta venue pour qu'on compose les groupes."
      />
      <SectionTabs section="pve" />

      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
        : events.length === 0 ? (
          <div className="glass-card fx-card" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Aucun passage programmé pour l&apos;instant.</div>
            {/* Un « aucun événement » sec laissait la page vide et muette. Le relevé du
                client, lui, est toujours là : autant dire ou aller le lire. */}
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
              Le staff annonce les passages depuis la gestion. En attendant, le relevé ci-dessous dit
              déjà tout ce que les fichiers du jeu savent de ces monstres.
            </div>
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {events.map(e => {
            const bete = monstreDeLEvenement(e.boss.name);
            return (
            <div key={e.id} className="glass-card fx-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="font-heading" style={{ fontSize: 18, fontWeight: 700 }}>{e.boss.name}</span>
                {e.boss.recommendedLevel && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>niv. {e.boss.recommendedLevel}+</span>}
                {e.status === "ONGOING" && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--green)", color: "var(--green)" }}>en cours</span>}
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--orange)" }}>{fmt(e.startAt)}</span>
              </div>
              {e.boss.zone && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}><Icon name="map-pin" size={14} style={{ display: "inline-block", marginRight: 5 }} />{e.boss.zone}</div>}
              {e.boss.strategy && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}><Icon name="target" size={14} style={{ display: "inline-block", marginRight: 5 }} />{e.boss.strategy}</div>}
              {e.boss.rewards && <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4 }}><Icon name="gift" size={14} style={{ display: "inline-block", marginRight: 5 }} />{e.boss.rewards}</div>}
              {e.note && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}><Icon name="edit" size={14} style={{ display: "inline-block", marginRight: 5 }} />{e.note}</div>}

              {bete ? <BeteEnBref m={bete} /> : <BeteInconnue nom={e.boss.name} />}

              <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => participate(e.id, "CONFIRMED")} style={btn("var(--green)", e.myStatus === "CONFIRMED")}><Icon name="check" size={15} />Présent</button>
                <button onClick={() => participate(e.id, "DECLINED")} style={btn("var(--red)", e.myStatus === "DECLINED")}><Icon name="x" size={15} />Absent</button>
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>{e.confirmed} présent(s){e.declined ? ` · ${e.declined} absent(s)` : ""}</span>
              </div>
              {e.participants.length > 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}><Icon name="users" size={13} style={{ display: "inline-block", marginRight: 5 }} />{e.participants.join(", ")}</div>}
            </div>
            );
          })}
        </div>
      )}

      <BestiaireWorldBoss />
    </div>
  );
}
