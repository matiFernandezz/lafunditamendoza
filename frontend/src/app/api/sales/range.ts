/**
 * Rango [from, to) de query params ISO 8601 (instantes con zona, p. ej. los
 * que arma el panel desde la hora local del celular). Los dos son opcionales
 * por separado; si vienen ambos, from tiene que ser anterior a to.
 */
export function parseRange(
  searchParams: URLSearchParams,
): { from?: string; to?: string } | { error: string } {
  const parse = (name: "from" | "to") => {
    const value = searchParams.get(name);
    if (value === null) return undefined;
    if (Number.isNaN(Date.parse(value))) {
      throw new Error(`${name} debe ser una fecha ISO 8601 valida`);
    }
    return new Date(value).toISOString();
  };
  try {
    const from = parse("from");
    const to = parse("to");
    if (from && to && from >= to) return { error: "from tiene que ser anterior a to" };
    return { from, to };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
