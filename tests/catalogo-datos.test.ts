// Reglas de los datos del catalogo (los que carga el seed). No necesitan base de datos.
import { describe, expect, it } from "vitest";
import { CATEGORIAS, PRODUCTOS } from "../prisma/catalogo-datos";

describe("datos del catalogo de la floristeria", () => {
  it("tiene las 4 categorias por ocasion", () => {
    expect(CATEGORIAS.map((c) => c.slug)).toEqual(["amor", "celebraciones", "condolencias", "para-casa"]);
  });

  it("tiene 10 productos y cada uno esta en una categoria que existe", () => {
    expect(PRODUCTOS).toHaveLength(10);
    const slugs = new Set(CATEGORIAS.map((c) => c.slug));
    for (const p of PRODUCTOS) expect(slugs.has(p.cat), `${p.slug} -> ${p.cat}`).toBe(true);
  });

  it("los slugs son unicos y aptos para URL y nombre de archivo (ASCII, minusculas, guiones)", () => {
    const todos = [...CATEGORIAS.map((c) => c.slug), ...PRODUCTOS.map((p) => p.slug)];
    expect(new Set(todos).size).toBe(todos.length);
    for (const s of todos) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("los precios estan en CENTIMOS: enteros entre 5 y 200 euros", () => {
    for (const p of PRODUCTOS) {
      expect(Number.isInteger(p.precio), p.slug).toBe(true);
      expect(p.precio, p.slug).toBeGreaterThanOrEqual(500);
      expect(p.precio, p.slug).toBeLessThanOrEqual(20000);
    }
  });

  it("el stock es un entero >= 0 y solo el centro de margaritas esta agotado", () => {
    for (const p of PRODUCTOS) expect(Number.isInteger(p.stock) && p.stock >= 0, p.slug).toBe(true);
    expect(PRODUCTOS.filter((p) => p.stock === 0).map((p) => p.slug)).toEqual(["centro-margaritas-lavanda"]);
  });

  it("todos tienen nombre y descripcion", () => {
    for (const p of PRODUCTOS) {
      expect(p.nombre.trim(), p.slug).not.toBe("");
      expect(p.descripcion.trim(), p.slug).not.toBe("");
    }
  });

  it("el mas caro es el centro de lirios (es lo que muestra ?orden=precio-desc)", () => {
    const masCaro = [...PRODUCTOS].sort((a, b) => b.precio - a.precio)[0];
    expect(masCaro.slug).toBe("centro-lirios-blancos");
  });
});
