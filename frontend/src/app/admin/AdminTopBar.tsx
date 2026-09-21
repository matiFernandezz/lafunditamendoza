"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/productos", label: "Productos" },
];

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
    <nav aria-label="Panel" className="flex items-center justify-between gap-2">
      <div className="flex">
        {LINKS.map((link) => {
          const current = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-xl px-3 text-base font-medium sm:px-4 ${
                current ? "bg-ink text-paper" : "text-ink active:bg-rule"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="min-h-11 px-3 text-base font-medium text-graphite underline underline-offset-2"
      >
        Salir
      </button>
    </nav>
  );
}
