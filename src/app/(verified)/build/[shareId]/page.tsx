import "@/app/(verified)/builder/airbuilder.css";
import { SharedBuildViewer } from "./SharedBuildViewer";

// Vue d'un build partagé. Réservée aux membres du serveur Discord comme le
// reste du site : un build dit la classe, le stuff et le niveau de quelqu'un —
// ça se montre entre membres, pas à internet.
export default async function SharedBuildPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  return (
    <div className="abx builder-readonly" style={{ padding: 16, maxWidth: 1120, margin: "0 auto" }}>
      <SharedBuildViewer shareId={shareId} />
    </div>
  );
}
