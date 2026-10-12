// Reglas del admin de productos: precios escritos en euros, unidades, validacion y reposicion. Sin BD.
import { describe, expect, it } from "vitest";
import {
  esReposicion, LIMITES_CORREGIR, LIMITES_REPONER, leerPrecio, leerUnidades, ordenarParaAdmin, precioParaEditar,
  primerCampoConErrorProducto, validarProducto,
} from "../src/lib/productos-admin";

describe("leerPrecio: euros escritos a centimos", () => {
  it("acepta coma o punto y hasta dos decimales", () => {
    expect(leerPrecio("45,90")).toBe(4590);
    expect(leerPrecio("45.9")).toBe(4590);
    expect(leerPrecio("45,5")).toBe(4550);
    expect(leerPrecio("45")).toBe(4500);
    expect(leerPrecio("0,50")).toBe(50);
    expect(leerPrecio("1000")).toBe(100_000);
  });
  it("tolera espacios y el simbolo del euro", () => {
    expect(leerPrecio(" 45,9 ")).toBe(4590);
    expect(leerPrecio("45,90 €")).toBe(4590);
    expect(leerPrecio("45,90€")).toBe(4590);
  });
  it("no confunde el punto de miles con decimales: 1.000 no son 1,00 euros", () => {
    expect(leerPrecio("1.000")).toBeNull();
    expect(leerPrecio("1.000,00")).toBeNull();
  });
  it("rechaza fuera de rango, mas de dos decimales y lo que no es un numero", () => {
    for (const malo of ["0,10", "0,49", "1000,01", "45,999", "-3", "abc", "", " ", "1e3", "45,", ",5", "4 5"]) {
      expect(leerPrecio(malo), malo).toBeNull();
    }
  });
  it("lo que no es texto (llamada a mano a la accion) es null, sin lanzar", () => {
    for (const malo of [null, undefined, 45, {}, ["45"]]) expect(leerPrecio(malo)).toBeNull();
    expect(leerPrecio("9".repeat(100_000))).toBeNull();
  });
});

describe("precioParaEditar: centimos al texto del formulario", () => {
  it("pone siempre dos decimales con coma", () => {
    expect(precioParaEditar(4590)).toBe("45,90");
    expect(precioParaEditar(4500)).toBe("45,00");
    expect(precioParaEditar(50)).toBe("0,50");
    expect(precioParaEditar(100_000)).toBe("1000,00");
  });
  it("lo que escribe vuelve a leerse igual", () => {
    for (const c of [50, 999, 2400, 4590, 100_000]) expect(leerPrecio(precioParaEditar(c))).toBe(c);
  });
});

describe("leerUnidades", () => {
  it("reponer: de 1 a 500", () => {
    expect(leerUnidades("1", LIMITES_REPONER)).toBe(1);
    expect(leerUnidades(" 500 ", LIMITES_REPONER)).toBe(500);
    expect(leerUnidades("0", LIMITES_REPONER)).toBeNull();
    expect(leerUnidades("501", LIMITES_REPONER)).toBeNull();
  });
  it("corregir: de 0 a 500", () => {
    expect(leerUnidades("0", LIMITES_CORREGIR)).toBe(0);
    expect(leerUnidades("500", LIMITES_CORREGIR)).toBe(500);
    expect(leerUnidades("501", LIMITES_CORREGIR)).toBeNull();
  });
  it("solo enteros escritos con cifras", () => {
    for (const malo of ["2,5", "2.5", "-3", "+3", "1e3", "diez", "", "0x10", null, 7, "9".repeat(1000)]) {
      expect(leerUnidades(malo, LIMITES_CORREGIR), String(malo)).toBeNull();
    }
  });
});

const BUENO = { nombre: "Ramo de peonías", descripcion: "Peonías rosas.", precio: "52", categoriaId: "1", visible: "on" };

