# Envíos por código postal · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pedir la dirección de entrega antes de pagar y cobrar unos gastos de envío que dependen del código postal.

**Architecture:** Una página nueva `/checkout/envio` con un formulario de cliente que enseña una vista previa del
envío. La Server Action `crearCheckout` vuelve a validar la entrega y a calcular el envío con los precios de la BD,
copia todo en el `Pedido` y se lo pasa a Stripe como `shipping_options`. Las reglas (zonas, tarifas, validación,
importes) viven en funciones puras de `src/lib/envio.ts` y `src/lib/pago.ts`, probadas con Vitest.

**Tech Stack:** Next.js 15 (App Router, Server Actions), TypeScript, Prisma 7 + PostgreSQL (Neon), Stripe Checkout,
Resend, Zustand, Tailwind + shadcn/ui (base-ui), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-12-envios-por-codigo-postal-design.md`

## Global Constraints

- Todo en español: textos de la web, comentarios y mensajes de commit. Los comentarios del código, sin tildes (como
  el resto del repo); los textos que ve el cliente, con tildes.
- Precios siempre en céntimos (`Int`); se formatean solo al pintarlos con `formatearPrecio` (`src/lib/formato.ts`).
- El nombre de la tienda solo se escribe en `src/lib/tienda.ts`. Si hace falta, se importa `TIENDA`. Nunca se
  escribe "Rincon de las Flores" sin tilde en `src`, `prisma` ni `public`, tampoco en un comentario (`tests/marca.test.ts`).
- Las escrituras en BD van en Server Actions (salvo el webhook). Una sola instancia de Prisma (`@/lib/prisma`) y una de Stripe (`@/lib/stripe`).
- Tarifas (de la spec): Sabadell (CP 08201 a 08208) 390 céntimos, gratis desde 4000; provincia 08 690, gratis desde
  7000; península 990, sin envío gratis; sin envío a 07, 35, 38, 51 y 52; CP válido = 5 dígitos con provincia 01–52.
- Límites de la entrega: nombre 2–80, teléfono 9 cifras que empiezan por 6/7/8/9 (`+34` opcional), dirección 5–150,
  ciudad 2–60, mensaje opcional ≤ 200.
- Nada de expresiones regulares con riesgo de backtracking sobre lo que escribe el usuario; longitudes acotadas.
- La migración solo añade columnas (nullables o con default): tiene que funcionar con el código anterior.
- Antes de dar una tarea por hecha: `npx tsc --noEmit && npm run lint && npm test`.
- No ejecutar `npm run build` con `npm run dev` en marcha.

## Review Focus

1. **HTML en el mensaje o la dirección**: un cliente escribe `<a href=…>` o `<script>` en la tarjeta. En el email
   tiene que salir como texto, escapado. React ya escapa en las páginas. Lo prueba `tests/email.test.ts` (Task 6).
2. **Llamada a `crearCheckout` desde fuera con datos raros** (números, `null`, objetos, textos de 100 000 caracteres):
   devuelve errores por campo y no lanza excepción. Lo prueba `validarEntrega` (Task 2).
3. **CP pegado con espacios** (`" 08208 "`, `"08 208"`): se acepta como Sabadell. Lo prueba Task 1.
4. **Pedidos de antes de esta función** (sin entrega y `gastosEnvio = 0`): el admin, "Mis pedidos", la página de
   éxito y el email se pintan como antes, sin bloque de entrega ni línea de envío. Lo prueban `entregaDelPedido`
   (Task 2) y la plantilla (Task 6).
5. **Precios del carrito desfasados respecto a la BD**: el umbral de envío gratis se decide con el subtotal de la BD,
   no con el del navegador. No se puede probar con un test unitario (la acción usa BD). Se comprueba a mano en Task 8,
   paso 3.

---

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/lib/envio.ts` (nuevo) | Tarifas, `calcularEnvio`, `validarEntrega`, `entregaDelPedido`. Puro. |
| `src/lib/pago.ts` (nuevo) | `subtotalDe` y `prepararPago`: total, `line_items` y `shipping_options` de Stripe. Puro. |
| `src/lib/plantilla-email.ts` (nuevo) | `plantillaConfirmacion` y `escaparHtml`, sacados de `email.ts` para poder probarlos (`email.ts` importa `server-only`). |
| `src/lib/email.ts` | Solo el envío con Resend; usa la plantilla. |
| `prisma/schema.prisma` + migración | Campos de entrega y `gastosEnvio` en `Pedido`. |
| `src/app/checkout/actions.ts` | `crearCheckout(articulos, datosEntrega)`. |
| `src/app/checkout/envio/page.tsx` (nuevo) | Página de servidor: exige sesión y pinta el formulario. |
| `src/components/formulario-envio.tsx` (nuevo) | Formulario de cliente con vista previa del envío y botón de pagar. |
| `src/components/vista-carrito.tsx` | El botón pasa a "Continuar con el envío". |
| `src/components/boton-pagar.tsx` | Se borra (su lógica pasa al formulario). |
| `src/components/resumen-pedido.tsx` (nuevo) | `ResumenPedido` (líneas, subtotal, envío, total) y `BloqueEntrega`. |
| `src/app/admin/pedidos/[id]/page.tsx`, `src/app/cuenta/pedidos/[id]/page.tsx`, `src/app/checkout/exito/page.tsx` | Usan los componentes de arriba. |
| `src/app/api/webhooks/stripe/route.ts` | Pasa entrega y envío al email. |
| `tests/envio.test.ts`, `tests/pago.test.ts`, `tests/email.test.ts` (nuevos) | Tests. |
| `docs/NOTAS-DEL-PROYECTO.md`, `CLAUDE.md`, `docs/ESPECIFICACION.md` | Documentación. |

---

### Task 1: Tarifas y cálculo del envío

**Files:**
- Create: `src/lib/envio.ts`
- Test: `tests/envio.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type ZonaEnvio = "SABADELL" | "PROVINCIA" | "PENINSULA"`
  - `TARIFAS_ENVIO: Record<ZonaEnvio, { nombre: string; coste: number; gratisDesde: number | null }>`
  - `type ResultadoEnvio = { ok: true; zona: ZonaEnvio; nombre: string; coste: number; faltaParaGratis: number | null } | { ok: false; error: string }`
  - `calcularEnvio(cpBruto: string, subtotal: number): ResultadoEnvio`

- [ ] **Step 1: Write the failing test**

Crea `tests/envio.test.ts`:

```ts
// Gastos de envio por codigo postal: zonas, envio gratis y codigos rechazados. Sin BD ni Stripe.
import { describe, expect, it } from "vitest";
import { calcularEnvio, TARIFAS_ENVIO } from "../src/lib/envio";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/envio.test.ts`
Expected: FAIL, no se puede resolver `../src/lib/envio`.

- [ ] **Step 3: Write minimal implementation**

