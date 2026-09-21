"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminTopBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-zinc-500">Panel de ventas</span>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm font-medium text-zinc-500 underline underline-offset-2"
      >
        Salir
      </button>
    </div>
  );
}
