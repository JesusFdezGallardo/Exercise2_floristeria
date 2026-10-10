// Tests del orden del catalogo: el valor llega de la URL y solo se aceptan los de la lista.
import { describe, expect, it } from "vitest";
import { leerOrden, ORDEN_POR_DEFECTO, orderByDe } from "../src/lib/orden";

describe("orden del catalogo (?orden=...)", () => {
  it("acepta los ordenes conocidos", () => {
    expect(leerOrden("precio-asc")).toBe("precio-asc");
    expect(leerOrden("precio-desc")).toBe("precio-desc");
    expect(leerOrden("nombre")).toBe("nombre");
  });
  it("sin orden, se usa el de siempre: precio ascendente", () => {
    expect(ORDEN_POR_DEFECTO).toBe("precio-asc");
    expect(leerOrden(undefined)).toBe("precio-asc");
    expect(leerOrden("")).toBe("precio-asc");
  });
  it("un valor desconocido no llega a Prisma: cae en el orden por defecto", () => {
    expect(leerOrden("DROP TABLE")).toBe("precio-asc");
    expect(leerOrden("toString")).toBe("precio-asc"); // ni propiedades heredadas de Object
    expect(leerOrden("PRECIO-DESC")).toBe("precio-asc");
  });
  it("si el parametro viene repetido, se usa el primero", () => {
    expect(leerOrden(["precio-desc", "nombre"])).toBe("precio-desc");
  });
  it("cada orden desempata por id para que sea estable", () => {
    expect(orderByDe("precio-desc")).toEqual([{ precio: "desc" }, { id: "asc" }]);
    expect(orderByDe("nombre")).toEqual([{ nombre: "asc" }, { id: "asc" }]);
  });
});