Crea `src/lib/envio.ts`:

```ts
// Gastos de envio por codigo postal. Las tarifas se cambian SOLO aqui, en centimos, y afectan a los pedidos nuevos:
// cada pedido guarda una copia de la entrega, la zona y el coste con los que se cobro.
// Lo usan el formulario de /checkout/envio (vista previa) y crearCheckout (el calculo que vale).
// Los dos primeros digitos del CP son la provincia: 08 = Barcelona, 07 = Baleares, 35 y 38 = Canarias, 51 = Ceuta, 52 = Melilla.

export type ZonaEnvio = "SABADELL" | "PROVINCIA" | "PENINSULA";

type Tarifa = { nombre: string; coste: number; gratisDesde: number | null };

export const TARIFAS_ENVIO: Record<ZonaEnvio, Tarifa> = {
  SABADELL: { nombre: "Reparto en Sabadell", coste: 390, gratisDesde: 4000 }, // reparto propio: CP 08201 a 08208
  PROVINCIA: { nombre: "Mensajería · provincia de Barcelona", coste: 690, gratisDesde: 7000 },
  PENINSULA: { nombre: "Mensajería 24 h · península", coste: 990, gratisDesde: null }, // sin envio gratis
};

// Baleares, Las Palmas, Santa Cruz de Tenerife, Ceuta y Melilla: flor fresca con transbordo o aduana, no se envia
const PROVINCIAS_SIN_ENVIO = ["07", "35", "38", "51", "52"];

export type ResultadoEnvio =
  | { ok: true; zona: ZonaEnvio; nombre: string; coste: number; faltaParaGratis: number | null }
  | { ok: false; error: string };

const cpNoValido = (): ResultadoEnvio => ({ ok: false, error: "Código postal no válido" });

// subtotal = lo que suman los productos, en centimos. faltaParaGratis: lo que falta para el envio gratis (null si ya
// lo es o si la zona no tiene envio gratis)
export function calcularEnvio(cpBruto: string, subtotal: number): ResultadoEnvio {
  if (cpBruto.length > 20) return cpNoValido(); // acotar antes de recorrer nada
  const cp = cpBruto.trim().replaceAll(" ", "");
  if (cp.length !== 5 || ![...cp].every((c) => c >= "0" && c <= "9")) return cpNoValido();

  const provincia = cp.slice(0, 2);
  if (provincia < "01" || provincia > "52") return cpNoValido();
  if (PROVINCIAS_SIN_ENVIO.includes(provincia)) return { ok: false, error: "No repartimos en ese código postal" };

  // Textos de 5 digitos: compararlos como texto es compararlos como numero
  const zona: ZonaEnvio = cp >= "08201" && cp <= "08208" ? "SABADELL" : provincia === "08" ? "PROVINCIA" : "PENINSULA";
  const { nombre, coste, gratisDesde } = TARIFAS_ENVIO[zona];
  const gratis = gratisDesde !== null && subtotal >= gratisDesde;
  return {
    ok: true,
    zona,
    nombre,
    coste: gratis ? 0 : coste,
    faltaParaGratis: gratisDesde === null || gratis ? null : gratisDesde - subtotal,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/envio.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/envio.ts tests/envio.test.ts
git commit -m "Envios: tarifas por codigo postal y calculo del envio con su test"
```

---

### Task 2: Validar la entrega y leerla de un pedido

**Files:**
- Modify: `src/lib/envio.ts` (añadir al final)
- Test: `tests/envio.test.ts` (añadir al final)

**Interfaces:**
- Consumes: `calcularEnvio` (Task 1).
- Produces:
  - `MAX_MENSAJE = 200`
  - `type CampoEntrega = "nombre" | "telefono" | "direccion" | "cp" | "ciudad" | "mensaje"`
  - `type DatosEntrega = Record<CampoEntrega, string>` (lo que escribe el formulario)
  - `type Entrega = Omit<DatosEntrega, "mensaje"> & { mensaje: string | null }` (normalizada)
  - `type ErroresEntrega = Partial<Record<CampoEntrega, string>>`
  - `validarEntrega(datos: Partial<Record<CampoEntrega, unknown>>): { ok: true; entrega: Entrega } | { ok: false; errores: ErroresEntrega }`
  - `type CamposEntregaPedido = { envioNombre: string | null; envioTelefono: string | null; envioDireccion: string | null; envioCp: string | null; envioCiudad: string | null; mensajeTarjeta: string | null }`
  - `entregaDelPedido(p: CamposEntregaPedido): Entrega | null`

- [ ] **Step 1: Write the failing test**

Añade el import y los bloques al final de `tests/envio.test.ts`. Cambia la línea de import del principio por:

```ts
import { calcularEnvio, entregaDelPedido, MAX_MENSAJE, TARIFAS_ENVIO, validarEntrega } from "../src/lib/envio";
```

Y añade al final:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/envio.test.ts`
Expected: FAIL, `validarEntrega`, `entregaDelPedido` y `MAX_MENSAJE` no existen.

- [ ] **Step 3: Write minimal implementation**

Añade al final de `src/lib/envio.ts`:

```ts
// ---- La entrega: a quien y donde se lleva el ramo ----

export const MAX_MENSAJE = 200; // caracteres de la tarjeta (el textarea usa el mismo limite)

export type CampoEntrega = "nombre" | "telefono" | "direccion" | "cp" | "ciudad" | "mensaje";
export type DatosEntrega = Record<CampoEntrega, string>; // tal cual lo escribe el formulario
export type Entrega = Omit<DatosEntrega, "mensaje"> & { mensaje: string | null }; // normalizada; sin mensaje = null
export type ErroresEntrega = Partial<Record<CampoEntrega, string>>;

// Lo que llega a la Server Action puede ser cualquier cosa: lo que no es texto cuenta como vacio
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Sin espacios, guiones, puntos ni +34 tienen que quedar 9 cifras que empiecen por 6, 7, 8 o 9 (moviles y fijos)
function normalizarTelefono(bruto: string): string | null {
  if (bruto.length > 25) return null; // acotar antes de recorrer
  let t = "";
  for (const c of bruto) if (c !== " " && c !== "-" && c !== ".") t += c;
  if (t.startsWith("+34")) t = t.slice(3);
  if (t.length !== 9 || !"6789".includes(t[0])) return null;
  return [...t].every((c) => c >= "0" && c <= "9") ? t : null;
}

