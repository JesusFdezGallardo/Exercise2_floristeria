# Gestión del catálogo en el admin (parte B) · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la floristería edite sus productos (datos, visibilidad y stock) desde `/admin/productos` sin tocar código.

**Architecture:** Un campo nuevo `Producto.visible` y tres Server Actions (`guardarProducto`, `reponerStock`,
`corregirStock`) que validan con funciones puras de `src/lib/productos-admin.ts`. Reponer es un `increment` atómico;
corregir es un `updateMany` condicionado al stock que vio el admin. Las dos llaman a `alReponer` (`src/lib/reposicion.ts`)
cuando un producto pasa de agotado a disponible: ahí se engancharán los avisos de reposición. La tienda filtra los
ocultos en tres sitios: `whereDe` (catálogo), la ficha y `crearCheckout`.

**Tech Stack:** Next.js 15 (App Router, Server Actions, `useActionState`), TypeScript, Prisma 7 + PostgreSQL (Neon),
Tailwind + shadcn/ui (base-ui), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-12-catalogo-admin-design.md`

## Global Constraints

- Todo en español: textos de la web, comentarios y mensajes de commit. Comentarios del código **sin tildes** (como
  el resto del repo); textos que ve el usuario, con tildes.
- El nombre de la tienda solo está en `src/lib/tienda.ts`; no se escribe en ningún otro archivo de `src/`
  (`tests/marca.test.ts`).
- Precios en céntimos (`Int`). Se formatean solo al pintarlos con `formatearPrecio` (`src/lib/formato.ts`).
- Límites (de la spec): nombre 1–80, descripción 1–1000 (tras `trim`); precio de 0,50 € a 1.000,00 € (50–100000
  céntimos), como mucho dos decimales; Reponer de 1 a 500 unidades; Corregir de 0 a 500.
- Cada Server Action de admin empieza con `exigirAdmin()`; cada página de admin usa `usuarioActual()` + `SinAcceso`.
- Escrituras en BD solo en Server Actions. Una sola instancia de Prisma (`@/lib/prisma`).
- Nada de expresiones regulares con riesgo de backtracking sobre lo que escribe el usuario; longitudes acotadas antes.
- Los módulos puros que se testean (`src/lib/productos-admin.ts`, `src/lib/catalogo-where.ts`) importan con rutas
  relativas (`./busqueda`), no con `@/`: Vitest no tiene configurado el alias.
- La migración solo añade una columna con default: tiene que funcionar con el código anterior.
- Antes de dar una tarea por hecha: `npx tsc --noEmit && npm run lint && npm test`.
- No ejecutar `npm run build` con `npm run dev` en marcha (comparten `.next`).

## Review Focus

1. **Stock negativo.** No hay reserva de stock: si dos personas pagan a la vez la última unidad, el stock queda en
   -1. Reponer desde -1 tiene que contar como reposición, y el admin tiene que mostrarlo como *Agotado* y arriba de
   la lista. Lo prueban `esReposicion(-1, 4)` y `ordenarParaAdmin` (Task 1). Por eso `esReposicion` usa
   `antes <= 0`, no `antes === 0` como decía la spec (la spec se ha corregido).
2. **Precios escritos "a la española" o con símbolos.** `"1.000"` no puede convertirse en 1,00 € (se rechaza);
   `"45,90 €"` y `" 45,9 "` se aceptan; `"45,999"` y `"1e3"` se rechazan. Lo prueba `leerPrecio` (Task 1).
3. **Server Actions llamadas a mano con datos falsos** (id `"abc"`, `stockLeido` ausente, unidades `"1e3"`,
   categoría inexistente, `visible` con cualquier valor): devuelven un error y nunca lanzan. Las reglas puras lo
   prueban (Task 1); las acciones, a mano (Task 6, pasos 7 y 8).
4. **Venta mientras se corrige el stock.** El admin tiene la ficha abierta con stock 5, entra una venta (queda 4) y
   guarda "5": no se guarda y se avisa con el valor nuevo. No se puede probar sin BD; se prueba a mano con dos
   pestañas (Task 6, paso 3).
5. **Ocultar un producto que está en un carrito.** Desaparece del catálogo, su ficha da 404 y `crearCheckout` lo
   rechaza. `whereDe` lo prueba (Task 2); la ficha y el checkout, a mano (Task 6, paso 4).

---

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/lib/productos-admin.ts` (nuevo) | Reglas puras: `leerPrecio`, `precioParaEditar`, `leerUnidades`, `validarProducto`, `primerCampoConErrorProducto`, `esReposicion`, `ordenarParaAdmin`. |
| `src/lib/catalogo-where.ts` (nuevo) | `whereDe(f)`: el `where` del catálogo, siempre con `visible: true`. Puro. |
| `src/lib/catalogo.ts` | `buscarProductos` usa `whereDe`. |
| `src/lib/reposicion.ts` (nuevo) | `alReponer(productoId)`: el gancho de reposición (por ahora solo deja una línea en el log). |
| `prisma/schema.prisma` + migración | `Producto.visible Boolean @default(true)`. |
| `src/app/producto/[id]/page.tsx` | Un producto oculto da 404. |
| `src/app/checkout/actions.ts` | Un producto oculto no se puede pagar. |
| `src/app/admin/productos/actions.ts` (nuevo) | `guardarProducto`, `reponerStock`, `corregirStock`. |
| `src/components/navegacion-admin.tsx` (nuevo) | Pestañas Pedidos / Productos. |
| `src/components/badge-producto.tsx` (nuevo) | Insignias *Agotado* y *Oculto*. |
| `src/app/admin/page.tsx` | Añade las pestañas. |
| `src/app/admin/productos/page.tsx` (nuevo) | Lista de productos. |
| `src/app/admin/productos/[id]/page.tsx` (nuevo) | Ficha con los tres formularios. |
| `src/components/campo-formulario.tsx` (nuevo) | `Campo` (sacado de `formulario-envio.tsx`) y `MensajeResultado`. |
| `src/components/formulario-envio.tsx` | Usa el `Campo` compartido. |
| `src/components/formulario-producto.tsx` (nuevo) | Datos del producto. |
| `src/components/formulario-reponer.tsx` (nuevo) | Reponer (+N). |
| `src/components/formulario-corregir-stock.tsx` (nuevo) | Corregir (fijar N). |
| `tests/productos-admin.test.ts` (nuevo) | Tests de las reglas puras. |
| `tests/catalogo-where.test.ts` (nuevo) | Tests de `whereDe`. |
| `CLAUDE.md`, `docs/NOTAS-DEL-PROYECTO.md`, `docs/ESPECIFICACION.md` | Documentación. |

---

### Task 1: Reglas puras del admin de productos

