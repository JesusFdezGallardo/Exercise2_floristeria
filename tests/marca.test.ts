// La tienda es El Rincon de las Flores: no queda nada de Volta, el nombre se escribe en UN solo sitio
// y las claves internas que dependian del nombre han cambiado.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { COOKIE_ADMIN } from "../src/lib/admin";
import { TIENDA } from "../src/lib/tienda";

// Todos los archivos de texto de una carpeta, sin entrar en el cliente generado de Prisma
function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (ruta.includes(join("src", "generated"))) return [];
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx|css|svg|prisma|sql)$/.test(nombre) ? [ruta] : [];
  });
}
const raiz = process.cwd();
const deLaTienda = ["src", "prisma", "public"].flatMap((c) => archivos(join(raiz, c)));

describe("marca de la tienda", () => {
  it("el nombre es El Rincon de las Flores", () => {
    expect(TIENDA.nombre).toBe("El Rincón de las Flores");
  });

  it("no queda ninguna mencion a Volta en src, prisma ni public", () => {
    const conVolta = deLaTienda.filter((f) => /volta/i.test(readFileSync(f, "utf8"))).map((f) => relative(raiz, f));
    expect(conVolta).toEqual([]);
  });

  it("el nombre solo se escribe en src/lib/tienda.ts (evita titulos con el nombre repetido)", () => {
    const conNombre = deLaTienda
      .filter((f) => f.startsWith(join(raiz, "src")) && readFileSync(f, "utf8").includes(TIENDA.nombre))
      .map((f) => relative(raiz, f).replaceAll("\\", "/"));
    expect(conNombre).toEqual(["src/lib/tienda.ts"]);
  });

  it("el carrito usa una clave nueva: los carritos de Volta (ids reutilizados) se ignoran", async () => {
    // En Node no hay localStorage y sin el persist de Zustand no se activa: le damos uno vacio
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    vi.resetModules();
    const { useCarrito } = await import("../src/store/carrito");
    expect(useCarrito.persist.getOptions().name).toBe("carrito-rincon");
    vi.unstubAllGlobals();
  });

  it("la cookie del admin tiene nombre nuevo", () => {
    expect(COOKIE_ADMIN).toBe("admin_rincon");
  });

  it("las notas del proyecto citan la clave actual del carrito, no la de Volta", () => {
    const notas = readFileSync(join(raiz, "docs", "NOTAS-DEL-PROYECTO.md"), "utf8");
    expect(notas).toContain("carrito-rincon");
    expect(notas).not.toContain("carrito-volta");
  });
});