export function validarEntrega(
  datos: Partial<Record<CampoEntrega, unknown>>,
): { ok: true; entrega: Entrega } | { ok: false; errores: ErroresEntrega } {
  const errores: ErroresEntrega = {};

  const nombre = texto(datos.nombre);
  if (nombre.length < 2) errores.nombre = "Escribe el nombre de quien recibe el ramo";
  else if (nombre.length > 80) errores.nombre = "El nombre es demasiado largo";

  const telefono = normalizarTelefono(texto(datos.telefono));
  if (telefono === null) errores.telefono = "Escribe un teléfono español de 9 cifras";

  const direccion = texto(datos.direccion);
  if (direccion.length < 5) errores.direccion = "Escribe la calle, el número y el piso";
  else if (direccion.length > 150) errores.direccion = "La dirección es demasiado larga";

  const cp = texto(datos.cp).replaceAll(" ", "");
  const envio = calcularEnvio(cp, 0); // aqui solo importa si hay reparto; el coste se calcula con el subtotal real
  if (!envio.ok) errores.cp = envio.error;

  const ciudad = texto(datos.ciudad);
  if (ciudad.length < 2) errores.ciudad = "Escribe la ciudad";
  else if (ciudad.length > 60) errores.ciudad = "El nombre de la ciudad es demasiado largo";

  const mensaje = texto(datos.mensaje);
  if (mensaje.length > MAX_MENSAJE) errores.mensaje = `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres`;

  if (Object.keys(errores).length > 0 || telefono === null) return { ok: false, errores };
  return { ok: true, entrega: { nombre, telefono, direccion, cp, ciudad, mensaje: mensaje === "" ? null : mensaje } };
}

// Los campos de entrega tal como se guardan en Pedido
export type CamposEntregaPedido = {
  envioNombre: string | null;
  envioTelefono: string | null;
  envioDireccion: string | null;
  envioCp: string | null;
  envioCiudad: string | null;
  mensajeTarjeta: string | null;
};

