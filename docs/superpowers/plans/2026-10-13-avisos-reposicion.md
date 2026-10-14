# Avisos de reposición · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un cliente con cuenta pida "avísame cuando vuelva" en un producto agotado y reciba un email (una sola
vez) cuando la floristería lo reponga.

**Architecture:** Tabla nueva `AvisoReposicion` (única por cliente y producto, `enviadoEn` nulo = pendiente). El
cliente la escribe con dos Server Actions desde la ficha (`pedirAviso`, `quitarAviso`) y la ve en `/cuenta/avisos`.
El gancho `alReponer` (`src/lib/reposicion.ts`), que ya llaman `reponerStock` y `corregirStock` y ahora también
`guardarProducto` (oculto → visible con stock), reserva los avisos pendientes con un único `UPDATE ... RETURNING`,
los envía por lotes con Resend y devuelve a pendiente los de un lote que falle. La lógica sin BD vive en
`src/lib/avisos.ts` y en la plantilla, con sus tests.

**Tech Stack:** Next.js 15 (App Router, Server Actions, `useActionState`), TypeScript, Prisma 7 + PostgreSQL (Neon),
Resend 6 (`resend.batch.send`), Tailwind + shadcn/ui (base-ui), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-avisos-reposicion-design.md`

## Global Constraints

- Todo en español: textos de la web, comentarios y mensajes de commit. Comentarios del código **sin tildes** (como el
  resto del repo); textos que ve el usuario, con tildes.
- El nombre de la tienda solo está en `src/lib/tienda.ts` (`TIENDA.nombre`); no se escribe en ningún otro archivo de
  `src/` (`tests/marca.test.ts`).
- Precios en céntimos (`Int`). Se formatean solo al pintarlos con `formatearPrecio` (`src/lib/formato.ts`).
- Solo clientes con cuenta piden avisos; cada aviso se envía **una vez** (`enviadoEn`); el admin ve solo el número.
- Los envíos van en lotes de como mucho **100** (`TAMANO_LOTE`), con `onboarding@resend.dev` como remitente y
  `EMAIL_PRUEBAS || email` como destinatario.
- "Mis avisos" muestra los enviados de los últimos **30 días** (`DIAS_HISTORIAL_AVISOS`).
- Cada Server Action comprueba la sesión en la BD (`usuarioActual()` o `exigirAdmin()`) y valida el id que llega.
- Escrituras en BD solo en Server Actions (y en `alReponer`, que solo se llama desde ellas). Una sola instancia de
  Prisma (`@/lib/prisma`).
- Los módulos puros que se testean (`src/lib/avisos.ts`, `src/lib/plantilla-email.ts`) importan con rutas relativas
  (`./formato`), no con `@/`: Vitest no tiene configurado el alias. Los tests importan con `../src/lib/...`.
- La migración solo crea una tabla: tiene que funcionar con el código anterior.
- Antes de dar una tarea por hecha: `npx tsc --noEmit && npm run lint && npm test`.
- No ejecutar `npm run build` con `npm run dev` en marcha (comparten `.next`).

## Review Focus

1. **Stock negativo.** Sin reserva de stock, dos ventas de la última unidad dejan el stock en -1. Ese producto está
   agotado: la ficha tiene que decir "Agotado", no dejar añadirlo al carrito y ofrecer el aviso. Lo prueban
   `puedePedirAviso({ visible: true, stock: -1 })` (Task 1) y el cambio a `stock <= 0` en la ficha y en
   `ComprarProducto` (Task 5).
2. **Producto oculto.** Un aviso nunca puede llevar a una 404: `alReponer` no envía si está oculto, y se envía al
   volver a hacerlo visible con stock. Lo prueba `debeAvisarAlGuardar` (Task 1); el envío, la prueba manual 4 (Task 7).
3. **Nombres con HTML en el email.** El nombre del cliente lo escribe el cliente al registrarse: la plantilla lo
   escapa. Lo prueba `plantillaAvisoReposicion` con `<b>` (Task 2).
4. **Acciones llamadas a mano.** Una Server Action es un endpoint público: `pedirAviso` sin sesión, con un id que no
   es un número, de un producto oculto o con stock, tiene que responder con un mensaje y no escribir nada. Prueba
   manual 5 (Task 7); el criterio, `puedePedirAviso` (Task 1).
5. **Resend falla o no hay clave.** El aviso no se da por enviado: vuelve a pendiente y el admin lee "no se pudo
   avisar". El texto lo prueba `textoResultadoAvisos` (Task 1); la vuelta atrás, la prueba manual 6 (Task 7).

---

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/lib/avisos.ts` (nuevo) | Reglas puras: quién puede pedir, cuándo avisar al guardar, lotes, textos del admin |
| `tests/avisos.test.ts` (nuevo) | Tests de `avisos.ts` y de `plantillaAvisoReposicion` |
| `src/lib/plantilla-email.ts` | + `plantillaAvisoReposicion` |
| `src/lib/email.ts` | + `enviarAvisosReposicion` (lote con `resend.batch.send`) |
| `prisma/schema.prisma` + migración | Modelo `AvisoReposicion` |
| `prisma/seed.ts` | `AvisoReposicion` en el `TRUNCATE` |
| `src/lib/reposicion.ts` | `alReponer` deja de solo escribir en el log: reserva, envía y devuelve el resultado |
| `src/app/admin/productos/actions.ts` | El resultado de los avisos en los mensajes; `guardarProducto` también avisa |
| `src/app/admin/productos/page.tsx` y `[id]/page.tsx` | "N avisos pendientes" |
| `src/app/producto/[id]/actions.ts` (nuevo) | `pedirAviso` y `quitarAviso` |
| `src/components/aviso-reposicion.tsx` (nuevo) | Botón de la ficha y botón "Quitar" |
| `src/app/producto/[id]/page.tsx`, `src/components/comprar-producto.tsx` | Agotado con `stock <= 0`; el aviso en la ficha |
| `src/app/cuenta/avisos/page.tsx` (nuevo), `src/components/menu-cuenta.tsx` | Mis avisos y su enlace |
| `CLAUDE.md`, `docs/NOTAS-DEL-PROYECTO.md`, `docs/ESPECIFICACION.md` | Documentación |

---

### Task 1: Reglas puras de los avisos

