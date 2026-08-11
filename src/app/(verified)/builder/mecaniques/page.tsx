"use client";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, type SectionVolet } from "@/components/VoletSections";
import { useCardFx } from "@/components/VgFx";
import {
  CARTES_ATTAQUE, CARTES_DEFENSE, PALIERS_ATTAQUE, PALIERS_DEFENSE,
  carteDePercage, libellePalier, COULEUR_CARTE,
  ICONE_ELEMENT, ICONE_EVEIL, ICONE_SCROLL, ICONE_DIAMANT, ICONE_HOLO, ICONE_GEMME, ICONE_UPGRADE,
  ICONE_RARETE, COULEUR_RARETE, ICONE_RUNE_ARME, ICONE_RUNE_MARTEAU, ICONE_RUNE_STAT, ICONE_RUNE_VIERGE,
  ETIQUETTE_ARTEFACT, ETIQUETTE_ULTIME, ETOILE_PLEINE, ETOILE_VIDE,
  planAscension, essenceArme,
} from "@/lib/assetsJeu";
import { RARETES } from "@/lib/specsFlyff";

/**
 * LA PLANCHE DES MÉCANIQUES — à quoi ressemble, EN JEU, ce que tu règles ici.
 *
 * Le problème que ça résout : l'AirBuilder et les commandes sur mesure parlent
 * en abrégé — « R1 », « Fulgur 10 % », « ★★ », « Rune Yggdrasil ». Ces mots
 * n'apprennent rien à qui ne les connaît pas déjà, et ils s'apprennent
 * justement en voyant l'objet. Toutes les images de cette page sortent du
 * client du jeu : ce sont exactement les pierres, parchemins et cartes que tu
 * as dans ton inventaire.
 *
 * Ce n'est pas une page de règles. On ne dit ici que ce que les fichiers du
 * client disent : un dessin, un nom. Là où le client ne fournit rien — la
 * rareté Commune et la Mythique n'ont pas de parchemin —, on l'écrit au lieu
 * d'emprunter l'image du palier voisin.
 */

const cadre: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
  padding: "10px 8px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)",
  minWidth: 82, textAlign: "center",
};
const legende: React.CSSProperties = { fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.25 };
const grille: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const note: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 };

/** Une case de la planche : l'image du jeu, son nom dessous. Sans image, on ne
 *  dessine pas la case — pas de carré vide qui ferait croire à un fichier
 *  manquant. */
