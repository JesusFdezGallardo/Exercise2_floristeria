# Cuentas con Google (parte A) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login con Google (Auth.js v5), opcional para navegar y obligatorio para pagar, con historial de pedidos,
carrito por usuario en `localStorage` y admin decidido por el rol de la BD (con `ADMIN_EMAILS` como semilla).

**Architecture:** Auth.js con sesión JWT y sin adaptador de Prisma. La cookie lleva solo `usuarioId`; el `Usuario`
(con su `rol`) se lee de la BD en cada petición con `usuarioActual()` (cacheado por petición con `cache` de React).
La config se parte en `src/auth.config.ts` (sin BD, la usa el middleware) y `src/auth.ts` (con Prisma). El carrito
sigue en Zustand + `persist`, pero el nombre de la clave cambia según la identidad y `SincronizarCarrito` suma el
carrito anónimo al del usuario al entrar.

**Tech Stack:** Next.js 15.5 (App Router), TypeScript, `next-auth@5.0.0-beta.32`, Prisma 7 (Neon), Zustand 5, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-11-cuentas-google-design.md`

## Global Constraints

- Todo en español: textos de la web, comentarios y mensajes de commit. Mensajes de commit terminan con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- El nombre de la tienda solo se escribe en `src/lib/tienda.ts` (`tests/marca.test.ts`). En textos nuevos se usa
  `TIENDA.nombre`. Nunca escribir el nombre sin tilde en `src`, `prisma` o `public`, ni en comentarios.
- Server Components por defecto; `"use client"` solo con estado o eventos.
- Escrituras en BD en Server Actions. Únicas API routes: el webhook de Stripe y `src/app/api/auth/[...nextauth]`.
- Precios en céntimos (Int); se formatean con `formatearPrecio` de `src/lib/formato.ts`.
- Una sola instancia de Prisma (`src/lib/prisma.ts`). Las funciones puras que se testean NO importan con `@/`
  (Vitest no tiene alias configurado): solo `import type` o rutas relativas.
- Solo el webhook marca PAGADO; sigue idempotente (solo cambia pedidos PENDIENTE).
- La migración tiene que funcionar con el código anterior: solo añade (tabla, enum, columna opcional).
- La base de desarrollo es la del `.env` (rama `desarrollo`). Antes de migrar, `npm run db:check` debe decir
  "desarrollo". **Nunca** ejecutar `npm run migrar:produccion`, cambiar variables de Vercel ni hacer `git push`
  sin confirmación explícita del usuario.
- Nunca imprimir valores del `.env` (cadenas de conexión, claves).
- Verificación antes de cerrar cada tarea: `npx tsc --noEmit && npm run lint && npm test`.
- No ejecutar `npm run build` con `npm run dev` en marcha.

## Review Focus

1. **Sesión vieja después de `npm run seed`** (los ids de `Usuario` se reinician): una cookie con `usuarioId=1` podría
   apuntar a otra persona. Se espera que `usuarioActual()` devuelva `null` si el email de la sesión no coincide con el
   del usuario de la BD. Test de `leerSesion` en la Tarea 1 y comprobación en `usuarioActual` (Tarea 4).
2. **`callbackUrl` hacia otro dominio** (`//malo.com`, `https://malo.com`, `/\malo.com`): se espera volver a `/`.
   Test de `destinoSeguro` en la Tarea 1.
3. **`ADMIN_EMAILS` con espacios, mayúsculas, comas sobrantes o vacía**: se espera que coincida sin distinguir
   mayúsculas y que una lista vacía no haga admin a nadie. Test de `esEmailAdmin` en la Tarea 1.
4. **Carrito anónimo con más unidades que stock o con el mismo producto que el del usuario**: se espera la suma con
   tope de stock y sin líneas duplicadas. Test de `juntarCarritos` en la Tarea 2.