**Files:**
- Create: `src/lib/avisos.ts`
- Test: `tests/avisos.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (todo exportado desde `src/lib/avisos.ts`):
  - `TAMANO_LOTE = 100`, `DIAS_HISTORIAL_AVISOS = 30`
  - `type ResultadoAvisos = { avisados: number; fallidos: number; oculto: boolean }`
  - `SIN_AVISOS: ResultadoAvisos` (`{ avisados: 0, fallidos: 0, oculto: false }`)
  - `puedePedirAviso(p: { visible: boolean; stock: number }): boolean`
  - `debeAvisarAlGuardar(antes: { visible: boolean }, despues: { visible: boolean; stock: number }): boolean`
  - `enLotes<T>(lista: T[], tamano: number): T[][]`
  - `textoResultadoAvisos(r: ResultadoAvisos): string`
  - `textoAvisosPendientes(n: number): string`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/avisos.test.ts`:

```ts
// Reglas de los avisos de reposicion: quien puede pedirlos, cuando se envian al guardar, lotes y textos. Sin BD.
import { describe, expect, it } from "vitest";
import {
  debeAvisarAlGuardar, enLotes, puedePedirAviso, SIN_AVISOS, textoAvisosPendientes, textoResultadoAvisos,
} from "../src/lib/avisos";

describe("puedePedirAviso", () => {
  it("solo en productos visibles y agotados (tambien con stock negativo)", () => {
    expect(puedePedirAviso({ visible: true, stock: 0 })).toBe(true);
    expect(puedePedirAviso({ visible: true, stock: -1 })).toBe(true);
    expect(puedePedirAviso({ visible: true, stock: 3 })).toBe(false);
    expect(puedePedirAviso({ visible: false, stock: 0 })).toBe(false);
  });
});

describe("debeAvisarAlGuardar", () => {
  it("avisa cuando un producto oculto pasa a visible con stock", () => {
    expect(debeAvisarAlGuardar({ visible: false }, { visible: true, stock: 2 })).toBe(true);
  });
  it("no avisa en los demas casos", () => {
    expect(debeAvisarAlGuardar({ visible: false }, { visible: true, stock: 0 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: false }, { visible: true, stock: -1 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: true }, { visible: true, stock: 5 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: true }, { visible: false, stock: 5 })).toBe(false);
    expect(debeAvisarAlGuardar({ visible: false }, { visible: false, stock: 5 })).toBe(false);
  });
});

describe("enLotes", () => {
  const lista = (n: number) => Array.from({ length: n }, (_, i) => i);
  it("trocea en listas de como mucho el tamano pedido", () => {
    expect(enLotes(lista(0), 100)).toEqual([]);
    expect(enLotes(lista(1), 100)).toEqual([[0]]);
    expect(enLotes(lista(100), 100).map((l) => l.length)).toEqual([100]);
    expect(enLotes(lista(101), 100).map((l) => l.length)).toEqual([100, 1]);
    expect(enLotes(lista(250), 100).map((l) => l.length)).toEqual([100, 100, 50]);
  });
  it("no pierde ni repite elementos", () => {
    expect(enLotes(lista(250), 100).flat()).toEqual(lista(250));
  });
});

describe("textoResultadoAvisos", () => {
  it("vacio si no hay nada que contar", () => {
    expect(textoResultadoAvisos(SIN_AVISOS)).toBe("");
  });
  it("producto oculto", () => {
    expect(textoResultadoAvisos({ avisados: 0, fallidos: 0, oculto: true }))
      .toBe(" · el producto está oculto: avisaremos cuando lo hagas visible");
  });
  it("avisados en singular y plural", () => {
    expect(textoResultadoAvisos({ avisados: 1, fallidos: 0, oculto: false })).toBe(" · avisado 1 cliente");
    expect(textoResultadoAvisos({ avisados: 3, fallidos: 0, oculto: false })).toBe(" · avisados 3 clientes");
  });
  it("fallidos en singular y plural", () => {
    expect(textoResultadoAvisos({ avisados: 0, fallidos: 1, oculto: false }))
      .toBe(" · no se pudo avisar a 1 cliente (se reintentará al reponer)");
    expect(textoResultadoAvisos({ avisados: 0, fallidos: 2, oculto: false }))
      .toBe(" · no se pudo avisar a 2 clientes (se reintentará al reponer)");
  });
  it("avisados y fallidos a la vez", () => {
    expect(textoResultadoAvisos({ avisados: 100, fallidos: 20, oculto: false }))
      .toBe(" · avisados 100 clientes · no se pudo avisar a 20 clientes (se reintentará al reponer)");
  });
});

describe("textoAvisosPendientes", () => {
  it("cuenta los pendientes para el admin", () => {
    expect(textoAvisosPendientes(0)).toBe("");
    expect(textoAvisosPendientes(1)).toBe("1 aviso pendiente");
    expect(textoAvisosPendientes(3)).toBe("3 avisos pendientes");
  });
});
```

- [ ] **Step 2: Ejecutar los tests y ver que fallan**

Run: `npx vitest run tests/avisos.test.ts`
Expected: FAIL, `Failed to resolve import "../src/lib/avisos"`.

- [ ] **Step 3: Implementar `src/lib/avisos.ts`**

```ts
// Reglas de los avisos de reposicion ("avisame cuando vuelva"). Sin BD ni Resend, para poder probarlas.
// Las usan la ficha del producto, sus Server Actions, el admin de productos y alReponer (src/lib/reposicion.ts).

// Resend acepta como mucho 100 emails por llamada a la API de lotes
export const TAMANO_LOTE = 100;
// "Mis avisos" ensena los avisos ya enviados de los ultimos 30 dias
export const DIAS_HISTORIAL_AVISOS = 30;

export type ResultadoAvisos = { avisados: number; fallidos: number; oculto: boolean };
export const SIN_AVISOS: ResultadoAvisos = { avisados: 0, fallidos: 0, oculto: false };

// Solo se pide aviso de lo que esta a la venta y agotado. Con <= 0: sin reserva de stock puede quedar en -1
export function puedePedirAviso(p: { visible: boolean; stock: number }): boolean {
  return p.visible && p.stock <= 0;
}

// Al guardar los datos: si un producto oculto vuelve a verse y tiene stock, sus avisos pendientes ya se pueden enviar
export function debeAvisarAlGuardar(antes: { visible: boolean }, despues: { visible: boolean; stock: number }): boolean {
  return !antes.visible && despues.visible && despues.stock > 0;
}

export function enLotes<T>(lista: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

const clientes = (n: number) => `${n} ${n === 1 ? "cliente" : "clientes"}`;

// Lo que se anade al mensaje del admin al reponer, corregir o guardar: " · avisados 3 clientes", o "" si nada
export function textoResultadoAvisos(r: ResultadoAvisos): string {
  if (r.oculto) return " · el producto está oculto: avisaremos cuando lo hagas visible";
  const partes: string[] = [];
  if (r.avisados > 0) partes.push(`${r.avisados === 1 ? "avisado" : "avisados"} ${clientes(r.avisados)}`);
  if (r.fallidos > 0) partes.push(`no se pudo avisar a ${clientes(r.fallidos)} (se reintentará al reponer)`);
  return partes.map((p) => ` · ${p}`).join("");
}

// Junto al stock en el admin
export function textoAvisosPendientes(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 aviso pendiente" : `${n} avisos pendientes`;
}
```