function Case({ src, nom, couleur, taille = 32 }: { src?: string | null; nom: string; couleur?: string; taille?: number }) {
  if (!src) return null;
  return (
    <div className="fx-card" style={{ ...cadre, borderColor: couleur ? `${couleur}55` : "var(--border)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: taille, height: taille, objectFit: "contain", imageRendering: "pixelated" }} />
      <span style={{ ...legende, color: couleur ?? "var(--text-muted)", fontWeight: couleur ? 700 : 400 }}>{nom}</span>
    </div>
  );
}

/** Les neuf familles d'ascension du client. Le glaive et la doloire n'en font
 *  qu'une : c'est le nom de fichier lui-même qui le dit. On garde ici un nom
 *  d'arme réel par famille, parce que `planAscension` lit un NOM d'arme — la
 *  planche se sert donc de la même fonction que les formulaires. */
const FAMILLES: { arme: string; label: string }[] = [
  { arme: "Épée", label: "Épée" },
  { arme: "Hache", label: "Hache" },
  { arme: "Glaive", label: "Glaive & Doloire" },
  { arme: "Arc", label: "Arc" },
  { arme: "Baguette", label: "Baguette" },
  { arme: "Bâton", label: "Bâton" },
  { arme: "Sceptre", label: "Sceptre" },
  { arme: "Poing", label: "Poing" },
  { arme: "Yoyo", label: "Yoyo" },
];

/** Les ressources d'artefact, telles que le client les nomme. On les montre
 *  sans expliquer leur recette : les crafts ne sont pas dans nos données, et
 *  inventer une recette ici enverrait quelqu'un farmer pour rien. */
const RESSOURCES: { f: string; nom: string }[] = [
  { f: "artefact-pierre", nom: "Pierre d'artefact" },
  { f: "artefact-plan", nom: "Plan" },
  { f: "artefact-morceau-parchemin", nom: "Morceau de parchemin" },
  { f: "artefact-coffret-plans", nom: "Coffret de plans" },
  { f: "artefact-boite-pierres", nom: "Boîte de pierres" },
  { f: "artefact-protection", nom: "Protection" },
  { f: "artefact-orichalque-pure", nom: "Orichalque pur" },
  { f: "artefact-orichalque-scintillant", nom: "Orichalque scintillant" },
  { f: "artefact-roche-lunaire", nom: "Roche lunaire" },
  { f: "artefact-diamant-holographique", nom: "Diamant holographique" },
];

export default function MecaniquesPage() {
  useCardFx();

  const sections: SectionVolet[] = [
    {
      clef: "rarete", titre: "Rareté", sous: "les six paliers d'une arme", icon: "gem", compte: RARETES.length,
      contenu: (
        <div style={{ display: "grid", gap: 10 }}>
          <p style={note}>
            La rareté est le premier chiffre qu&apos;on lit sur une arme : c&apos;est elle qui donne
            les lignes bonus. Chaque palier a sa couleur — la même que dans l&apos;AirBuilder.
          </p>
          <div style={grille}>
            {RARETES.map((r) => <Case key={r} src={ICONE_RARETE[r]} nom={r} couleur={COULEUR_RARETE[r]} />)}
          </div>
          <p style={note}>
            Tu ne verras que quatre parchemins : <b>Commun</b> est l&apos;état de base et le client
            n&apos;en livre pas pour <b>Mythique</b>. Plutôt que de te montrer celui du palier
            d&apos;à côté, on n&apos;en montre aucun.
          </p>
        </div>
      ),
    },
    {
      clef: "artefact", titre: "Artefact & ascension", sous: "au-delà de +10, et les plans par arme", icon: "sparkles", compte: FAMILLES.length,
      contenu: (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={note}>
            Jusqu&apos;à +10, tu améliores. À partir de +11 ta pièce devient un <b>artefact</b> :
            elle porte ce bandeau, elle gagne jusqu&apos;à trois étoiles d&apos;ascension et elle
            ouvre les trois diamants holographiques.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ETIQUETTE_ARTEFACT} alt="Artefact" style={{ height: 24, width: "auto", imageRendering: "pixelated" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ETIQUETTE_ULTIME} alt="Ultime" style={{ height: 24, width: "auto", imageRendering: "pixelated" }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              {[1, 2, 3].map((i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={i <= 2 ? ETOILE_PLEINE : ETOILE_VIDE} alt="" style={{ width: 20, height: 20, imageRendering: "pixelated" }} />
              ))}
              <span style={{ ...legende, marginLeft: 6 }}>2 étoiles sur 3</span>
            </span>
            <Case src={ICONE_UPGRADE} nom="Amélioration" taille={26} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
              Le plan d&apos;ascension dépend de ton arme
            </div>
            <p style={note}>
              Neuf familles, et une seule pour le glaive et la doloire. Si ton arme n&apos;est pas
              dans cette liste, le client ne dessine pas son plan : le site te le dira en mots
              plutôt qu&apos;avec l&apos;image d&apos;une autre arme.
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {FAMILLES.map((f) => (
                <div key={f.arme} className="fx-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <span style={{ width: 130, flexShrink: 0, fontSize: 12.5, fontWeight: 700 }}>{f.label}</span>
                  {[1, 2, 3].map((n) => {
                    const src = planAscension(f.arme, n);
                    if (!src) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={n} src={src} alt="" title={`${f.label} — ascension ${n}`} style={{ width: 28, height: 28, objectFit: "contain", imageRendering: "pixelated" }} />
                    );
                  })}
                  <span style={{ ...legende, marginLeft: 4 }}>1 · 2 · 3</span>
                  {/* Jamais de `src=""` en repli : le navigateur recharge alors la
                      page courante comme si c'était une image, et l'icône
                      cassée est plus bruyante que l'absence. */}
                  {essenceArme(f.arme) && (
                    <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={essenceArme(f.arme)!} alt="" title={`Essence — ${f.label}`} style={{ width: 26, height: 26, objectFit: "contain", imageRendering: "pixelated" }} />
                      <span style={legende}>essence</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
              Ce que tu ramasses pour ça
            </div>
            <div style={grille}>
              {RESSOURCES.map((r) => <Case key={r.f} src={`/jeu/mecaniques/${r.f}.webp`} nom={r.nom} />)}
            </div>
          </div>
        </div>
      ),
    },
    {
      clef: "percage", titre: "Perçage", sous: "cartes d'attaque et de défense", icon: "target", compte: CARTES_ATTAQUE.length + CARTES_DEFENSE.length,
      contenu: (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={note}>
            Le même élément change de nom selon ce qu&apos;il fait : le feu <b>attaque</b> sous
            « Feu » et <b>défend</b> sous « Volcano ». Une arme et un bouclier prennent des
            cartes d&apos;attaque, une tenue prend des cartes de défense — d&apos;où deux séries
            de dessins.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
              Attaque — arme et bouclier
            </div>
            <div style={grille}>
              {CARTES_ATTAQUE.map((c) => PALIERS_ATTAQUE.map((p) => (
                <Case key={`${c}-${p}`} src={carteDePercage(c, p)} nom={`${c} ${libellePalier(c, p)}`} couleur={COULEUR_CARTE[c]} />
              )))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
              Défense — tenue
            </div>
            <div style={grille}>
              {CARTES_DEFENSE.map((c) => PALIERS_DEFENSE.map((p) => (
                <Case key={`${c}-${p}`} src={carteDePercage(c, p)} nom={`${c} ${libellePalier(c, p)}`} couleur={COULEUR_CARTE[c]} />
              )))}
            </div>
          </div>
        </div>
      ),
    },
    {
      clef: "eveil", titre: "Éveil, scroll, élément", sous: "R1, R2 et les cinq éléments", icon: "awaken", compte: 2 + Object.keys(ICONE_ELEMENT).length,
      contenu: (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={note}>
            <b>R1</b> et <b>R2</b> sont deux parchemins d&apos;éveil : ils posent une statistique
            en plus sur la pièce, R2 plus fort que R1. Le <b>scroll de stat</b> monte une des
            quatre statistiques de base de +1 à +4. L&apos;<b>élément</b> de l&apos;arme (jusqu&apos;à
            +20) ne se confond pas avec les cartes de perçage ci-contre.
          </p>
          <div style={grille}>
            <Case src={ICONE_EVEIL.R1} nom="Éveil R1" />
            <Case src={ICONE_EVEIL.R2} nom="Éveil R2" />
            <Case src={ICONE_SCROLL} nom="Scroll de stat" />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
              Élément de l&apos;arme
            </div>
            <div style={grille}>
              {Object.entries(ICONE_ELEMENT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} taille={24} />)}
            </div>
          </div>
        </div>
      ),
    },
    {
      clef: "sertissage", titre: "Sertissage & gemmes", sous: "diamants, holos, gemmes de costume", icon: "gem", compte: null,
      contenu: (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={note}>
            Une arme porte <b>cinq diamants</b>, et trois <b>holographiques</b> de plus une fois
            passée en artefact. Les <b>gemmes</b> sont l&apos;affaire des costumes : quatre
            emplacements, un dessin par pièce — la tête, le torse, les gants et les bottes ne
            portent pas la même.
          </p>
          <div style={grille}>
            <Case src={ICONE_DIAMANT} nom="Diamant" />
            <Case src={ICONE_HOLO} nom="Diamant holographique" />
            <Case src={ICONE_GEMME.fhead} nom="Gemme — chapeau" />
            <Case src={ICONE_GEMME.ftop} nom="Gemme — haut" />
            <Case src={ICONE_GEMME.fhand} nom="Gemme — gants" />
            <Case src={ICONE_GEMME.ffoot} nom="Gemme — bottes" />
          </div>
        </div>
      ),
    },
    {
      clef: "runes", titre: "Runes", sous: "celle de l'arme n'est pas celle de la tenue", icon: "rune", compte: null,
      contenu: (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={note}>
            Deux choses portent ce mot. La rune d&apos;<b>arme</b> dépend du palier de l&apos;arme,
            et le <b>marteau</b> a sa propre série. La rune de <b>tenue</b> (aussi cape, familier,
            ramasseur) porte la pierre de la statistique qu&apos;elle donne. Confondre les deux
            fait acheter la mauvaise.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>Rune d&apos;arme</div>
            <div style={grille}>
              {Object.entries(ICONE_RUNE_ARME).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
              <Case src={ICONE_RUNE_VIERGE} nom="Yggdrasil vierge" />
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>Rune de marteau</div>
            <div style={grille}>
              {Object.entries(ICONE_RUNE_MARTEAU).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>Rune de tenue, par statistique</div>
            <div style={grille}>
              {Object.entries(ICONE_RUNE_STAT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon="gem"
        title="Les mécaniques, en images"
        subtitle="Ce que « R1 », « Fulgur 10 % » ou « ★★ » veulent dire — avec les images du jeu."
      />
      <VoletSections sections={sections} defaut="artefact" />
    </>
  );
}