// La entrega de un pedido, o null si es de antes de los envios (no tiene)
export function entregaDelPedido(p: CamposEntregaPedido): Entrega | null {
  if (!p.envioNombre || !p.envioTelefono || !p.envioDireccion || !p.envioCp || !p.envioCiudad) return null;
  return {
    nombre: p.envioNombre,
    telefono: p.envioTelefono,
    direccion: p.envioDireccion,
    cp: p.envioCp,
    ciudad: p.envioCiudad,
    mensaje: p.mensajeTarjeta,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/envio.test.ts`
Expected: PASS (todos, también los de Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/lib/envio.ts tests/envio.test.ts
git commit -m "Envios: validacion de la entrega (destinatario, telefono, direccion, CP, mensaje) con su test"
```

---

### Task 3: Importes y parámetros de Stripe

**Files:**
- Create: `src/lib/pago.ts`
- Test: `tests/pago.test.ts`

**Interfaces:**
- Consumes: nada (recibe `{ nombre, coste }`, que encaja con el `ResultadoEnvio` correcto de Task 1).
- Produces:
  - `type LineaPago = { nombre: string; precio: number; cantidad: number }`
  - `type EnvioPago = { nombre: string; coste: number }`
  - `subtotalDe(lineas: LineaPago[]): number`
  - `prepararPago(lineas: LineaPago[], envio: EnvioPago): { total: number; lineItems: …; shippingOptions: … }`

- [ ] **Step 1: Write the failing test**

Crea `tests/pago.test.ts`:

```ts
// Lo que se manda a Stripe y el total del pedido: tienen que cuadrar (Stripe cobra lineas + envio).
import { describe, expect, it } from "vitest";
import { prepararPago, subtotalDe } from "../src/lib/pago";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pago.test.ts`
Expected: FAIL, no se puede resolver `../src/lib/pago`.

- [ ] **Step 3: Write minimal implementation**

Crea `src/lib/pago.ts`:

```ts
// Lo que se manda a Stripe Checkout y el total del pedido, sacados de crearCheckout para poder probarlos sin Stripe.
// total = productos + envio: es lo que cobra Stripe (amount_total) y lo que se guarda en Pedido.total.
import type Stripe from "stripe";

type Parametros = Stripe.Checkout.SessionCreateParams;

export type LineaPago = { nombre: string; precio: number; cantidad: number }; // precio en centimos, leido de la BD
export type EnvioPago = { nombre: string; coste: number }; // el envio ya calculado (calcularEnvio)

export const subtotalDe = (lineas: LineaPago[]) => lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);

export function prepararPago(lineas: LineaPago[], envio: EnvioPago) {
  const lineItems: NonNullable<Parametros["line_items"]> = lineas.map((l) => ({
    quantity: l.cantidad,
    price_data: { currency: "eur", unit_amount: l.precio, product_data: { name: l.nombre } },
  }));
  // Un unico envio, ya calculado: en Stripe el cliente no elige zona (con coste 0, Stripe muestra "Gratis")
  const shippingOptions: NonNullable<Parametros["shipping_options"]> = [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: envio.nombre,
        fixed_amount: { amount: envio.coste, currency: "eur" },
      },
    },
  ];
  return { total: subtotalDe(lineas) + envio.coste, lineItems, shippingOptions };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pago.test.ts && npx tsc --noEmit`
Expected: PASS y tsc sin errores. Si tsc se queja de algún campo de `price_data` o `shipping_rate_data` por la
versión de los tipos de `stripe`, no cambies los literales. Comprueba el nombre exacto del campo en
`node_modules/stripe/types/Checkout/SessionsResource.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pago.ts tests/pago.test.ts
git commit -m "Envios: total y parametros de Stripe (lineas y envio) en una funcion pura con su test"
```

---

### Task 4: Modelo de datos y `crearCheckout` con entrega

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Pedido`)
- Create: `prisma/migrations/<fecha>_envios/migration.sql` (lo genera Prisma)
- Modify: `src/app/checkout/actions.ts` (archivo entero)
- Modify: `src/components/boton-pagar.tsx` (temporal, para que compile hasta Task 5)

**Interfaces:**
- Consumes: `validarEntrega`, `calcularEnvio`, `CampoEntrega`, `ErroresEntrega` (`@/lib/envio`); `prepararPago`, `subtotalDe` (`@/lib/pago`).
- Produces:
  - Campos de `Pedido`: `envioNombre`, `envioTelefono`, `envioDireccion`, `envioCp`, `envioCiudad`, `envioZona`, `mensajeTarjeta` (`String?`) y `gastosEnvio` (`Int`, default 0).
  - `crearCheckout(articulos: ArticuloCheckout[], datosEntrega: Partial<Record<CampoEntrega, unknown>>): Promise<ResultadoCheckout>`
  - `type ResultadoCheckout = { error?: string; errores?: ErroresEntrega; necesitaLogin?: true }`

- [ ] **Step 1: Añadir los campos al schema**

En `prisma/schema.prisma`, dentro de `model Pedido`, justo después de la línea `usuarioId       Int? // opcional: ...`, añade:

```prisma

  // Entrega: se copia al comprar (como precioUnitario), asi el pedido no cambia si luego cambian las tarifas.
  // Todo null en los pedidos anteriores a los envios; que sea obligatoria lo exige crearCheckout, no la BD.
  envioNombre    String? // quien recibe el ramo
  envioTelefono  String?
  envioDireccion String? // calle, numero, piso
  envioCp        String? // texto: "08208" (un Int perderia el 0 inicial)
  envioCiudad    String?
  envioZona      String? // nombre de la zona tal como se cobro: "Reparto en Sabadell"
  gastosEnvio    Int     @default(0) // en centimos; 0 si fue gratis. Va incluido en total
  mensajeTarjeta String? // opcional, maximo 200 caracteres
```

Y cambia el comentario de `total`:

```prisma
  total           Int // en centimos: productos + gastosEnvio (lo que cobra Stripe)
```

- [ ] **Step 2: Crear y aplicar la migración en desarrollo**

Antes de nada, comprueba que estás en desarrollo:

Run: `npm run db:check`
Expected: dice que es la base de **desarrollo**. Si dice producción, PARA y avisa.

Run: `npx prisma migrate dev --name envios`
Expected: se crea `prisma/migrations/<fecha>_envios/migration.sql` con un `ALTER TABLE "Pedido" ADD COLUMN ...` por
campo, todos nullables salvo `"gastosEnvio" INTEGER NOT NULL DEFAULT 0`. Ningún `DROP` ni `NOT NULL` sin default.
Abre el SQL y compruébalo. El cliente de Prisma se regenera en `src/generated/prisma`.

- [ ] **Step 3: Reescribir `crearCheckout`**

Sustituye `src/app/checkout/actions.ts` entero por:

```ts
"use server";
// Server Action del checkout: se ejecuta SOLO en el servidor, aunque la llame un boton del navegador.
// Del carrito solo nos fiamos de QUE productos y CUANTOS. Precios y stock se leen de la base de datos.
// La entrega y el envio tambien se validan y se calculan aqui: lo que enseña el formulario es solo una vista previa.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { calcularEnvio, validarEntrega, type CampoEntrega, type ErroresEntrega } from "@/lib/envio";
import { prepararPago, subtotalDe } from "@/lib/pago";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";
import { stripe } from "@/lib/stripe";

export type ArticuloCheckout = { id: number; cantidad: number };
export type ResultadoCheckout = { error?: string; errores?: ErroresEntrega; necesitaLogin?: true };

export async function crearCheckout(
  articulos: ArticuloCheckout[],
  datosEntrega: Partial<Record<CampoEntrega, unknown>>,
): Promise<ResultadoCheckout> {
  // 0. Para pagar hay que haber entrado. Se comprueba aqui y no solo en el boton: la accion se puede llamar desde fuera
  const usuario = await usuarioActual();
  if (!usuario) return { necesitaLogin: true };

  // 1. La entrega, lo primero: asi el cliente ve todos los errores del formulario de una vez
  const validada = validarEntrega(datosEntrega ?? {});
  if (!validada.ok) return { errores: validada.errores };
  const { entrega } = validada;

  // 2. Validar lo que llega del navegador (lo puede haber tocado cualquiera)
  const limpios = (Array.isArray(articulos) ? articulos : []).filter(
    (a) => Number.isInteger(a?.id) && Number.isInteger(a?.cantidad) && a.cantidad > 0,
  );
  if (limpios.length === 0) return { error: "El carrito está vacío" };

  // 3. Precios y stock de VERDAD, desde la base de datos
  const productos = await prisma.producto.findMany({ where: { id: { in: limpios.map((a) => a.id) } } });
  const lineas = [];
  for (const a of limpios) {
    const p = productos.find((x) => x.id === a.id);
    if (!p) return { error: "Un producto del carrito ya no existe" };
    if (p.stock < a.cantidad) return { error: `Solo quedan ${p.stock} unidades de ${p.nombre}` };
    lineas.push({ producto: p, cantidad: a.cantidad });
  }
  const lineasPago = lineas.map((l) => ({ nombre: l.producto.nombre, precio: l.producto.precio, cantidad: l.cantidad }));

  // 4. El envio con el subtotal REAL (el de la BD): el envio gratis no se decide con los precios del navegador
  const envio = calcularEnvio(entrega.cp, subtotalDe(lineasPago));
  if (!envio.ok) return { errores: { cp: envio.error } };
  const { total, lineItems, shippingOptions } = prepararPago(lineasPago, envio);

  // 5. El pedido nace PENDIENTE, con su entrega y su envio copiados. Solo el webhook lo pasara a PAGADO
  const pedido = await prisma.pedido.create({
    data: {
      email: usuario.email, // el de su cuenta; Stripe lo muestra fijo
      usuarioId: usuario.id,
      total, // productos + envio
      gastosEnvio: envio.coste,
      envioZona: envio.nombre,
      envioNombre: entrega.nombre,
      envioTelefono: entrega.telefono,
      envioDireccion: entrega.direccion,
      envioCp: entrega.cp,
      envioCiudad: entrega.ciudad,
      mensajeTarjeta: entrega.mensaje,
      lineas: {
        create: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad, precioUnitario: l.producto.precio })),
      },
    },
  });

  // 6. La sesion de Stripe Checkout: la pagina de pago la pone Stripe, no nosotros
  const origen = (await headers()).get("origin") ?? "http://localhost:3000";
  const sesion = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: usuario.email, // el cliente no puede cambiarlo en la pagina de Stripe
    line_items: lineItems,
    shipping_options: shippingOptions, // Stripe lo suma: amount_total = total
    metadata: { pedidoId: String(pedido.id) }, // el webhook lo usara para saber que pedido confirmar
    success_url: `${origen}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origen}/checkout/cancelado`,
  });

  await prisma.pedido.update({ where: { id: pedido.id }, data: { stripeSessionId: sesion.id } });

  // 7. redirect() FUERA de cualquier try/catch: funciona lanzando un error especial que Next captura
  redirect(sesion.url!);
}
```

- [ ] **Step 4: Mantener el carrito compilando hasta Task 5**

`src/components/boton-pagar.tsx` llama a `crearCheckout` con un solo argumento. En la línea
`const r = await crearCheckout(lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })));` añade un segundo
argumento `{}`. Este archivo se borra en Task 5. Mientras tanto, pagar desde el carrito devolverá errores de
entrega, cosa esperada.

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app/checkout/actions.ts src/components/boton-pagar.tsx
git commit -m "Envios: el pedido guarda la entrega y los gastos de envio; crearCheckout los valida, calcula y manda a Stripe"
```

---

### Task 5: Página `/checkout/envio` y botón del carrito

**Files:**
- Create: `src/app/checkout/envio/page.tsx`
- Create: `src/components/formulario-envio.tsx`
- Modify: `src/components/vista-carrito.tsx`
- Delete: `src/components/boton-pagar.tsx`

**Interfaces:**
- Consumes: `crearCheckout`, `ResultadoCheckout` (Task 4); `calcularEnvio`, `MAX_MENSAJE`, `CampoEntrega`, `DatosEntrega`, `ErroresEntrega` (Tasks 1-2); `useCarrito`, `calcularTotal` (`@/store/carrito`); `usuarioActual` (`@/lib/sesion`).
- Produces: la ruta `/checkout/envio` y el componente `FormularioEnvio` (sin props).

- [ ] **Step 1: La página de servidor**

Crea `src/app/checkout/envio/page.tsx`:

```tsx
// Paso de entrega: entre el carrito y Stripe. Sin sesion no se puede pagar, asi que se manda a entrar y de vuelta aqui.
// La pagina es de servidor; el formulario es de cliente porque el carrito vive en el navegador (Zustand).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioEnvio } from "@/components/formulario-envio";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entrega" };

export default async function PaginaEnvio() {
  if (!(await usuarioActual())) redirect("/entrar?callbackUrl=%2Fcheckout%2Fenvio");
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">¿Adónde llevamos el ramo?</h1>
      <FormularioEnvio />
    </main>
  );
}
```

- [ ] **Step 2: El formulario**

Crea `src/components/formulario-envio.tsx`:

```tsx
"use client";
// Formulario de entrega de /checkout/envio. El envio que se ve aqui es una VISTA PREVIA con los precios del carrito:
// el que se cobra lo recalcula crearCheckout con los de la BD. Al pagar manda ids, cantidades y la entrega (no precios).
import { useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearCheckout } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { calcularEnvio, MAX_MENSAJE, type CampoEntrega, type DatosEntrega, type ErroresEntrega } from "@/lib/envio";
import { formatearPrecio } from "@/lib/formato";
import { calcularTotal, useCarrito } from "@/store/carrito";

