// Contraste WCAG AA (4,5:1) de los colores del tema (src/app/globals.css, bloque :root).
// Los colores estan en oklch: se pasan a sRGB para calcular la luminancia, igual que hace el navegador.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
const raiz = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));

type RGB = [number, number, number]; // sRGB codificado, 0..1

function variable(nombre: string): RGB {
  const m = raiz.match(new RegExp(`--${nombre}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`));
  if (!m) throw new Error(`--${nombre} no esta en :root como oklch(L C H)`);
  const [L, C, H] = m.slice(1).map(Number);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lineal = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const cod = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  return lineal.map((x) => Math.min(1, Math.max(0, cod(x)))) as RGB;
}

// Un color con transparencia (bg-destructive/10) pintado sobre otro, como lo compone el navegador
const sobre = (c: RGB, alfa: number, fondo: RGB): RGB => c.map((x, i) => alfa * x + (1 - alfa) * fondo[i]) as RGB;

function luminancia(c: RGB): number {
  const lin = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contraste(a: RGB, b: RGB): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe("contraste del tema (WCAG AA, 4,5:1)", () => {
  const fondo = variable("background");
  const casos: [string, RGB, RGB][] = [
    ["texto sobre crema", variable("foreground"), fondo],
    ["texto de los botones sobre verde", variable("primary-foreground"), variable("primary")],
    ["texto secundario sobre crema", variable("muted-foreground"), fondo],
    ["texto secundario sobre fondo suave", variable("muted-foreground"), variable("muted")],
    ["error en rojo sobre crema (login del admin, ficha agotada)", variable("destructive"), fondo],
    ["distintivo Agotado (rojo sobre rojo al 10 %)", variable("destructive"), sobre(variable("destructive"), 0.1, variable("card"))],
  ];
  for (const [nombre, texto, detras] of casos) {
    it(nombre, () => {
      expect(contraste(texto, detras)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
