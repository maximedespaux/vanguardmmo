import "../airbuilder.css";
import { BuilderViewer } from "./BuilderViewer";

// /builder/<user> — vue lecture seule du build d'un membre (lien depuis le GuildViewer).
export default async function BuilderUserPage({ params }: { params: Promise<{ user: string }> }) {
  const { user } = await params;
  return (
    <div className="abx builder-readonly">
      <BuilderViewer user={user} />
    </div>
  );
}
