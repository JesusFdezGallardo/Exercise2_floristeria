// Reglas de las cuentas que no necesitan base de datos ni Google.
import { describe, expect, it } from "vitest";
import { destinoSeguro, esEmailAdmin, leerSesion, mensajeErrorEntrada, puedeVerPedido } from "../src/lib/cuentas";

describe("esEmailAdmin (semilla de ADMIN_EMAILS)", () => {
  it("encuentra el email en la lista", () => {
    expect(esEmailAdmin("ana@gmail.com", "luis@gmail.com,ana@gmail.com")).toBe(true);
  });
  it("no distingue mayusculas y quita espacios", () => {
    expect(esEmailAdmin("  Ana@Gmail.com ", " luis@gmail.com , ANA@gmail.com ")).toBe(true);
  });
  it("ignora comas sobrantes", () => {
    expect(esEmailAdmin("ana@gmail.com", ",,ana@gmail.com,")).toBe(true);
  });
  it("una lista vacia o sin definir no hace admin a nadie", () => {
    expect(esEmailAdmin("ana@gmail.com", "")).toBe(false);
    expect(esEmailAdmin("ana@gmail.com", undefined)).toBe(false);
    expect(esEmailAdmin("", ",")).toBe(false);
  });
  it("no acepta coincidencias parciales", () => {
    expect(esEmailAdmin("ana@gmail.co", "ana@gmail.com")).toBe(false);
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
});

describe("mensajeErrorEntrada", () => {
  it("sin codigo no hay mensaje", () => {
    expect(mensajeErrorEntrada(undefined)).toBeNull();
  });
  it("traduce los codigos conocidos de Auth.js", () => {
    expect(mensajeErrorEntrada("AccessDenied")).toMatch(/verificado/);
    expect(mensajeErrorEntrada("Configuration")).toMatch(/configurado/);
  });
  it("cualquier otro codigo da un mensaje generico", () => {
    expect(mensajeErrorEntrada("OAuthCallbackError")).toMatch(/inténtalo de nuevo/);
  });
});

describe("leerSesion", () => {
  it("convierte el id a numero y el email a minusculas", () => {
    expect(leerSesion({ id: "7", email: "Ana@Gmail.com" })).toEqual({ id: 7, email: "ana@gmail.com" });
  });
  it("sin sesion, sin email o con id raro devuelve null", () => {
    expect(leerSesion(undefined)).toBeNull();
    expect(leerSesion({ id: "7" })).toBeNull();
    expect(leerSesion({ id: "abc", email: "a@b.c" })).toBeNull();
    expect(leerSesion({ id: "0", email: "a@b.c" })).toBeNull();
    expect(leerSesion({ id: "1.5", email: "a@b.c" })).toBeNull();
  });
});
