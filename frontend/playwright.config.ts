import { defineConfig, devices } from "@playwright/test";

// Los tests corren contra el stack local completo: Supabase (supabase start,
// :54321) tiene que estar arriba antes; la app (Next) la levanta Playwright
// solo si no está corriendo ya.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  // Los dos tamaños contra los que venimos revisando el diseño: desktop y
  // un mobile de 375px (el más angosto que nos importa).
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
