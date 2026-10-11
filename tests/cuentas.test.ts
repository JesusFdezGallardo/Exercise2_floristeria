// Reglas de las cuentas que no necesitan base de datos.
import { describe, expect, it } from "vitest";
import { destinoSeguro, puedeVerPedido, validarRegistro } from "../src/lib/cuentas";

const valido = { nombre: "Ana", email: "ana@gmail.com", contrasena: "12345678", repetir: "12345678" };

describe("validarRegistro", () => {
  it("acepta un registro correcto, recorta el nombre y pasa el email a minusculas", () => {
    expect(validarRegistro({ ...valido, nombre: "  Ana Pérez ", email: " Ana@Gmail.COM " })).toEqual({
      ok: true,
      datos: { nombre: "Ana Pérez", email: "ana@gmail.com" },
    });
  });
  it("exige nombre", () => {
    expect(validarRegistro({ ...valido, nombre: "   " })).toEqual({ ok: false, error: "Escribe tu nombre" });
  });
  it("rechaza un nombre de mas de 80 caracteres", () => {
    expect(validarRegistro({ ...valido, nombre: "a".repeat(81) })).toEqual({ ok: false, error: "El nombre es demasiado largo" });
  });
  it("rechaza enseguida un email enorme (sin limite, el regex tardaba minutos: ReDoS)", () => {
    const inicio = performance.now();
    const r = validarRegistro({ ...valido, email: "a@" + ".".repeat(50_000) + "@" });
    expect(performance.now() - inicio).toBeLessThan(50);
    expect(r).toEqual({ ok: false, error: "Escribe un email válido" });
  });
  it("rechaza un email valido de mas de 254 caracteres (el maximo de un email)", () => {
    expect(validarRegistro({ ...valido, email: "a".repeat(250) + "@b.es" })).toEqual({ ok: false, error: "Escribe un email válido" });
  });
  it("exige un email con formato valido", () => {
    for (const email of ["", "ana", "ana@", "@gmail.com", "ana@gmail", "ana @gmail.com", "ana@gmail..com", "ana@.gmail.com"]) {
      expect(validarRegistro({ ...valido, email })).toEqual({ ok: false, error: "Escribe un email válido" });
    }
  });
  it("exige al menos 8 caracteres de contraseña", () => {
    expect(validarRegistro({ ...valido, contrasena: "1234567", repetir: "1234567" })).toEqual({
      ok: false,
      error: "La contraseña necesita al menos 8 caracteres",
    });
  });
  it("rechaza contraseñas de mas de 200 caracteres (scrypt con textos enormes es caro)", () => {
    const larga = "a".repeat(201);
    expect(validarRegistro({ ...valido, contrasena: larga, repetir: larga })).toEqual({
      ok: false,
      error: "La contraseña es demasiado larga (máximo 200 caracteres)",
    });
  });
  it("exige que las dos contraseñas coincidan", () => {
    expect(validarRegistro({ ...valido, repetir: "87654321" })).toEqual({ ok: false, error: "Las contraseñas no coinciden" });
  });
});

describe("puedeVerPedido", () => {
  it("el dueño ve su pedido", () => {
    expect(puedeVerPedido({ id: 3, rol: "CLIENTE" }, { usuarioId: 3 })).toBe(true);
  });
  it("otro cliente no lo ve", () => {
    expect(puedeVerPedido({ id: 4, rol: "CLIENTE" }, { usuarioId: 3 })).toBe(false);
  });
  it("un pedido antiguo sin dueño no lo ve ningun cliente", () => {
    expect(puedeVerPedido({ id: 3, rol: "CLIENTE" }, { usuarioId: null })).toBe(false);
  });
  it("el admin ve cualquiera", () => {
    expect(puedeVerPedido({ id: 1, rol: "ADMIN" }, { usuarioId: 3 })).toBe(true);
    expect(puedeVerPedido({ id: 1, rol: "ADMIN" }, { usuarioId: null })).toBe(true);
  });
});

describe("destinoSeguro (a donde volver tras entrar)", () => {
  it("acepta rutas de la propia tienda", () => {
    expect(destinoSeguro("/carrito")).toBe("/carrito");
    expect(destinoSeguro("/admin?estado=PAGADO")).toBe("/admin?estado=PAGADO");
  });
  it("manda a / si falta o apunta fuera", () => {
    expect(destinoSeguro(undefined)).toBe("/");
    expect(destinoSeguro("")).toBe("/");
    expect(destinoSeguro("https://malo.com")).toBe("/");
    expect(destinoSeguro("//malo.com")).toBe("/");
    expect(destinoSeguro("/\\malo.com")).toBe("/");
  });
  it("no se deja engañar por tabuladores o saltos de linea (el navegador los quita: /\\t/malo.com = //malo.com)", () => {
    expect(destinoSeguro("/\t/malo.com")).toBe("/");
    expect(destinoSeguro("/\n/malo.com")).toBe("/");
    expect(destinoSeguro("/\r\n/malo.com")).toBe("/");
  });
});