- [ ] **Step 4: Ejecutar los tests y ver que pasan**

Run: `npx vitest run tests/avisos.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Comprobaciones y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add src/lib/avisos.ts tests/avisos.test.ts
git commit -m "Avisos de reposicion: reglas puras (quien puede pedirlos, cuando avisar al guardar, lotes y textos)"
```

---

### Task 2: Plantilla y envío del email de aviso

**Files:**
- Modify: `src/lib/plantilla-email.ts` (añadir al final)
- Modify: `src/lib/email.ts` (añadir al final; actualizar el comentario de cabecera)
- Test: `tests/avisos.test.ts` (añadir un `describe`)

**Interfaces:**
- Consumes: `escaparHtml` y `formatearPrecio` (ya existen), `TIENDA` (`src/lib/tienda.ts`).
- Produces:
  - `type DatosAviso = { nombreCliente: string; nombreProducto: string; precio: number; url: string }`
    (en `plantilla-email.ts`; `precio` en céntimos)
  - `plantillaAvisoReposicion(d: DatosAviso): string`
  - `type AvisoEmail = DatosAviso & { email: string }` (en `email.ts`)
  - `enviarAvisosReposicion(avisos: AvisoEmail[]): Promise<boolean>` (en `email.ts`; como mucho 100 avisos;
    `true` si el lote salió)

- [ ] **Step 1: Escribir el test que falla**

Añadir al principio de `tests/avisos.test.ts`, junto a los otros imports:

```ts
import { formatearPrecio } from "../src/lib/formato";
import { plantillaAvisoReposicion } from "../src/lib/plantilla-email";
```

Y al final del archivo:

```ts
describe("plantillaAvisoReposicion", () => {
  const datos = {
    nombreCliente: "Ana <b>",
    nombreProducto: "Centro de margaritas & lavanda",
    precio: 2900,
    url: "https://ejemplo.test/producto/10",
  };
  it("lleva el enlace a la ficha y el precio formateado", () => {
    const html = plantillaAvisoReposicion(datos);
    expect(html).toContain('href="https://ejemplo.test/producto/10"');
    expect(html).toContain(formatearPrecio(2900));
  });
  it("escapa los nombres", () => {
    const html = plantillaAvisoReposicion(datos);
    expect(html).toContain("Ana &lt;b&gt;");
    expect(html).not.toContain("Ana <b>");
    expect(html).toContain("Centro de margaritas &amp; lavanda");
  });
  it("dice que se avisa una sola vez", () => {
    expect(plantillaAvisoReposicion(datos)).toContain("Te avisamos una sola vez");
  });
});
```

- [ ] **Step 2: Ejecutar el test y ver que falla**

Run: `npx vitest run tests/avisos.test.ts`
Expected: FAIL, `plantillaAvisoReposicion is not a function` (o error de import).

- [ ] **Step 3: Añadir la plantilla al final de `src/lib/plantilla-email.ts`**

```ts
// Aviso de reposicion: el producto vuelve a estar disponible. El nombre del cliente lo escribio el al registrarse: se escapa
export type DatosAviso = { nombreCliente: string; nombreProducto: string; precio: number; url: string };

export function plantillaAvisoReposicion(d: DatosAviso): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2A22">
    <h1 style="font-size:22px;color:#3F6B4A">Ya ha vuelto: ${escaparHtml(d.nombreProducto)}</h1>
    <p>Hola, ${escaparHtml(d.nombreCliente)}. Nos pediste que te avisáramos y ya tenemos otra vez
      <strong>${escaparHtml(d.nombreProducto)}</strong> (${formatearPrecio(d.precio)}).</p>
    <p style="margin:24px 0">
      <a href="${escaparHtml(d.url)}" style="background:#3F6B4A;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none">Ver el producto</a>
    </p>
    <p style="color:#737373;font-size:12px">Te avisamos una sola vez; puedes ver tus avisos en tu cuenta de ${TIENDA.nombre}.<br>
      Tienda ficticia (material de clase).</p>
  </div>`;
}
```

(`escaparHtml` sobre la URL no cambia una URL normal y evita romper el atributo si trae comillas.)

- [ ] **Step 4: Ejecutar el test y ver que pasa**

Run: `npx vitest run tests/avisos.test.ts`
Expected: PASS.

- [ ] **Step 5: Añadir el envío por lotes a `src/lib/email.ts`**

Cambiar el comentario de la primera línea por:

```ts
// Envio de emails con Resend: la confirmacion del pedido (solo desde el WEBHOOK, el punto fiable) y los avisos de
// reposicion (solo desde alReponer). Las plantillas, en plantilla-email.ts.
```

Cambiar el import de la plantilla por:

```ts
import { plantillaAvisoReposicion, plantillaConfirmacion, type DatosAviso, type PedidoEmail } from "@/lib/plantilla-email";
```

Y añadir al final:

```ts
export type AvisoEmail = DatosAviso & { email: string };