const ENTRAR = "/entrar?callbackUrl=%2Fcheckout%2Fenvio";
const VACIO: DatosEntrega = { nombre: "", telefono: "", direccion: "", cp: "", ciudad: "", mensaje: "" };

export function FormularioEnvio() {
  const lineas = useCarrito((s) => s.lineas);
  const [datos, setDatos] = useState<DatosEntrega>(VACIO);
  const [errores, setErrores] = useState<ErroresEntrega>({});
  const [pendiente, empezar] = useTransition();
  const router = useRouter();

  if (lineas.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Tu carrito está vacío.</p>
        <Button render={<Link href="/" />} nativeButton={false}>
          Ver el catálogo
        </Button>
      </div>
    );
  }

  const subtotal = calcularTotal(lineas);
  // Vista previa en cuanto hay 5 cifras; antes no se dice nada (ni error)
  const envio = datos.cp.replaceAll(" ", "").length === 5 ? calcularEnvio(datos.cp, subtotal) : null;

  const cambiar = (campo: CampoEntrega) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDatos({ ...datos, [campo]: e.target.value });
    setErrores({ ...errores, [campo]: undefined }); // el error se va al corregir
  };

  function pagar(e: FormEvent) {
    e.preventDefault();
    empezar(async () => {
      // Si todo va bien, la accion redirige a Stripe y esta linea nunca devuelve nada
      const r = await crearCheckout(lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })), datos);
      if (r?.necesitaLogin) router.push(ENTRAR); // la sesion caduco mientras rellenaba
      else if (r?.errores) setErrores(r.errores);
      else if (r?.error) toast.error(r.error);
    });
  }

  return (
    <form onSubmit={pagar} className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Quién lo recibe" error={errores.nombre}>
          <Input name="nombre" autoComplete="name" maxLength={80} value={datos.nombre} onChange={cambiar("nombre")}
            aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo etiqueta="Teléfono de quien lo recibe" error={errores.telefono} ayuda="Por si el repartidor no encuentra a nadie">
          <Input name="telefono" type="tel" autoComplete="tel" maxLength={20} value={datos.telefono}
            onChange={cambiar("telefono")} aria-invalid={!!errores.telefono} />
        </Campo>
        <Campo etiqueta="Dirección" error={errores.direccion} ayuda="Calle, número, piso y puerta">
          <Input name="direccion" autoComplete="street-address" maxLength={150} value={datos.direccion}
            onChange={cambiar("direccion")} aria-invalid={!!errores.direccion} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Campo etiqueta="Código postal" error={errores.cp ?? (envio && !envio.ok ? envio.error : undefined)}>
            <Input name="cp" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={datos.cp}
              onChange={cambiar("cp")} aria-invalid={!!errores.cp || (envio !== null && !envio.ok)} />
          </Campo>
          <Campo etiqueta="Ciudad" error={errores.ciudad}>
            <Input name="ciudad" autoComplete="address-level2" maxLength={60} value={datos.ciudad}
              onChange={cambiar("ciudad")} aria-invalid={!!errores.ciudad} />
          </Campo>
        </div>
        <Campo etiqueta="Mensaje para la tarjeta (opcional)" error={errores.mensaje}
          ayuda={`${datos.mensaje.length}/${MAX_MENSAJE}`}>
          <textarea name="mensaje" rows={3} maxLength={MAX_MENSAJE} value={datos.mensaje} onChange={cambiar("mensaje")}
            aria-invalid={!!errores.mensaje}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30" />
        </Campo>
      </div>

      <aside className="flex h-fit flex-col gap-3 rounded-xl border p-5 text-sm">
        <ul className="space-y-1">
          {lineas.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span>{l.cantidad} × {l.nombre}</span>
              <span className="tabular-nums">{formatearPrecio(l.precio * l.cantidad)}</span>
            </li>
          ))}
        </ul>
        <Separator />
        <p className="flex justify-between"><span>Productos</span><span className="tabular-nums">{formatearPrecio(subtotal)}</span></p>
        <p className="flex justify-between gap-3">
          <span>{envio?.ok ? envio.nombre : "Envío"}</span>
          <span className="tabular-nums">
            {envio?.ok ? (envio.coste === 0 ? "Gratis" : formatearPrecio(envio.coste)) : "Según el código postal"}
          </span>
        </p>
        {envio?.ok && envio.faltaParaGratis !== null && (
          <p className="text-muted-foreground">Te faltan {formatearPrecio(envio.faltaParaGratis)} para el envío gratis.</p>
        )}
        <Separator />
        <p className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatearPrecio(subtotal + (envio?.ok ? envio.coste : 0))}</span>
        </p>
        <Button type="submit" size="lg" disabled={pendiente || (envio !== null && !envio.ok)}>
          {pendiente ? "Preparando el pago..." : "Pagar con tarjeta"}
        </Button>
        <p className="text-xs text-muted-foreground">Pago seguro con Stripe (modo test: no se cobra nada)</p>
      </aside>
    </form>
  );
}

