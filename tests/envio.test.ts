// Gastos de envio por codigo postal: zonas, envio gratis y codigos rechazados. Sin BD ni Stripe.
import { describe, expect, it } from "vitest";
import { calcularEnvio, TARIFAS_ENVIO } from "../src/lib/envio";

const { SABADELL, PROVINCIA, PENINSULA } = TARIFAS_ENVIO;

describe("tarifas de envio", () => {
  // Si cambian los precios, este test se actualiza a la vez que la tabla (a proposito: que sea un cambio consciente)
  it("son las de la spec", () => {
    expect(TARIFAS_ENVIO).toEqual({
      SABADELL: { nombre: "Reparto en Sabadell", coste: 390, gratisDesde: 4000 },
      PROVINCIA: { nombre: "Mensajería · provincia de Barcelona", coste: 690, gratisDesde: 7000 },
      PENINSULA: { nombre: "Mensajería 24 h · península", coste: 990, gratisDesde: null },
    });
  });
});

describe("calcularEnvio: zonas", () => {
  it("08208 (la tienda) es reparto en Sabadell y dice cuanto falta para el envio gratis", () => {
    expect(calcularEnvio("08208", 2000)).toEqual({
      ok: true, zona: "SABADELL", nombre: SABADELL.nombre, coste: SABADELL.coste, faltaParaGratis: 2000,
    });
  });
  it("de 08201 a 08208 es Sabadell", () => {
    for (const cp of ["08201", "08202", "08203", "08204", "08205", "08206", "08207", "08208"]) {
      expect(calcularEnvio(cp, 0)).toMatchObject({ ok: true, zona: "SABADELL" });
    }
  });
  it("08200 y 08209 ya no son Sabadell, son provincia", () => {
    expect(calcularEnvio("08200", 0)).toMatchObject({ ok: true, zona: "PROVINCIA" });
    expect(calcularEnvio("08209", 0)).toMatchObject({ ok: true, zona: "PROVINCIA" });
  });
  it("08001 (Barcelona) es mensajeria de provincia", () => {
    expect(calcularEnvio("08001", 0)).toEqual({
      ok: true, zona: "PROVINCIA", nombre: PROVINCIA.nombre, coste: PROVINCIA.coste, faltaParaGratis: 7000,
    });
  });
  it("28013 (Madrid) es peninsula: sin envio gratis aunque el pedido sea grande", () => {
    expect(calcularEnvio("28013", 100_000)).toEqual({
      ok: true, zona: "PENINSULA", nombre: PENINSULA.nombre, coste: PENINSULA.coste, faltaParaGratis: null,
    });
  });
  it("los extremos validos 01001 y 50001 son peninsula", () => {
    expect(calcularEnvio("01001", 0)).toMatchObject({ ok: true, zona: "PENINSULA" });
    expect(calcularEnvio("50001", 0)).toMatchObject({ ok: true, zona: "PENINSULA" });
  });
  it("acepta el CP con espacios alrededor o en medio", () => {
    expect(calcularEnvio(" 08208 ", 0)).toMatchObject({ ok: true, zona: "SABADELL" });
    expect(calcularEnvio("08 208", 0)).toMatchObject({ ok: true, zona: "SABADELL" });
  });
});

describe("calcularEnvio: envio gratis", () => {
  it("en Sabadell, 40,00 € justos ya es gratis y 39,99 € no", () => {
    expect(calcularEnvio("08208", 4000)).toMatchObject({ coste: 0, faltaParaGratis: null });
    expect(calcularEnvio("08208", 3999)).toMatchObject({ coste: SABADELL.coste, faltaParaGratis: 1 });
  });
  it("en provincia, 70,00 € justos ya es gratis y 69,99 € no", () => {
    expect(calcularEnvio("08001", 7000)).toMatchObject({ coste: 0, faltaParaGratis: null });
    expect(calcularEnvio("08001", 6999)).toMatchObject({ coste: PROVINCIA.coste, faltaParaGratis: 1 });
  });
});

describe("calcularEnvio: codigos rechazados", () => {
  it("no envia a Baleares, Canarias, Ceuta ni Melilla", () => {
    for (const cp of ["07001", "35001", "38001", "51001", "52001"]) {
      expect(calcularEnvio(cp, 0)).toEqual({ ok: false, error: "No repartimos en ese código postal" });
    }
  });
  it("rechaza codigos que no existen o mal escritos", () => {
    for (const cp of ["", "     ", "0820", "082081", "08a08", "00123", "53000", "99999", "-8208"]) {
      expect(calcularEnvio(cp, 0)).toEqual({ ok: false, error: "Código postal no válido" });
    }
  });
  it("rechaza enseguida un texto enorme", () => {
    const inicio = performance.now();
    expect(calcularEnvio("0".repeat(100_000), 0)).toEqual({ ok: false, error: "Código postal no válido" });
    expect(performance.now() - inicio).toBeLessThan(50);
  });
});