describe("validarProducto", () => {
  it("datos buenos: limpios y convertidos", () => {
    expect(validarProducto({ ...BUENO, nombre: "  Ramo de peonías  ", descripcion: " Peonías rosas. " })).toEqual({
      ok: true,
      datos: { nombre: "Ramo de peonías", descripcion: "Peonías rosas.", precio: 5200, categoriaId: 1, visible: true },
    });
  });
  it("visible solo si la casilla llega marcada (\"on\")", () => {
    const sinCasilla = validarProducto({ ...BUENO, visible: undefined });
    expect(sinCasilla.ok && sinCasilla.datos.visible).toBe(false);
    const raro = validarProducto({ ...BUENO, visible: "true" });
    expect(raro.ok && raro.datos.visible).toBe(false);
  });
  it("un error por campo, todos a la vez", () => {
    expect(validarProducto({ nombre: " ", descripcion: "", precio: "gratis", categoriaId: "abc" })).toEqual({
      ok: false,
      errores: {
        nombre: "Escribe el nombre del producto",
        descripcion: "Escribe una descripción",
        precio: "Escribe un precio entre 0,50 € y 1.000 € (por ejemplo, 45,90)",
        categoriaId: "Elige una categoría de la lista",
      },
    });
  });
  it("limites de longitud", () => {
    const r = validarProducto({ ...BUENO, nombre: "a".repeat(81), descripcion: "b".repeat(1001) });
    expect(r).toEqual({
      ok: false,
      errores: { nombre: "El nombre no puede pasar de 80 caracteres", descripcion: "La descripción no puede pasar de 1000 caracteres" },
    });
    expect(validarProducto({ ...BUENO, nombre: "a".repeat(80), descripcion: "b".repeat(1000) }).ok).toBe(true);
  });
  it("lo que no es texto cuenta como vacio y no lanza", () => {
    const r = validarProducto({ nombre: 5, descripcion: null, precio: {}, categoriaId: ["1"] });
    expect(r.ok).toBe(false);
  });
  it("categoria: entero positivo", () => {
    for (const malo of ["0", "-1", "1.5", "1e2", ""]) {
      expect(validarProducto({ ...BUENO, categoriaId: malo }), malo).toMatchObject({ ok: false, errores: { categoriaId: expect.any(String) } });
    }
  });
});

describe("primerCampoConErrorProducto", () => {
  it("sigue el orden del formulario", () => {
    expect(primerCampoConErrorProducto({ precio: "x", nombre: "y" })).toBe("nombre");
    expect(primerCampoConErrorProducto({ categoriaId: "x", precio: "y" })).toBe("precio");
    expect(primerCampoConErrorProducto({})).toBeNull();
  });
});

describe("esReposicion: el producto pasa de agotado a disponible", () => {
  it("de 0 a algo, si", () => expect(esReposicion(0, 5)).toBe(true));
  it("desde stock negativo (dos ventas a la vez de la ultima unidad), tambien", () => expect(esReposicion(-1, 4)).toBe(true));
  it("si ya habia stock, no", () => expect(esReposicion(3, 8)).toBe(false));
  it("si sigue agotado, no", () => {
    expect(esReposicion(0, 0)).toBe(false);
    expect(esReposicion(-2, 0)).toBe(false);
  });
  it("si baja a cero, no", () => expect(esReposicion(5, 0)).toBe(false));
});

describe("ordenarParaAdmin", () => {
  it("primero los agotados (incluido stock negativo), despues por nombre, sin tocar el array original", () => {
    const productos = [
      { nombre: "Ramo de tulipanes", stock: 3 },
      { nombre: "Centro de lirios", stock: 0 },
      { nombre: "Árbol de ejemplo", stock: 2 },
      { nombre: "Ramo de girasoles", stock: -1 },
    ];
    const copia = [...productos];
    expect(ordenarParaAdmin(productos).map((p) => p.nombre)).toEqual([
      "Centro de lirios", "Ramo de girasoles", "Árbol de ejemplo", "Ramo de tulipanes",
    ]);
    expect(productos).toEqual(copia);
  });
});
