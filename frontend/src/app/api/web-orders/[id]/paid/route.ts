import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/web-orders/[id]/paid">) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  return forwardToBackend(`/api/web-orders/${id}/paid`, { method: "POST" });
}
