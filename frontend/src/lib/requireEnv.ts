export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Falta ${name}. Copiá .env.example a .env.local y completalo.`);
  }
  return value;
}
