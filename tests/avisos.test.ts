// Reglas de los avisos de reposicion: quien puede pedirlos, cuando se envian al guardar, lotes y textos. Sin BD.
import { describe, expect, it } from "vitest";
import {
  enLotes, enviarEnLotes, puedePedirAviso, SIN_AVISOS, textoAvisosPendientes, textoResultadoAvisos,
} from "../src/lib/avisos";
import { formatearPrecio } from "../src/lib/formato";
import { plantillaAvisoReposicion } from "../src/lib/plantilla-email";

describe("puedePedirAviso", () => {
  it("solo en productos visibles y agotados (tambien con stock negativo)", () => {
    expect(puedePedirAviso({ visible: true, stock: 0 })).toBe(true);
    expect(puedePedirAviso({ visible: true, stock: -1 })).toBe(true);
    expect(puedePedirAviso({ visible: true, stock: 3 })).toBe(false);
    expect(puedePedirAviso({ visible: false, stock: 0 })).toBe(false);
  });
});

describe("enviarEnLotes: nunca deja un aviso reservado sin enviar", () => {
  const reservados = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

  it("si todos los lotes salen, no devuelve nada a pendientes", async () => {
    const devueltos: number[] = [];
    const r = await enviarEnLotes(reservados(150), async () => true, async (ids) => { devueltos.push(...ids); });
    expect(r).toEqual({ avisados: 150, fallidos: 0 });
    expect(devueltos).toEqual([]);
  });

  it("devuelve a pendientes los avisos del lote que falla", async () => {
    const devueltos: number[] = [];
    let llamada = 0;
    const r = await enviarEnLotes(reservados(150), async () => ++llamada === 1, async (ids) => { devueltos.push(...ids); });
    expect(r).toEqual({ avisados: 100, fallidos: 50 });
    expect(devueltos).toEqual(reservados(150).slice(100).map((a) => a.id));
  });

  it("si enviar lanza una excepcion, cuenta el lote como fallido y lo devuelve, sin lanzar", async () => {
    const devueltos: number[] = [];
    const r = await enviarEnLotes(
      reservados(3),
      async () => { throw new Error("se corto la conexion"); },
      async (ids) => { devueltos.push(...ids); },
    );
    expect(r).toEqual({ avisados: 0, fallidos: 3 });
    expect(devueltos).toEqual([1, 2, 3]);
  });
});

describe("enLotes", () => {
  const lista = (n: number) => Array.from({ length: n }, (_, i) => i);
  it("trocea en listas de como mucho el tamano pedido", () => {
    expect(enLotes(lista(0), 100)).toEqual([]);
    expect(enLotes(lista(1), 100)).toEqual([[0]]);
    expect(enLotes(lista(100), 100).map((l) => l.length)).toEqual([100]);
    expect(enLotes(lista(101), 100).map((l) => l.length)).toEqual([100, 1]);
    expect(enLotes(lista(250), 100).map((l) => l.length)).toEqual([100, 100, 50]);
  });
  it("no pierde ni repite elementos", () => {
    expect(enLotes(lista(250), 100).flat()).toEqual(lista(250));
  });
});

describe("textoResultadoAvisos", () => {
  it("vacio si no hay nada que contar", () => {
    expect(textoResultadoAvisos(SIN_AVISOS)).toBe("");
  });
  it("producto oculto", () => {
    expect(textoResultadoAvisos({ avisados: 0, fallidos: 0, oculto: true }))
      .toBe(" · el producto está oculto: avisaremos cuando lo hagas visible");
  });
  it("avisados en singular y plural", () => {
    expect(textoResultadoAvisos({ avisados: 1, fallidos: 0, oculto: false })).toBe(" · avisado 1 cliente");
    expect(textoResultadoAvisos({ avisados: 3, fallidos: 0, oculto: false })).toBe(" · avisados 3 clientes");
  });
  it("fallidos en singular y plural", () => {
    expect(textoResultadoAvisos({ avisados: 0, fallidos: 1, oculto: false }))
      .toBe(" · no se pudo avisar a 1 cliente (se reintentará al reponer)");
    expect(textoResultadoAvisos({ avisados: 0, fallidos: 2, oculto: false }))
      .toBe(" · no se pudo avisar a 2 clientes (se reintentará al reponer)");
  });
  it("error al enviar (no se sabe a cuantos)", () => {
    expect(textoResultadoAvisos({ ...SIN_AVISOS, error: true }))
      .toBe(" · no se pudieron enviar los avisos (se reintentará al reponer)");
  });
  it("avisados y fallidos a la vez", () => {
    expect(textoResultadoAvisos({ avisados: 100, fallidos: 20, oculto: false }))
      .toBe(" · avisados 100 clientes · no se pudo avisar a 20 clientes (se reintentará al reponer)");
  });
});

describe("textoAvisosPendientes", () => {
  it("cuenta los pendientes para el admin", () => {
    expect(textoAvisosPendientes(0)).toBe("");
    expect(textoAvisosPendientes(1)).toBe("1 aviso pendiente");
    expect(textoAvisosPendientes(3)).toBe("3 avisos pendientes");
  });
});

describe("plantillaAvisoReposicion", () => {
  const datos = {
    nombreCliente: "Ana <b>",
    nombreProducto: "Centro de margaritas & lavanda",
    precio: 2900,
    url: "https://ejemplo.test/producto/10",
  };
  it("lleva el enlace a la ficha y el precio formateado", () => {
    const html = plantillaAvisoReposicion(datos);
    expect(html).toContain('href="https://ejemplo.test/producto/10"');
    expect(html).toContain(formatearPrecio(2900));
  });
  it("escapa los nombres", () => {
    const html = plantillaAvisoReposicion(datos);
    expect(html).toContain("Ana &lt;b&gt;");
    expect(html).not.toContain("Ana <b>");
    expect(html).toContain("Centro de margaritas &amp; lavanda");
  });
  it("dice que se avisa una sola vez", () => {
    expect(plantillaAvisoReposicion(datos)).toContain("Te avisamos una sola vez");
  });
});
