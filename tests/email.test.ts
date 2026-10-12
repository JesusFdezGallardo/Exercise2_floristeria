// Plantilla del email de confirmacion: muestra envio y entrega, y escapa lo que escribe el cliente.
import { describe, expect, it } from "vitest";
import { formatearPrecio } from "../src/lib/formato";
import { escaparHtml, plantillaConfirmacion, type PedidoEmail } from "../src/lib/plantilla-email";

const pedido: PedidoEmail = {
  id: 7,
  email: "ana@gmail.com",
  total: 3880,
  gastosEnvio: 390,
  envioZona: "Reparto en Sabadell",
  entrega: { nombre: "Marta López", telefono: "612345678", direccion: "Carrer de Gràcia 12", cp: "08208", ciudad: "Sabadell", mensaje: "¡Felicidades!" },
  lineas: [{ nombre: "Ramo de rosas", cantidad: 1, precioUnitario: 3490 }],
};

describe("escaparHtml", () => {
  it("convierte los caracteres especiales de HTML", () => {
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("plantillaConfirmacion", () => {
  it("muestra productos, envio con su zona y total", () => {
    const html = plantillaConfirmacion(pedido);
    expect(html).toContain(formatearPrecio(3490)); // subtotal
    expect(html).toContain("Reparto en Sabadell");
    expect(html).toContain(formatearPrecio(390));
    expect(html).toContain(formatearPrecio(3880));
  });
  it("con envio gratis dice Gratis", () => {
    expect(plantillaConfirmacion({ ...pedido, gastosEnvio: 0, total: 3490 })).toContain("Gratis");
  });
  it("muestra a quien y donde se entrega, y el mensaje de la tarjeta", () => {
    const html = plantillaConfirmacion(pedido);
    for (const t of ["Marta López", "612345678", "Carrer de Gràcia 12", "08208", "Sabadell", "¡Felicidades!"]) expect(html).toContain(t);
  });
  it("escapa lo que escribe el cliente (no se puede meter HTML en el email)", () => {
    const html = plantillaConfirmacion({
      ...pedido,
      entrega: { ...pedido.entrega!, nombre: "<b>Marta</b>", mensaje: `<a href="https://malo.example">pincha</a>` },
    });
    expect(html).not.toContain("<b>Marta</b>");
    expect(html).not.toContain(`<a href="https://malo.example">`);
    expect(html).toContain("&lt;b&gt;Marta&lt;/b&gt;");
  });
  it("un pedido de antes de los envios se pinta como antes: sin entrega ni linea de envio", () => {
    const html = plantillaConfirmacion({ ...pedido, gastosEnvio: 0, envioZona: null, entrega: null, total: 3490 });
    expect(html).not.toContain("Entrega");
    expect(html).not.toContain("Envío");
    expect(html).toContain(formatearPrecio(3490));
  });
});
