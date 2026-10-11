// Tests de la busqueda sin tildes: lo que escribe el cliente y el nombre guardado se normalizan igual.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { escaparLike, normalizar } from "../src/lib/busqueda";
import { PRODUCTOS } from "../prisma/catalogo-datos";

describe("normalizar (busqueda sin tildes ni mayusculas)", () => {
  it("quita las tildes y pasa a minusculas", () => {
    expect(normalizar("Peonías")).toBe("peonias");
    expect(normalizar("PEONÍAS")).toBe("peonias");
    expect(normalizar("peonias")).toBe("peonias");
  });

  it("quita tambien la dieresis y la virgulilla de la ñ", () => {
    expect(normalizar("Pingüino")).toBe("pinguino");
    expect(normalizar("Año")).toBe("ano");
  });

  it("no toca el resto del texto (espacios, numeros)", () => {
    expect(normalizar("Ramo de 12 rosas rojas")).toBe("ramo de 12 rosas rojas");
    expect(normalizar("")).toBe("");
  });

  it("un nombre con tilde se encuentra buscando sin ella", () => {
    const peonias = PRODUCTOS.find((p) => p.slug === "ramo-peonias-rosas")!;
    expect(normalizar(peonias.nombre)).toContain(normalizar("peonias"));
  });
});

describe("la migracion rellena nombreBusqueda igual que normalizar()", () => {
  it("cada letra de translate() en SQL se convierte en lo mismo que en JavaScript", () => {
    const sql = readFileSync(join(process.cwd(), "prisma/migrations/20261011120000_busqueda_sin_tildes/migration.sql"), "utf8");
    const [, de, a] = sql.match(/translate\(\s*"nombre",\s*'([^']+)',\s*'([^']+)'/)!;
    expect([...de].length).toBe([...a].length);
    [...de].forEach((letra, i) => expect(normalizar(letra)).toBe([...a][i]));
  });
});

describe("escaparLike (los comodines de LIKE se buscan como texto)", () => {
  it("escapa % y _ para que no signifiquen 'cualquier cosa'", () => {
    // String.raw: las barras se leen tal cual, sin escapes de JavaScript de por medio
    expect(escaparLike("100%")).toBe(String.raw`100\%`);
    expect(escaparLike("_")).toBe(String.raw`\_`);
  });
  it("escapa tambien la barra invertida, que es el caracter de escape", () => {
    expect(escaparLike(String.raw`a\b`)).toBe(String.raw`a\\b`);
  });
  it("no toca un texto normal", () => {
    expect(escaparLike("peonias")).toBe("peonias");
  });
});
