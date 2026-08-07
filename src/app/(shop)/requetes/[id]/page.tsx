"use client";
import { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { Fil } from "@/components/Fil";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import type { Role } from "@prisma/client";
import { BandeauVente } from "@/components/BandeauVente";

/**
 * Page d'une requête boutique : la négociation en plein écran.
 *
 * Le fil existait dans un panneau replié au fond d'une carte — utilisable pour
 * un mot, intenable pour marchander. Ici la discussion et les offres tiennent
 * ensemble, et le lien est partageable : on peut renvoyer quelqu'un vers SA
 * demande, ce qu'un panneau replié ne permet pas.
 */
export default function RequetePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const moi = session?.user as { id?: string; role?: Role } | undefined;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="cart" title="Demande" subtitle="Discute et négocie ici. Tout se règle sur le site." />
      <Link href="/messages" style={{ fontSize: 12.5, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <Icon name="arrow-left" size={13} /> Retour à mes conversations
      </Link>

      <div className="glass-card fx-card" style={{ padding: 16 }}>
        {/* Qui fournit l'objet vient AVANT ce qu'on s'est dit : la conversation
            ne sert à rien tant que personne n'est en face. */}
        <BandeauVente id={id} moiId={moi?.id} estStaff={moi?.role ? canAccessAdmin(moi.role) : false} deLaGuilde={(moi?.role ? canAccessGuild(moi.role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1"} />
        <Fil type="requete" id={id} moiId={moi?.id} estStaff={moi?.role ? canAccessAdmin(moi.role) : false} negociation />
      </div>
    </div>
  );
}
