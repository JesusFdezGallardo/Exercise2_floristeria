// Cada producto tiene su ilustracion en public/productos/<slug>.svg, y no sobra ninguna.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCTOS } from "../prisma/catalogo-datos";

const CARPETA = join(process.cwd(), "public", "productos");
const archivos = readdirSync(CARPETA);

describe("ilustraciones de los productos", () => {
  it("cada producto tiene su SVG", () => {
    for (const p of PRODUCTOS) expect(archivos, p.slug).toContain(`${p.slug}.svg`);
  });

  it("no queda ninguna imagen sin producto (por ejemplo, las de Volta)", () => {
    const esperadas = PRODUCTOS.map((p) => `${p.slug}.svg`).sort();
    expect([...archivos].sort()).toEqual(esperadas);
  });

  it("son SVG de 500x500 hechos a mano, sin imagenes ni recursos externos", () => {
    for (const a of archivos) {
      const svg = readFileSync(join(CARPETA, a), "utf8");
      expect(svg.startsWith("<svg"), a).toBe(true);
      expect(svg, a).toContain('viewBox="0 0 500 500"');
      expect(svg, a).not.toMatch(/<image|<script|<text/);
      // la unica URL permitida es la del espacio de nombres de SVG
      expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', ""), a).not.toMatch(/https?:/);
    }
  });
});
