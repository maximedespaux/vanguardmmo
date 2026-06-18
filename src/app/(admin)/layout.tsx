import { Shell } from "@/components/Shell";
import { requireAdmin } from "@/lib/access";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <Shell>{children}</Shell>;
}
