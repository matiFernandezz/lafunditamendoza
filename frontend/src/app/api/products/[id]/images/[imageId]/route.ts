import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]/images/[imageId]">,
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id, imageId } = await ctx.params;
  return forwardToBackend(`/api/products/${id}/images/${imageId}`, { method: "DELETE" });
}
