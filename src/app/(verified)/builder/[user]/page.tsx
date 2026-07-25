import "../airbuilder.css";
import { requireGuild } from "@/lib/access";
import { BuilderViewer } from "./BuilderViewer";

// /builder/<user> — vue lecture seule du build d'un membre (lien depuis le GuildViewer).
// ?v=<snapshotId> → ouvre une version archivée (historique #7).
export default async function BuilderUserPage({ params, searchParams }: { params: Promise<{ user: string }>; searchParams: Promise<{ v?: string }> }) {
  await requireGuild(); // consulter le build d'un autre reste réservé à la guilde
  const { user } = await params;
  const { v } = await searchParams;
  return (
    <div className="abx builder-readonly">
      <BuilderViewer user={user} version={v} />
    </div>
  );
}