**Files:**
- Create: `src/lib/productos-admin.ts`
- Test: `tests/productos-admin.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `MAX_NOMBRE = 80`, `MAX_DESCRIPCION = 1000`, `LIMITES_REPONER = { min: 1, max: 500 }`, `LIMITES_CORREGIR = { min: 0, max: 500 }`
  - `leerPrecio(v: unknown): number | null` (céntimos)
  - `precioParaEditar(centimos: number): string` (`4590` → `"45,90"`)
  - `leerUnidades(v: unknown, limites: { min: number; max: number }): number | null`
  - `type CampoProducto = "nombre" | "descripcion" | "precio" | "categoriaId"`
  - `type ErroresProducto = Partial<Record<CampoProducto, string>>`
  - `type DatosProducto = { nombre: string; descripcion: string; precio: number; categoriaId: number; visible: boolean }`
  - `validarProducto(d: Partial<Record<CampoProducto | "visible", unknown>>): { ok: true; datos: DatosProducto } | { ok: false; errores: ErroresProducto }`
  - `primerCampoConErrorProducto(errores: ErroresProducto): CampoProducto | null`
  - `esReposicion(antes: number, despues: number): boolean`
  - `ordenarParaAdmin<T extends { nombre: string; stock: number }>(productos: T[]): T[]`

- [ ] **Step 1: Crear la rama**

```bash
git switch main
git switch -c catalogo-admin
```

- [ ] **Step 2: Escribir los tests (fallan)**

Crear `tests/productos-admin.test.ts`:

```ts
// Reglas del admin de productos: precios escritos en euros, unidades, validacion y reposicion. Sin BD.
import { describe, expect, it } from "vitest";
import {
  esReposicion, LIMITES_CORREGIR, LIMITES_REPONER, leerPrecio, leerUnidades, ordenarParaAdmin, precioParaEditar,
  primerCampoConErrorProducto, validarProducto,
} from "../src/lib/productos-admin";

describe("leerPrecio: euros escritos a centimos", () => {
  it("acepta coma o punto y hasta dos decimales", () => {
    expect(leerPrecio("45,90")).toBe(4590);
    expect(leerPrecio("45.9")).toBe(4590);
    expect(leerPrecio("45,5")).toBe(4550);
    expect(leerPrecio("45")).toBe(4500);
    expect(leerPrecio("0,50")).toBe(50);
    expect(leerPrecio("1000")).toBe(100_000);
  });
  it("tolera espacios y el simbolo del euro", () => {
    expect(leerPrecio(" 45,9 ")).toBe(4590);
    expect(leerPrecio("45,90 €")).toBe(4590);
    expect(leerPrecio("45,90€")).toBe(4590);
  });
  it("no confunde el punto de miles con decimales: 1.000 no son 1,00 euros", () => {
    expect(leerPrecio("1.000")).toBeNull();
    expect(leerPrecio("1.000,00")).toBeNull();
  });
  it("rechaza fuera de rango, mas de dos decimales y lo que no es un numero", () => {
    for (const malo of ["0,10", "0,49", "1000,01", "45,999", "-3", "abc", "", " ", "1e3", "45,", ",5", "4 5"]) {
      expect(leerPrecio(malo), malo).toBeNull();
    }
  });
  it("lo que no es texto (llamada a mano a la accion) es null, sin lanzar", () => {
    for (const malo of [null, undefined, 45, {}, ["45"]]) expect(leerPrecio(malo)).toBeNull();
    expect(leerPrecio("9".repeat(100_000))).toBeNull();
  });
});

describe("precioParaEditar: centimos al texto del formulario", () => {
  it("pone siempre dos decimales con coma", () => {
    expect(precioParaEditar(4590)).toBe("45,90");
    expect(precioParaEditar(4500)).toBe("45,00");
    expect(precioParaEditar(50)).toBe("0,50");
    expect(precioParaEditar(100_000)).toBe("1000,00");
  });
  it("lo que escribe vuelve a leerse igual", () => {
    for (const c of [50, 999, 2400, 4590, 100_000]) expect(leerPrecio(precioParaEditar(c))).toBe(c);
  });
});

describe("leerUnidades", () => {
  it("reponer: de 1 a 500", () => {
    expect(leerUnidades("1", LIMITES_REPONER)).toBe(1);
    expect(leerUnidades(" 500 ", LIMITES_REPONER)).toBe(500);
    expect(leerUnidades("0", LIMITES_REPONER)).toBeNull();
    expect(leerUnidades("501", LIMITES_REPONER)).toBeNull();
  });
  it("corregir: de 0 a 500", () => {
    expect(leerUnidades("0", LIMITES_CORREGIR)).toBe(0);
    expect(leerUnidades("500", LIMITES_CORREGIR)).toBe(500);
    expect(leerUnidades("501", LIMITES_CORREGIR)).toBeNull();
  });
  it("solo enteros escritos con cifras", () => {
    for (const malo of ["2,5", "2.5", "-3", "+3", "1e3", "diez", "", "0x10", null, 7, "9".repeat(1000)]) {
      expect(leerUnidades(malo, LIMITES_CORREGIR), String(malo)).toBeNull();
    }
  });
});

const BUENO = { nombre: "Ramo de peonías", descripcion: "Peonías rosas.", precio: "52", categoriaId: "1", visible: "on" };

describe("validarProducto", () => {
  it("datos buenos: limpios y convertidos", () => {
    expect(validarProducto({ ...BUENO, nombre: "  Ramo de peonías  ", descripcion: " Peonías rosas. " })).toEqual({
      ok: true,
      datos: { nombre: "Ramo de peonías", descripcion: "Peonías rosas.", precio: 5200, categoriaId: 1, visible: true },
    });
  });
  it("visible solo si la casilla llega marcada (\"on\")", () => {
    const sinCasilla = validarProducto({ ...BUENO, visible: undefined });
    expect(sinCasilla.ok && sinCasilla.datos.visible).toBe(false);
    const raro = validarProducto({ ...BUENO, visible: "true" });
    expect(raro.ok && raro.datos.visible).toBe(false);
  });
  it("un error por campo, todos a la vez", () => {
    expect(validarProducto({ nombre: " ", descripcion: "", precio: "gratis", categoriaId: "abc" })).toEqual({
      ok: false,
      errores: {
        nombre: "Escribe el nombre del producto",
        descripcion: "Escribe una descripción",
        precio: "Escribe un precio entre 0,50 € y 1.000 € (por ejemplo, 45,90)",
        categoriaId: "Elige una categoría de la lista",
      },
    });
  });
  it("limites de longitud", () => {
    const r = validarProducto({ ...BUENO, nombre: "a".repeat(81), descripcion: "b".repeat(1001) });
    expect(r).toEqual({
      ok: false,
      errores: { nombre: "El nombre no puede pasar de 80 caracteres", descripcion: "La descripción no puede pasar de 1000 caracteres" },
    });
    expect(validarProducto({ ...BUENO, nombre: "a".repeat(80), descripcion: "b".repeat(1000) }).ok).toBe(true);
  });
  it("lo que no es texto cuenta como vacio y no lanza", () => {
    const r = validarProducto({ nombre: 5, descripcion: null, precio: {}, categoriaId: ["1"] });
    expect(r.ok).toBe(false);
  });
  it("categoria: entero positivo", () => {
    for (const malo of ["0", "-1", "1.5", "1e2", ""]) {
      expect(validarProducto({ ...BUENO, categoriaId: malo }), malo).toMatchObject({ ok: false, errores: { categoriaId: expect.any(String) } });
    }
  });
});

describe("primerCampoConErrorProducto", () => {
  it("sigue el orden del formulario", () => {
    expect(primerCampoConErrorProducto({ precio: "x", nombre: "y" })).toBe("nombre");
    expect(primerCampoConErrorProducto({ categoriaId: "x", precio: "y" })).toBe("precio");
    expect(primerCampoConErrorProducto({})).toBeNull();
  });
});

describe("esReposicion: el producto pasa de agotado a disponible", () => {
  it("de 0 a algo, si", () => expect(esReposicion(0, 5)).toBe(true));
  it("desde stock negativo (dos ventas a la vez de la ultima unidad), tambien", () => expect(esReposicion(-1, 4)).toBe(true));
  it("si ya habia stock, no", () => expect(esReposicion(3, 8)).toBe(false));
  it("si sigue agotado, no", () => {
    expect(esReposicion(0, 0)).toBe(false);
    expect(esReposicion(-2, 0)).toBe(false);
  });
  it("si baja a cero, no", () => expect(esReposicion(5, 0)).toBe(false));
});