5. **Pedidos antiguos sin dueño** (`usuarioId` null): ningún cliente los ve en "Mis pedidos" (solo el admin), y uno
   PENDIENTE antiguo que se pague tras el despliegue sigue recibiendo el email de Stripe. Test de `puedeVerPedido`
   en la Tarea 1 y compatibilidad en el webhook (Tarea 7).

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/cuentas.ts` | Crear | Funciones puras: `esEmailAdmin`, `puedeVerPedido`, `destinoSeguro`, `mensajeErrorEntrada`, `leerSesion` |
| `tests/cuentas.test.ts` | Crear | Tests de `src/lib/cuentas.ts` |
| `src/store/carrito.ts` | Modificar | `CLAVE_CARRITO`, `claveCarrito`, `juntarCarritos`, `skipHydration` |
| `tests/carrito.test.ts` | Crear | Tests de `claveCarrito` y `juntarCarritos` |
| `prisma/schema.prisma` + migración `cuentas` | Modificar/Crear | `Rol`, `Usuario`, `Pedido.usuarioId` |
| `prisma/seed.ts` | Modificar | `TRUNCATE` también de `Usuario` |
| `src/auth.config.ts` | Crear | Config de Auth.js sin BD (proveedor, páginas, `signIn`, `session`) |
| `src/auth.ts` | Crear | Config completa: `jwt` con `upsert` del `Usuario` |
| `src/app/api/auth/[...nextauth]/route.ts` | Crear | Reexporta `handlers` |
| `src/lib/sesion.ts` | Crear | `usuarioActual()` y `exigirAdmin()` (solo servidor) |
| `src/app/entrar/actions.ts` | Crear | Server Actions `entrarConGoogle(destino)` y `salir()` |
| `src/app/entrar/page.tsx` | Crear | Página de entrada con errores en español |
| `src/middleware.ts` | Reescribir | Exige sesión en `/admin` y `/cuenta` |
| `src/components/menu-cuenta.tsx` | Crear | Menú del usuario en la cabecera (cliente) |
| `src/components/sincronizar-carrito.tsx` | Crear | Cambia la clave del carrito y suma el anónimo al entrar |
| `src/components/cabecera.tsx`, `src/app/layout.tsx` | Modificar | Botón "Entrar" o menú; montar `SincronizarCarrito` |
| `src/components/sin-acceso.tsx` | Crear | Página "No tienes acceso" |
| `src/app/admin/*` | Modificar | `exigirAdmin` en páginas y acciones; borrar `entrar/` |
| `src/lib/admin.ts` | Borrar | Sustituido por `src/lib/sesion.ts` |
| `src/app/checkout/actions.ts`, `src/components/boton-pagar.tsx`, `src/components/vista-carrito.tsx`, `src/app/carrito/page.tsx` | Modificar | Checkout con sesión |
| `src/app/api/webhooks/stripe/route.ts` | Modificar | No sobrescribe `email`; envía a `pedido.email` |
| `src/app/cuenta/pedidos/page.tsx`, `src/app/cuenta/pedidos/[id]/page.tsx` | Crear | Mis pedidos |
| `next.config.ts` | Modificar | `remotePatterns` para las fotos de Google |
| `.env.example`, `.github/workflows/ci.yml` | Modificar | Variables `AUTH_*` y `ADMIN_EMAILS`; quitar `ADMIN_PASSWORD` |
| `CLAUDE.md`, `docs/*.md`, `README.md` | Modificar | Documentación |

---

### Task 1: Reglas puras de las cuentas

**Files:**
- Create: `src/lib/cuentas.ts`
- Test: `tests/cuentas.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Rol = "CLIENTE" | "ADMIN"`
  - `esEmailAdmin(email: string, lista: string | undefined): boolean`
  - `puedeVerPedido(usuario: { id: number; rol: Rol }, pedido: { usuarioId: number | null }): boolean`
  - `destinoSeguro(valor: string | null | undefined): string`
  - `mensajeErrorEntrada(codigo: string | undefined): string | null`
  - `leerSesion(user: { id?: string | null; email?: string | null } | null | undefined): { id: number; email: string } | null`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/cuentas.test.ts`:
```ts
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
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/cuentas.test.ts`
Expected: FAIL, no encuentra `../src/lib/cuentas`.

- [ ] **Step 3: Implementar**

`src/lib/cuentas.ts`:
```ts
// Reglas de las cuentas de cliente: funciones puras, sin BD ni Auth.js, para poder testearlas (tests/cuentas.test.ts).
export type Rol = "CLIENTE" | "ADMIN";

// ¿Este email esta en ADMIN_EMAILS? La lista es la SEMILLA del rol: al entrar, esas cuentas pasan a ADMIN.
// Quitar un email de la lista no quita el rol: lo que manda es Usuario.rol en la BD.
export function esEmailAdmin(email: string, lista: string | undefined): boolean {
  const buscado = email.trim().toLowerCase();
  if (!buscado || !lista) return false;
  return lista
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(buscado);
}

// Un pedido lo ve su dueño o un admin. Los pedidos de antes de las cuentas (sin dueño) solo los ve el admin.
export function puedeVerPedido(usuario: { id: number; rol: Rol }, pedido: { usuarioId: number | null }): boolean {
  return usuario.rol === "ADMIN" || (pedido.usuarioId !== null && pedido.usuarioId === usuario.id);
}

// A donde volver tras entrar: solo rutas de la propia tienda. "//x.com" o "/\x.com" saldrian a otro dominio.
export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return "/";
  return valor;
}

// Auth.js manda a /entrar?error=<codigo> cuando algo falla. Lo contamos en español.
const ERRORES_ENTRADA: Record<string, string> = {
  AccessDenied: "No se pudo entrar con esa cuenta: necesita un email verificado de Google.",
  Configuration: "El acceso con Google no está configurado en este servidor.",
};

export function mensajeErrorEntrada(codigo: string | undefined): string | null {
  if (!codigo) return null;
  return ERRORES_ENTRADA[codigo] ?? "No se pudo entrar con Google. Puede que hayas cancelado el acceso: inténtalo de nuevo.";
}

// Lo que trae la cookie de sesion (session.user), validado. El email sirve para comprobar que el id sigue siendo
// de la misma persona: si se reinician los ids (npm run seed), una cookie vieja podria apuntar a otro usuario.
export function leerSesion(
  user: { id?: string | null; email?: string | null } | null | undefined,
): { id: number; email: string } | null {
  const id = Number(user?.id);
  const email = user?.email?.trim().toLowerCase();
  if (!Number.isInteger(id) || id <= 0 || !email) return null;
  return { id, email };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/cuentas.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cuentas.ts tests/cuentas.test.ts
git commit -m "Reglas puras de las cuentas: semilla de admins, quien ve un pedido y destino seguro tras entrar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Carrito por usuario (funciones puras y store)

**Files:**
- Modify: `src/store/carrito.ts`
- Test: `tests/carrito.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (en `src/store/carrito.ts`):
  - `CLAVE_CARRITO = "carrito-rincon"`
  - `claveCarrito(usuarioId: number | null): string`
  - `juntarCarritos(anonimo: LineaCarrito[], usuario: LineaCarrito[]): LineaCarrito[]`
  - `useCarrito` sigue igual, pero con `skipHydration: true`: **no se carga solo**; lo carga `SincronizarCarrito`
    (Tarea 5). `useCarrito.persist.getOptions().name` sigue siendo `"carrito-rincon"` al arrancar.

- [ ] **Step 1: Escribir los tests que fallan**

`tests/carrito.test.ts`:
```ts
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
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/carrito.test.ts`
Expected: FAIL, `claveCarrito` y `juntarCarritos` no existen.

- [ ] **Step 3: Implementar**

En `src/store/carrito.ts`:

1. Cambiar el comentario de cabecera por:
```ts
// Estado global del carrito con Zustand: un store = estado + acciones, sin Provider ni Context.
// Con persist, el carrito se guarda en localStorage y sobrevive a recargas y a cerrar el navegador.
// Hay un carrito por identidad: "carrito-rincon" sin sesion y "carrito-rincon:<usuarioId>" con sesion.
// El store NO se carga solo (skipHydration): lo carga SincronizarCarrito cuando sabe quien ha entrado.
```

2. Justo después de `export type LineaCarrito = ...`, añadir:
```ts
export const CLAVE_CARRITO = "carrito-rincon"; // cambiarla invalida los carritos guardados (ver NOTAS)

export const claveCarrito = (usuarioId: number | null) =>
  usuarioId === null ? CLAVE_CARRITO : `${CLAVE_CARRITO}:${usuarioId}`;
```

3. En las opciones de `persist`, sustituir la línea `name: "carrito-rincon", ...` por:
```ts
      name: CLAVE_CARRITO, // la clave en localStorage; SincronizarCarrito la cambia segun la sesion
      skipHydration: true, // no cargar hasta saber de quien es el carrito
```

4. Al final del archivo, añadir:
```ts
// Al entrar: el carrito anonimo se SUMA al del usuario. Mismo producto = una linea, sin pasar del stock
// (el mayor de los dos guardados). De una linea repetida se quedan los datos del anonimo, que son los mas recientes.
export function juntarCarritos(anonimo: LineaCarrito[], usuario: LineaCarrito[]): LineaCarrito[] {
  const resultado = usuario.map((l) => ({ ...l }));
  for (const a of anonimo) {
    const i = resultado.findIndex((l) => l.id === a.id);
    if (i === -1) {
      resultado.push({ ...a, cantidad: Math.min(a.cantidad, a.stock) });
    } else {
      const stock = Math.max(resultado[i].stock, a.stock);
      resultado[i] = { ...a, stock, cantidad: Math.min(resultado[i].cantidad + a.cantidad, stock) };
    }
  }
  return resultado.filter((l) => l.cantidad > 0);
}
```

- [ ] **Step 4: Ejecutar todos los tests**

Run: `npm test`
Expected: PASS, incluido `tests/marca.test.ts` ("el carrito usa una clave nueva": el nombre inicial sigue siendo
`carrito-rincon`).

- [ ] **Step 5: Commit**

```bash
git add src/store/carrito.ts tests/carrito.test.ts
git commit -m "Carrito: clave por usuario y suma del carrito anonimo al entrar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Modelo `Usuario` y migración

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`
- Create: `prisma/migrations/<fecha>_cuentas/migration.sql` (lo genera Prisma)

**Interfaces:**
- Produces: modelo `Usuario { id, email, nombre, imagen, rol, creadoEn, pedidos }`, enum `Rol` en
  `@/generated/prisma/enums`, y `Pedido.usuarioId: number | null`.

- [ ] **Step 1: Editar el schema**

En `prisma/schema.prisma`, después del enum `EstadoPedido`, añadir:
```prisma
// Rol de la cuenta. Lo que manda es este campo; ADMIN_EMAILS solo lo pone a ADMIN al entrar (semilla).
enum Rol {
  CLIENTE
  ADMIN
}

// Cuenta de cliente, creada la primera vez que alguien entra con Google (callback jwt de src/auth.ts)
model Usuario {
  id       Int      @id @default(autoincrement())
  email    String   @unique // el de Google, en minusculas
  nombre   String?
  imagen   String? // foto de Google, para el avatar de la cabecera
  rol      Rol      @default(CLIENTE)
  creadoEn DateTime @default(now())
  pedidos  Pedido[]
}
```
Y en `model Pedido`, después de `lineas LineaPedido[]`, añadir:
```prisma
  usuario         Usuario?      @relation(fields: [usuarioId], references: [id])
  usuarioId       Int? // opcional: los pedidos de antes de las cuentas no tienen dueño

  @@index([usuarioId])
```

- [ ] **Step 2: Comprobar que estamos en desarrollo**

Run: `npm run db:check`
Expected: dice "desarrollo". Si dice "PRODUCCION", PARAR y avisar al usuario.

- [ ] **Step 3: Crear y aplicar la migración en desarrollo**

Run: `npx prisma migrate dev --name cuentas`
Expected: crea `prisma/migrations/<fecha>_cuentas/migration.sql` con `CREATE TYPE "Rol"`, `CREATE TABLE "Usuario"`,
`ALTER TABLE "Pedido" ADD COLUMN "usuarioId" INTEGER` y la clave foránea, y regenera el cliente.
Revisar que el SQL **no borra ni cambia** columnas existentes.

- [ ] **Step 4: Seed también vacía los usuarios**

En `prisma/seed.ts`, cambiar el comentario de cabecera `// OJO: borra tambien TODOS los pedidos.` por
`// OJO: borra tambien TODOS los pedidos y los usuarios (se vuelven a crear al entrar con Google).`, y sustituir las
líneas del `TRUNCATE` por:
```ts
  // Vaciamos las 5 tablas Y reiniciamos los contadores de id (RESTART IDENTITY).
  // Con deleteMany los id seguian creciendo (13, 14...) y los enlaces /producto/1 dejaban de existir.
  await prisma.$executeRaw`TRUNCATE "LineaPedido", "Pedido", "Usuario", "Producto", "Categoria" RESTART IDENTITY CASCADE`;
```

- [ ] **Step 5: Verificar**

Run: `npm run seed && npx tsc --noEmit && npm run lint && npm test`
Expected: el seed termina sin errores y todo pasa.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts
git commit -m "Modelo Usuario con rol y pedidos con dueño opcional

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Auth.js con Google (núcleo)

**Files:**
- Create: `src/auth.config.ts`, `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/sesion.ts`,
  `src/app/entrar/actions.ts`
- Modify: `src/middleware.ts`, `next.config.ts`, `.env.example`, `.github/workflows/ci.yml`, `package.json` (dependencia)

**Interfaces:**
- Consumes: `esEmailAdmin`, `leerSesion`, `destinoSeguro` (Tarea 1); modelo `Usuario` (Tarea 3).
- Produces:
  - `auth`, `signIn`, `signOut`, `handlers` desde `@/auth`
  - `usuarioActual(): Promise<Usuario | null>` y `exigirAdmin(): Promise<Usuario | null>` desde `@/lib/sesion`
  - Server Actions `entrarConGoogle(destino: string): Promise<void>` y `salir(): Promise<void>` desde
    `@/app/entrar/actions`

- [ ] **Step 1: Prerrequisito externo (lo hace el usuario)**

Pedir al usuario que, en Google Cloud Console (APIs y servicios → Credenciales), cree un **ID de cliente OAuth** de
tipo "Aplicación web" con estas URIs de redirección autorizadas:
- `http://localhost:3000/api/auth/callback/google`
- `https://exercise2-floristeria.vercel.app/api/auth/callback/google`

(La pantalla de consentimiento en modo "Prueba" basta; hay que añadir como usuarios de prueba las cuentas que vayan a
entrar.) Después, que añada a su `.env` local: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS` (su email) y
`AUTH_SECRET`, este último generado con
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
No leer ni imprimir esos valores. Se puede seguir con los pasos 2-9 mientras tanto; el paso 10 los necesita.

- [ ] **Step 2: Instalar Auth.js**

Run: `npm install next-auth@5.0.0-beta.32`
Expected: se añade a `dependencies` sin errores de peer (acepta Next 15 y React 19).

- [ ] **Step 3: Config sin BD (la usa el middleware)**

`src/auth.config.ts`:
```ts
// Configuracion de Auth.js SIN base de datos. La usa el middleware, que no puede importar Prisma.
// src/auth.ts la amplia con lo que si necesita la BD (crear el Usuario al entrar).
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [Google], // lee AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET del entorno
  session: { strategy: "jwt" }, // la sesion va en una cookie cifrada con AUTH_SECRET: no hay tabla de sesiones
  pages: { signIn: "/entrar", error: "/entrar" },
  trustHost: true, // detras de Vercel o en local, la URL la da la propia peticion
  callbacks: {
    // Solo cuentas de Google con el email verificado
    signIn({ account, profile }) {
      return account?.provider === "google" && profile?.email_verified === true;
    },
    // Lo que ve la app de la sesion: el id de NUESTRO Usuario (lo pone el callback jwt de src/auth.ts).
    // El rol NO va aqui: se lee de la BD cada vez (src/lib/sesion.ts).
    session({ session, token }) {
      if (typeof token.usuarioId === "number") session.user.id = String(token.usuarioId);
      return session;
    },
  },
} satisfies NextAuthConfig;
```

- [ ] **Step 4: Config completa**

`src/auth.ts`:
```ts
// Auth.js: login con Google. Exporta auth() (leer la sesion), signIn/signOut y los handlers de /api/auth.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { esEmailAdmin } from "@/lib/cuentas";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // profile solo llega en el momento de entrar: ahi se crea o se actualiza el Usuario y su id va al token.
    async jwt({ token, profile }) {
      if (profile?.email) {
        const email = profile.email.toLowerCase();
        const nombre = profile.name ?? null;
        const imagen = typeof profile.picture === "string" ? profile.picture : null;
        // ADMIN_EMAILS es la semilla: si el email esta, pasa a ADMIN; si no, el rol que tenga no se toca
        const admin = esEmailAdmin(email, process.env.ADMIN_EMAILS);
        const usuario = await prisma.usuario.upsert({
          where: { email },
          create: { email, nombre, imagen, rol: admin ? "ADMIN" : "CLIENTE" },
          update: { nombre, imagen, ...(admin ? { rol: "ADMIN" as const } : {}) },
        });
        token.usuarioId = usuario.id;
      }
      return token;
    },
  },
});
```

- [ ] **Step 5: Ruta de Auth.js**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
// Rutas de Auth.js (/api/auth/...): aqui vuelve Google tras el login. Es la otra API route junto al webhook.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 6: Helpers de sesión**

`src/lib/sesion.ts`:
```ts
// Quien ha entrado, leido de la BD. Sustituye a la vieja contraseña del admin.
// cache(): layout, cabecera y pagina lo piden en la misma peticion, pero se consulta la BD una sola vez.
import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { leerSesion } from "@/lib/cuentas";
import { prisma } from "@/lib/prisma";

export const usuarioActual = cache(async () => {
  const sesion = leerSesion((await auth())?.user);
  if (!sesion) return null;
  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.id } });
  // Si el email no coincide, la cookie es de antes de reiniciar los ids (npm run seed): no es esta persona
  return usuario && usuario.email === sesion.email ? usuario : null;
});

// El rol se lee de la BD, nunca de la cookie: quitarlo en la BD tiene efecto al momento.
// OJO: el middleware protege paginas, no Server Actions. Cada accion de admin llama a exigirAdmin().
export async function exigirAdmin() {
  const usuario = await usuarioActual();
  return usuario?.rol === "ADMIN" ? usuario : null;
}
```

- [ ] **Step 7: Acciones de entrar y salir**

`src/app/entrar/actions.ts`:
```ts
"use server";
// Entrar y salir. signIn redirige a Google y, a la vuelta, a "destino" (solo rutas de la tienda).
import { signIn, signOut } from "@/auth";
import { destinoSeguro } from "@/lib/cuentas";

export async function entrarConGoogle(destino: string) {
  await signIn("google", { redirectTo: destinoSeguro(destino) });
}

export async function salir() {
  await signOut({ redirectTo: "/" });
}
```

- [ ] **Step 8: Middleware**

Reemplazar todo `src/middleware.ts` por:
```ts
// Middleware: antes de /admin y /cuenta comprueba que HAY SESION; si no, a /entrar y de vuelta aqui.
// No mira el rol (no puede usar la BD): eso lo hacen la pagina y cada Server Action con exigirAdmin().
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (req.auth) return NextResponse.next();
  const entrar = new URL("/entrar", req.nextUrl);
  entrar.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(entrar);
});

export const config = { matcher: ["/admin/:path*", "/cuenta/:path*"] };
```

- [ ] **Step 9: Imágenes de Google, variables y CI**

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las fotos de perfil de Google (avatar de la cabecera) vienen de este dominio
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }] },
};

export default nextConfig;
```

En `.env.example`, sustituir el bloque del panel de admin (`# --- Panel de admin ...` y `ADMIN_PASSWORD=""`) por:
```
# --- Cuentas con Google (Auth.js) ---
# Google Cloud Console > APIs y servicios > Credenciales > ID de cliente OAuth (Aplicacion web).
# URIs de redireccion: http://localhost:3000/api/auth/callback/google y la de produccion.
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
# Cifra la cookie de sesion. Genera uno: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET=""
# Emails (separados por comas) que pasan a ADMIN al entrar. Quitarlos de aqui NO quita el rol (esta en la BD)
ADMIN_EMAILS=""
```

En `.github/workflows/ci.yml`, dentro de `env:`, después de `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, añadir:
```yaml
      AUTH_SECRET: secreto_ficticio_para_ci_de_al_menos_32_caracteres
      AUTH_GOOGLE_ID: ficticio.apps.googleusercontent.com
      AUTH_GOOGLE_SECRET: ficticio_para_ci
      ADMIN_EMAILS: ""
```

- [ ] **Step 10: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS. (El código antiguo de admin sigue existiendo y compilando; se quita en la Tarea 6.)
Si `tsc` se queja de `profile.email_verified` o `token.usuarioId`, son `unknown` en los tipos de Auth.js: comparar
con `=== true` y `typeof ... === "number"` como arriba ya lo resuelve; no añadir `any`.

Con las variables del paso 1 ya en `.env`: `npm run dev` y abrir `http://localhost:3000/api/auth/providers`.
Expected: JSON con `google`. Parar el servidor.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json src/auth.config.ts src/auth.ts "src/app/api/auth" src/lib/sesion.ts src/app/entrar/actions.ts src/middleware.ts next.config.ts .env.example .github/workflows/ci.yml
git commit -m "Login con Google con Auth.js: sesion JWT, Usuario en la BD y rol leido de la BD

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Página de entrada, cabecera y carrito sincronizado

**Files:**
- Create: `src/app/entrar/page.tsx`, `src/components/menu-cuenta.tsx`, `src/components/sincronizar-carrito.tsx`
- Modify: `src/components/cabecera.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: `usuarioActual` (Tarea 4), `entrarConGoogle`, `salir` (Tarea 4), `destinoSeguro`,
  `mensajeErrorEntrada` (Tarea 1), `claveCarrito`, `CLAVE_CARRITO`, `juntarCarritos`, `useCarrito`, `LineaCarrito`
  (Tarea 2).
- Produces: `<SincronizarCarrito usuarioId={number | null} />`, `<MenuCuenta nombre imagen esAdmin />`.

- [ ] **Step 1: Página `/entrar`**

`src/app/entrar/page.tsx`:
```tsx
// Pagina de entrada: un boton que lleva a Google. Aqui llegan tambien el middleware y los errores de Auth.js.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { entrarConGoogle } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import { destinoSeguro, mensajeErrorEntrada } from "@/lib/cuentas";
import { usuarioActual } from "@/lib/sesion";
import { TIENDA } from "@/lib/tienda";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ callbackUrl?: string; error?: string }> };

export default async function Entrar({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const destino = destinoSeguro(callbackUrl);
  // Si ya ha entrado, no tiene nada que hacer aqui
  if (!error && (await usuarioActual())) redirect(destino);

  const mensaje = mensajeErrorEntrada(error);
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24">
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <p className="text-sm text-muted-foreground">
        Entra con tu cuenta de Google para pagar y ver tus pedidos en {TIENDA.nombre}.
      </p>
      <form action={entrarConGoogle.bind(null, destino)}>
        <Button type="submit" className="w-full">Entrar con Google</Button>
      </form>
      {mensaje && <p className="text-sm text-destructive">{mensaje}</p>}
    </main>
  );
}
```

- [ ] **Step 2: Menú de la cuenta**

`src/components/menu-cuenta.tsx`:
```tsx
"use client";
// Menu del usuario en la cabecera: avatar, "Mis pedidos", "Panel de admin" (solo admins) y "Salir".
// Es un <details> nativo; el cliente solo hace falta para cerrarlo al navegar.
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { salir } from "@/app/entrar/actions";

const opcion = "rounded-md px-3 py-2 text-left hover:bg-muted";

export function MenuCuenta({ nombre, imagen, esAdmin }: { nombre: string; imagen: string | null; esAdmin: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const ruta = usePathname();
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [ruta]);

  return (
    <details ref={menu} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2" aria-label="Tu cuenta">
        {imagen ? (
          <Image src={imagen} alt="" width={28} height={28} className="size-7 rounded-full" />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">
            {nombre.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-32 truncate sm:inline">{nombre}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 flex w-48 flex-col rounded-lg border bg-background p-1 shadow-md">
        <Link href="/cuenta/pedidos" className={opcion}>Mis pedidos</Link>
        {esAdmin && <Link href="/admin" className={opcion}>Panel de admin</Link>}
        <form action={salir}>
          <button type="submit" className={`w-full ${opcion}`}>Salir</button>
        </form>
      </div>
    </details>
  );
}
```

- [ ] **Step 3: Cabecera**

Reemplazar `src/components/cabecera.tsx` por:
```tsx
// Cabecera de la tienda (Server Component). El icono del carrito y el menu de la cuenta necesitan el navegador.
import Link from "next/link";
import { IconoCarrito } from "@/components/icono-carrito";
import { Logo } from "@/components/logo";
import { MenuCuenta } from "@/components/menu-cuenta";
import { usuarioActual } from "@/lib/sesion";
import { TIENDA } from "@/lib/tienda";

export async function Cabecera() {
  const usuario = await usuarioActual();
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8" />
          <span className="font-heading text-lg font-semibold tracking-tight">{TIENDA.nombre}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Catálogo
          </Link>
          <IconoCarrito />
          {usuario ? (
            <MenuCuenta nombre={usuario.nombre ?? usuario.email} imagen={usuario.imagen} esAdmin={usuario.rol === "ADMIN"} />
          ) : (
            <Link href="/entrar" className="text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Sincronizar el carrito**

`src/components/sincronizar-carrito.tsx`:
```tsx
"use client";
// Elige el carrito segun quien ha entrado y, al entrar, le suma lo que hubiera en el carrito anonimo.
// Sin sesion: "carrito-rincon". Con sesion: "carrito-rincon:<id>". No pinta nada.
import { useEffect } from "react";
import { CLAVE_CARRITO, claveCarrito, juntarCarritos, useCarrito, type LineaCarrito } from "@/store/carrito";

// Lo que persist guarda en localStorage es {"state":{"lineas":[...]},"version":0}
function leerLineas(clave: string): LineaCarrito[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) ?? "null");
    return Array.isArray(guardado?.state?.lineas) ? guardado.state.lineas : [];
  } catch {
    return [];
  }
}

export function SincronizarCarrito({ usuarioId }: { usuarioId: number | null }) {
  useEffect(() => {
    const clave = claveCarrito(usuarioId);
    let lineas = leerLineas(clave);
    if (usuarioId !== null) {
      // Lo anonimo se suma una sola vez: despues se vacia, y las siguientes visitas no suman nada
      const anonimo = leerLineas(CLAVE_CARRITO);
      if (anonimo.length > 0) {
        lineas = juntarCarritos(anonimo, lineas);
        localStorage.removeItem(CLAVE_CARRITO);
      }
    }
    // Primero se cambia la clave y despues el estado: setState escribe en la clave NUEVA
    // (al salir, el carrito del usuario se queda guardado en la suya y en memoria entra el anonimo)
    useCarrito.persist.setOptions({ name: clave });
    useCarrito.setState({ lineas });
  }, [usuarioId]);
  return null;
}
```

- [ ] **Step 5: Layout**

En `src/app/layout.tsx`: importar `SincronizarCarrito` y `usuarioActual`, hacer `RootLayout` `async`, y montar el
componente antes de la cabecera:
```tsx
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const usuario = await usuarioActual();
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <SincronizarCarrito usuarioId={usuario?.id ?? null} />
        <Cabecera />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
```
(Conservar el comentario de las variables de fuente en `<html>`. Leer la sesión hace dinámicas todas las páginas;
el catálogo ya lo era por los filtros de la URL.)

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS.

Prueba a mano (`npm run dev`):
1. Sin sesión, añadir 2 productos. La cabecera muestra "Entrar".
2. "Entrar" → Google → vuelve. La cabecera muestra el avatar y el carrito conserva los 2 productos.
3. En DevTools → Application → Local Storage: existe `carrito-rincon:<id>` con las líneas y `carrito-rincon` ya no está.
4. Menú → "Salir": el carrito aparece vacío. Volver a entrar: reaparecen los 2 productos.
5. `/entrar?error=AccessDenied` muestra el mensaje del email verificado.

- [ ] **Step 7: Commit**

```bash
git add src/app/entrar/page.tsx src/components/menu-cuenta.tsx src/components/sincronizar-carrito.tsx src/components/cabecera.tsx src/app/layout.tsx
git commit -m "Pagina de entrada, menu de la cuenta en la cabecera y carrito por usuario

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin por rol (adiós a la contraseña)

**Files:**
- Create: `src/components/sin-acceso.tsx`
- Modify: `src/app/admin/actions.ts`, `src/app/admin/page.tsx`, `src/app/admin/pedidos/[id]/page.tsx`,
  `tests/marca.test.ts`, `src/lib/tienda.ts` (comentario)
- Delete: `src/lib/admin.ts`, `src/app/admin/entrar/page.tsx`

**Interfaces:**
- Consumes: `exigirAdmin` (Tarea 4).
- Produces: `<SinAcceso />`; `cambiarEstado(pedidoId, nuevo)` con la misma firma que ahora.

- [ ] **Step 1: Componente "No tienes acceso"**

`src/components/sin-acceso.tsx`:
```tsx
// Lo que ve quien ha entrado con una cuenta que no es ADMIN al abrir el panel
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SinAcceso() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">No tienes acceso</h1>
      <p className="text-muted-foreground">Esta zona es solo para la floristería y tu cuenta no tiene permiso de administración.</p>
      <Button render={<Link href="/" />} nativeButton={false}>Volver al catálogo</Button>
    </main>
  );
}
```

- [ ] **Step 2: Acciones del admin**

Reemplazar `src/app/admin/actions.ts` por:
```ts
"use server";
// Server Actions del panel de admin. OJO: una Server Action es un endpoint publico (cualquiera puede llamarla),
// asi que CADA accion vuelve a comprobar el rol en la BD con exigirAdmin(). El middleware solo mira que haya sesion.
import { revalidatePath } from "next/cache";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { puedeCambiar } from "@/lib/estados";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sesion";

export async function cambiarEstado(pedidoId: number, nuevo: EstadoPedido): Promise<{ error?: string }> {
  // 1. ¿Es admin? (aunque la pagina ya lo compruebe: la accion se puede llamar sin pasar por la pagina)
  if (!(await exigirAdmin())) return { error: "No autorizado" };

  // 2. ¿Es un cambio permitido desde el estado ACTUAL de la base de datos?
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { error: "El pedido no existe" };
  if (!puedeCambiar(pedido.estado, nuevo)) return { error: `No se puede pasar de ${pedido.estado} a ${nuevo}` };

  // 3. Guardar y avisar a Next de que esas paginas han cambiado
  await prisma.pedido.update({ where: { id: pedidoId }, data: { estado: nuevo } });
  revalidatePath("/admin");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  return {};
}
```

- [ ] **Step 3: Páginas del admin**

En `src/app/admin/page.tsx`:
- Quitar los imports de `salir` y de `Button`; importar `SinAcceso` de `@/components/sin-acceso` y `exigirAdmin` de
  `@/lib/sesion`.
- Primera línea de `PanelPedidos`: `if (!(await exigirAdmin())) return <SinAcceso />;`
- Sustituir el bloque de la cabecera (`<div className="flex items-center justify-between">` con el `<form action={salir}>`)
  por solo `<h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>` (salir está ahora en el menú de la cuenta).

En `src/app/admin/pedidos/[id]/page.tsx`:
- Importar `SinAcceso` y `exigirAdmin`.
- Primera línea de `DetallePedido`: `if (!(await exigirAdmin())) return <SinAcceso />;`

- [ ] **Step 4: Borrar lo viejo y ajustar el test de marca**

Run: `git rm src/lib/admin.ts src/app/admin/entrar/page.tsx`

En `tests/marca.test.ts`: quitar `import { COOKIE_ADMIN } from "../src/lib/admin";` y el test
`it("la cookie del admin tiene nombre nuevo", ...)` completo.

En `src/lib/tienda.ts`, en el comentario, cambiar `la entrada del admin` por `la pagina de entrada`.

- [ ] **Step 5: Verificar**

Run: `grep -rn "admin/entrar\|COOKIE_ADMIN\|esAdmin\|ADMIN_PASSWORD" src tests` → sin resultados.
Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS.

Prueba a mano (`npm run dev`):
1. Sin sesión, `/admin` → redirige a `/entrar?callbackUrl=%2Fadmin`; al entrar con el email de `ADMIN_EMAILS` vuelve a `/admin`.
2. En `npx prisma studio`, poner el rol de ese usuario a `CLIENTE` y recargar `/admin` → "No tienes acceso" sin
   tener que salir. Volver a ponerlo a `ADMIN`.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/admin src/components/sin-acceso.tsx src/lib tests/marca.test.ts
git commit -m "Admin por rol de la cuenta de Google: fuera la contraseña y la cookie propia

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Checkout con sesión y webhook

**Files:**
- Modify: `src/app/checkout/actions.ts`, `src/components/boton-pagar.tsx`, `src/components/vista-carrito.tsx`,
  `src/app/carrito/page.tsx`, `src/app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `usuarioActual` y `entrarConGoogle` (Tarea 4).
- Produces: `crearCheckout(articulos): Promise<{ error?: string; necesitaLogin?: true }>`;
  `BotonPagar({ lineas, conSesion })`; `VistaCarrito({ conSesion })`.

- [ ] **Step 1: La Server Action exige sesión**

En `src/app/checkout/actions.ts`:
- Importar `import { usuarioActual } from "@/lib/sesion";`
- Cambiar la firma a
  `export async function crearCheckout(articulos: ArticuloCheckout[]): Promise<{ error?: string; necesitaLogin?: true }> {`
- Al principio de la función, antes del paso 1, añadir:
```ts
  // 0. Para pagar hay que haber entrado. Se comprueba aqui y no solo en el boton: la accion se puede llamar desde fuera
  const usuario = await usuarioActual();
  if (!usuario) return { necesitaLogin: true };
```
- En el `prisma.pedido.create`, sustituir `email: "pendiente@checkout", // Stripe nos dara el email real al pagar` por:
```ts
      email: usuario.email, // el de su cuenta de Google; Stripe lo muestra fijo
      usuarioId: usuario.id,
```
- En `stripe.checkout.sessions.create`, después de `mode: "payment",` añadir
  `customer_email: usuario.email, // el cliente no puede cambiarlo en la pagina de Stripe`

- [ ] **Step 2: Botón de pagar**

Reemplazar `src/components/boton-pagar.tsx` por:
```tsx
"use client";
// Boton "Pagar": llama a la Server Action con los ids y cantidades (NO con los precios).
// Sin sesion, primero lleva a Google y vuelve al carrito (ya sumado) para que el cliente pague lo que ve.
import { useTransition } from "react";
import { toast } from "sonner";
import { crearCheckout } from "@/app/checkout/actions";
import { entrarConGoogle } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import type { LineaCarrito } from "@/store/carrito";

export function BotonPagar({ lineas, conSesion }: { lineas: LineaCarrito[]; conSesion: boolean }) {
  const [pendiente, empezar] = useTransition();

  function pagar() {
    empezar(async () => {
      if (!conSesion) return entrarConGoogle("/carrito");
      // Si todo va bien, la accion redirige a Stripe y esta linea nunca devuelve nada
      const r = await crearCheckout(lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })));
      if (r?.necesitaLogin) return entrarConGoogle("/carrito"); // la sesion caduco mientras tanto
      if (r?.error) toast.error(r.error);
    });
  }

  const texto = conSesion ? "Pagar con tarjeta" : "Entrar con Google para pagar";
  return (
    <Button size="lg" onClick={pagar} disabled={pendiente} className="px-8">
      {pendiente ? (conSesion ? "Preparando el pago..." : "Abriendo Google...") : texto}
    </Button>
  );
}
```

- [ ] **Step 3: Pasar `conSesion` desde la página**

En `src/components/vista-carrito.tsx`: cambiar `export function VistaCarrito() {` por
`export function VistaCarrito({ conSesion }: { conSesion: boolean }) {` y `<BotonPagar lineas={lineas} />` por
`<BotonPagar lineas={lineas} conSesion={conSesion} />`.

En `src/app/carrito/page.tsx`: importar `usuarioActual` de `@/lib/sesion`, hacer la página `async` y pasar
`<VistaCarrito conSesion={(await usuarioActual()) !== null} />`.

- [ ] **Step 4: Webhook**

En `src/app/api/webhooks/stripe/route.ts`, sustituir el bloque del evento `checkout.session.completed` desde
`// updateMany con estado PENDIENTE` hasta el cierre del `if (count === 1) { ... }` (sin tocar el `else`) por:
```ts
    // updateMany con estado PENDIENTE: si Stripe reenvia el evento, no se procesa dos veces (idempotencia).
    // El email NO se toca: el pedido nace con el de la cuenta de Google.
    const { count } = await prisma.pedido.updateMany({
      where: { id: pedidoId, estado: "PENDIENTE" },
      data: { estado: "PAGADO" },
    });

    if (count === 1) {
      const pedido = await prisma.pedido.findUniqueOrThrow({
        where: { id: pedidoId },
        include: { lineas: { include: { producto: true } } },
      });
      // Pedidos de antes de las cuentas (sin dueño): su email real solo lo tiene Stripe
      let email = pedido.email;
      if (pedido.usuarioId === null && sesion.customer_details?.email) {
        email = sesion.customer_details.email;
        await prisma.pedido.update({ where: { id: pedidoId }, data: { email } });
      }

      // Descontamos el stock de lo vendido
      for (const l of pedido.lineas) {
        await prisma.producto.update({ where: { id: l.productoId }, data: { stock: { decrement: l.cantidad } } });
      }
      console.log(`[webhook] pedido ${pedidoId} PAGADO (${pedido.total} centimos, ${email})`);

      // El email sale de AQUI, del webhook: si el cliente cierra el navegador tras pagar, lo recibe igual.
      // Si el email falla, el pedido sigue pagado: lo registramos y respondemos 200 a Stripe.
      try {
        await enviarConfirmacion({
          id: pedidoId,
          email,
          total: pedido.total,
          lineas: pedido.lineas.map((l) => ({ nombre: l.producto.nombre, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
        });
      } catch (e) {
        console.error("[email] no se pudo enviar:", (e as Error).message);
      }
    } else {
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS.

Prueba a mano: `npm run dev` y, en otra terminal,
`stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe`.
1. Sin sesión, `/carrito` muestra "Entrar con Google para pagar" → Google → vuelve a `/carrito` con el carrito.
2. "Pagar con tarjeta" → Stripe muestra el email de la cuenta fijo. Pagar con `4242 4242 4242 4242`.
3. `npx tsx scripts/ver-pedidos.ts`: el pedido está PAGADO, con el email de Google, y `stripe listen` muestra `200`.

- [ ] **Step 6: Commit**

```bash
git add src/app/checkout/actions.ts src/components/boton-pagar.tsx src/components/vista-carrito.tsx src/app/carrito/page.tsx src/app/api/webhooks/stripe/route.ts
git commit -m "Pagar exige sesion: el pedido nace con el usuario y el email de Google

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Mis pedidos

**Files:**
- Create: `src/app/cuenta/pedidos/page.tsx`, `src/app/cuenta/pedidos/[id]/page.tsx`

**Interfaces:**
- Consumes: `usuarioActual` (Tarea 4), `puedeVerPedido` (Tarea 1), `BadgeEstado`, `formatearPrecio`.

- [ ] **Step 1: Lista**

`src/app/cuenta/pedidos/page.tsx`:
```tsx
// Mis pedidos: los pedidos de la cuenta que ha entrado, del mas reciente al mas antiguo.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeEstado } from "@/components/badge-estado";
import { Button } from "@/components/ui/button";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis pedidos" };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "Europe/Madrid" });

export default async function MisPedidos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=/cuenta/pedidos"); // el middleware ya lo evita; por si la cookie es vieja

  const pedidos = await prisma.pedido.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { id: "desc" },
    include: { _count: { select: { lineas: true } } },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Mis pedidos</h1>
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Todavía no has hecho ningún pedido.</p>
          <Button render={<Link href="/" />} nativeButton={false}>Ver el catálogo</Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {pedidos.map((p) => (
            <li key={p.id}>
              <Link href={`/cuenta/pedidos/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50">
                <span className="font-medium">#{p.id}</span>
                <span className="flex-1 text-sm text-muted-foreground">
                  {fecha.format(p.creadoEn)} · {p._count.lineas} {p._count.lineas === 1 ? "producto" : "productos"}
                </span>
                <BadgeEstado estado={p.estado} />
                <span className="w-24 text-right font-semibold tabular-nums">{formatearPrecio(p.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Detalle**

`src/app/cuenta/pedidos/[id]/page.tsx`:
```tsx
// Detalle de un pedido del cliente. Si no es suyo, 404 (no 403): asi no se revela que ese pedido existe.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeEstado } from "@/components/badge-estado";
import { puedeVerPedido } from "@/lib/cuentas";
import { formatearPrecio } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Pedido #${(await params).id}` };
}

export default async function MiPedido({ params }: Props) {
  const { id: texto } = await params;
  const usuario = await usuarioActual();
  if (!usuario) redirect(`/entrar?callbackUrl=/cuenta/pedidos/${encodeURIComponent(texto)}`);

  const id = Number(texto);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { lineas: { include: { producto: { select: { nombre: true } } } } },
  });
  if (!pedido || !puedeVerPedido(usuario, pedido)) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <Link href="/cuenta/pedidos" className="text-sm text-muted-foreground hover:text-foreground">← Mis pedidos</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Pedido #{pedido.id}</h1>
        <BadgeEstado estado={pedido.estado} />
      </div>
      <p className="text-sm text-muted-foreground">
        {pedido.creadoEn.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} · {pedido.email}
      </p>
      <div className="rounded-xl border p-5">
        <ul className="space-y-1 text-sm">
          {pedido.lineas.map((l) => (
            <li key={l.id} className="flex justify-between">
              <span>{l.cantidad} × {l.producto.nombre}</span>
              <span className="tabular-nums">{formatearPrecio(l.precioUnitario * l.cantidad)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t pt-3 font-semibold">
          <span>Total</span><span>{formatearPrecio(pedido.total)}</span>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS.

Prueba a mano (`npm run dev`), con el pedido pagado de la Tarea 7:
1. Menú → "Mis pedidos" lo muestra como Pagado; al pulsarlo se ve el detalle.
2. Con otra cuenta de Google (usuario de prueba de la pantalla de consentimiento), `/cuenta/pedidos/<ese id>` → 404 y
   la lista sale vacía.
3. Sin sesión, `/cuenta/pedidos` → `/entrar?callbackUrl=%2Fcuenta%2Fpedidos`.

- [ ] **Step 4: Commit**

```bash
git add src/app/cuenta
git commit -m "Mis pedidos: lista y detalle de los pedidos de la cuenta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentación

**Files:**
- Modify: `CLAUDE.md`, `docs/NOTAS-DEL-PROYECTO.md`, `docs/ESPECIFICACION.md`, `README.md`

- [ ] **Step 1: `CLAUDE.md`**

Sustituir la viñeta que empieza por `- **Admin:** contraseña ADMIN_PASSWORD ...` por:
```markdown
- **Cuentas con Google (Auth.js v5, sesión JWT):** config en `src/auth.config.ts` (sin BD, la usa el middleware) y
  `src/auth.ts` (crea el `Usuario` al entrar). La cookie lleva solo el id; `usuarioActual()` y `exigirAdmin()`
  (`src/lib/sesion.ts`) leen el usuario y su **rol de la BD**. El middleware solo exige sesión en `/admin` y `/cuenta`:
  cada página y cada Server Action de admin vuelven a llamar a `exigirAdmin`.
- **`ADMIN_EMAILS` es solo la semilla:** al entrar, esos emails pasan a ADMIN. Quitar un email de la lista **no** le
  quita el rol: hay que cambiar `Usuario.rol` en la BD (Prisma Studio).
- **Pagar exige sesión:** `crearCheckout` devuelve `necesitaLogin` sin usuario; el pedido nace con `usuarioId` y el
  email de Google (`customer_email` en Stripe). El webhook ya no sobrescribe el email.
- **Las URIs de redirección de Google** (`/api/auth/callback/google`, local y producción) se dan de alta en Google
  Cloud Console, fuera del código. Un dominio nuevo de Vercel necesita la suya.
```
En la viñeta de `npm run seed`: cambiar `borra también los pedidos` por `borra también los pedidos y los usuarios`,
y cambiar `(` + "`carrito-rincon` en `src/store/carrito.ts`" + `)` por
`` (`CLAVE_CARRITO` = `carrito-rincon` en `src/store/carrito.ts`; con sesión, cada usuario usa `carrito-rincon:<id>`) ``.

- [ ] **Step 2: `docs/NOTAS-DEL-PROYECTO.md`**

Reescribir la sección `## Carrito` así:
```markdown
## Carrito
- **Qué es Zustand:** una librería pequeña de estado compartido en el navegador. `src/store/carrito.ts` define el store
  (las `lineas` y las acciones `anadir`, `cambiarCantidad`, `quitar`, `vaciar`) y cualquier componente lo usa con
  `useCarrito()`, sin Provider ni Context: el icono de la cabecera, la ficha y `/carrito` se repintan solos. Se eligió
  por eso: menos código que un Context y un selector (`useCarrito((s) => ...)`) que evita repintados de más.
- **`persist`** copia el estado en `localStorage`. Hay **un carrito por identidad**: `carrito-rincon` sin sesión y
  `carrito-rincon:<usuarioId>` con sesión. No hay carrito en la base de datos ni se sincroniza entre dispositivos.
- El store se crea con `skipHydration`: no se carga solo. Lo carga `SincronizarCarrito` (en el layout), que recibe el
  `usuarioId` del servidor. **Al entrar**, suma el carrito anónimo al del usuario (`juntarCarritos`: mismo producto =
  una línea, sin pasar del stock) y borra el anónimo. **Al salir**, carga el anónimo (vacío); el del usuario queda
  guardado en ese navegador.
- Guarda una **copia** del precio y del stock del momento en que se añadió. Por eso el checkout **no se fía** de esos
  datos: vuelve a leer precio y stock de la base de datos.
- Si cambias la forma de `LineaCarrito`, los carritos guardados con la forma antigua siguen en el navegador de la gente.
  Para invalidarlos, cambia `CLAVE_CARRITO` (o usa `version` + `migrate` de Zustand).
```
Añadir una sección nueva `## Cuentas` antes de `## Admin`:
```markdown
## Cuentas
- Login con Google con Auth.js v5 (`next-auth@5` beta), sesión **JWT** en una cookie cifrada con `AUTH_SECRET`, sin
  adaptador de Prisma: no hay tablas `Account` ni `Session`, solo `Usuario` (email, nombre, foto, `rol`).
- Configuración partida en dos porque el middleware no puede usar Prisma: `src/auth.config.ts` (proveedor, páginas,
  `signIn` que exige `email_verified`, `session`) y `src/auth.ts` (callback `jwt`: `upsert` del `Usuario` al entrar).
- La cookie lleva **solo el id**. `usuarioActual()` lo lee y además compara el email: tras `npm run seed` los ids se
  reinician y una cookie vieja podría apuntar a otra persona; en ese caso devuelve `null`.
- Entrar y salir son Server Actions (`src/app/entrar/actions.ts`). `destinoSeguro` solo deja volver a rutas de la tienda.
- Pagar exige sesión. Sin ella, el botón del carrito lleva a Google y vuelve a `/carrito` (no directo a Stripe), para
  que el cliente vea el carrito ya sumado antes de pagar.
- "Mis pedidos" (`/cuenta/pedidos`) muestra los pedidos con `usuarioId` del usuario. Un pedido ajeno da **404**. Los
  pedidos de antes de las cuentas no tienen dueño y solo los ve el admin.
- **Google Cloud Console:** cliente OAuth "Aplicación web" con las URIs de redirección
  `http://localhost:3000/api/auth/callback/google` y `https://exercise2-floristeria.vercel.app/api/auth/callback/google`.
  Mientras la pantalla de consentimiento esté en modo "Prueba", solo entran las cuentas añadidas como usuarios de prueba.
```
Reescribir las dos primeras viñetas de `## Admin` así (la tercera, la de la fila con `::after`, se queda):
```markdown
- Es admin quien tiene `Usuario.rol = ADMIN` en la BD. `ADMIN_EMAILS` (lista separada por comas) es la **semilla**:
  al entrar, esos emails pasan a ADMIN; quitarlos de la lista no quita el rol (se cambia en Prisma Studio).
- El middleware (`src/middleware.ts`) solo exige **sesión** en `/admin`. El rol lo comprueban las páginas (si no es
  admin, `SinAcceso`) y **cada Server Action** de `src/app/admin/actions.ts` con `exigirAdmin()`. Si añades una acción
  de admin, tiene que hacer lo mismo.
```

- [ ] **Step 3: `docs/ESPECIFICACION.md`**

- En "Qué hace la tienda", añadir al final del primer párrafo: `Para pagar hay que entrar con Google; con la cuenta,
  el cliente ve sus pedidos.`
- En la tabla de páginas, añadir filas:
  `| /entrar | Entrar con Google | Cliente |`,
  `| /cuenta/pedidos y /cuenta/pedidos/[id] | Mis pedidos: lista y detalle | Cliente con sesión |`
  y cambiar la fila de `/admin` para que en "Quién la usa" diga `Floristería (cuenta con rol ADMIN)`.
- En "Modelo de datos", añadir: `- **Usuario** 1 — N **Pedido** (opcional: los pedidos antiguos no tienen dueño). Un
  usuario tiene un **rol**: CLIENTE o ADMIN.`
- En "Fuera de alcance", quitar `Cuentas de cliente, `.

- [ ] **Step 4: `README.md`**

- En la tabla de "Servicios externos", después de la fila de Resend, añadir:
  ```markdown
  | **Google (OAuth)** | Entrar con la cuenta de Google | Al pulsar "Entrar" o "Entrar con Google para pagar"; Google vuelve a `/api/auth/callback/google` | `src/auth.ts` y `src/auth.config.ts` (Auth.js) | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` (cifra la cookie), `ADMIN_EMAILS` (semilla de admins) |
  ```
  y en la fila de Vercel cambiar `Las de arriba, más ADMIN_PASSWORD` por `Las de arriba`.
- En "Desplegarlo en Vercel" (línea ~107), sustituir `ADMIN_PASSWORD` por las cuatro variables nuevas.
- En "Ejecutarlo en local", añadir un paso: crear el cliente OAuth en Google Cloud Console con la URI
  `http://localhost:3000/api/auth/callback/google` y rellenar las variables `AUTH_*` y `ADMIN_EMAILS` del `.env`.
- En "Qué tiene la aplicación", añadir las filas de `/entrar` y `/cuenta/pedidos`, y en "Estructura" las líneas
  `src/auth.ts, src/auth.config.ts   login con Google (Auth.js)` y `src/lib/sesion.ts        usuario actual y admin`.

- [ ] **Step 5: Verificar y commit**

Run: `grep -rn "ADMIN_PASSWORD\|admin_rincon\|admin/entrar" CLAUDE.md README.md docs/ESPECIFICACION.md docs/NOTAS-DEL-PROYECTO.md .env.example`
Expected: sin resultados.
Run: `npm test` (el test de marca lee `docs/NOTAS-DEL-PROYECTO.md` y exige que cite `carrito-rincon`).
Expected: PASS.

```bash
git add CLAUDE.md README.md docs/ESPECIFICACION.md docs/NOTAS-DEL-PROYECTO.md
git commit -m "Documentacion de las cuentas con Google y del carrito por usuario

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Verificación final y paso a producción

**Files:** ninguno nuevo.

- [ ] **Step 1: Verificación completa en local**

Con `npm run dev` **parado**:
Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: todo PASS y el build termina sin errores.

- [ ] **Step 2: Recorrido completo en local**

Con `npm run dev` y `stripe listen` en marcha, repetir de seguido las pruebas a mano de las Tareas 5, 6, 7 y 8 y
anotar el resultado de cada una.

- [ ] **Step 3: Pedir confirmación al usuario**

Explicar al usuario lo que queda y **esperar su sí** antes de cada cosa:
1. `npm run migrar:produccion` (aplica la migración `cuentas` a la rama `main` de Neon; solo añade).
2. Variables en Vercel (Production): `AUTH_SECRET` (uno **nuevo**, distinto del local), `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`. Quitar `ADMIN_PASSWORD`. Esto lo hace el usuario en el panel de Vercel o
   autoriza a hacerlo con la CLI.
3. `git push` a `main` (Vercel despliega y el CI corre).

- [ ] **Step 4: Recorrido en producción**

En `https://exercise2-floristeria.vercel.app`: entrar con Google, carrito sumado, pagar con 4242, el pedido aparece
PAGADO en "Mis pedidos" y en `/admin` con la cuenta admin; otra cuenta ve "No tienes acceso". Comprobar el CI en
GitHub (`gh run list --limit 1`).
