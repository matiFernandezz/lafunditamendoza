import type { NextRequest } from "next/server";
import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/product-variants/[id]">,
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const body = await request.text();
  return forwardToBackend(`/api/product-variants/${id}`, { method: "PATCH", body });
}