// Etiqueta + campo + ayuda o error debajo
function Campo({ etiqueta, error, ayuda, children }: { etiqueta: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {etiqueta}
      {children}
      {error ? <span className="font-normal text-destructive">{error}</span>
        : ayuda && <span className="font-normal text-muted-foreground">{ayuda}</span>}
    </label>
  );
}
```

- [ ] **Step 3: El carrito lleva al paso de entrega**

En `src/components/vista-carrito.tsx`:
- Borra `import { BotonPagar } from "@/components/boton-pagar";`.
- Debajo de los imports añade `const ENTRAR = "/entrar?callbackUrl=%2Fcheckout%2Fenvio";`.
- Cambia el bloque `<div className="flex justify-end"><BotonPagar lineas={lineas} conSesion={conSesion} /></div>` por:

```tsx
      <div className="flex justify-end">
        {/* Sin sesion, a entrar y de vuelta al paso de entrega */}
        <Button size="lg" render={<Link href={conSesion ? "/checkout/envio" : ENTRAR} />} nativeButton={false} className="px-8">
          {conSesion ? "Continuar con el envío" : "Entrar para continuar"}
        </Button>
      </div>
```

- Cambia `<p className="text-right text-xs text-muted-foreground">Pago seguro con Stripe (modo test: no se cobra nada)</p>`
  por `<p className="text-right text-xs text-muted-foreground">Los gastos de envío se calculan con el código postal</p>`.

Borra `src/components/boton-pagar.tsx` y comprueba que nadie más lo usa:

Run: `git rm src/components/boton-pagar.tsx` y después busca `boton-pagar` y `BotonPagar` en `src/`.
Expected: ningún resultado. El comentario de `src/app/entrar/page.tsx` dice "el boton de pagar sin sesion": cámbialo
por "el carrito sin sesion".

- [ ] **Step 4: Verificar tipos, lint y tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

- [ ] **Step 5: Verificar en el navegador**

Con `npm run dev` y `stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe` en marcha:
1. Sin sesión, en `/carrito` con algo dentro: el botón dice "Entrar para continuar" y, tras entrar, lleva a `/checkout/envio`.
2. Ir directamente a `/checkout/envio` sin sesión manda a `/entrar`.
3. Con sesión, escribir el CP `08208` con un carrito de menos de 40 €: sale "Reparto en Sabadell · 3,90 €" y "Te faltan … para el envío gratis".
4. El CP `07001` muestra "No repartimos en ese código postal" y el botón queda desactivado.
5. Pulsar "Pagar" con campos vacíos muestra un error debajo de cada campo y no va a Stripe.
6. Con todo bien, en Stripe aparece la línea de envío y el total coincide con el de la página.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/checkout/envio src/components/formulario-envio.tsx src/components/vista-carrito.tsx src/components/boton-pagar.tsx src/app/entrar/page.tsx
git commit -m "Envios: paso de entrega en /checkout/envio con vista previa del envio; el carrito lleva a el"
```

---

### Task 6: Email con la entrega (y escapado)

**Files:**
- Create: `src/lib/plantilla-email.ts`
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/webhooks/stripe/route.ts` (la llamada a `enviarConfirmacion`)
- Test: `tests/email.test.ts`

**Interfaces:**
- Consumes: `Entrega`, `entregaDelPedido` (Task 2); campos de `Pedido` (Task 4).
- Produces:
  - `escaparHtml(texto: string): string`
  - `type PedidoEmail = { id: number; email: string; total: number; gastosEnvio: number; envioZona: string | null; entrega: Entrega | null; lineas: LineaEmail[] }`
  - `plantillaConfirmacion(p: PedidoEmail): string` (ahora en `@/lib/plantilla-email`)

- [ ] **Step 1: Write the failing test**

Crea `tests/email.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/email.test.ts`
Expected: FAIL, no se puede resolver `../src/lib/plantilla-email`.

- [ ] **Step 3: Sacar la plantilla y añadir envío, entrega y escapado**

Crea `src/lib/plantilla-email.ts`:

```ts
// Plantilla HTML del email de confirmacion. Va aparte de email.ts (que es "server-only") para poder probarla.
// Tablas y estilos en linea, que es lo que entienden todos los clientes de correo.
// TODO lo que viene de la BD se escapa: la entrega y el mensaje los escribe el cliente.
import type { Entrega } from "@/lib/envio";
import { formatearPrecio } from "@/lib/formato";
import { TIENDA } from "@/lib/tienda";

export type LineaEmail = { nombre: string; cantidad: number; precioUnitario: number };
export type PedidoEmail = {
  id: number;
  email: string;
  total: number; // productos + envio
  gastosEnvio: number;
  envioZona: string | null; // null en los pedidos de antes de los envios
  entrega: Entrega | null;
  lineas: LineaEmail[];
};

export function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const fila = (izquierda: string, derecha: string, estilo = "padding:8px 0") =>
  `<tr><td style="${estilo}">${izquierda}</td><td style="${estilo};text-align:right">${derecha}</td></tr>`;

