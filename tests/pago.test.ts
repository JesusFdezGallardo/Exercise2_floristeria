// Lo que se manda a Stripe y el total del pedido: tienen que cuadrar (Stripe cobra lineas + envio).
import { describe, expect, it } from "vitest";
import { lineasDelCarrito, prepararPago, subtotalDe } from "../src/lib/pago";

const lineas = [
  { nombre: "Ramo de rosas", precio: 3490, cantidad: 2 },
  { nombre: "Centro de mesa", precio: 2990, cantidad: 1 },
];

describe("prepararPago", () => {
  it("el subtotal suma precio por cantidad en centimos", () => {
    expect(subtotalDe(lineas)).toBe(9970);
    expect(subtotalDe([])).toBe(0);
  });
  it("el total es el subtotal mas el envio", () => {
    expect(prepararPago(lineas, { nombre: "Mensajería 24 h · península", coste: 990 }).total).toBe(10960);
  });
  it("con envio gratis el total es el subtotal", () => {
    expect(prepararPago(lineas, { nombre: "Reparto en Sabadell", coste: 0 }).total).toBe(9970);
  });
  it("manda las lineas a Stripe en centimos y en euros", () => {
    expect(prepararPago(lineas, { nombre: "x", coste: 0 }).lineItems).toEqual([
      { quantity: 2, price_data: { currency: "eur", unit_amount: 3490, product_data: { name: "Ramo de rosas" } } },
      { quantity: 1, price_data: { currency: "eur", unit_amount: 2990, product_data: { name: "Centro de mesa" } } },
    ]);
  });
  it("manda un unico envio ya calculado, con el nombre de la zona", () => {
    expect(prepararPago(lineas, { nombre: "Reparto en Sabadell", coste: 390 }).shippingOptions).toEqual([
      { shipping_rate_data: { type: "fixed_amount", display_name: "Reparto en Sabadell", fixed_amount: { amount: 390, currency: "eur" } } },
    ]);
  });
  it("lo que cobrara Stripe (lineas + envio) es el total que se guarda", () => {
    const { total, lineItems, shippingOptions } = prepararPago(lineas, { nombre: "x", coste: 690 });
    const lineasStripe = lineItems.reduce((t, l) => t + (l.price_data?.unit_amount ?? 0) * (l.quantity ?? 0), 0);
    const envioStripe = shippingOptions[0].shipping_rate_data?.fixed_amount?.amount ?? 0;
    expect(lineasStripe + envioStripe).toBe(total);
  });
});

describe("lineasDelCarrito: lo que pide el carrito contra lo que dice la BD", () => {
  const rosas = { id: 1, nombre: "Ramo de rosas", precio: 4500, stock: 5, visible: true };
  const lirios = { id: 2, nombre: "Centro de lirios", precio: 6500, stock: 3, visible: false };

  it("con todo disponible, une cada articulo con su producto", () => {
    expect(lineasDelCarrito([{ id: 1, cantidad: 2 }], [rosas])).toEqual({ ok: true, lineas: [{ producto: rosas, cantidad: 2 }] });
  });
  it("un producto oculto desde el admin dice CUAL es, para que el cliente sepa que quitar", () => {
    expect(lineasDelCarrito([{ id: 1, cantidad: 1 }, { id: 2, cantidad: 1 }], [rosas, lirios])).toEqual({
      ok: false, error: "Centro de lirios ya no está disponible: quítalo del carrito",
    });
  });
  it("un producto que ya no existe", () => {
    expect(lineasDelCarrito([{ id: 9, cantidad: 1 }], [rosas])).toEqual({ ok: false, error: "Un producto del carrito ya no existe" });
  });
  it("sin stock suficiente", () => {
    expect(lineasDelCarrito([{ id: 1, cantidad: 6 }], [rosas])).toEqual({ ok: false, error: "Solo quedan 5 unidades de Ramo de rosas" });
  });
});