// Un lote de avisos (como mucho 100, el limite de Resend) en una sola llamada. Devuelve si salio:
// con false, alReponer devuelve esos avisos a pendientes para reintentarlo en la siguiente reposicion.
export async function enviarAvisosReposicion(avisos: AvisoEmail[]): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("[email] sin RESEND_API_KEY: los avisos de reposicion se quedan pendientes");
    return false;
  }
  const resend = new Resend(clave);
  const { error } = await resend.batch.send(
    avisos.map((a) => ({
      from: `${TIENDA.nombre} <onboarding@resend.dev>`,
      to: process.env.EMAIL_PRUEBAS || a.email, // sin dominio propio, Resend solo entrega a la cuenta (ver arriba)
      subject: `Vuelve a haber ${a.nombreProducto} · ${TIENDA.nombre}`,
      html: plantillaAvisoReposicion(a),
    })),
  );
  if (error) {
    console.error("[email] Resend devolvio un error con los avisos:", error.message);
    return false;
  }
  return true;
}
```

- [ ] **Step 6: Comprobaciones y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde (incluido `tests/marca.test.ts`: la plantilla usa `TIENDA.nombre`).

```bash
git add src/lib/plantilla-email.ts src/lib/email.ts tests/avisos.test.ts
git commit -m "Avisos de reposicion: plantilla del email y envio por lotes con Resend"
```

---

### Task 3: Tabla `AvisoReposicion`

**Files:**
- Modify: `prisma/schema.prisma` (modelos `Usuario`, `Producto` y modelo nuevo)
- Create: `prisma/migrations/<fecha>_avisos_reposicion/migration.sql` (lo genera Prisma)
- Modify: `prisma/seed.ts:18` (el `TRUNCATE`)

**Interfaces:**
- Consumes: nada.
- Produces: el cliente de Prisma con `prisma.avisoReposicion` (campos `id`, `usuarioId`, `productoId`, `creadoEn`,
  `enviadoEn: Date | null`), la clave compuesta `usuarioId_productoId` para `upsert`, y las relaciones
  `Usuario.avisos` y `Producto.avisos`.

- [ ] **Step 1: Comprobar que se apunta a desarrollo**

Run: `npm run db:check`
Expected: `Entorno  : desarrollo (no es la de produccion)`. Si dice producción, parar.

- [ ] **Step 2: Añadir el modelo a `prisma/schema.prisma`**

En `model Producto`, debajo de `lineas      LineaPedido[]`:

```prisma
  avisos      AvisoReposicion[]
```

En `model Usuario`, debajo de `sesiones   Sesion[]`:

```prisma
  avisos     AvisoReposicion[]
```

Y al final del archivo:

```prisma
// "Avisame cuando vuelva": un cliente con cuenta pide que le avisen cuando un producto agotado vuelva a tener stock.
// Una fila como mucho por cliente y producto; volver a pedirlo reutiliza la fila (enviadoEn vuelve a null).
// Lo envia alReponer (src/lib/reposicion.ts), una sola vez.
model AvisoReposicion {
  id         Int       @id @default(autoincrement())
  usuario    Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  usuarioId  Int
  producto   Producto  @relation(fields: [productoId], references: [id], onDelete: Cascade)
  productoId Int
  creadoEn   DateTime  @default(now())
  enviadoEn  DateTime? // null = pendiente; con fecha = ya se aviso (una sola vez)

  @@unique([usuarioId, productoId])
  @@index([productoId, enviadoEn])
}
```

- [ ] **Step 3: Crear y aplicar la migración en desarrollo**

Run: `npx prisma migrate dev --name avisos_reposicion`
Expected: crea `prisma/migrations/<fecha>_avisos_reposicion/migration.sql` con un `CREATE TABLE "AvisoReposicion"`,
el índice único, el índice de `productoId, enviadoEn` y dos claves ajenas `ON DELETE CASCADE`; lo aplica y regenera
el cliente. Abrir el SQL y comprobar que **solo crea** cosas (ningún `DROP` ni `ALTER` de otras tablas).

- [ ] **Step 4: Añadir la tabla al `TRUNCATE` del seed**

En `prisma/seed.ts`, la línea del `TRUNCATE` pasa a:

```ts
  await prisma.$executeRaw`TRUNCATE "AvisoReposicion", "LineaPedido", "Pedido", "Sesion", "Usuario", "Producto", "Categoria" RESTART IDENTITY CASCADE`;
```

Y en el comentario de encima, si enumera lo que se borra, añadir los avisos.

- [ ] **Step 5: Comprobaciones y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts
git commit -m "Avisos de reposicion: tabla AvisoReposicion (una por cliente y producto) y su sitio en el seed"
```

---

### Task 4: `alReponer` envía los avisos y el admin ve el resultado

**Files:**
- Modify: `src/lib/reposicion.ts` (reescribir)
- Modify: `src/app/admin/productos/actions.ts` (imports, helper `origen`, las tres acciones)
- Modify: `src/app/admin/productos/page.tsx` (contador en la lista)
- Modify: `src/app/admin/productos/[id]/page.tsx` (contador en la ficha)

**Interfaces:**
- Consumes: `SIN_AVISOS`, `TAMANO_LOTE`, `enLotes`, `debeAvisarAlGuardar`, `textoResultadoAvisos`,
  `textoAvisosPendientes`, `type ResultadoAvisos` (Task 1); `enviarAvisosReposicion`, `type AvisoEmail` (Task 2);
  `prisma.avisoReposicion` (Task 3).
- Produces: `alReponer(productoId: number, origen: string): Promise<ResultadoAvisos>`.

- [ ] **Step 1: Reescribir `src/lib/reposicion.ts`**

```ts
// Gancho de reposicion: el UNICO sitio que sabe que un producto vuelve a poder comprarse. Lo llaman, desde
// src/app/admin/productos/actions.ts, reponerStock y corregirStock (pasa de agotado a disponible: esReposicion)
// y guardarProducto (un producto oculto vuelve a verse con stock: debeAvisarAlGuardar).
// Envia los avisos de "avisame cuando vuelva" (AvisoReposicion), cada uno UNA sola vez:
// 1. Si el producto esta oculto no se avisa (el enlace daria 404): se hara al volver a mostrarlo.
// 2. Los avisos pendientes se reservan con un solo UPDATE ... RETURNING: si dos reposiciones coinciden, cada aviso
//    lo reserva solo una de ellas (no hay emails dobles).
// 3. Se envian por lotes; los de un lote que falla (o sin RESEND_API_KEY) vuelven a pendientes y se reintentan en la
//    siguiente reposicion. Nunca se da por enviado un email que no salio.
import "server-only";
import { enLotes, SIN_AVISOS, TAMANO_LOTE, type ResultadoAvisos } from "@/lib/avisos";
import { enviarAvisosReposicion, type AvisoEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function alReponer(productoId: number, origen: string): Promise<ResultadoAvisos> {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { nombre: true, precio: true, visible: true, stock: true },
  });
  // stock <= 0: se ha vendido entre medias. No hay nada que avisar
  if (!producto || producto.stock <= 0) return SIN_AVISOS;
  if (!producto.visible) return { ...SIN_AVISOS, oculto: true };

  const reservados = await prisma.$queryRaw<{ id: number; usuarioId: number }[]>`
    UPDATE "AvisoReposicion" SET "enviadoEn" = CURRENT_TIMESTAMP
    WHERE "productoId" = ${productoId} AND "enviadoEn" IS NULL
    RETURNING id, "usuarioId"`;
  if (reservados.length === 0) return SIN_AVISOS;

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: reservados.map((r) => r.usuarioId) } },
    select: { id: true, email: true, nombre: true },
  });
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const url = `${origen}/producto/${productoId}`;

  let avisados = 0;
  let fallidos = 0;
  for (const lote of enLotes(reservados, TAMANO_LOTE)) {
    // El usuario siempre existe (borrarlo borra sus avisos en cascada); el flatMap solo contenta al tipo
    const emails: AvisoEmail[] = lote.flatMap((r) => {
      const u = porId.get(r.usuarioId);
      return u ? [{ email: u.email, nombreCliente: u.nombre, nombreProducto: producto.nombre, precio: producto.precio, url }] : [];
    });
    if (await enviarAvisosReposicion(emails)) {
      avisados += lote.length;
    } else {
      fallidos += lote.length;
      await prisma.avisoReposicion.updateMany({ where: { id: { in: lote.map((r) => r.id) } }, data: { enviadoEn: null } });
    }
  }
  console.info(`[reposicion] producto ${productoId}: avisados ${avisados}, fallidos ${fallidos}`);
  return { avisados, fallidos, oculto: false };
}
```

