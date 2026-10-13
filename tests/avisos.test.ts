// Reglas de los avisos de reposicion: quien puede pedirlos, cuando se envian al guardar, lotes y textos. Sin BD.
import { describe, expect, it } from "vitest";
import {
  debeAvisarAlGuardar, enLotes, puedePedirAviso, SIN_AVISOS, textoAvisosPendientes, textoResultadoAvisos,
} from "../src/lib/avisos";

describe("puedePedirAviso", () => {
  it("solo en productos visibles y agotados (tambien con stock negativo)", () => {
    expect(puedePedirAviso({ visible: true, stock: 0 })).toBe(true);
    expect(puedePedirAviso({ visible: true, stock: -1 })).toBe(true);
    expect(puedePedirAviso({ visible: true, stock: 3 })).toBe(false);
    expect(puedePedirAviso({ visible: false, stock: 0 })).toBe(false);
  });
});

describe("debeAvisarAlGuardar", () => {
  it("avisa cuando un producto oculto pasa a visible con stock", () => {
    expect(debeAvisarAlGuardar({ visible: false }, { visible: true, stock: 2 })).toBe(true);
  });
  it("no avisa en los demas casos", () => {
    expect(debeAvisarAlGuardar({ visible: false }, { visible: true, stock: 0 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: false }, { visible: true, stock: -1 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: true }, { visible: true, stock: 5 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: true }, { visible: false, stock: 5 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: false }, { visible: false, stock: 5 })).toBe(false);
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
