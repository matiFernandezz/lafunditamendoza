import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/products/[id]/images/reorder">,
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const body = await request.text();
  return forwardToBackend(`/api/products/${id}/images/reorder`, { method: "PATCH", body });
}