- [ ] **Step 2: Imports y helper en `src/app/admin/productos/actions.ts`**

Añadir a los imports (en orden alfabético con los demás):

```ts
import { headers } from "next/headers";
import { debeAvisarAlGuardar, SIN_AVISOS, textoResultadoAvisos } from "@/lib/avisos";
```

Y debajo de `function refrescar(...) { ... }`:

```ts
// Para los enlaces absolutos de los emails de aviso (como en crearCheckout)
async function origen() {
  return (await headers()).get("origin") ?? "http://localhost:3000";
}
```

- [ ] **Step 3: `reponerStock` y `corregirStock` añaden el resultado al mensaje**

En `reponerStock`, sustituir:

```ts
  const antes = nuevo - unidades;
  if (esReposicion(antes, nuevo)) await alReponer(id);
  refrescar(id);
  return { ok: `Stock: ${antes} → ${nuevo}` };
```

por:

```ts
  const antes = nuevo - unidades;
  const avisos = esReposicion(antes, nuevo) ? await alReponer(id, await origen()) : SIN_AVISOS;
  refrescar(id);
  return { ok: `Stock: ${antes} → ${nuevo}${textoResultadoAvisos(avisos)}` };
```

En `corregirStock`, sustituir:

```ts
  if (esReposicion(leido, nuevo)) await alReponer(id);
  refrescar(id);
  return { ok: `Stock: ${leido} → ${nuevo}` };
```

por:

```ts
  const avisos = esReposicion(leido, nuevo) ? await alReponer(id, await origen()) : SIN_AVISOS;
  refrescar(id);
  return { ok: `Stock: ${leido} → ${nuevo}${textoResultadoAvisos(avisos)}` };
```

- [ ] **Step 4: `guardarProducto` avisa al volver a mostrar un producto con stock**

En `guardarProducto`, sustituir el bloque desde `// El stock NO se toca aqui.` hasta `refrescar(id);` (incluido):

```ts
  // El stock NO se toca aqui. nombreBusqueda se recalcula: si no, el producto renombrado no saldria en la busqueda
  const { count } = await prisma.producto.updateMany({
    where: { id },
    data: { ...r.datos, nombreBusqueda: normalizar(r.datos.nombre) },
  });
  if (count === 0) return { error: NO_EXISTE, valores };

  refrescar(id);
```

por:

```ts
  // Como estaba antes: si pasa de oculto a visible con stock, hay que enviar los avisos que esperaban
  const antes = await prisma.producto.findUnique({ where: { id }, select: { visible: true, stock: true } });
  if (!antes) return { error: NO_EXISTE, valores };

  // El stock NO se toca aqui. nombreBusqueda se recalcula: si no, el producto renombrado no saldria en la busqueda
  const { count } = await prisma.producto.updateMany({
    where: { id },
    data: { ...r.datos, nombreBusqueda: normalizar(r.datos.nombre) },
  });
  if (count === 0) return { error: NO_EXISTE, valores };

  // alReponer vuelve a leer el stock: si se vendio entre medias, no avisa
  const avisos = debeAvisarAlGuardar(antes, { visible: r.datos.visible, stock: antes.stock })
    ? await alReponer(id, await origen())
    : SIN_AVISOS;
  refrescar(id);
```

Y en su `return` final, cambiar `ok: "Guardado",` por:

```ts
    ok: `Guardado${textoResultadoAvisos(avisos)}`,
```

Actualizar también el comentario de cabecera del archivo: tras "El stock solo cambia aqui (reponer y corregir)…",
añadir una línea: `// Las tres acciones llaman a alReponer cuando un producto vuelve a poder comprarse (envia los avisos de reposicion).`

- [ ] **Step 5: Contador en la lista del admin (`src/app/admin/productos/page.tsx`)**

Añadir el import:

```ts
import { textoAvisosPendientes } from "@/lib/avisos";
```

Sustituir la consulta:

```ts
  const productos = ordenarParaAdmin(
    await prisma.producto.findMany({ include: { categoria: { select: { nombre: true } } } }),
  );
```

por:

```ts
  const [todos, pendientes] = await Promise.all([
    prisma.producto.findMany({ include: { categoria: { select: { nombre: true } } } }),
    // Una sola consulta para toda la lista: cuantos avisos pendientes tiene cada producto
    prisma.avisoReposicion.groupBy({ by: ["productoId"], where: { enviadoEn: null }, _count: { _all: true } }),
  ]);
  const productos = ordenarParaAdmin(todos);
  const avisosDe = new Map(pendientes.map((p) => [p.productoId, p._count._all]));
```

Y la celda de estado:

```tsx
              <TableCell><BadgeProducto stock={p.stock} visible={p.visible} /></TableCell>
```

pasa a:

```tsx
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeProducto stock={p.stock} visible={p.visible} />
                  {avisosDe.has(p.id) && (
                    <span className="text-xs text-muted-foreground">{textoAvisosPendientes(avisosDe.get(p.id)!)}</span>
                  )}
                </div>
              </TableCell>
```

- [ ] **Step 6: Contador en la ficha del admin (`src/app/admin/productos/[id]/page.tsx`)**

Añadir el import:

```ts
import { textoAvisosPendientes } from "@/lib/avisos";
```

Sustituir:

```ts
  const [producto, categorias] = await Promise.all([prisma.producto.findUnique({ where: { id } }), listarCategorias()]);
```

