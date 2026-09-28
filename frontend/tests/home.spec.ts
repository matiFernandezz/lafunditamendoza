import { expect, test } from "@playwright/test";

test("la home carga con su hero, el logo y las categorías", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu iPhone, pero más vos.");
  await expect(page.getByRole("img", { name: "La Fundita" })).toBeVisible();
  // Dentro de <main>: en mobile los links del nav del header existen pero
  // están ocultos detrás del menú hamburguesa.
  await expect(page.locator('main a[href^="/categoria/"]').first()).toBeVisible();
});

// El optimizador de next/image ya rompió en silencio todas las fotos del
// sitio (remotePatterns sin puerto + bloqueo de IPs privadas): el <img>
// quedaba "complete" pero con naturalWidth 0, así que se chequea eso y no
// la visibilidad.
test("las fotos de la home se descargan de verdad", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const broken = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );

  expect(broken).toEqual([]);
});
