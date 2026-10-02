import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/web-orders/[id]/cancel">) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const body = await request.text();
  return forwardToBackend(`/api/web-orders/${id}/cancel`, { method: "POST", body });
}
