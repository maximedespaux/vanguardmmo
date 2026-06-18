import { Shell } from "@/components/Shell";
import { requireGuild } from "@/lib/access";
export default async function GuildLayout({ children }: { children: React.ReactNode }) {
  await requireGuild(); // redirige si rôle insuffisant
  return <Shell>{children}</Shell>;
}
