// Tests de las reglas de negocio que no necesitan base de datos ni Stripe.
import { describe, expect, it } from "vitest";
import { puedeCambiar } from "../src/lib/estados";
import { formatearPrecio } from "../src/lib/formato";
import { calcularTotal, contarArticulos, type LineaCarrito } from "../src/store/carrito";

const linea = (precio: number, cantidad: number): LineaCarrito =>
  ({ id: 1, nombre: "x", imagen: "", stock: 10, precio, cantidad });

describe("precios en centimos", () => {
  it("formatea 4990 como 49,90 €", () => {
    expect(formatearPrecio(4990).replace(/\s/g, " ")).toBe("49,90 €");
  });
  it("suma el carrito sin decimales flotantes", () => {
    const lineas = [linea(4990, 2), linea(8990, 1)];
    expect(calcularTotal(lineas)).toBe(18970);
    expect(contarArticulos(lineas)).toBe(3);
  });
});

describe("estados del pedido (admin)", () => {
  it("permite PAGADO -> ENVIADO -> ENTREGADO", () => {
    expect(puedeCambiar("PAGADO", "ENVIADO")).toBe(true);
    expect(puedeCambiar("ENVIADO", "ENTREGADO")).toBe(true);
  });
  it("el admin NO puede marcar un pedido como PAGADO (eso es del webhook)", () => {
    expect(puedeCambiar("PENDIENTE", "PAGADO")).toBe(false);
  });
  it("no se vuelve atras ni se cancela algo ya pagado", () => {
    expect(puedeCambiar("ENVIADO", "PAGADO")).toBe(false);
    expect(puedeCambiar("PAGADO", "CANCELADO")).toBe(false);
  });
});
