import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = "C:\\Users\\ds228\\AppData\\Local\\Temp\\claude\\c--Users-ds228-Desktop-PA-power-automation-power-automation\\5d64df52-93fb-466b-9666-43408e3f7c0f\\scratchpad";

const browser = await chromium.launch();
const consoleErrors = [];

async function shot(viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[${label}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`[${label}] pageerror: ${err.message}`));

  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 30000 });
  const section = page.locator("section:has-text(\"Курси нашої школи\")").first();
  await section.waitFor({ state: "visible", timeout: 20000 });
  await section.scrollIntoViewIfNeeded();
  // let images/layout settle
  await page.waitForTimeout(800);

  const fullPath = path.join(OUT_DIR, `courses-${label}-full.png`);
  await page.screenshot({ path: fullPath });

  const secPath = path.join(OUT_DIR, `courses-${label}-section.png`);
  await section.screenshot({ path: secPath });

  console.log(`Saved: ${fullPath}`);
  console.log(`Saved: ${secPath}`);

  await context.close();
}

await shot({ width: 1440, height: 900 }, "desktop");
await shot({ width: 390, height: 844 }, "mobile");

await browser.close();

if (consoleErrors.length) {
  console.log("\n--- Console errors ---");
  for (const e of consoleErrors) console.log(e);
} else {
  console.log("\nNo console errors.");
}