describe("ordenarParaAdmin", () => {
  it("primero los agotados (incluido stock negativo), despues por nombre, sin tocar el array original", () => {
    const productos = [
      { nombre: "Ramo de tulipanes", stock: 3 },
      { nombre: "Centro de lirios", stock: 0 },
      { nombre: "Árbol de ejemplo", stock: 2 },
      { nombre: "Ramo de girasoles", stock: -1 },
    ];
    const copia = [...productos];
    expect(ordenarParaAdmin(productos).map((p) => p.nombre)).toEqual([
      "Centro de lirios", "Ramo de girasoles", "Árbol de ejemplo", "Ramo de tulipanes",
    ]);
    expect(productos).toEqual(copia);
  });
});
```

- [ ] **Step 3: Ejecutar los tests y ver que fallan**

Run: `npx vitest run tests/productos-admin.test.ts`
Expected: FAIL (`Failed to resolve import "../src/lib/productos-admin"`).

- [ ] **Step 4: Implementar `src/lib/productos-admin.ts`**

```ts
// Reglas del admin de productos: funciones puras, sin BD ni Node, para poder testearlas (tests/productos-admin.test.ts)
// y usarlas tambien en los formularios. Las Server Actions estan en src/app/admin/productos/actions.ts.

export const MAX_NOMBRE = 80;
export const MAX_DESCRIPCION = 1000;
const PRECIO_MINIMO = 50; // centimos: 0,50 EUR
const PRECIO_MAXIMO = 100_000; // centimos: 1.000,00 EUR
export const LIMITES_REPONER = { min: 1, max: 500 };
export const LIMITES_CORREGIR = { min: 0, max: 500 };

// Lo que llega a una Server Action puede ser cualquier cosa: lo que no es texto cuenta como vacio
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Euros con coma o punto y como mucho dos decimales. Cuantificadores acotados: sin backtracking que explote.
// "1.000" no encaja (tres decimales): mejor rechazarlo que guardar 1,00 EUR.
const FORMATO_PRECIO = /^(\d{1,4})(?:[.,](\d{1,2}))?$/;

// "45,90" -> 4590. Sin coma flotante: parte entera y decimales por separado
export function leerPrecio(v: unknown): number | null {
  const t = texto(v);
  if (t.length > 12) return null; // acotar antes del regex
  const m = FORMATO_PRECIO.exec(t.replace("€", "").trim());
  if (!m) return null;
  const centimos = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return centimos >= PRECIO_MINIMO && centimos <= PRECIO_MAXIMO ? centimos : null;
}

// 4590 -> "45,90": como se escribe en el formulario (sin simbolo ni separador de miles, para que leerPrecio lo lea igual)
export function precioParaEditar(centimos: number): string {
  return `${Math.floor(centimos / 100)},${String(centimos % 100).padStart(2, "0")}`;
}

// Unidades de stock: solo cifras (ni signos, ni decimales, ni "1e3")
export function leerUnidades(v: unknown, limites: { min: number; max: number }): number | null {
  const t = texto(v);
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  return n >= limites.min && n <= limites.max ? n : null;
}

export type CampoProducto = "nombre" | "descripcion" | "precio" | "categoriaId";
export type ErroresProducto = Partial<Record<CampoProducto, string>>;
export type DatosProducto = { nombre: string; descripcion: string; precio: number; categoriaId: number; visible: boolean };

// Orden de los campos en el formulario: el primero con error es al que se lleva el foco
const ORDEN_CAMPOS: CampoProducto[] = ["nombre", "descripcion", "precio", "categoriaId"];
export const primerCampoConErrorProducto = (errores: ErroresProducto): CampoProducto | null =>
  ORDEN_CAMPOS.find((c) => errores[c]) ?? null;

export function validarProducto(
  d: Partial<Record<CampoProducto | "visible", unknown>>,
): { ok: true; datos: DatosProducto } | { ok: false; errores: ErroresProducto } {
  const errores: ErroresProducto = {};

  const nombre = texto(d.nombre);
  if (!nombre) errores.nombre = "Escribe el nombre del producto";
  else if (nombre.length > MAX_NOMBRE) errores.nombre = `El nombre no puede pasar de ${MAX_NOMBRE} caracteres`;

  const descripcion = texto(d.descripcion);
  if (!descripcion) errores.descripcion = "Escribe una descripción";
  else if (descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `La descripción no puede pasar de ${MAX_DESCRIPCION} caracteres`;
  }

  const precio = leerPrecio(d.precio);
  if (precio === null) errores.precio = "Escribe un precio entre 0,50 € y 1.000 € (por ejemplo, 45,90)";

  const categoriaTexto = texto(d.categoriaId);
  const categoriaId = /^\d{1,9}$/.test(categoriaTexto) ? Number(categoriaTexto) : 0;
  if (categoriaId <= 0) errores.categoriaId = "Elige una categoría de la lista";

  if (Object.keys(errores).length > 0 || precio === null) return { ok: false, errores };
  // Una casilla marcada llega como "on"; sin marcar, no llega
  return { ok: true, datos: { nombre, descripcion, precio, categoriaId, visible: d.visible === "on" } };
}

// El producto pasa de agotado a disponible. "<= 0" y no "=== 0": sin reserva de stock, dos ventas a la vez de la
// ultima unidad lo dejan en -1 (ver NOTAS, Stock)
export function esReposicion(antes: number, despues: number): boolean {
  return antes <= 0 && despues > 0;
}

// Lista del admin: primero lo que hay que reponer, despues por nombre (con las reglas del español)
export function ordenarParaAdmin<T extends { nombre: string; stock: number }>(productos: T[]): T[] {
  return [...productos].sort((a, b) => Number(a.stock > 0) - Number(b.stock > 0) || a.nombre.localeCompare(b.nombre, "es"));
}
```

- [ ] **Step 5: Ejecutar los tests y ver que pasan**

Run: `npx vitest run tests/productos-admin.test.ts`
Expected: PASS (todos los tests).

- [ ] **Step 6: Comprobación completa y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add src/lib/productos-admin.ts tests/productos-admin.test.ts
git commit -m "Catalogo admin: reglas puras de precio, unidades, validacion y reposicion"
```

---

### Task 2: `Producto.visible` y los tres filtros de la tienda

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Producto`)
- Create: migración `prisma/migrations/<fecha>_producto_visible/migration.sql` (la genera Prisma)
- Create: `src/lib/catalogo-where.ts`
- Modify: `src/lib/catalogo.ts:1-41`
- Modify: `src/app/producto/[id]/page.tsx:14-18`
- Modify: `src/app/checkout/actions.ts:35-41`
- Test: `tests/catalogo-where.test.ts`

**Interfaces:**
- Consumes: `normalizar`, `escaparLike` de `src/lib/busqueda.ts`; `type Filtros` de `src/lib/catalogo.ts`.
- Produces: columna `Producto.visible: boolean`; `whereDe(f: Filtros): Prisma.ProductoWhereInput`.

- [ ] **Step 1: Escribir el test de `whereDe` (falla)**

Crear `tests/catalogo-where.test.ts`:

```ts
// El where del catalogo: los filtros de la URL y, siempre, solo los productos visibles. Sin BD.
import { describe, expect, it } from "vitest";
import { whereDe } from "../src/lib/catalogo-where";

const SIN_FILTROS = { q: "", categoria: "", min: null, max: null, orden: "precio-asc" as const };