por:

```ts
  const [producto, categorias, avisosPendientes] = await Promise.all([
    prisma.producto.findUnique({ where: { id } }),
    listarCategorias(),
    prisma.avisoReposicion.count({ where: { productoId: id, enviadoEn: null } }),
  ]);
```

Y debajo de `<BadgeProducto stock={producto.stock} visible={producto.visible} />`:

```tsx
            {avisosPendientes > 0 && (
              <span className="text-muted-foreground">{textoAvisosPendientes(avisosPendientes)}</span>
            )}
```

- [ ] **Step 7: Comprobaciones y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add src/lib/reposicion.ts src/app/admin/productos
git commit -m "Avisos de reposicion: alReponer reserva y envia los avisos, y el admin ve pendientes y resultado"
```

---

### Task 5: El cliente pide el aviso desde la ficha

**Files:**
- Create: `src/app/producto/[id]/actions.ts`
- Create: `src/components/aviso-reposicion.tsx`
- Modify: `src/app/producto/[id]/page.tsx`
- Modify: `src/components/comprar-producto.tsx:15` (`agotado`)

**Interfaces:**
- Consumes: `puedePedirAviso` (Task 1); `prisma.avisoReposicion` y la clave `usuarioId_productoId` (Task 3);
  `usuarioActual()` (`src/lib/sesion.ts`); `MensajeResultado` (`src/components/campo-formulario.tsx`).
- Produces:
  - `type EstadoAviso = { ok?: string; error?: string }`
  - `pedirAviso(_: EstadoAviso, datos: FormData): Promise<EstadoAviso>` y
    `quitarAviso(_: EstadoAviso, datos: FormData): Promise<EstadoAviso>` (campo `id` = id del producto)
  - `AvisoReposicion({ productoId: number; email: string | null; pendiente: boolean })` y
    `QuitarAviso({ productoId: number; etiqueta: string })` (componentes de cliente)

- [ ] **Step 1: Server Actions (`src/app/producto/[id]/actions.ts`)**

```ts
"use server";
// Avisos de reposicion del cliente: pedir y quitar "avisame cuando vuelva". Una Server Action es un endpoint publico:
// cada una comprueba la sesion en la BD y valida el id (puede llegar cualquier cosa, no solo lo del formulario).
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { puedePedirAviso } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export type EstadoAviso = { ok?: string; error?: string };

const SIN_SESION = "Entra en tu cuenta para pedir el aviso";
const NO_EXISTE = "El producto no existe";

function leerId(datos: FormData): number | null {
  const id = Number(String(datos.get("id") ?? ""));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function refrescar(id: number) {
  revalidatePath(`/producto/${id}`);
  revalidatePath("/cuenta/avisos");
}

export async function pedirAviso(_: EstadoAviso, datos: FormData): Promise<EstadoAviso> {
  const usuario = await usuarioActual();
  if (!usuario) return { error: SIN_SESION };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE };

  const producto = await prisma.producto.findUnique({ where: { id }, select: { visible: true, stock: true } });
  if (!producto || !producto.visible) return { error: NO_EXISTE };
  if (!puedePedirAviso(producto)) {
    refrescar(id); // la ficha que tenia abierta estaba desfasada: se vuelve a pintar con el stock
    return { error: "Ya hay stock de este producto" };
  }

  try {
    // Una fila por cliente y producto: si ya se le aviso otra vez, vuelve a quedar pendiente
    await prisma.avisoReposicion.upsert({
      where: { usuarioId_productoId: { usuarioId: usuario.id, productoId: id } },
      create: { usuarioId: usuario.id, productoId: id },
      update: { enviadoEn: null, creadoEn: new Date() },
    });
  } catch (e) {
    // P2002: dos clics a la vez crearon la fila por el otro lado. El aviso ya esta pedido
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  refrescar(id);
  return { ok: "Te avisaremos" };
}

export async function quitarAviso(_: EstadoAviso, datos: FormData): Promise<EstadoAviso> {
  const usuario = await usuarioActual();
  if (!usuario) return { error: SIN_SESION };
  const id = leerId(datos);
  if (!id) return { error: NO_EXISTE };
  // Solo los suyos y pendientes: un aviso ya enviado se queda en su historial
  await prisma.avisoReposicion.deleteMany({ where: { usuarioId: usuario.id, productoId: id, enviadoEn: null } });
  refrescar(id);
  return { ok: "Aviso quitado" };
}
```

- [ ] **Step 2: Componentes (`src/components/aviso-reposicion.tsx`)**

```tsx
"use client";
// "Avisame cuando vuelva" en la ficha de un producto agotado, y el boton "Quitar" que tambien usa Mis avisos.
// Sin sesion es un enlace a /entrar que vuelve a la ficha (el aviso se pide con un clic mas, ya con sesion).
import Link from "next/link";
import { useActionState } from "react";
import { pedirAviso, quitarAviso, type EstadoAviso } from "@/app/producto/[id]/actions";
import { MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";

type Props = { productoId: number; email: string | null; pendiente: boolean };

export function AvisoReposicion({ productoId, email, pendiente }: Props) {
  if (!email) {
    const entrar = `/entrar?callbackUrl=${encodeURIComponent(`/producto/${productoId}`)}`;
    return (
      <Button variant="outline" className="self-start" render={<Link href={entrar} />} nativeButton={false}>
        Avísame cuando vuelva
      </Button>
    );
  }
  if (pendiente) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p>Te avisaremos por email a <span className="font-medium">{email}</span></p>
        <QuitarAviso productoId={productoId} etiqueta="Quitar aviso" />
      </div>
    );
  }
  return <PedirAviso productoId={productoId} />;
}