export function plantillaConfirmacion(p: PedidoEmail): string {
  const filas = p.lineas
    .map((l) => fila(`${l.cantidad} × ${escaparHtml(l.nombre)}`, formatearPrecio(l.precioUnitario * l.cantidad)))
    .join("");
  const borde = "padding:12px 0;border-top:1px solid #e5e5e5";
  // Subtotal y envio solo en los pedidos con envio (los antiguos se pintan como antes)
  const envio = p.envioZona
    ? fila("Productos", formatearPrecio(p.total - p.gastosEnvio), borde) +
      fila(`Envío · ${escaparHtml(p.envioZona)}`, p.gastosEnvio === 0 ? "Gratis" : formatearPrecio(p.gastosEnvio))
    : "";
  const e = p.entrega;
  const entrega = e
    ? `<h2 style="font-size:16px;color:#3F6B4A;margin-top:24px">Entrega</h2>
    <p style="margin:0">${escaparHtml(e.nombre)} · ${escaparHtml(e.telefono)}<br>
      ${escaparHtml(e.direccion)}<br>${escaparHtml(e.cp)} ${escaparHtml(e.ciudad)}</p>
    ${e.mensaje ? `<p style="font-style:italic">Tarjeta: «${escaparHtml(e.mensaje)}»</p>` : ""}`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2A22">
    <h1 style="font-size:22px;color:#3F6B4A">Gracias por tu compra en ${TIENDA.nombre}</h1>
    <p>Hemos recibido el pago de tu pedido <strong>#${p.id}</strong>. Te avisaremos cuando salga de la tienda.</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e5e5">${filas}${envio}
      ${fila("<strong>Total</strong>", `<strong>${formatearPrecio(p.total)}</strong>`, borde)}
    </table>${entrega}
    <p style="color:#737373;font-size:12px">Tienda ficticia (material de clase). Pago en modo test: no se ha cobrado nada.</p>
  </div>`;
}
```

En `src/lib/email.ts`:
- Borra los tipos `LineaEmail` y `PedidoEmail` y la función `plantillaConfirmacion` entera.
- Quita el import de `formatearPrecio`, que ya no se usa.
- Añade `import { plantillaConfirmacion, type PedidoEmail } from "@/lib/plantilla-email";`.
- Cambia el comentario de la primera línea por:
  `// Envio del email de confirmacion con Resend. Solo se llama desde el WEBHOOK (el punto fiable). La plantilla, en plantilla-email.ts.`

`enviarConfirmacion(p: PedidoEmail)` no cambia.

Comprueba que nadie más importa la plantilla desde `@/lib/email`: busca `plantillaConfirmacion` en `src/` y `scripts/`.
Si aparece, cambia el import a `@/lib/plantilla-email`.

- [ ] **Step 4: El webhook pasa entrega y envío**

En `src/app/api/webhooks/stripe/route.ts`:
- Añade `import { entregaDelPedido } from "@/lib/envio";`.
- En la llamada a `enviarConfirmacion({ ... })`, después de `total: pedido.total,`, añade:

```ts
          gastosEnvio: pedido.gastosEnvio,
          envioZona: pedido.envioZona,
          entrega: entregaDelPedido(pedido),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/email.test.ts && npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde. `tests/marca.test.ts` incluido: la plantilla usa `TIENDA.nombre` y no escribe el nombre.

- [ ] **Step 6: Commit**

```bash
git add src/lib/plantilla-email.ts src/lib/email.ts src/app/api/webhooks/stripe/route.ts tests/email.test.ts
git commit -m "Envios: el email de confirmacion lleva envio, entrega y mensaje, y escapa lo que escribe el cliente"
```

---

### Task 7: La entrega en el admin, "Mis pedidos" y la página de éxito

**Files:**
- Create: `src/components/resumen-pedido.tsx`
- Modify: `src/app/admin/pedidos/[id]/page.tsx`
- Modify: `src/app/cuenta/pedidos/[id]/page.tsx`
- Modify: `src/app/checkout/exito/page.tsx`

**Interfaces:**
- Consumes: `entregaDelPedido`, `Entrega` (Task 2); campos de `Pedido` (Task 4).
- Produces:
  - `ResumenPedido({ lineas, total, gastosEnvio, envioZona, cabecera? })`, con `lineas: { id: number; cantidad: number; precioUnitario: number; producto: { nombre: string } }[]`
  - `BloqueEntrega({ entrega }: { entrega: Entrega })`

- [ ] **Step 1: Los componentes**

Crea `src/components/resumen-pedido.tsx`:

```tsx
// Lineas, productos, envio y total de un pedido (ResumenPedido) y a quien y donde se entrega (BloqueEntrega).
// Los usan el detalle del admin, el de "Mis pedidos" y la pagina de exito. Los pedidos de antes de los envios
// (envioZona null) se pintan como antes: sin linea de envio.
import type { ReactNode } from "react";
import type { Entrega } from "@/lib/envio";
import { formatearPrecio } from "@/lib/formato";

type Linea = { id: number; cantidad: number; precioUnitario: number; producto: { nombre: string } };
type Props = { lineas: Linea[]; total: number; gastosEnvio: number; envioZona: string | null; cabecera?: ReactNode };

export function ResumenPedido({ lineas, total, gastosEnvio, envioZona, cabecera }: Props) {
  return (
    <div className="rounded-xl border p-5">
      {cabecera}
      <ul className={`space-y-1 text-sm ${cabecera ? "mt-3" : ""}`}>
        {lineas.map((l) => (
          <li key={l.id} className="flex justify-between">
            <span>{l.cantidad} × {l.producto.nombre}</span>
            <span className="tabular-nums">{formatearPrecio(l.precioUnitario * l.cantidad)}</span>
          </li>
        ))}
      </ul>
      {envioZona && (
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <p className="flex justify-between"><span>Productos</span><span className="tabular-nums">{formatearPrecio(total - gastosEnvio)}</span></p>
          <p className="flex justify-between">
            <span>Envío · {envioZona}</span>
            <span className="tabular-nums">{gastosEnvio === 0 ? "Gratis" : formatearPrecio(gastosEnvio)}</span>
          </p>
        </div>
      )}
      <p className="mt-3 flex justify-between border-t pt-3 font-semibold">
        <span>Total</span><span className="tabular-nums">{formatearPrecio(total)}</span>
      </p>
    </div>
  );
}

export function BloqueEntrega({ entrega }: { entrega: Entrega }) {
  return (
    <div className="rounded-xl border p-5 text-sm">
      <h2 className="mb-2 font-semibold">Entrega</h2>
      <p>{entrega.nombre} · {entrega.telefono}</p>
      <p>{entrega.direccion}</p>
      <p>{entrega.cp} {entrega.ciudad}</p>
      {entrega.mensaje && (
        <p className="mt-3 whitespace-pre-line italic text-muted-foreground">Tarjeta: «{entrega.mensaje}»</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Admin**

En `src/app/admin/pedidos/[id]/page.tsx`:
- Añade `import { BloqueEntrega, ResumenPedido } from "@/components/resumen-pedido";` e `import { entregaDelPedido } from "@/lib/envio";`.
- Quita `import { formatearPrecio } from "@/lib/formato";`, que deja de usarse.
- Antes del `return`, añade `const entrega = entregaDelPedido(pedido);`.
- Sustituye el bloque `<div className="rounded-xl border p-5"> … </div>` (las líneas y el total) por:

```tsx
      {/* La floristeria necesita saber adonde llevarlo, a quien y que escribir en la tarjeta */}
      {entrega && <BloqueEntrega entrega={entrega} />}
      <ResumenPedido lineas={pedido.lineas} total={pedido.total} gastosEnvio={pedido.gastosEnvio} envioZona={pedido.envioZona} />
```

- [ ] **Step 3: Mis pedidos**

En `src/app/cuenta/pedidos/[id]/page.tsx`, los mismos imports y la misma retirada de `formatearPrecio`. Añade
`const entrega = entregaDelPedido(pedido);` antes del `return` y sustituye el bloque `<div className="rounded-xl border p-5"> … </div>` por:

```tsx
      <ResumenPedido lineas={pedido.lineas} total={pedido.total} gastosEnvio={pedido.gastosEnvio} envioZona={pedido.envioZona} />
      {entrega && <BloqueEntrega entrega={entrega} />}
```

- [ ] **Step 4: Página de éxito (sin la dirección)**

La página de éxito la abre cualquiera que tenga el `session_id`, así que **no** se enseña la entrega, solo el
importe con el envío. En `src/app/checkout/exito/page.tsx`:
- Añade `import { ResumenPedido } from "@/components/resumen-pedido";`.
- Quita `import { formatearPrecio } from "@/lib/formato";`.
- Sustituye el bloque `<div className="rounded-xl border p-5"> … </div>` por:

```tsx
          <ResumenPedido
            lineas={pedido.lineas}
            total={pedido.total}
            gastosEnvio={pedido.gastosEnvio}
            envioZona={pedido.envioZona}
            cabecera={<p className="text-sm text-muted-foreground">Pedido #{pedido.id} · estado {pedido.estado}</p>}
          />
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Con `npm run dev`:
- Un pedido antiguo (sin entrega) en `/admin/pedidos/<id>` y `/cuenta/pedidos/<id>` se ve como antes, sin bloque de entrega ni línea de envío.
- Un pedido nuevo muestra Productos, Envío · zona y Total, más el bloque Entrega con el mensaje.

- [ ] **Step 6: Commit**

```bash
git add src/components/resumen-pedido.tsx src/app/admin/pedidos src/app/cuenta/pedidos src/app/checkout/exito/page.tsx
git commit -m "Envios: el admin y Mis pedidos muestran la entrega; resumen con envio compartido en las tres paginas"
```

---

### Task 8: Documentación y prueba completa en local

**Files:**
- Modify: `docs/NOTAS-DEL-PROYECTO.md` (sección nueva antes de `## Catálogo`)
- Modify: `CLAUDE.md` (Particularidades)
- Modify: `docs/ESPECIFICACION.md` (modelo y fuera de alcance)

- [ ] **Step 1: Notas del proyecto**

En `docs/NOTAS-DEL-PROYECTO.md`, justo antes de la línea `## Catálogo`, añade:

```markdown
### Envíos

- **Dónde se pide la entrega:** en `/checkout/envio` (`src/components/formulario-envio.tsx`), entre el carrito y
  Stripe. Va antes del pago porque el envío forma parte de lo que se cobra.
- **Tarifas:** solo en `TARIFAS_ENVIO` de `src/lib/envio.ts`, en céntimos: Sabadell (CP 08201 a 08208, reparto
  propio), provincia de Barcelona (08) y resto de la península (mensajería). A Baleares (07), Canarias (35, 38),
  Ceuta (51) y Melilla (52) no se envía. El test `tests/envio.test.ts` fija la tabla: si cambias un precio, cambia
  también el test.
- **Cambiar un precio solo afecta a los pedidos nuevos:** el pedido copia la entrega, `envioZona` (el nombre de la
  zona) y `gastosEnvio` al crearse, igual que `precioUnitario`. `Pedido.total` = productos + `gastosEnvio`, que es lo
  que cobra Stripe.
- **El envío que vale lo calcula el servidor:** el formulario solo enseña una vista previa con los precios del
  carrito. `crearCheckout` vuelve a validar la entrega (`validarEntrega`) y a calcular el envío con el subtotal de la
  BD. Así el envío gratis no se decide con precios viejos o manipulados.
- **En Stripe** el envío va como una única `shipping_options` ya calculada (`src/lib/pago.ts`). No hay eventos nuevos
  ni variables de entorno.
- **El email escapa la entrega** (`escaparHtml` de `src/lib/plantilla-email.ts`): la dirección y el mensaje los
  escribe el cliente.
- **Pedidos de antes de los envíos:** no tienen entrega (`entregaDelPedido` devuelve `null`) y su `gastosEnvio` vale
  0. Se pintan como antes.
- **La página de éxito no muestra la dirección:** la abre cualquiera que tenga el `session_id`.
```

- [ ] **Step 2: CLAUDE.md**

En `CLAUDE.md`, dentro de "## Particularidades", después del punto que empieza por `- **Pagar exige sesión:**`, añade:

```markdown
- **Envíos por código postal:** la entrega se pide en `/checkout/envio`, antes de pagar. Las tarifas están solo en
  `TARIFAS_ENVIO` (`src/lib/envio.ts`) y `crearCheckout` recalcula el envío con los precios de la BD. El pedido
  copia la entrega y `gastosEnvio`, y `total` ya los incluye.
```

- [ ] **Step 3: Especificación**

En `docs/ESPECIFICACION.md`:
- Después de la línea `- Un pedido tiene un **estado**: PENDIENTE, PAGADO, ENVIADO, ENTREGADO, CANCELADO.`, añade:
  `- Un pedido lleva su **entrega** (destinatario, teléfono, dirección, CP, ciudad y mensaje de tarjeta opcional) y unos **gastos de envío** que dependen del código postal.`
- En "## Fuera de alcance", cambia `envíos reales` por
  `integración con transportistas (etiquetas, seguimiento, precios en tiempo real), fecha de entrega, envíos fuera de la península`.

- [ ] **Step 4: Prueba completa en local**

Con `npm run dev` y `stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe`:
1. Compra con CP `08208` y menos de 40 €, con tarjeta `4242 4242 4242 4242`. En Stripe aparece "Reparto en Sabadell"
   con 3,90 €. Tras pagar, `npx tsx scripts/ver-pedidos.ts` muestra el pedido PAGADO, y el `total` coincide con el
   importe de Stripe (`stripe events list` → `amount_total`).
2. Compra con CP `08208` y 40 € o más: Stripe muestra el envío "Gratis".
3. **Precio desfasado (Review Focus 5):** con un carrito de justo 40 € en Sabadell, baja en `npx prisma studio` el
   precio de uno de los productos para que el subtotal real quede por debajo de 40 €. Paga sin recargar. La vista
   previa decía "Gratis", pero Stripe tiene que cobrar 3,90 € de envío. Devuelve después el precio a su valor original.
4. Compra a `28013`: 9,90 €.
5. CP `07001`: no deja pagar.
6. El pedido pagado muestra la entrega y el mensaje en `/admin/pedidos/<id>`, en `/cuenta/pedidos/<id>` y en el email
   (con `EMAIL_PRUEBAS` puesto). La página de éxito muestra el envío pero no la dirección.

- [ ] **Step 5: Verificación final**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: todo en verde.

Para `npm run build`, para antes `npm run dev`: comparten `.next`.
Run: `npm run build`
Expected: build correcto, con `/checkout/envio` en la lista de rutas.

- [ ] **Step 6: Commit**

```bash
git add docs/NOTAS-DEL-PROYECTO.md CLAUDE.md docs/ESPECIFICACION.md
git commit -m "Documentacion de los envios por codigo postal"
```

---

### Task 9: Producción (solo con el visto bueno del usuario)

Toca la base de datos publicada y despliega. **No lo ejecutes sin que el usuario lo confirme en ese momento.**

- [ ] **Step 1:** Run: `npm run migrar:produccion`
  Expected: aplica la migración `…_envios`. Va antes del push porque solo añade columnas y el código desplegado
  ahora sigue funcionando con ellas.
- [ ] **Step 2:** `git push`. Vercel despliega. No hay variables nuevas en Vercel ni en el CI, ni eventos nuevos en el
  destino del webhook de Stripe.
- [ ] **Step 3:** En https://exercise2-floristeria.vercel.app, haz una compra de prueba a `08208` con `4242…`. Comprueba
  que el pedido llega PAGADO al admin con la entrega y que `pending_webhooks` vale 0 en `stripe events list`.