describe("whereDe", () => {
  it("sin filtros, solo los visibles", () => {
    expect(whereDe(SIN_FILTROS)).toEqual({ visible: true });
  });
  it("con todos los filtros, sigue exigiendo visible", () => {
    expect(whereDe({ q: "Peonías", categoria: "amor", min: 20, max: 50.5, orden: "nombre" })).toEqual({
      visible: true,
      nombreBusqueda: { contains: "peonias" },
      categoria: { slug: "amor" },
      precio: { gte: 2000, lte: 5050 },
    });
  });
  it("solo minimo o solo maximo", () => {
    expect(whereDe({ ...SIN_FILTROS, min: 30 })).toEqual({ visible: true, precio: { gte: 3000 } });
    expect(whereDe({ ...SIN_FILTROS, max: 30 })).toEqual({ visible: true, precio: { lte: 3000 } });
  });
  it("escapa los comodines de LIKE", () => {
    expect(whereDe({ ...SIN_FILTROS, q: "50%_" })).toEqual({ visible: true, nombreBusqueda: { contains: "50\\%\\_" } });
  });
});
```

Run: `npx vitest run tests/catalogo-where.test.ts`
Expected: FAIL (`Failed to resolve import "../src/lib/catalogo-where"`).

- [ ] **Step 2: Implementar `src/lib/catalogo-where.ts`**

```ts
// El where de Prisma del catalogo, a partir de los filtros ya validados de la URL.
// Archivo aparte de catalogo.ts (que usa Prisma) para poder testearlo sin base de datos.
// SIEMPRE lleva visible: true: un producto oculto desde el admin no sale ni en la lista ni en la busqueda.
import type { Prisma } from "../generated/prisma/client";
import { escaparLike, normalizar } from "./busqueda";
import type { Filtros } from "./catalogo";

export function whereDe(f: Filtros): Prisma.ProductoWhereInput {
  const where: Prisma.ProductoWhereInput = { visible: true };
  // Sin tildes ni mayusculas: "peonias" encuentra "Ramo de peonías rosas" (ver src/lib/busqueda.ts)
  if (f.q) where.nombreBusqueda = { contains: escaparLike(normalizar(f.q)) }; // LIKE '%q%' sobre el nombre normalizado
  if (f.categoria) where.categoria = { slug: f.categoria };
  if (f.min !== null || f.max !== null) {
    // el usuario escribe euros; en la base guardamos centimos
    where.precio = {
      ...(f.min !== null && { gte: Math.round(f.min * 100) }),
      ...(f.max !== null && { lte: Math.round(f.max * 100) }),
    };
  }
  return where;
}
```

Run: `npx vitest run tests/catalogo-where.test.ts`
Expected: PASS. Vitest no comprueba tipos; `npx tsc --noEmit` sí fallará hasta el Step 3, porque `visible` aún no
está en el schema.

- [ ] **Step 3: Añadir `visible` al schema y crear la migración**

En `prisma/schema.prisma`, dentro de `model Producto`, debajo de `stock`:

```prisma
  stock          Int      @default(0)
  visible        Boolean  @default(true) // false = oculto: fuera del catalogo y de la compra; los pedidos antiguos lo siguen viendo
  creadoEn       DateTime @default(now())
