"use client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";

function Tip({ title, prio, mt, children }: { title?: string; prio?: string; mt?: boolean; children: React.ReactNode }) {
  return (
    <div className="gd-tip" style={mt ? { marginTop: 10 } : undefined}>
      {title && <h4>{title}{prio ? <span className="gd-prio">{prio}</span> : null}</h4>}
      <p>{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="gd-note">{children}</div>;
}

function Prestige({ badge, title, subtitle, isOpen, onToggle, children }: { badge: string; title: React.ReactNode; subtitle: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`gd-prestige ${isOpen ? "open" : ""}`}>
      <div className="gd-head" onClick={onToggle}>
        <div className="gd-badge">{badge}</div>
        <div className="gd-pt"><h3>{title}</h3><div className="gd-ps">{subtitle}</div></div>
        <div className="gd-arrow">▶</div>
      </div>
      <div className="gd-body">{children}</div>
    </div>
  );
}

export default function GuidePage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ p3: true });
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));
  const P = (id: string) => ({ isOpen: !!open[id], onToggle: () => toggle(id) });

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-guides.png" title="Guides" subtitle="Guide de progression, calculateur de prestige et infos de jeu." />
      <SectionTabs section="guides" />

      <div className="gd">
        {/* VIDEOS */}
        <div className="gd-card">
          <h2 className="gd-cardtitle">🎬 Astuces en vidéo</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>Playlist d&apos;astuces pour les <b>instances Solo</b> (8 vidéos · série en cours).</p>
          <div className="gd-video">
            <iframe src="https://www.youtube.com/embed/videoseries?list=PL64S1j7adQcwMHVfTyRfMkBOu8hS7c08V" title="Astuces donjons Vanguard" frameBorder="0" allowFullScreen />
          </div>
          <a className="gd-vlink" href="https://www.youtube.com/playlist?list=PL64S1j7adQcwMHVfTyRfMkBOu8hS7c08V" target="_blank" rel="noreferrer">▶ Voir la playlist complète sur YouTube</a>
        </div>

        {/* AUTHOR */}
        <div className="gd-card">
          <div className="gd-author">
            <div className="av">🎓</div>
            <div><div className="n">Guide de progression — par Sugot</div><div className="r">Formateur volontaire é__è</div></div>
          </div>
          <p className="gd-intro">Bonjour à tous les nouveaux joueurs, vous voilà 200 et prestige 3. Pour ne pas vous disperser et avoir des objectifs clairs, voici une « trame » à suivre, ou du moins quelques conseils pour vous y retrouver sans passer des heures à errer inutilement. Ce guide est classé par prestige pour suivre pas à pas.</p>
        </div>

        {/* QUEST ITEMS */}
        <div className="gd-card">
          <h2 className="gd-cardtitle">📦 Items quête requis (tous prestiges)</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>La quantité totale d&apos;items de quête requis pour tous les prestiges. Ça peut sembler important, mais en vous y prenant bien tout se goupillera — le farm étant l&apos;essence même de Flyff 🙂</p>
          <div className="gd-grid">
            {([["Nucléus", "160 000"], ["Perin", "1 400"], ["Emblème de protection", "15 000"], ["Badge Jardin prestigieux", "69"], ["Badge Donjon mineur", "4"], ["Badge Donjon", "2"], ["Badge de la tour", "2"], ["Badge World Boss prestigieux", "4"]] as const).map(([l, v]) => (
              <div className="gd-qitem" key={l}><span className="ql">{l}</span><span className="qv">{v}</span></div>
            ))}
          </div>
        </div>

        <h2 className="gd-phead">🌟 Guide par prestige</h2>

        <Prestige badge="P3" title="Le début de l'aventure" subtitle="Quelles instances favoriser" {...P("p3")}>
          <Tip title="🌱 Faille du débutant">Toujours utile pour récupérer les Jetons d&apos;Air et les échanger au PNJ devant l&apos;instance contre des consommables et CS gratuits. (Tout ce qui est gratuit n&apos;est pas à payer !)</Tip>
          <Tip title="👻 Instance Vampirique">4 entrées par jour. Les armes : soit les vendre au PNJ pour 5 périn/u, soit les transformer en morceaux d&apos;armes vampiriques au PNJ Pépito (à côté de la forge à Flaris).</Tip>
          <Tip title="🌲 Forêt d'Euphrasia / Grotte d'Herneos">À faire pour vous constituer un stock de perles niveau 3.</Tip>
          <Tip title="❄️ Ruines Givrées">1 entrée. Tuez tous les mobs et le boss pour récupérer les items servant à crafter des meubles (durabilité 7 jours, cumulables jusqu&apos;à 30 jours).</Tip>
          <Tip title="🏛️ Ruines Prestigieuses" prio="À anticiper">1 entrée/jour. À faire dès le départ : tuez les mobs et le boss. Il faut 40 lianes + 1 terreau pour un badge, donc anticipez au plus tôt.</Tip>
          <Tip title="🚀 USS Celestia">Petite instance, CD de 2h. Essayez d&apos;avoir un ramasseur PVE en lien avec votre classe, que vous pourrez muter pour peu de prix via les jetons rookies (1 mutagène + 7 clés).</Tip>
          <Note>💡 Faites toutes ces instances en priorité. Il vous faudra peu de PV : <b>150K en élément vent +20</b> permet de toutes les faire. Ensuite, si possible, commencez un set <b>Shaitan</b> si vous souhaitez faire Behemoth et Bastion (450k HP).</Note>
          <Tip title="🗼 Badge de la Tour" prio="À prioriser" mt>Quête récupérable à Oasis. 15K mobs en 1vs1 ou 40K en AoE. Conseil : visez l&apos;AoE avec une classe magique — le <b>Primat qui OS les mobs</b> est votre partenaire idéal. Il en faut 2 jusqu&apos;au prestige 10 ; en faire un 3ème sera votre gagne-pain pour passer directement au P5 si vous achetez vos nucléus.</Tip>
        </Prestige>

        <Prestige badge="P4" title="Rien ne changera 😄" subtitle="Continuez sur votre lancée" {...P("p4")}>
          <Tip>Rien ne change à ce prestige — poursuivez les objectifs du P3.</Tip>
        </Prestige>

        <Prestige badge="P5" title="Enfin un prestige intéressant !" subtitle="3 choses très importantes se débloquent" {...P("p5")}>
          <Tip title="🐉 Sietch Kalgas">Une instance longue, très longue (attendez-vous à courir). Très intéressante : pas de PV minimal requis car le boss a un aggro fixe. Tapez avec un perso en tournant autour, et avec votre second personnage tapez librement sans jamais vous faire toucher. Il vous faut <b>2 personnages P5</b>.</Tip>
          <Tip title="🗼 Tower Defense" prio="À prioriser">3 entrées/jour, 700 emblèmes de protection si vous allez au bout par entrée. Une statue s&apos;affiche sur la mini-map (croix rouge) : défendez la tour. Surveillez les 2 premières vagues, puis lancez vos AoE sans ciblage avec vos dugkug toutes les 60s via le Ftool et partez faire autre chose. ⚠️ L&apos;AoE Primat en combo Halo peut bugger/s&apos;arrêter : cliquez et décalez votre perso pour relancer.</Tip>
          <Tip title="🎖️ Quête Badge Donjon Mineur" prio="À prioriser">Il en faut 4 par personnage jusqu&apos;au P10. Pour en avoir 1, faites Vampirique / Behemoth / Bastion / Celestia sur 3 jours.</Tip>
          <Note>🌸 Optionnel (ou pas 😄) : le <b>Jardin Prestigieux</b> (en haut de l&apos;escalier d&apos;Oasis, à gauche, le téléporteur). Le CW y est tous les jours à <b>18h30</b> pour récupérer un buff de 2h (le temps s&apos;arrête lors des déconnexions).</Note>
        </Prestige>

        <Prestige badge="P6" title="Peu de gains" subtitle="Mais un déblocage utile" {...P("p6")}>
          <Tip>Vous débloquez le <b>second étage des Ruines Prestigieuses</b>, ce qui permet d&apos;accumuler encore plus de badges Jardin prestigieux.</Tip>
        </Prestige>

        <Prestige badge="P7" title="Fin du guide débutant" subtitle="Nouvelle zone de farm + Jardin de Jade" {...P("p7")}>
          <Tip title="🌾 Nouvelle zone de Farm">Accessible au téléporteur du Jardin Prestigieux (Oasis). Zone parfaite pour farm des nucléus parfaits (échangeables contre n&apos;importe quel autre nucléus), des branches (à revendre), des perins à foison, et une grande quantité d&apos;ori/pl très utiles.</Tip>
          <Tip title="🟢 Jardin de Jade">Instance pour farm les items quête servant à votre rune d&apos;arme <b>Yggdrasil</b>. C&apos;est laborieux, mais voici une astuce : vous pouvez ne faire que les mobs pour avoir les marteaux (il en faut 3000, prix avoisinant 1P/u). Plus vous anticipez tôt, mieux c&apos;est — le taux de drop est bas sans cape ni Goldéa.</Tip>
          <Note>💡 <b>Astuce de pauvre (Sugot) :</b> restat full END via les parchemins à Isruel, restez en stuff DPS, dugkug en continu via Ftool, prenez une dizaine/vingtaine de mobs (ça tape un peu fort, ne soyez pas trop gourmand) et hop, AoE. Uniquement sur les mobs, sans toucher au boss. Faites votre stock de 3000 marteaux et vendez le surplus : ça financera vos 4 runes vierges Yggdrasil 🙂</Note>
        </Prestige>

        <Prestige badge="P8" title="Le Temple Aérien" subtitle="Dernière étape avant le P10" {...P("p8")}>
          <Tip>Pour ceux ayant des tanks (Prestige 3) à environ <b>1M3 HP</b>, n&apos;hésitez pas à passer rapidement prestige 8 avec votre DPS principal (il vous faudra quand même un perso prestige 5 dans ces recommandations).</Tip>
          <Tip title="⛩️ Temple Aérien">Instance très rapide (3h de CD), nécessitant seulement <b>360k HP</b> (armure +20 vent). Dernière étape pour valider votre quête Badge Donjon, qui demande encore une fois pendant 3 jours : Sentier / Dédale / Kalgas / Temple Aérien.</Tip>
          <Note>🎯 Voici ce qu&apos;il vous faudra pour préparer tous les items quête afin de passer P10, sans vous perdre.</Note>
        </Prestige>

        <div className="gd-foot">N&apos;hésitez pas pour la suite à aller en vocal, sinon sur le Wiki du serveur !<br />Votre dévoué Sugot 🎓</div>
      </div>

      <style>{`
        .gd { line-height:1.6; color:var(--text); }
        .gd h2, .gd h3, .gd h4 { font-family:'Rajdhani',sans-serif; margin:0; font-weight:700; }
        .gd p { margin:0; }
        .gd b { color:var(--text); }
        .gd-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:24px; margin-bottom:20px; }
        .gd-cardtitle { font-size:20px; text-transform:uppercase; letter-spacing:1px; color:var(--orange); margin-bottom:14px; display:flex; align-items:center; gap:10px; }
        .gd-author { display:flex; align-items:center; gap:14px; margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid var(--border); }
        .gd-author .av { width:48px; height:48px; border-radius:50%; background:var(--bg-4); display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid var(--orange); flex-shrink:0; }
        .gd-author .n { font-family:'Rajdhani',sans-serif; font-weight:700; font-size:16px; }
        .gd-author .r { font-size:12px; color:var(--orange); }
        .gd-intro { font-size:14px; color:var(--text); }
        .gd-video { position:relative; padding-bottom:56.25%; height:0; border-radius:12px; overflow:hidden; border:1px solid var(--border); margin-bottom:12px; }
        .gd-video iframe { position:absolute; top:0; left:0; width:100%; height:100%; }
        .gd-vlink { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; background:#FF0000; color:#fff; border-radius:8px; text-decoration:none; font-family:'Rajdhani',sans-serif; font-weight:600; font-size:14px; }
        .gd-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
        .gd-qitem { display:flex; justify-content:space-between; align-items:center; background:var(--bg-3); border:1px solid var(--border); border-radius:8px; padding:10px 14px; }
        .gd-qitem .ql { font-size:13px; color:var(--text-muted); }
        .gd-qitem .qv { font-family:'Rajdhani',sans-serif; font-weight:700; color:var(--gold); font-size:16px; }
        .gd-phead { color:var(--orange); text-transform:uppercase; letter-spacing:1px; margin:24px 0 14px; font-size:20px; }
        .gd-prestige { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; margin-bottom:16px; overflow:hidden; }
        .gd-head { padding:16px 20px; display:flex; align-items:center; gap:14px; cursor:pointer; background:linear-gradient(90deg, rgba(255,140,26,.08), transparent); border-left:3px solid var(--orange); transition:background .15s; }
        .gd-head:hover { background:linear-gradient(90deg, rgba(255,140,26,.14), transparent); }
        .gd-badge { width:44px; height:44px; border-radius:10px; background:var(--bg-4); display:flex; align-items:center; justify-content:center; font-family:'Rajdhani',sans-serif; font-weight:700; color:var(--gold); font-size:18px; flex-shrink:0; border:1px solid var(--gold); }
        .gd-pt { flex:1; }
        .gd-head h3 { font-size:18px; }
        .gd-ps { font-size:12px; color:var(--text-muted); margin-top:2px; }
        .gd-arrow { color:var(--text-muted); transition:transform .25s; font-size:13px; }
        .gd-prestige.open .gd-arrow { transform:rotate(90deg); }
        .gd-body { padding:0 20px; max-height:0; overflow:hidden; transition:max-height .35s ease, padding .35s ease; }
        .gd-prestige.open .gd-body { padding:16px 20px 20px; max-height:4000px; }
        .gd-tip { background:var(--bg-3); border-radius:10px; padding:14px 16px; margin-bottom:10px; border-left:2px solid var(--orange-dark); }
        .gd-tip h4 { font-size:15px; color:var(--orange); margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .gd-tip p { font-size:13.5px; color:var(--text); }
        .gd-prio { display:inline-block; font-size:10px; text-transform:uppercase; letter-spacing:1px; padding:2px 8px; border-radius:4px; background:rgba(248,113,113,.18); color:var(--red); font-weight:600; }
        .gd-note { background:rgba(255,140,26,.06); border:1px solid var(--orange-dark); border-radius:8px; padding:12px 14px; font-size:13.5px; margin-top:10px; }
        .gd-foot { text-align:center; color:var(--text-muted); font-size:13px; padding:20px; font-style:italic; }
      `}</style>
    </div>
  );
}
