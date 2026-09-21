import { forwardToBackend, requireSession, unauthorized } from "@/lib/adminProxy";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  return forwardToBackend("/api/categories");
}