```

Comprobar que el `.env` apunta a desarrollo y crear la migración:

Run: `npm run db:check`
Expected: `Entorno  : desarrollo (no es la de produccion)`. Si dice producción, PARAR.

Run: `npx prisma migrate dev --name producto_visible`
Expected: crea `prisma/migrations/<fecha>_producto_visible/migration.sql` con
`ALTER TABLE "Producto" ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true;` y regenera el cliente.
Abrir el archivo y confirmar que **solo** contiene ese `ALTER TABLE`.

- [ ] **Step 4: `buscarProductos` usa `whereDe`**

En `src/lib/catalogo.ts`, sustituir las importaciones y `buscarProductos`:

```ts
// Busqueda y filtros del catalogo: se resuelven en el SERVIDOR con Prisma a partir de la URL.
//   /?q=rosas&categoria=amor&min=40&max=60&orden=precio-desc
// El where se construye en catalogo-where.ts (puro, con test) y siempre deja fuera los productos ocultos.
import { whereDe } from "@/lib/catalogo-where";
import { leerOrden, orderByDe, type Orden } from "@/lib/orden";
import { prisma } from "@/lib/prisma";
```

(`leerFiltros` y `type Filtros` no cambian.)

```ts
export async function buscarProductos(f: Filtros) {
  return prisma.producto.findMany({
    where: whereDe(f),
    include: { categoria: { select: { nombre: true } } },
    orderBy: orderByDe(f.orden),
  });
}
```

- [ ] **Step 5: La ficha de un producto oculto da 404**

En `src/app/producto/[id]/page.tsx`, `cargarProducto`:

```ts
async function cargarProducto(idTexto: string) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) return null; // /producto/abc -> 404 sin tocar la base
  // Un producto oculto desde el admin no existe para la tienda: 404 igual que uno borrado
  return prisma.producto.findFirst({ where: { id, visible: true }, include: { categoria: true } });
}
```

- [ ] **Step 6: `crearCheckout` rechaza los ocultos**

En `src/app/checkout/actions.ts`, paso 3:

```ts
  // 3. Precios y stock de VERDAD, desde la base de datos. Un producto oculto desde el admin ya no se vende
  const productos = await prisma.producto.findMany({ where: { id: { in: limpios.map((a) => a.id) }, visible: true } });
  const lineas = [];
  for (const a of limpios) {
    const p = productos.find((x) => x.id === a.id);
    if (!p) return { error: "Un producto del carrito ya no está disponible" };
```

(El resto del bucle no cambia.) El webhook **no** se toca: si se pagó antes de ocultarlo, se cobra igual.

- [ ] **Step 7: Comprobación completa y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Run (con `npm run dev` en marcha): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/producto/1`
Expected: `200` (todos los productos siguen visibles).

```bash
git add prisma/schema.prisma prisma/migrations src/lib/catalogo-where.ts src/lib/catalogo.ts "src/app/producto/[id]/page.tsx" src/app/checkout/actions.ts tests/catalogo-where.test.ts
git commit -m "Catalogo admin: Producto.visible; los ocultos no salen en el catalogo, su ficha da 404 y no se pueden pagar"
```

---

### Task 3: Server Actions y gancho de reposición

**Files:**
- Create: `src/lib/reposicion.ts`
- Create: `src/app/admin/productos/actions.ts`

**Interfaces:**
- Consumes (Task 1): `validarProducto`, `leerUnidades`, `LIMITES_REPONER`, `LIMITES_CORREGIR`, `esReposicion`,
  `precioParaEditar`, `type ErroresProducto`. Existentes: `exigirAdmin` (`@/lib/sesion`), `normalizar` (`@/lib/busqueda`).
- Produces:
  - `alReponer(productoId: number): Promise<void>`
  - `type ValoresProducto = { nombre: string; descripcion: string; precio: string; categoriaId: string; visible: boolean }`
  - `type EstadoDatos = { ok?: string; error?: string; errores?: ErroresProducto; valores?: ValoresProducto }`
  - `type EstadoStock = { ok?: string; error?: string }`
  - `guardarProducto(_: EstadoDatos, datos: FormData): Promise<EstadoDatos>` — campos `id`, `nombre`, `descripcion`, `precio`, `categoriaId`, `visible`
  - `reponerStock(_: EstadoStock, datos: FormData): Promise<EstadoStock>` — campos `id`, `unidades`
  - `corregirStock(_: EstadoStock, datos: FormData): Promise<EstadoStock>` — campos `id`, `stock`, `stockLeido`

  El id del producto viaja en un `input hidden` llamado `id` (no con `.bind`), así las tres acciones tienen la firma
  que espera `useActionState`.

Las acciones usan BD y sesión: no tienen test unitario (como `cambiarEstado`). Se prueban a mano en la Task 6.

- [ ] **Step 1: Crear `src/lib/reposicion.ts`**

```ts
// Gancho de reposicion: lo llaman reponerStock y corregirStock (src/app/admin/productos/actions.ts) cuando un producto
// pasa de agotado a disponible (esReposicion). Es el UNICO sitio que sabe que un producto ha vuelto.
// Aqui se enviaran los avisos de "avisame cuando vuelva a haber" (siguiente subproyecto). Por ahora solo deja rastro
// en el log del servidor, que sirve para comprobarlo a mano.
import "server-only";

export async function alReponer(productoId: number): Promise<void> {
  console.info(`[reposicion] el producto ${productoId} vuelve a tener stock`);
}
```

- [ ] **Step 2: Crear `src/app/admin/productos/actions.ts`**

```ts
"use server";
// Server Actions del admin de productos. OJO: una Server Action es un endpoint publico (cualquiera puede llamarla),
// asi que CADA accion vuelve a comprobar el rol en la BD con exigirAdmin() y valida todo lo que llega.
// El stock solo cambia aqui (reponer y corregir), en el webhook de Stripe (descuenta al pagar) y en el seed.
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { normalizar } from "@/lib/busqueda";
import { prisma } from "@/lib/prisma";
import {
  esReposicion, leerUnidades, LIMITES_CORREGIR, LIMITES_REPONER, precioParaEditar, validarProducto, type ErroresProducto,
} from "@/lib/productos-admin";
import { alReponer } from "@/lib/reposicion";
import { exigirAdmin } from "@/lib/sesion";

// Lo que se vuelve a pintar en el formulario de datos (tal como se escribe: el precio como texto)
export type ValoresProducto = { nombre: string; descripcion: string; precio: string; categoriaId: string; visible: boolean };
export type EstadoDatos = { ok?: string; error?: string; errores?: ErroresProducto; valores?: ValoresProducto };
export type EstadoStock = { ok?: string; error?: string };

const NO_AUTORIZADO = "No autorizado: vuelve a entrar con una cuenta de administración";
const NO_EXISTE = "El producto no existe";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

// El id viaja en un input hidden: lo puede cambiar cualquiera, asi que se valida como lo demas
function leerId(datos: FormData): number | null {
  const id = Number(texto(datos, "id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Paginas que muestran el producto: el admin y la tienda
function refrescar(id: number) {
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  revalidatePath(`/producto/${id}`);
  revalidatePath("/");
}

export async function guardarProducto(_: EstadoDatos, datos: FormData): Promise<EstadoDatos> {
  if (!(await exigirAdmin())) return { error: NO_AUTORIZADO };

  const valores: ValoresProducto = {
    nombre: texto(datos, "nombre"),
    descripcion: texto(datos, "descripcion"),
    precio: texto(datos, "precio"),
    categoriaId: texto(datos, "categoriaId"),
    visible: datos.get("visible") === "on",
  };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE, valores };

  const r = validarProducto({ ...valores, visible: datos.get("visible") });
  if (!r.ok) return { errores: r.errores, valores };

  const categoria = await prisma.categoria.findUnique({ where: { id: r.datos.categoriaId } });
  if (!categoria) return { errores: { categoriaId: "Elige una categoría de la lista" }, valores };

  // El stock NO se toca aqui. nombreBusqueda se recalcula: si no, el producto renombrado no saldria en la busqueda
  const { count } = await prisma.producto.updateMany({
    where: { id },
    data: { ...r.datos, nombreBusqueda: normalizar(r.datos.nombre) },
  });
  if (count === 0) return { error: NO_EXISTE, valores };

  refrescar(id);
  const { nombre, descripcion, precio, categoriaId, visible } = r.datos;
  return {
    ok: "Guardado",
    valores: { nombre, descripcion, precio: precioParaEditar(precio), categoriaId: String(categoriaId), visible },
  };
}

export async function reponerStock(_: EstadoStock, datos: FormData): Promise<EstadoStock> {
  if (!(await exigirAdmin())) return { error: NO_AUTORIZADO };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE };
  const unidades = leerUnidades(datos.get("unidades"), LIMITES_REPONER);
  if (unidades === null) {
    return { error: `Escribe cuántas unidades han llegado (de ${LIMITES_REPONER.min} a ${LIMITES_REPONER.max})` };
  }

  let nuevo: number;
  try {
    // increment es atomico en la BD: no pisa las ventas que el webhook descuente a la vez
    const producto = await prisma.producto.update({
      where: { id },
      data: { stock: { increment: unidades } },
      select: { stock: true },
    });
    nuevo = producto.stock;
  } catch (e) {
    // P2025 = no existe ese producto
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { error: NO_EXISTE };
    throw e;
  }

  const antes = nuevo - unidades;
  if (esReposicion(antes, nuevo)) await alReponer(id);
  refrescar(id);
  return { ok: `Stock: ${antes} → ${nuevo}` };
}

export async function corregirStock(_: EstadoStock, datos: FormData): Promise<EstadoStock> {
  if (!(await exigirAdmin())) return { error: NO_AUTORIZADO };
  const id = leerId(datos);
  // stockLeido = el stock que tenia la pagina al pintarse. Puede ser negativo (ver esReposicion)
  const leido = Number(texto(datos, "stockLeido"));
  if (!id || texto(datos, "stockLeido") === "" || !Number.isInteger(leido)) return { error: NO_EXISTE };
  const nuevo = leerUnidades(datos.get("stock"), LIMITES_CORREGIR);
  if (nuevo === null) {
    return { error: `Escribe el stock real (de ${LIMITES_CORREGIR.min} a ${LIMITES_CORREGIR.max} unidades)` };
  }

  // Solo se guarda si el stock sigue siendo el que vio el admin: si se vendio algo mientras tanto, no se pisa
  const { count } = await prisma.producto.updateMany({ where: { id, stock: leido }, data: { stock: nuevo } });
  if (count === 0) {
    const actual = await prisma.producto.findUnique({ where: { id }, select: { stock: true } });
    if (!actual) return { error: NO_EXISTE };
    refrescar(id); // la pagina se vuelve a pintar con el stock nuevo (y el campo oculto stockLeido, con el)
    return { error: `El stock ha cambiado mientras editabas: ahora hay ${actual.stock}. Revisa el recuento y guarda otra vez.` };
  }

  if (esReposicion(leido, nuevo)) await alReponer(id);
  refrescar(id);
  return { ok: `Stock: ${leido} → ${nuevo}` };
}
```

- [ ] **Step 3: Comprobación completa y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add src/lib/reposicion.ts src/app/admin/productos/actions.ts
git commit -m "Catalogo admin: acciones para guardar datos, reponer y corregir stock, con el gancho alReponer"
```

---

### Task 4: Pestañas del admin y lista de productos

**Files:**
- Create: `src/components/navegacion-admin.tsx`
- Create: `src/components/badge-producto.tsx`
- Create: `src/app/admin/productos/page.tsx`
- Modify: `src/app/admin/page.tsx:40-41` (añadir las pestañas encima del título)

**Interfaces:**
- Consumes (Task 1): `ordenarParaAdmin`. Existentes: `usuarioActual`, `SinAcceso`, `Table*`, `formatearPrecio`.
- Produces: `NavegacionAdmin({ activa }: { activa: "pedidos" | "productos" })`;
  `BadgeProducto({ stock, visible }: { stock: number; visible: boolean })`.

- [ ] **Step 1: Crear `src/components/navegacion-admin.tsx`**

```tsx
// Pestañas del panel de admin: Pedidos y Productos. Solo enlaces (Server Component).
import Link from "next/link";

const PESTANAS = [
  { clave: "pedidos", href: "/admin", texto: "Pedidos" },
  { clave: "productos", href: "/admin/productos", texto: "Productos" },
] as const;

export function NavegacionAdmin({ activa }: { activa: (typeof PESTANAS)[number]["clave"] }) {
  return (
    <nav aria-label="Secciones del admin" className="flex gap-2 text-sm">
      {PESTANAS.map((p) => (
        <Link key={p.clave} href={p.href} aria-current={p.clave === activa ? "page" : undefined}
          className={`rounded-full border px-3 py-1 ${p.clave === activa ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Crear `src/components/badge-producto.tsx`**

```tsx
// Insignias de un producto en el admin: Agotado (stock 0 o negativo) y Oculto (no se ve en la tienda).
// Mismo estilo que BadgeEstado. Si esta a la venta, no pinta nada.
const ESTILO = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1";

export function BadgeProducto({ stock, visible }: { stock: number; visible: boolean }) {
  return (
    <span className="inline-flex gap-1.5">
      {stock <= 0 && <span className={`${ESTILO} bg-amber-50 text-amber-800 ring-amber-200`}>Agotado</span>}
      {!visible && <span className={`${ESTILO} bg-neutral-100 text-neutral-600 ring-neutral-200`}>Oculto</span>}
    </span>
  );
}
```

- [ ] **Step 3: Crear `src/app/admin/productos/page.tsx`**

```tsx
// Panel de admin: lista de productos. Primero los agotados (lo que hay que reponer), despues por nombre.
// Incluye los ocultos: si no, no habria forma de volver a mostrarlos.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeProducto } from "@/components/badge-producto";
import { NavegacionAdmin } from "@/components/navegacion-admin";
import { SinAcceso } from "@/components/sin-acceso";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { ordenarParaAdmin } from "@/lib/productos-admin";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Productos · Admin" };
export const dynamic = "force-dynamic";

export default async function PanelProductos() {
  // La cookie ya la exige el middleware; aqui se comprueba que la sesion es valida y que el rol es ADMIN
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=/admin/productos");
  if (usuario.rol !== "ADMIN") return <SinAcceso />;

  const productos = ordenarParaAdmin(
    await prisma.producto.findMany({ include: { categoria: { select: { nombre: true } } } }),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavegacionAdmin activa="productos" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Productos</h1>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((p) => (
            // Toda la fila abre la ficha: el ::after del enlace se estira sobre la fila (relative), como en pedidos
            <TableRow key={p.id} className="relative">
              <TableCell>
                <Link href={`/admin/productos/${p.id}`}
                  className="font-medium underline underline-offset-4 after:absolute after:inset-0 after:content-['']">
                  {p.nombre}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.categoria.nombre}</TableCell>
              <TableCell className="text-right tabular-nums">{formatearPrecio(p.precio)}</TableCell>
              <TableCell className={`text-right tabular-nums ${p.stock <= 0 ? "font-semibold text-destructive" : ""}`}>
                {p.stock}
              </TableCell>
              <TableCell><BadgeProducto stock={p.stock} visible={p.visible} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
```

- [ ] **Step 4: Pestañas en la lista de pedidos**

En `src/app/admin/page.tsx`, importar `NavegacionAdmin` y cambiar el principio del `return`:

```tsx
import { NavegacionAdmin } from "@/components/navegacion-admin";
```

```tsx
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavegacionAdmin activa="pedidos" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Pedidos</h1>
```

- [ ] **Step 5: Comprobación y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Con `npm run dev` y entrando como admin, abrir http://localhost:3000/admin/productos.
Expected: las pestañas, con *Productos* marcada; los 10 productos; "Centro de margaritas y lavanda" (stock 0) el
primero, con *Agotado* y el 0 en rojo. Al pulsar en cualquier punto de una fila se abre `/admin/productos/<id>` (de
momento da 404: la ficha llega en la Task 5). En `/admin` también se ven las pestañas, con *Pedidos* marcada.

```bash
git add src/components/navegacion-admin.tsx src/components/badge-producto.tsx src/app/admin/productos/page.tsx src/app/admin/page.tsx
git commit -m "Catalogo admin: pestanas Pedidos y Productos y lista de productos con los agotados arriba"
```

---

### Task 5: Ficha del producto en el admin con sus tres formularios

**Files:**
- Create: `src/components/campo-formulario.tsx`
- Modify: `src/components/formulario-envio.tsx` (quitar su `Campo` local e importar el compartido)
- Create: `src/components/formulario-producto.tsx`
- Create: `src/components/formulario-reponer.tsx`
- Create: `src/components/formulario-corregir-stock.tsx`
- Create: `src/app/admin/productos/[id]/page.tsx`

**Interfaces:**
- Consumes (Task 1): `MAX_NOMBRE`, `MAX_DESCRIPCION`, `LIMITES_REPONER`, `LIMITES_CORREGIR`, `precioParaEditar`,
  `primerCampoConErrorProducto`. (Task 3): `guardarProducto`, `reponerStock`, `corregirStock`, `type EstadoDatos`,
  `type EstadoStock`, `type ValoresProducto`. (Task 4): `BadgeProducto`. Existentes: `listarCategorias`
  (`@/lib/catalogo`), `Card*`, `Input`, `Button`.
- Produces: `Campo({ etiqueta, error?, ayuda?, children })` y `MensajeResultado({ ok?, error? })` en
  `src/components/campo-formulario.tsx`.

- [ ] **Step 1: Sacar `Campo` a un componente compartido**

Crear `src/components/campo-formulario.tsx`:

```tsx
// Piezas comunes de los formularios: etiqueta + campo + ayuda o error debajo, y el mensaje de resultado de una accion.
import type { ReactNode } from "react";

export function Campo({ etiqueta, error, ayuda, children }: { etiqueta: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {etiqueta}
      {children}
      {error ? <span className="font-normal text-destructive">{error}</span>
        : ayuda && <span className="font-normal text-muted-foreground">{ayuda}</span>}
    </label>
  );
}

// Resultado de una Server Action: el error en rojo o la confirmacion en verde (role para los lectores de pantalla)
export function MensajeResultado({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (ok) return <p role="status" className="text-sm text-emerald-700">{ok}</p>;
  return null;
}
```

En `src/components/formulario-envio.tsx`: borrar la función `Campo` del final del archivo (y su comentario
`// Etiqueta + campo + ayuda o error debajo`), quitar `type ReactNode` de la importación de `react` y añadir:

```tsx
import { Campo } from "@/components/campo-formulario";
```

Run: `npx tsc --noEmit && npm run lint`
Expected: en verde (el formulario de envío sigue igual).

- [ ] **Step 2: Crear `src/components/formulario-producto.tsx`**

```tsx
"use client";
// Formulario de los datos de un producto en el admin: nombre, descripcion, precio, categoria y visible.
// El stock NO va aqui: tiene sus propios formularios (reponer y corregir). Llama a la Server Action guardarProducto.
// Los campos son no controlados: tras enviar, React los reinicia a su defaultValue, que es lo que devuelve la accion.
import { useActionState, useEffect } from "react";
import { guardarProducto, type EstadoDatos, type ValoresProducto } from "@/app/admin/productos/actions";
import { Campo, MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_DESCRIPCION, MAX_NOMBRE, primerCampoConErrorProducto } from "@/lib/productos-admin";

// Mismo aspecto que Input para el textarea y el select
const CLASE_CAMPO =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

type Props = { id: number; categorias: { id: number; nombre: string }[]; inicial: ValoresProducto };

export function FormularioProducto({ id, categorias, inicial }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoDatos, FormData>(guardarProducto, {});
  const v = estado.valores ?? inicial;
  const errores = estado.errores ?? {};

  // Tras un error, el foco va al primer campo que lo tiene (en el movil puede quedar fuera de la pantalla)
  useEffect(() => {
    const campo = primerCampoConErrorProducto(estado.errores ?? {});
    if (campo) document.getElementsByName(campo)[0]?.focus();
  }, [estado]);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <Campo etiqueta="Nombre" error={errores.nombre}>
        <Input name="nombre" maxLength={MAX_NOMBRE} defaultValue={v.nombre} aria-invalid={!!errores.nombre} />
      </Campo>
      <Campo etiqueta="Descripción" error={errores.descripcion}>
        <textarea name="descripcion" rows={4} maxLength={MAX_DESCRIPCION} defaultValue={v.descripcion}
          aria-invalid={!!errores.descripcion} className={CLASE_CAMPO} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Precio (€)" error={errores.precio} ayuda="Por ejemplo: 45,90">
          <Input name="precio" inputMode="decimal" maxLength={12} defaultValue={v.precio} aria-invalid={!!errores.precio} />
        </Campo>
        <Campo etiqueta="Categoría" error={errores.categoriaId}>
          <select name="categoriaId" defaultValue={v.categoriaId} aria-invalid={!!errores.categoriaId} className={CLASE_CAMPO}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="visible" defaultChecked={v.visible} className="size-4" />
        Visible en la tienda
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendiente}>{pendiente ? "Guardando..." : "Guardar"}</Button>
        <MensajeResultado ok={estado.ok} error={estado.error} />
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Crear `src/components/formulario-reponer.tsx`**

```tsx
"use client";
// Reponer: suma las unidades que han llegado. En la BD es un increment atomico: no pisa las ventas que entren a la vez.
import { useActionState } from "react";
import { reponerStock, type EstadoStock } from "@/app/admin/productos/actions";
import { Campo, MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormularioReponer({ id, stock }: { id: number; stock: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoStock, FormData>(reponerStock, {});
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">Stock actual: <span className="font-semibold tabular-nums">{stock}</span></p>
      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Unidades que han llegado">
          <Input name="unidades" inputMode="numeric" maxLength={4} required className="w-32" />
        </Campo>
        <Button type="submit" disabled={pendiente}>{pendiente ? "Añadiendo..." : "Añadir"}</Button>
      </div>
      <MensajeResultado ok={estado.ok} error={estado.error} />
    </form>
  );
}
```

- [ ] **Step 4: Crear `src/components/formulario-corregir-stock.tsx`**

```tsx
"use client";
// Corregir: fija el stock a un valor (para recuentos). Lleva en un campo oculto el stock que se vio al pintar la
// pagina (stockLeido): si ha cambiado (una venta, una reposicion en otra pestaña), la accion no guarda y avisa.
// El campo visible es controlado y sigue al stock del servidor: si no, tras reponer seguiria mostrando el numero
// viejo y al guardar se volveria a el sin aviso (stockLeido ya seria el nuevo).
import { useActionState, useState } from "react";
import { corregirStock, type EstadoStock } from "@/app/admin/productos/actions";
import { Campo, MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormularioCorregirStock({ id, stock }: { id: number; stock: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoStock, FormData>(corregirStock, {});
  const [valor, setValor] = useState(String(stock));
  // Si el stock cambia en el servidor, el campo pasa al valor nuevo (patron de React para ajustar estado a una prop)
  const [visto, setVisto] = useState(stock);
  if (visto !== stock) {
    setVisto(stock);
    setValor(String(stock));
  }

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stockLeido" value={stock} />
      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Stock real">
          <Input name="stock" inputMode="numeric" maxLength={4} required className="w-32" value={valor}
            onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Button type="submit" variant="outline" disabled={pendiente}>{pendiente ? "Guardando..." : "Guardar recuento"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Para recuentos. Para lo que llega, usa Reponer.</p>
      <MensajeResultado ok={estado.ok} error={estado.error} />
    </form>
  );
}
```

- [ ] **Step 5: Crear `src/app/admin/productos/[id]/page.tsx`**

```tsx
// Ficha de un producto en el admin: datos, reponer y corregir stock. Cada bloque es un formulario con su Server Action.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeProducto } from "@/components/badge-producto";
import { FormularioCorregirStock } from "@/components/formulario-corregir-stock";
import { FormularioProducto } from "@/components/formulario-producto";
import { FormularioReponer } from "@/components/formulario-reponer";
import { SinAcceso } from "@/components/sin-acceso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarCategorias } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { precioParaEditar } from "@/lib/productos-admin";
import { usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Producto #${(await params).id} · Admin` };
}

export default async function FichaProductoAdmin({ params }: Props) {
  const usuario = await usuarioActual();
  if (!usuario) redirect(`/entrar?callbackUrl=/admin/productos/${encodeURIComponent((await params).id)}`);
  if (usuario.rol !== "ADMIN") return <SinAcceso />;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  // Sin filtrar por visible: los ocultos tambien se editan (si no, no habria forma de volver a mostrarlos)
  const [producto, categorias] = await Promise.all([prisma.producto.findUnique({ where: { id } }), listarCategorias()]);
  if (!producto) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/admin/productos" className="text-sm text-muted-foreground hover:text-foreground">← Productos</Link>
      <div className="flex items-center gap-4">
        <Image src={producto.imagen} alt="" width={64} height={64} className="size-16 rounded-lg object-cover" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{producto.nombre}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <BadgeProducto stock={producto.stock} visible={producto.visible} />
            {producto.visible && (
              <Link href={`/producto/${producto.id}`} className="text-muted-foreground underline underline-offset-4">
                Ver en la tienda
              </Link>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Datos</CardTitle></CardHeader>
        <CardContent>
          <FormularioProducto
            id={producto.id}
            categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
            inicial={{
              nombre: producto.nombre,
              descripcion: producto.descripcion,
              precio: precioParaEditar(producto.precio),
              categoriaId: String(producto.categoriaId),
              visible: producto.visible,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Reponer</CardTitle></CardHeader>
        <CardContent><FormularioReponer id={producto.id} stock={producto.stock} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Corregir stock</CardTitle></CardHeader>
        <CardContent><FormularioCorregirStock id={producto.id} stock={producto.stock} /></CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 6: Comprobación y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Con `npm run dev`, como admin, abrir `/admin/productos/1`.
Expected: miniatura, nombre, "Ver en la tienda" y las tres tarjetas con los datos actuales (precio "45,00").
`/admin/productos/abc` y `/admin/productos/999` dan la 404 general.
`/checkout/envio` sigue pintando el formulario de entrega igual que antes (usa el `Campo` compartido).

```bash
git add src/components/campo-formulario.tsx src/components/formulario-envio.tsx src/components/formulario-producto.tsx src/components/formulario-reponer.tsx src/components/formulario-corregir-stock.tsx "src/app/admin/productos/[id]/page.tsx"
git commit -m "Catalogo admin: ficha del producto con datos, reponer y corregir stock"
```

---

### Task 6: Documentación, prueba completa en local y verificación final

**Files:**
- Modify: `CLAUDE.md` (sección "Particularidades")
- Modify: `docs/NOTAS-DEL-PROYECTO.md` (secciones "Stock", "Búsqueda sin tildes" y "Admin")
- Modify: `docs/ESPECIFICACION.md:29` (fila de `/admin`)

- [ ] **Step 1: `CLAUDE.md`**

En "Búsqueda sin tildes", cambiar el final `Quien cree o renombre productos tiene que rellenarla;\n  hoy solo lo hace el seed.` por:

```markdown
  Quien cree o renombre productos tiene que rellenarla;
  hoy lo hacen el seed y `guardarProducto` (admin de productos).
```

Y añadir, justo después del punto "Lista del admin":

```markdown
- **Admin de productos** (`/admin/productos`): edita datos y stock; no crea ni borra (se oculta con
  `Producto.visible`). Los ocultos se filtran en `whereDe` (`src/lib/catalogo-where.ts`), la ficha y `crearCheckout`;
  el webhook no filtra. El stock solo cambia en `reponerStock` (increment), `corregirStock` (solo si sigue siendo el
  `stockLeido` del formulario), el webhook y el seed. `alReponer` (`src/lib/reposicion.ts`) es el único punto que sabe
  que un producto vuelve a tener stock.
```

- [ ] **Step 2: `docs/NOTAS-DEL-PROYECTO.md`**

En "### Stock", añadir al final de la lista:

```markdown
- Desde el admin (`/admin/productos/<id>`) el stock cambia de dos formas, cada una con su Server Action en
  `src/app/admin/productos/actions.ts`:
  - **Reponer** suma N con `increment`: es atómico en la BD y no pisa una venta que el webhook descuente a la vez.
  - **Corregir** fija N con `updateMany({ where: { id, stock: stockLeido } })`, donde `stockLeido` es el stock que
    tenía la página al pintarse (va en un campo oculto). Si entretanto cambió, no se guarda nada y se avisa con el
    valor nuevo. No hace falta una columna de versión: el propio stock hace de testigo.
- Cuando cualquiera de las dos deja un producto que estaba en 0 (o en negativo) con stock, llama a `alReponer`
  (`src/lib/reposicion.ts`). Es el gancho de los avisos de reposición; hoy solo escribe una línea en el log.
```

En "### Búsqueda sin tildes", sustituir el punto "**Hay que mantenerla sincronizada:** …" por:

```markdown
- **Hay que mantenerla sincronizada:** la rellenan el seed y `guardarProducto` (el admin de productos, al renombrar).
  Si algún día se crean productos desde otro sitio, ese código tiene que guardar también
  `nombreBusqueda: normalizar(nombre)`, o el producto no saldrá en las búsquedas.
```

En "## Admin", añadir al final de la lista:

```markdown
- **Productos** (`/admin/productos`): lista con los agotados arriba y ficha con tres formularios (datos, reponer y
  corregir stock). No se crean ni se borran productos desde la web: uno nuevo entra por `prisma/catalogo-datos.ts`
  con su SVG. "Borrar" es **ocultar** (`Producto.visible = false`), porque los pedidos antiguos apuntan al producto.
- Un producto oculto se filtra en tres sitios: `whereDe` (`src/lib/catalogo-where.ts`, catálogo y búsqueda), la ficha
  pública (`findFirst` con `visible: true`, da 404) y `crearCheckout` (no se puede pagar aunque siga en un carrito).
  El webhook no filtra: lo que se pagó antes de ocultarlo se cobra y descuenta stock igual. Un sitio nuevo que liste
  productos para la tienda tiene que filtrar también.
- El slug y la imagen no se editan: renombrar un producto no cambia su URL ni su ilustración.
```

- [ ] **Step 3: `docs/ESPECIFICACION.md`**

Cambiar la fila de `/admin`:

```markdown
| `/admin` y `/admin/productos` | Panel de pedidos (lista, detalle y cambio de estado) y de productos (datos, visibilidad, reponer y corregir stock) | Floristería (cuenta con rol ADMIN) |
```

- [ ] **Step 4: Prueba completa en local**

Con `npm run dev` (la base de desarrollo), entrando como admin:

1. **Reponer un agotado:** en "Centro de margaritas y lavanda" (stock 0), Reponer 5.
   Expected: "Stock: 0 → 5"; en la terminal de `npm run dev` sale `[reposicion] el producto <id> vuelve a tener stock`;
   en la tienda la ficha dice "En stock: 5 unidades" y la lista del admin ya no lo pone arriba.
   Reponer otras 2: "Stock: 5 → 7" y **no** sale la línea de `[reposicion]`.
2. **Corregir:** poner 3 y guardar. Expected: "Stock: 7 → 3".
3. **Corregir con dos pestañas:** abrir la ficha del mismo producto en dos pestañas. En la A, Reponer 1 (queda 4).
   En la B, sin recargar, poner 10 en Corregir y guardar.
   Expected: en la B, "El stock ha cambiado mientras editabas: ahora hay 4…", y el campo pasa a 4. Guardar otra vez
   el 10 ahora sí funciona: "Stock: 4 → 10".
4. **Ocultar:** añadir al carrito (como cliente, en otra ventana privada) un producto; como admin, desmarcar
   "Visible en la tienda" y guardar.
   Expected: no aparece en `/` ni buscándolo; `/producto/<id>` da la 404 de producto; al pagar el carrito sale
   "Un producto del carrito ya no está disponible". En el admin se ve con la insignia *Oculto* y sin "Ver en la
   tienda". Volver a marcarlo: reaparece en la tienda.
5. **Renombrar con tildes:** cambiar el nombre a "Ramo de peonías rosas pálidas" y guardar; buscar `palidas` en la
   tienda. Expected: aparece.
6. **Errores del formulario de datos:** vaciar el nombre y poner precio `1.000`. Expected: dos errores, el foco va al
   nombre, la descripción conserva lo escrito y no se guarda nada. Poner precio `45,9 €`: se guarda y el campo muestra
   `45,90`.
7. **Sin permiso:** entrar con una cuenta de cliente en `/admin/productos` y en `/admin/productos/1`.
   Expected: "No tienes acceso". Sin sesión: redirige a `/entrar?callbackUrl=…`.
8. **Datos falsos en una acción:** en las herramientas de desarrollo, cambiar el `value` del campo oculto `id` del
   formulario Reponer a `abc` y enviar. Expected: "El producto no existe", sin error 500 en la terminal.
9. Devolver los productos tocados a su estado (o `npm run seed`, que además borra pedidos y usuarios de desarrollo:
   después hay que volver a crear el admin con `npm run crear-admin -- <email>`).

- [ ] **Step 5: Verificación final**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Parar `npm run dev` (comparte `.next` con el build) y:
Run: `npm run build`
Expected: build correcto, con `/admin/productos` y `/admin/productos/[id]` en la lista de rutas.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/NOTAS-DEL-PROYECTO.md docs/ESPECIFICACION.md
git commit -m "Documentacion del admin de productos: visible, reponer, corregir y el gancho alReponer"
```

- [ ] **Step 7: Despliegue (cuando el usuario lo decida)**

1. `npm run migrar:produccion` (aplica `<fecha>_producto_visible` a producción; compatible con el código anterior).
2. Fusionar `catalogo-admin` en `main`, pasar `npx tsc --noEmit && npm run lint && npm test` sobre el resultado y
   hacer push (despliega en Vercel).
3. Comprobar en https://exercise2-floristeria.vercel.app/admin/productos con la cuenta de admin de producción.