function PedirAviso({ productoId }: { productoId: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoAviso, FormData>(pedirAviso, {});
  return (
    <form action={accion} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={productoId} />
      <Button type="submit" variant="outline" disabled={pendiente}>
        {pendiente ? "Guardando..." : "Avísame cuando vuelva"}
      </Button>
      <MensajeResultado error={estado.error} />
    </form>
  );
}

export function QuitarAviso({ productoId, etiqueta }: { productoId: number; etiqueta: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAviso, FormData>(quitarAviso, {});
  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="id" value={productoId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pendiente}>{pendiente ? "Quitando..." : etiqueta}</Button>
      <MensajeResultado error={estado.error} />
    </form>
  );
}
```

(Tras un `ok`, la acción refresca la página y el componente cambia de estado: el propio cambio es la confirmación,
por eso solo se pinta el error.)

- [ ] **Step 3: La ficha (`src/app/producto/[id]/page.tsx`)**

Añadir los imports:

```ts
import { AvisoReposicion } from "@/components/aviso-reposicion";
import { usuarioActual } from "@/lib/sesion";
```

Sustituir:

```ts
  const agotado = producto.stock === 0;
```

por:

```ts
  // <= 0 y no === 0: sin reserva de stock, dos ventas a la vez de la ultima unidad lo dejan en -1
  const agotado = producto.stock <= 0;
  // Solo hace falta saber si ya pidio el aviso cuando el producto esta agotado
  const usuario = agotado ? await usuarioActual() : null;
  const avisoPendiente = usuario
    ? await prisma.avisoReposicion.findFirst({
        where: { usuarioId: usuario.id, productoId: producto.id, enviadoEn: null },
        select: { id: true },
      })
    : null;
```

Y justo después del `<p>` de "Agotado / En stock" (antes de `<ComprarProducto`):

```tsx
          {agotado && (
            <AvisoReposicion productoId={producto.id} email={usuario?.email ?? null} pendiente={!!avisoPendiente} />
          )}
```

- [ ] **Step 4: `ComprarProducto` no deja añadir con stock negativo**

En `src/components/comprar-producto.tsx`, sustituir:

```ts
  const agotado = producto.stock === 0;
```

por:

```ts
  const agotado = producto.stock <= 0; // sin reserva de stock puede quedar en -1
```

- [ ] **Step 5: Comprobaciones y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add "src/app/producto/[id]" src/components/aviso-reposicion.tsx src/components/comprar-producto.tsx
git commit -m "Avisos de reposicion: el cliente pide y quita el aviso en la ficha; agotado tambien con stock negativo"
```

---

### Task 6: Mis avisos

**Files:**
- Create: `src/app/cuenta/avisos/page.tsx`
- Modify: `src/components/menu-cuenta.tsx` (enlace y comentario)

**Interfaces:**
- Consumes: `DIAS_HISTORIAL_AVISOS` (Task 1); `QuitarAviso` (Task 5); `prisma.avisoReposicion` (Task 3).
- Produces: la página `/cuenta/avisos`.

- [ ] **Step 1: La página (`src/app/cuenta/avisos/page.tsx`)**

```tsx
// Mis avisos: los "avisame cuando vuelva" de la cuenta. Pendientes (con "Quitar") y enviados en los ultimos 30 dias.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QuitarAviso } from "@/components/aviso-reposicion";
import { DIAS_HISTORIAL_AVISOS } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis avisos" };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeZone: "Europe/Madrid" });

// Un producto oculto sigue en la lista, pero sin enlace: su ficha da 404
function NombreProducto({ producto }: { producto: { id: number; nombre: string; visible: boolean } }) {
  if (!producto.visible) return <span className="font-medium">{producto.nombre}</span>;
  return (
    <Link href={`/producto/${producto.id}`} className="font-medium underline underline-offset-4">{producto.nombre}</Link>
  );
}

export default async function MisAvisos() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar?callbackUrl=%2Fcuenta%2Favisos"); // cookie caducada o borrada

  const desde = new Date(Date.now() - DIAS_HISTORIAL_AVISOS * 24 * 60 * 60 * 1000);
  const avisos = await prisma.avisoReposicion.findMany({
    where: { usuarioId: usuario.id, OR: [{ enviadoEn: null }, { enviadoEn: { gte: desde } }] },
    orderBy: { creadoEn: "desc" },
    include: { producto: { select: { id: true, nombre: true, visible: true } } },
  });
  const pendientes = avisos.filter((a) => a.enviadoEn === null);
  const enviados = avisos.filter((a) => a.enviadoEn !== null);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Mis avisos</h1>
      {avisos.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No tienes avisos. Cuando un producto esté agotado, pulsa «Avísame cuando vuelva» en su ficha.
        </div>
      ) : (
        <>
          {pendientes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Pendientes</h2>
              <ul className="flex flex-col divide-y rounded-xl border">
                {pendientes.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <NombreProducto producto={a.producto} />
                    <span className="flex-1 text-sm text-muted-foreground">pedido el {fecha.format(a.creadoEn)}</span>
                    <QuitarAviso productoId={a.producto.id} etiqueta="Quitar" />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {enviados.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Enviados</h2>
              <ul className="flex flex-col divide-y rounded-xl border">
                {enviados.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <NombreProducto producto={a.producto} />
                    <span className="text-sm text-muted-foreground">Te avisamos el {fecha.format(a.enviadoEn!)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: El enlace en el menú (`src/components/menu-cuenta.tsx`)**

Debajo de `<Link href="/cuenta/pedidos" className={opcion}>Mis pedidos</Link>`:

```tsx
        <Link href="/cuenta/avisos" className={opcion}>Mis avisos</Link>
```

Y en el comentario de cabecera, `"Mis pedidos", "Panel de admin"` pasa a `"Mis pedidos", "Mis avisos", "Panel de admin"`.

- [ ] **Step 3: Comprobaciones y commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

```bash
git add src/app/cuenta/avisos src/components/menu-cuenta.tsx
git commit -m "Avisos de reposicion: pagina Mis avisos con pendientes y enviados, enlazada desde el menu de la cuenta"
```

---

### Task 7: Documentación, prueba completa en local y verificación final

**Files:**
- Modify: `CLAUDE.md` ("Particularidades")
- Modify: `docs/NOTAS-DEL-PROYECTO.md` (sección nueva y "Admin")
- Modify: `docs/ESPECIFICACION.md:28` (tabla de rutas)

- [ ] **Step 1: `CLAUDE.md`**

En el punto "Admin de productos", sustituir `` `alReponer` (`src/lib/reposicion.ts`) es el único punto que sabe
que un producto vuelve a tener stock. `` por:

```markdown
  `alReponer` (`src/lib/reposicion.ts`) es el único punto que sabe que un producto vuelve a poder comprarse (lo
  llaman reponer, corregir y `guardarProducto` al pasar de oculto a visible con stock).
```

Y añadir, justo después de ese punto:

```markdown
- **Avisos de reposición** (`AvisoReposicion`): solo clientes con cuenta, desde la ficha de un producto agotado; se ven
  en `/cuenta/avisos`. Cada aviso se envía **una vez** (`enviadoEn`). `alReponer` los reserva con un único
  `UPDATE ... RETURNING` (sin envíos dobles), los manda por lotes de 100 con `resend.batch.send` y devuelve a pendiente
  los de un lote que falle o si no hay `RESEND_API_KEY`. No avisa de productos ocultos (el enlace daría 404).
  Reglas puras en `src/lib/avisos.ts`.
```

- [ ] **Step 2: `docs/NOTAS-DEL-PROYECTO.md`**

Añadir una sección nueva antes de "## Base de datos y entorno":

```markdown
## Avisos de reposición

- Un cliente **con cuenta** pulsa "Avísame cuando vuelva" en la ficha de un producto agotado (`stock <= 0`). Sin
  sesión, el botón lleva a `/entrar` y vuelve a la ficha. Las acciones (`pedirAviso`, `quitarAviso`) están en
  `src/app/producto/[id]/actions.ts` y rechazan productos ocultos o con stock aunque se llamen a mano.
- Tabla `AvisoReposicion`: una fila como mucho por cliente y producto (`@@unique`). `enviadoEn` nulo = pendiente.
  Volver a pedir un aviso ya enviado reutiliza la fila (`upsert` que pone `enviadoEn = null`).
- **Se envía una sola vez**, desde `alReponer` (`src/lib/reposicion.ts`):
  1. Si el producto está oculto no envía nada (el enlace daría 404); se envía cuando `guardarProducto` lo vuelve a
     hacer visible con stock.
  2. Reserva los pendientes con un único `UPDATE ... SET "enviadoEn" = CURRENT_TIMESTAMP ... RETURNING`. Si dos
     reposiciones coinciden, cada aviso lo reserva solo una: no hay emails dobles.
  3. Envía por lotes de 100 (`resend.batch.send`). Un lote que falla, o la falta de `RESEND_API_KEY`, devuelve esos
     avisos a `enviadoEn = null`: se reintentan en la siguiente reposición.
- El enlace del email sale de la cabecera `origin` de la petición del admin (como `crearCheckout`).
- Sin dominio propio, Resend solo entrega a la dirección de la cuenta (o a `EMAIL_PRUEBAS`): hoy todos los avisos
  llegan ahí.
- El admin ve "N avisos pendientes" junto al stock, y el mensaje al reponer dice a cuántos se ha avisado.
- `/cuenta/avisos` muestra los pendientes (con "Quitar") y los enviados de los últimos 30 días
  (`DIAS_HISTORIAL_AVISOS`).
```

En "## Admin", en el punto de **Productos**, añadir al final: `Junto al stock se ve cuántos avisos de reposición
están pendientes (ver "Avisos de reposición").`

- [ ] **Step 3: `docs/ESPECIFICACION.md`**

Debajo de la fila de `/cuenta/pedidos`, añadir:

```markdown
| `/cuenta/avisos` | Mis avisos de reposición: pendientes (se pueden quitar) y enviados en los últimos 30 días | Cliente con sesión |
```

Y en la fila de `/producto/[id]`, cambiar la descripción por:
`Detalle: ilustración, precio, stock, cantidad, añadir al carrito; si está agotado, "Avísame cuando vuelva"`.

- [ ] **Step 4: Prueba completa en local**

Con `EMAIL_PRUEBAS` y `RESEND_API_KEY` en `.env` y `npm run dev` (base de desarrollo). Hace falta una cuenta de
admin y otra de cliente (si no existen: `npm run crear-admin -- <email>` y registrarse en `/registro`).

1. **Pedir y quitar:** como cliente, en "Centro de margaritas y lavanda" (stock 0) pulsar "Avísame cuando vuelva".
   Expected: la ficha pasa a "Te avisaremos por email a <email> · Quitar aviso"; en `/cuenta/avisos` aparece en
   Pendientes. Quitarlo desde `/cuenta/avisos` y volver a pedirlo desde la ficha funciona.
2. **Reponer avisa:** como admin, la lista y la ficha dicen "1 aviso pendiente". Reponer 5.
   Expected: "Stock: 0 → 5 · avisado 1 cliente"; en la terminal `[reposicion] producto 10: avisados 1, fallidos 0`;
   llega el email a `EMAIL_PRUEBAS` y su botón abre `http://localhost:3000/producto/10`. En `/cuenta/avisos` pasa a
   "Te avisamos el …" y el admin ya no muestra avisos pendientes.
3. **Una sola vez:** Reponer 2 más. Expected: "Stock: 5 → 7", sin texto de avisos y sin email.
4. **Oculto:** Corregir a 0; como cliente, pedir aviso. Como admin, desmarcar "Visible en la tienda" y guardar;
   Reponer 3. Expected: "Stock: 0 → 3 · el producto está oculto: avisaremos cuando lo hagas visible", sin email; en
   `/cuenta/avisos` la fila sigue pendiente y sin enlace. Marcar "Visible" y guardar.
   Expected: "Guardado · avisado 1 cliente" y llega el email.
5. **Acción llamada a mano:** con el producto 10 con stock, abrir como cliente la ficha de un producto agotado
   (o poner otro a 0), cambiar en las herramientas de desarrollo el `value` del campo oculto `id` del formulario a
   `10` y enviar. Expected: "Ya hay stock de este producto" y no se crea el aviso. Con `abc`: "El producto no existe".
6. **Sin clave de Resend:** comentar `RESEND_API_KEY` en `.env` y reiniciar `npm run dev`. Corregir el producto a 0,
   pedir aviso como cliente y Reponer 1. Expected: "Stock: 0 → 1 · no se pudo avisar a 1 cliente (se reintentará al
   reponer)" y el admin sigue mostrando "1 aviso pendiente". Volver a poner la clave, reiniciar, Corregir a 0 y
   Reponer 1: ahora "avisado 1 cliente" y llega el email.
7. Devolver los productos tocados a su estado (stock y visibilidad).

- [ ] **Step 5: Verificación final**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Parar `npm run dev` (comprobar que no queda nada escuchando en el puerto 3000) y:
Run: `npm run build`
Expected: build correcto, con `/cuenta/avisos` en la lista de rutas.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/NOTAS-DEL-PROYECTO.md docs/ESPECIFICACION.md
git commit -m "Documentacion de los avisos de reposicion"
```

- [ ] **Step 7: Despliegue (cuando el usuario lo decida)**

1. `npm run migrar:produccion` (aplica `<fecha>_avisos_reposicion` a producción: solo crea la tabla).
2. Fusionar `avisos-reposicion` en `main`, pasar `npx tsc --noEmit && npm run lint && npm test` sobre el resultado y
   hacer push (despliega en Vercel).
3. Comprobar en https://exercise2-floristeria.vercel.app: pedir un aviso con una cuenta de cliente en un producto
   agotado y reponerlo como admin.
