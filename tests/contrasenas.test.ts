// Contraseñas con scrypt y huella de los tokens de sesion.
import { describe, expect, it } from "vitest";
import { cifrarContrasena, comprobarContrasena, huellaToken } from "../src/lib/contrasenas";

describe("contraseñas", () => {
  it("la misma contraseña se valida", async () => {
    const guardada = await cifrarContrasena("rosas-rojas-8");
    expect(await comprobarContrasena("rosas-rojas-8", guardada)).toBe(true);
  });
  it("otra contraseña no", async () => {
    const guardada = await cifrarContrasena("rosas-rojas-8");
    expect(await comprobarContrasena("rosas-rojas-9", guardada)).toBe(false);
  });
  it("nunca se guarda en claro y dos cifrados de la misma contraseña son distintos (sal aleatoria)", async () => {
    const a = await cifrarContrasena("rosas-rojas-8");
    const b = await cifrarContrasena("rosas-rojas-8");
    expect(a).not.toContain("rosas");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });
  it("un valor guardado mal formado da false sin lanzar", async () => {
    for (const malo of ["", "sinpuntos", "zz:zz", "abcd:1234", "a:b:c", ":"]) {
      expect(await comprobarContrasena("lo-que-sea", malo)).toBe(false);
    }
  });
});

describe("huellaToken", () => {
  it("es el SHA-256 en hexadecimal", () => {
    expect(huellaToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("tokens distintos dan huellas distintas", () => {
    expect(huellaToken("a")).not.toBe(huellaToken("b"));
  });
});
