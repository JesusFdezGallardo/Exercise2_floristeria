// Carrito por usuario: la clave de localStorage depende de quien ha entrado, y al entrar se suma el anonimo.
import { describe, expect, it } from "vitest";
import { claveCarrito, juntarCarritos, type LineaCarrito } from "../src/store/carrito";

const linea = (id: number, cantidad: number, stock = 10, precio = 1000): LineaCarrito =>
  ({ id, nombre: `p${id}`, imagen: "", precio, stock, cantidad });

describe("claveCarrito", () => {
  it("sin sesion usa la clave de siempre", () => {
    expect(claveCarrito(null)).toBe("carrito-rincon");
  });
  it("con sesion, una clave por usuario", () => {
    expect(claveCarrito(7)).toBe("carrito-rincon:7");
  });
});

describe("juntarCarritos (al entrar)", () => {
  it("dos vacios dan uno vacio", () => {
    expect(juntarCarritos([], [])).toEqual([]);
  });
  it("si solo hay anonimo, se queda el anonimo", () => {
    expect(juntarCarritos([linea(1, 2)], [])).toEqual([linea(1, 2)]);
  });
  it("si solo hay del usuario, se queda el del usuario", () => {
    expect(juntarCarritos([], [linea(1, 2)])).toEqual([linea(1, 2)]);
  });
  it("suma las cantidades del mismo producto sin duplicar la linea", () => {
    expect(juntarCarritos([linea(1, 2)], [linea(1, 3)])).toEqual([linea(1, 5)]);
  });
  it("no pasa del stock (el mayor de los dos guardados)", () => {
    expect(juntarCarritos([linea(1, 4, 6)], [linea(1, 4, 5)])).toEqual([linea(1, 6, 6)]);
    expect(juntarCarritos([linea(2, 9, 3)], [])).toEqual([linea(2, 3, 3)]);
  });
  it("conserva el orden: primero las del usuario y despues las nuevas", () => {
    const r = juntarCarritos([linea(3, 1), linea(1, 1)], [linea(1, 1), linea(2, 1)]);
    expect(r.map((l) => l.id)).toEqual([1, 2, 3]);
  });
  it("de una linea repetida se queda con los datos del anonimo (los mas recientes)", () => {
    const r = juntarCarritos([linea(1, 1, 10, 1200)], [linea(1, 1, 10, 1000)]);
    expect(r[0].precio).toBe(1200);
  });
  it("descarta lineas sin unidades (stock agotado)", () => {
    expect(juntarCarritos([linea(1, 2, 0)], [])).toEqual([]);
  });
  it("no modifica las listas de entrada", () => {
    const usuario = [linea(1, 1)];
    juntarCarritos([linea(1, 1)], usuario);
    expect(usuario).toEqual([linea(1, 1)]);
  });
});
