import { NextResponse, type NextRequest } from "next/server";
import { coverImage, searchProducts } from "@/lib/catalog";

const MAX_RESULTS = 6;

/**
 * Sugerencias del buscador del header (público, sin sesión): las primeras
 * coincidencias con foto, nombre, tipo y precio, y cuántas hay en total.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ data: { total: 0, results: [] } });

  try {
    const products = await searchProducts(query);
    const results = products.slice(0, MAX_RESULTS).map((product) => {
      const prices = product.product_variants.map((v) => v.price);
      return {
        id: product.id,
        name: product.name,
        category: product.category?.name ?? null,
        image: coverImage(product),
        min_price: Math.min(...prices),
        same_price: new Set(prices).size <= 1,
      };
    });
    return NextResponse.json(
      { data: { total: products.length, results } },
      // El catálogo cambia poco: el navegador puede reusar la respuesta un ratito.
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    return NextResponse.json({ error: "No se pudo buscar." }, { status: 500 });
  }
}
