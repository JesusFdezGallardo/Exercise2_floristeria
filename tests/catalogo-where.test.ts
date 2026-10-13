// El where del catalogo: los filtros de la URL y, siempre, solo los productos visibles. Sin BD.
import { describe, expect, it } from "vitest";
import { whereDe } from "../src/lib/catalogo-where";

const SIN_FILTROS = { q: "", categoria: "", min: null, max: null, orden: "precio-asc" as const };

describe("whereDe", () => {
  it("sin filtros, solo los visibles", () => {
    expect(whereDe(SIN_FILTROS)).toEqual({ visible: true });
  });
  it("con todos los filtros, sigue exigiendo visible", () => {
    expect(whereDe({ q: "Peonías", categoria: "amor", min: 20, max: 50.5, orden: "nombre" })).toEqual({
      visible: true,
      nombreBusqueda: { contains: "peonias" },
      categoria: { slug: "amor" },
      precio: { gte: 2000, lte: 5050 },
    });
  });
  it("solo minimo o solo maximo", () => {
    expect(whereDe({ ...SIN_FILTROS, min: 30 })).toEqual({ visible: true, precio: { gte: 3000 } });
    expect(whereDe({ ...SIN_FILTROS, max: 30 })).toEqual({ visible: true, precio: { lte: 3000 } });
  });
  it("escapa los comodines de LIKE", () => {
    expect(whereDe({ ...SIN_FILTROS, q: "50%_" })).toEqual({ visible: true, nombreBusqueda: { contains: "50\\%\\_" } });
  });
});
