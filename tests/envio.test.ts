// Gastos de envio por codigo postal: zonas, envio gratis y codigos rechazados. Sin BD ni Stripe.
import { describe, expect, it } from "vitest";
import { calcularEnvio, entregaDelPedido, MAX_MENSAJE, primerCampoConError, TARIFAS_ENVIO, validarEntrega } from "../src/lib/envio";

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

const valida = {
  nombre: "Marta López",
  telefono: "612 34 56 78",
  direccion: "Carrer de Gràcia 12, 2º 1ª",
  cp: "08208",
  ciudad: "Sabadell",
  mensaje: "¡Feliz cumpleaños!",
};

describe("validarEntrega", () => {
  it("acepta una entrega correcta y la normaliza", () => {
    expect(validarEntrega({ ...valida, nombre: "  Marta López ", cp: " 08 208 " })).toEqual({
      ok: true,
      entrega: { ...valida, telefono: "612345678", cp: "08208" },
    });
  });
  it("el mensaje es opcional: vacio, con espacios o ausente se guarda como null", () => {
    for (const mensaje of ["", "   ", undefined]) {
      const r = validarEntrega({ ...valida, mensaje });
      expect(r.ok && r.entrega.mensaje).toBeNull();
    }
  });
  it("acepta telefonos con +34, espacios, guiones o puntos", () => {
    for (const telefono of ["+34 612 34 56 78", "+34-612-345-678", "612.345.678", "912345678", "712345678", "812345678"]) {
      const r = validarEntrega({ ...valida, telefono });
      expect(r.ok, telefono).toBe(true);
    }
  });
  it("rechaza telefonos que no son de 9 cifras espanolas", () => {
    for (const telefono of ["", "512345678", "61234567", "6123456789", "+33612345678", "61234567a", "0034612345678"]) {
      expect(validarEntrega({ ...valida, telefono }), telefono).toEqual({
        ok: false, errores: { telefono: "Escribe un teléfono español de 9 cifras" },
      });
    }
  });
  it("respeta los limites de nombre, direccion y ciudad", () => {
    const err = (campo: string, valor: string) => {
      const r = validarEntrega({ ...valida, [campo]: valor });
      return r.ok ? null : r.errores[campo as keyof typeof r.errores];
    };
    expect(err("nombre", "a")).toBe("Escribe el nombre de quien recibe el ramo");
    expect(err("nombre", "ab")).toBeNull();
    expect(err("nombre", "a".repeat(80))).toBeNull();
    expect(err("nombre", "a".repeat(81))).toBe("El nombre es demasiado largo");
    expect(err("direccion", "a".repeat(4))).toBe("Escribe la calle, el número y el piso");
    expect(err("direccion", "a".repeat(5))).toBeNull();
    expect(err("direccion", "a".repeat(150))).toBeNull();
    expect(err("direccion", "a".repeat(151))).toBe("La dirección es demasiado larga");
    expect(err("ciudad", "a")).toBe("Escribe la ciudad");
    expect(err("ciudad", "ab")).toBeNull();
    expect(err("ciudad", "a".repeat(60))).toBeNull();
    expect(err("ciudad", "a".repeat(61))).toBe("El nombre de la ciudad es demasiado largo");
  });
  it("el mensaje admite 200 caracteres y no 201", () => {
    expect(MAX_MENSAJE).toBe(200);
    expect(validarEntrega({ ...valida, mensaje: "a".repeat(200) }).ok).toBe(true);
    expect(validarEntrega({ ...valida, mensaje: "a".repeat(201) })).toEqual({
      ok: false, errores: { mensaje: "El mensaje no puede pasar de 200 caracteres" },
    });
  });
  it("el CP usa las reglas de calcularEnvio", () => {
    expect(validarEntrega({ ...valida, cp: "07001" })).toEqual({ ok: false, errores: { cp: "No repartimos en ese código postal" } });
    expect(validarEntrega({ ...valida, cp: "abc" })).toEqual({ ok: false, errores: { cp: "Código postal no válido" } });
  });
  it("devuelve todos los errores a la vez", () => {
    const r = validarEntrega({});
    expect(r.ok).toBe(false);
    expect(Object.keys(r.ok ? {} : r.errores).sort()).toEqual(["ciudad", "cp", "direccion", "nombre", "telefono"]);
  });
  it("no se rompe con datos que no son texto (la accion se puede llamar desde fuera)", () => {
    const r = validarEntrega({ nombre: 42, telefono: null, direccion: { a: 1 }, cp: ["08208"], ciudad: true, mensaje: 7 });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.ok ? {} : r.errores).sort()).toEqual(["ciudad", "cp", "direccion", "nombre", "telefono"]);
  });
  it("rechaza enseguida textos enormes", () => {
    const enorme = "6".repeat(100_000);
    const inicio = performance.now();
    const r = validarEntrega({ nombre: enorme, telefono: enorme, direccion: enorme, cp: enorme, ciudad: enorme, mensaje: enorme });
    expect(performance.now() - inicio).toBeLessThan(50);
    expect(Object.keys(r.ok ? {} : r.errores).sort()).toEqual(["ciudad", "cp", "direccion", "mensaje", "nombre", "telefono"]);
  });
});

describe("entregaDelPedido", () => {
  const pedido = {
    envioNombre: "Marta López", envioTelefono: "612345678", envioDireccion: "Carrer de Gràcia 12",
    envioCp: "08208", envioCiudad: "Sabadell", mensajeTarjeta: null,
  };
  it("lee la entrega de un pedido", () => {
    expect(entregaDelPedido(pedido)).toEqual({
      nombre: "Marta López", telefono: "612345678", direccion: "Carrer de Gràcia 12", cp: "08208", ciudad: "Sabadell", mensaje: null,
    });
  });
  it("devuelve null en los pedidos de antes de los envios (sin entrega)", () => {
    expect(entregaDelPedido({
      envioNombre: null, envioTelefono: null, envioDireccion: null, envioCp: null, envioCiudad: null, mensajeTarjeta: null,
    })).toBeNull();
  });
});

describe("primerCampoConError", () => {
  // El formulario lleva ahi el foco: en el movil los errores quedan por encima del boton de pagar, fuera de la pantalla
  it("devuelve el primer campo con error en el orden del formulario, no en el del objeto", () => {
    expect(primerCampoConError({ ciudad: "x", telefono: "x", mensaje: "x" })).toBe("telefono");
    expect(primerCampoConError({ mensaje: "x", cp: "x" })).toBe("cp");
  });
  it("sin errores devuelve null", () => {
    expect(primerCampoConError({})).toBeNull();
    expect(primerCampoConError({ nombre: undefined })).toBeNull();
  });
});
