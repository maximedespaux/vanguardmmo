"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Le mot qui manquait quand une page se refuse.
 *
 * Le middleware renvoie sur `/?error=guild` ou `/?error=admin` quand le rôle ne
 * suffit pas. Or l'accueil se contentait de rediriger vers `/histoire` : le
 * paramètre était perdu en route, et l'utilisateur se retrouvait sur une page de
 * présentation sans jamais savoir POURQUOI il avait quitté celle qu'il visait.
 * Maintenant qu'il y a un accueil, autant qu'il le dise.
 *
 * On dit à quel niveau ça bloque, jamais qui a le droit ni combien ils sont : la
 * page est publique.
 */
const MOTS: Record<string, string> = {
  guild: "Cette page est réservée aux membres de GENESIS. Connecte-toi avec Discord — si tu es dans la guilde, elle s'ouvrira.",
  admin: "Cette page est réservée au staff de la guilde. Rien à faire de ton côté.",
};

export function AvisAcces() {
  const err = useSearchParams().get("error");
  const mot = err ? MOTS[err] : undefined;
  if (!mot) return null;
  return (
    <div className="acc-avis" role="status">
      <Icon name="lock" size={18} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
      <span>{mot}</span>
      {err === "guild" && <Link href="/login" className="acc-avis-a"><Icon name="discord" size={15} /> Se connecter</Link>}

      <style>{`
        .acc-avis{display:flex;gap:11px;align-items:flex-start;flex-wrap:wrap;
          margin-top:20px;padding:14px 16px;border-radius:12px;font-size:13.5px;line-height:1.55;
          color:var(--text);background:rgba(255,210,74,.07);border:1px solid rgba(255,210,74,.3)}
        .acc-avis>span{flex:1;min-width:200px}
        .acc-avis-a{display:inline-flex;align-items:center;gap:7px;text-decoration:none;font-size:13px;font-weight:600;
          padding:7px 14px;border-radius:9px;background:#5865F2;color:#fff}
        .acc-avis-a:hover{filter:brightness(1.1)}
      `}</style>
    </div>
  );
}
