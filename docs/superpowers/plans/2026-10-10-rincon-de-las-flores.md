# El Rincón de las Flores · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Tienda Volta en El Rincón de las Flores (floristería de barrio: 10 ramos y centros, verde y crema,
ilustraciones propias) y dejarla desplegada en la cuenta del alumno, con su repositorio de GitHub y su URL de Vercel.

**Architecture:** La lógica de la tienda no cambia (Next.js 15 App Router, Prisma, Stripe, Resend, Zustand). Cambian
los datos del seed, que se sacan a un módulo puro (`prisma/catalogo-datos.ts`) para poder testearlos sin base de datos;
las ilustraciones SVG; el tema de colores; las fuentes; y los textos. El nombre de la tienda vive en un solo archivo,
`src/lib/tienda.ts`. El schema de Prisma no cambia, así que no hay migración.

**Tech Stack:** Next.js 15.5, TypeScript estricto, Tailwind 4 + shadcn/ui (Base UI), Prisma 7 + Neon, Stripe (test),
Resend, Zustand 5, Vitest 5, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-10-rincon-de-las-flores-design.md`

## Global Constraints

- El nombre de la tienda es exactamente `El Rincón de las Flores`, y dentro de `src/` solo aparece escrito en `src/lib/tienda.ts`.
- Los precios se guardan en céntimos (`Int`). La clave secreta de Stripe solo vive en el servidor. El pedido solo pasa a PAGADO en el webhook.
- El schema de Prisma no cambia: no se crea ninguna migración.
- Todo en español. Los textos que ve el cliente o el admin llevan tildes y eñes correctas; los comentarios del código y los identificadores siguen sin tildes, como ahora.
- Los mensajes de commit van en español y terminan con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Al terminar, `grep -ri volta src prisma public` (sin contar `src/generated`) no devuelve nada. "Volta" solo puede quedar en `PROMPTS.md`.
- Colores de referencia: crema `#FAF6EE`, texto `#1F2A22`, verde hoja `#3F6B4A`, fondo suave `#F1EBDD`, borde `#E3DACA`.
- No se toca: `PROMPTS.md`, el modo oscuro (`.dark` en `globals.css`) ni la lógica de checkout, webhook y admin.
- Nunca entran en git: `.env`, `node_modules`, `src/generated`, `.next`.

## Renderizar SVG para revisarlos

Las Tareas 3, 4 y 6 pasan SVG a PNG con Chrome en modo headless y miran el resultado con la herramienta Read.
La ruta del proyecto tiene espacios, así que en las URL `file:///` van como `%20`. En todos esos pasos se usan estas variables:
```bash
SCRATCH="C:/Users/jesus/AppData/Local/Temp/claude/C--Users-jesus-Downloads-Proyecto-2-Ecommerce-tienda-online/2eed7672-3c09-49ea-8639-e7edbfa89739/scratchpad"
RAIZ_URL="file:///$(pwd -W | sed 's/ /%20/g')"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
```

## Review Focus

1. **Un carrito viejo de Volta en el navegador.** Los ids vuelven a empezar en 1: la persona vería "Auriculares 49,90 €" y Stripe le cobraría las rosas. Lo esperado es que ese carrito se ignore. Test en la Tarea 5 (clave `carrito-rincon`).
2. **Un producto sin imagen, o una imagen que sobra.** Un slug con una errata deja una tarjeta rota. Lo esperado es que cada producto tenga su SVG y que no quede ninguno huérfano. Test en la Tarea 3.
3. **Un precio escrito en euros en vez de céntimos** (`45` en lugar de `4500`): el ramo costaría 0,45 €. Lo esperado es que todos los precios estén en un rango de céntimos razonable. Test en la Tarea 2.
4. **Un slug con tildes o mayúsculas** (`ramo-peonías`): rompe la URL y el nombre del archivo. Lo esperado es que los slugs sean ASCII en minúsculas con guiones. Test en la Tarea 2.
5. **El nombre de la tienda duplicado en el título de la pestaña** ("Carrito · El Rincón de las Flores · El Rincón de las Flores") si una página lo vuelve a añadir a mano. Lo esperado es que solo `tienda.ts` lo escriba. Test en la Tarea 5.

---

## Mapa de archivos

| Archivo | Tarea | Responsabilidad |
|---|---|---|
| `prisma/catalogo-datos.ts` (nuevo) | 2 | Categorías y productos de la floristería, sin dependencias |
| `prisma/seed.ts` | 2 | Vaciar tablas y cargar `catalogo-datos` |
| `tests/catalogo-datos.test.ts` (nuevo) | 2 | Reglas de los datos: céntimos, slugs, categorías, agotado |
| `public/productos/*.svg` (10 nuevas, 12 borradas) | 3 | Ilustraciones propias |
| `tests/imagenes.test.ts` (nuevo) | 3 | Una SVG por producto, sin huérfanas, sin recursos externos |
| `src/app/globals.css` | 4 | Colores y fuente de los títulos |
| `src/app/layout.tsx` | 4, 5 | Fuentes (4); metadatos con el nombre (5) |
| `src/components/logo.tsx` (nuevo) | 4 | Flor del logo, en SVG |
| `src/app/icon.svg` (nuevo), `src/app/favicon.ico` (borrado) | 4 | Icono de la pestaña |
| `src/lib/tienda.ts` (nuevo) | 5 | Nombre y descripción de la tienda |
| `tests/marca.test.ts` (nuevo) | 5 | Sin "Volta", nombre en un solo sitio, claves internas nuevas |
| Páginas y componentes con texto visible | 5 | Nombre y tildes |
| `README.md`, `docs/ESPECIFICACION.md`, `docs/NOTAS-DEL-PROYECTO.md`, `CLAUDE.md`, `docs/arquitectura.svg` | 6 | Documentación |

---

### Tarea 1: Repositorio git local y rama de trabajo

**Files:**
- No se modifica ningún archivo del proyecto; se crea `.git/`.

**Interfaces:**
- Consumes: nada.
- Produces: un repositorio con `main` (la plantilla tal como está hoy, incluidos el orden del catálogo, el webhook de caducidad, las notas, la spec y este plan) y la rama `floristeria`, donde se hacen las Tareas 2 a 6.

- [ ] **Step 1: Comprobar que no hay ya un repositorio**

Run: `git rev-parse --is-inside-work-tree`
Expected: error `not a git repository`. Si dice `true`, PARAR y avisar: el plan supone que no hay repositorio.

- [ ] **Step 2: Crear el repositorio en `main`**

Run: `git init -b main`
Expected: `Initialized empty Git repository in .../tienda-online/.git/`

- [ ] **Step 3: Comprobar qué entraría y qué no**

Run: `git status --porcelain --untracked-files=all | grep -E "\.env$|node_modules|src/generated|\.next/" ; echo "fin"`
Expected: solo `fin`. El `.gitignore` ya excluye `.env*` (salvo `.env.example`), `/node_modules`, `/src/generated/prisma` y `.next`.

Run: `git status --porcelain --untracked-files=all | grep -c "\.env.example"`
Expected: `1` (`.env.example` sí se sube: lleva los nombres sin valores).

- [ ] **Step 4: Primer commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Plantilla Tienda Volta del curso, punto de partida

Incluye el orden del catalogo (?orden=), el webhook de checkout caducado,
las notas del proyecto y la spec y el plan de El Rincon de las Flores.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

Run: `git show --stat HEAD | grep -E "\.env$|node_modules" ; echo "fin"`
Expected: solo `fin`.

- [ ] **Step 5: Crear la rama de trabajo**

Run: `git switch -c floristeria`
Expected: `Switched to a new branch 'floristeria'`

---

### Tarea 2: Datos del catálogo y seed

**Files:**
- Create: `prisma/catalogo-datos.ts`
- Modify: `prisma/seed.ts` (completo)
- Test: `tests/catalogo-datos.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `export type CategoriaSeed = { nombre: string; slug: string }`
  - `export type ProductoSeed = { cat: string; nombre: string; slug: string; precio: number; stock: number; descripcion: string }`
  - `export const CATEGORIAS: CategoriaSeed[]` (4) y `export const PRODUCTOS: ProductoSeed[]` (10), en `prisma/catalogo-datos.ts`. La Tarea 3 usa `PRODUCTOS[i].slug` para los nombres de las imágenes.

- [ ] **Step 1: Escribir el test que falla**

`tests/catalogo-datos.test.ts`:
```ts
// Reglas de los datos del catalogo (los que carga el seed). No necesitan base de datos.
import { describe, expect, it } from "vitest";
import { CATEGORIAS, PRODUCTOS } from "../prisma/catalogo-datos";

describe("datos del catalogo de la floristeria", () => {
  it("tiene las 4 categorias por ocasion", () => {
    expect(CATEGORIAS.map((c) => c.slug)).toEqual(["amor", "celebraciones", "condolencias", "para-casa"]);
  });

  it("tiene 10 productos y cada uno esta en una categoria que existe", () => {
    expect(PRODUCTOS).toHaveLength(10);
    const slugs = new Set(CATEGORIAS.map((c) => c.slug));
    for (const p of PRODUCTOS) expect(slugs.has(p.cat), `${p.slug} -> ${p.cat}`).toBe(true);
  });

  it("los slugs son unicos y aptos para URL y nombre de archivo (ASCII, minusculas, guiones)", () => {
    const todos = [...CATEGORIAS.map((c) => c.slug), ...PRODUCTOS.map((p) => p.slug)];
    expect(new Set(todos).size).toBe(todos.length);
    for (const s of todos) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("los precios estan en CENTIMOS: enteros entre 5 y 200 euros", () => {
    for (const p of PRODUCTOS) {
      expect(Number.isInteger(p.precio), p.slug).toBe(true);
      expect(p.precio, p.slug).toBeGreaterThanOrEqual(500);
      expect(p.precio, p.slug).toBeLessThanOrEqual(20000);
    }
  });

  it("el stock es un entero >= 0 y solo el centro de margaritas esta agotado", () => {
    for (const p of PRODUCTOS) expect(Number.isInteger(p.stock) && p.stock >= 0, p.slug).toBe(true);
    expect(PRODUCTOS.filter((p) => p.stock === 0).map((p) => p.slug)).toEqual(["centro-margaritas-lavanda"]);
  });

  it("todos tienen nombre y descripcion", () => {
    for (const p of PRODUCTOS) {
      expect(p.nombre.trim(), p.slug).not.toBe("");
      expect(p.descripcion.trim(), p.slug).not.toBe("");
    }
  });

  it("el mas caro es el centro de lirios (es lo que muestra ?orden=precio-desc)", () => {
    const masCaro = [...PRODUCTOS].sort((a, b) => b.precio - a.precio)[0];
    expect(masCaro.slug).toBe("centro-lirios-blancos");
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/catalogo-datos.test.ts`
Expected: FAIL con `Cannot find module '../prisma/catalogo-datos'`.

- [ ] **Step 3: Crear los datos**

`prisma/catalogo-datos.ts`:
```ts
// Datos del catalogo de la floristeria: los carga prisma/seed.ts.
// Van en un modulo aparte, sin Prisma, para poder testearlos sin base de datos (tests/catalogo-datos.test.ts).
// La imagen de cada producto es /productos/<slug>.svg (tests/imagenes.test.ts comprueba que existe).

export type CategoriaSeed = { nombre: string; slug: string };
export type ProductoSeed = { cat: string; nombre: string; slug: string; precio: number; stock: number; descripcion: string };

// Por ocasion: es como busca el cliente de una floristeria
export const CATEGORIAS: CategoriaSeed[] = [
  { nombre: "Amor", slug: "amor" },
  { nombre: "Celebraciones", slug: "celebraciones" },
  { nombre: "Condolencias", slug: "condolencias" },
  { nombre: "Para casa", slug: "para-casa" },
];

// precio en CENTIMOS
export const PRODUCTOS: ProductoSeed[] = [
  { cat: "amor", nombre: "Ramo de 12 rosas rojas", slug: "ramo-rosas-rojas", precio: 4500, stock: 20,
    descripcion: "Doce rosas rojas de tallo largo con eucalipto, envueltas en papel kraft. Unos 50 cm de alto. Incluye tarjeta para tu mensaje." },
  { cat: "amor", nombre: "Ramo de peonías rosas", slug: "ramo-peonias-rosas", precio: 5200, stock: 8,
    descripcion: "Peonías rosas bien abiertas, el ramo más romántico de la tienda. Duran de 5 a 7 días si cambias el agua cada dos." },
  { cat: "amor", nombre: "Ramo de claveles rojos", slug: "ramo-claveles-rojos", precio: 2400, stock: 15,
    descripcion: "Diez claveles rojos, el clásico de toda la vida. Aguantan hasta dos semanas en agua fresca." },
  { cat: "celebraciones", nombre: "Ramo de girasoles", slug: "ramo-girasoles", precio: 3200, stock: 15,
    descripcion: "Girasoles grandes para alegrar cualquier celebración. Unos 60 cm de alto: ponlos en un jarrón alto." },
  { cat: "celebraciones", nombre: "Ramo de gerberas multicolor", slug: "ramo-gerberas", precio: 2800, stock: 18,
    descripcion: "Gerberas naranjas, rosas, amarillas y rojas. Ideal para cumpleaños. Incluye tarjeta para tu mensaje." },
  { cat: "celebraciones", nombre: "Ramo de tulipanes variados", slug: "ramo-tulipanes", precio: 3500, stock: 12,
    descripcion: "Siete tulipanes de colores. Siguen creciendo en el jarrón: córtales un poco el tallo cada dos días." },
  { cat: "condolencias", nombre: "Centro de lirios blancos", slug: "centro-lirios-blancos", precio: 6500, stock: 6,
    descripcion: "Lirios blancos con verde de temporada sobre base de cerámica. Sobrio y elegante. Incluye tarjeta para el mensaje." },
  { cat: "condolencias", nombre: "Centro de crisantemos blancos", slug: "centro-crisantemos-blancos", precio: 5500, stock: 5,
    descripcion: "Crisantemos blancos, la flor tradicional del recuerdo, sobre base de cerámica. Unos 40 cm de ancho. Incluye tarjeta." },
  { cat: "para-casa", nombre: "Centro de mesa de hortensias", slug: "centro-hortensias", precio: 4200, stock: 7,
    descripcion: "Hortensias azules y lilas en maceta de barro. Unos 35 cm de ancho: perfecto para la mesa del comedor." },
  { cat: "para-casa", nombre: "Centro de margaritas y lavanda", slug: "centro-margaritas-lavanda", precio: 2900, stock: 0,
    descripcion: "Margaritas y lavanda en maceta de barro: huele a campo. Agotado hasta primavera." },
];
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npx vitest run tests/catalogo-datos.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: El seed usa los datos nuevos**

Sustituir `prisma/seed.ts` entero por:
```ts
// Datos de ejemplo de la floristeria: 4 categorias por ocasion y 10 ramos y centros (prisma/catalogo-datos.ts).
//   npx prisma db seed      (o npm run seed)
// Es idempotente: borra y vuelve a crear, asi se puede lanzar tantas veces como haga falta.
// OJO: borra tambien TODOS los pedidos.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORIAS, PRODUCTOS } from "./catalogo-datos";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Vaciamos las 4 tablas Y reiniciamos los contadores de id (RESTART IDENTITY).
  // Con deleteMany los id seguian creciendo (13, 14...) y los enlaces /producto/1 dejaban de existir.
  await prisma.$executeRaw`TRUNCATE "LineaPedido", "Pedido", "Producto", "Categoria" RESTART IDENTITY CASCADE`;

  for (const c of CATEGORIAS) {
    await prisma.categoria.create({
      data: {
        ...c,
        productos: {
          create: PRODUCTOS.filter((p) => p.cat === c.slug).map((p) => ({
            nombre: p.nombre,
            slug: p.slug,
            descripcion: p.descripcion,
            precio: p.precio,
            stock: p.stock,
            imagen: `/productos/${p.slug}.svg`,
          })),
        },
      },
    });
  }

  const porCategoria = await prisma.categoria.findMany({
    select: { nombre: true, _count: { select: { productos: true } } },
    orderBy: { id: "asc" },
  });
  for (const c of porCategoria) console.log(`  ${c.nombre.padEnd(14)} ${c._count.productos} productos`);
  console.log(`Seed completado: ${await prisma.categoria.count()} categorias, ${await prisma.producto.count()} productos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Tipos, lint y todos los tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores; 17 tests en verde (10 de antes + 7 nuevos).

El seed real contra la base se ejecuta en la Tarea 7, cuando ya exista el `.env`.

- [ ] **Step 7: Commit**

```bash
git add prisma/catalogo-datos.ts prisma/seed.ts tests/catalogo-datos.test.ts
git commit -m "$(cat <<'EOF'
Catalogo de la floristeria: 4 ocasiones y 10 ramos y centros

Los datos salen del seed a prisma/catalogo-datos.ts para testearlos sin base de datos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarea 3: Ilustraciones de los productos

**Files:**
- Create: 10 SVG en `public/productos/` (contenido abajo)
- Delete: las 12 SVG de Volta de `public/productos/`
- Test: `tests/imagenes.test.ts`

**Interfaces:**
- Consumes: `PRODUCTOS` de `prisma/catalogo-datos.ts` (Tarea 2).
- Produces: `public/productos/<slug>.svg` para cada producto. Las páginas ya las cargan por `producto.imagen`.

**Estilo común** (para que encajen entre sí): lienzo de 500×500 con fondo `#FAF6EE`; formas planas sin degradados ni
textos. **Ramos:** papel kraft de fondo `#DDBF94`, cono delantero `#C9A27A` con pliegues `#B08560` y un lazo.
**Centros:** base baja delante de las flores; cerámica `#D8D2C4`/`#C4BDAE` para condolencias y barro `#B5653B`/`#9C5530`
para "Para casa". Hojas en `#3F6B4A` y `#5E8C68`. Los pétalos repetidos se dibujan con `<defs>` y `<use>`.

- [ ] **Step 1: Escribir el test que falla**

`tests/imagenes.test.ts`:
```ts
// Cada producto tiene su ilustracion en public/productos/<slug>.svg, y no sobra ninguna.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCTOS } from "../prisma/catalogo-datos";

const CARPETA = join(process.cwd(), "public", "productos");
const archivos = readdirSync(CARPETA);

describe("ilustraciones de los productos", () => {
  it("cada producto tiene su SVG", () => {
    for (const p of PRODUCTOS) expect(archivos, p.slug).toContain(`${p.slug}.svg`);
  });

  it("no queda ninguna imagen sin producto (por ejemplo, las de Volta)", () => {
    const esperadas = PRODUCTOS.map((p) => `${p.slug}.svg`).sort();
    expect([...archivos].sort()).toEqual(esperadas);
  });

  it("son SVG de 500x500 hechos a mano, sin imagenes ni recursos externos", () => {
    for (const a of archivos) {
      const svg = readFileSync(join(CARPETA, a), "utf8");
      expect(svg.startsWith("<svg"), a).toBe(true);
      expect(svg, a).toContain('viewBox="0 0 500 500"');
      expect(svg, a).not.toMatch(/<image|<script|<text/);
      // la unica URL permitida es la del espacio de nombres de SVG
      expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', ""), a).not.toMatch(/https?:/);
    }
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/imagenes.test.ts`
Expected: FAIL: falta `ramo-rosas-rojas.svg`, y sobran `altavoz-bluetooth-mini.svg` y el resto de imágenes de Volta.

- [ ] **Step 3: Borrar las imágenes de Volta**

```bash
git rm -q public/productos/altavoz-bluetooth-mini.svg public/productos/auriculares-volta-pulse.svg \
  public/productos/auriculares-volta-studio.svg public/productos/camiseta-basica.svg \
  public/productos/chanclas-piscina.svg public/productos/correa-silicona.svg \
  public/productos/reloj-volta-classic.svg public/productos/reloj-volta-sport.svg \
  public/productos/sudadera-capucha.svg public/productos/vaqueros-slim.svg \
  public/productos/zapatillas-running.svg public/productos/zapatillas-urbanas.svg
```

- [ ] **Step 4: Crear los 4 ramos de Amor y Celebraciones (1 de 3)**

`public/productos/ramo-rosas-rojas.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<g id="rosa"><circle r="26" fill="#9F1D24"/><circle r="19" fill="#C0262D"/><path d="M-12 -2 C-10 -14 10 -14 12 -2 C10 8 -6 10 -8 2 C-6 -6 4 -6 5 0" fill="none" stroke="#7F1219" stroke-width="3" stroke-linecap="round"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<path d="M150 250 L118 118 L250 168 L382 118 L350 250 Z" fill="#DDBF94"/>
<g fill="#5E8C68"><ellipse cx="160" cy="190" rx="16" ry="44" transform="rotate(-35 160 190)"/><ellipse cx="340" cy="190" rx="16" ry="44" transform="rotate(35 340 190)"/></g>
<g fill="#3F6B4A"><ellipse cx="190" cy="140" rx="12" ry="36" transform="rotate(-15 190 140)"/><ellipse cx="310" cy="140" rx="12" ry="36" transform="rotate(15 310 140)"/></g>
<use href="#rosa" x="195" y="148"/><use href="#rosa" x="250" y="140"/><use href="#rosa" x="305" y="148"/>
<use href="#rosa" x="167" y="190"/><use href="#rosa" x="222" y="186"/><use href="#rosa" x="278" y="186"/><use href="#rosa" x="333" y="190"/>
<use href="#rosa" x="150" y="234"/><use href="#rosa" x="200" y="230"/><use href="#rosa" x="250" y="228"/><use href="#rosa" x="300" y="230"/><use href="#rosa" x="350" y="234"/>
<path d="M138 248 L362 248 L286 456 L214 456 Z" fill="#C9A27A"/>
<path d="M250 248 L250 456 M190 248 L232 456 M310 248 L268 456" stroke="#B08560" stroke-width="3" fill="none" opacity=".6"/>
<g fill="#3F6B4A"><ellipse cx="222" cy="326" rx="28" ry="13" transform="rotate(-18 222 326)"/><ellipse cx="278" cy="326" rx="28" ry="13" transform="rotate(18 278 326)"/><path d="M244 334 L226 382 L238 378 L248 388 Z"/><path d="M256 334 L274 382 L262 378 L252 388 Z"/><circle cx="250" cy="330" r="10"/></g>
</svg>
```

`public/productos/ramo-peonias-rosas.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<g id="peonia"><circle cx="-16" cy="4" r="22" fill="#F2A7BB"/><circle cx="16" cy="4" r="22" fill="#F2A7BB"/><circle cx="0" cy="-14" r="22" fill="#F5B5C6"/><circle cx="0" cy="12" r="22" fill="#EE95AD"/><circle cx="-6" cy="-2" r="13" fill="#F9CCD8"/><circle cx="7" cy="2" r="10" fill="#E8839D"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<path d="M150 250 L118 118 L250 168 L382 118 L350 250 Z" fill="#DDBF94"/>
<g fill="#5E8C68"><ellipse cx="160" cy="190" rx="16" ry="44" transform="rotate(-35 160 190)"/><ellipse cx="340" cy="190" rx="16" ry="44" transform="rotate(35 340 190)"/></g>
<g fill="#3F6B4A"><ellipse cx="190" cy="140" rx="12" ry="36" transform="rotate(-15 190 140)"/><ellipse cx="310" cy="140" rx="12" ry="36" transform="rotate(15 310 140)"/></g>
<use href="#peonia" x="250" y="146"/><use href="#peonia" x="186" y="176"/><use href="#peonia" x="314" y="176"/>
<use href="#peonia" x="218" y="226"/><use href="#peonia" x="284" y="226"/>
<path d="M138 248 L362 248 L286 456 L214 456 Z" fill="#C9A27A"/>
<path d="M250 248 L250 456 M190 248 L232 456 M310 248 L268 456" stroke="#B08560" stroke-width="3" fill="none" opacity=".6"/>
<g fill="#E8839D"><ellipse cx="222" cy="326" rx="28" ry="13" transform="rotate(-18 222 326)"/><ellipse cx="278" cy="326" rx="28" ry="13" transform="rotate(18 278 326)"/><path d="M244 334 L226 382 L238 378 L248 388 Z"/><path d="M256 334 L274 382 L262 378 L252 388 Z"/><circle cx="250" cy="330" r="10"/></g>
</svg>
```

`public/productos/ramo-claveles-rojos.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<g id="clavel"><circle r="22" fill="#C81E3A"/><g fill="#E0334F"><circle cx="18" cy="0" r="8"/><circle cx="12.7" cy="12.7" r="8"/><circle cx="0" cy="18" r="8"/><circle cx="-12.7" cy="12.7" r="8"/><circle cx="-18" cy="0" r="8"/><circle cx="-12.7" cy="-12.7" r="8"/><circle cx="0" cy="-18" r="8"/><circle cx="12.7" cy="-12.7" r="8"/></g><circle r="10" fill="#A3152D"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<path d="M150 250 L118 118 L250 168 L382 118 L350 250 Z" fill="#DDBF94"/>
<g fill="#5E8C68"><ellipse cx="160" cy="190" rx="16" ry="44" transform="rotate(-35 160 190)"/><ellipse cx="340" cy="190" rx="16" ry="44" transform="rotate(35 340 190)"/></g>
<g fill="#3F6B4A"><ellipse cx="190" cy="140" rx="12" ry="36" transform="rotate(-15 190 140)"/><ellipse cx="310" cy="140" rx="12" ry="36" transform="rotate(15 310 140)"/></g>
<use href="#clavel" x="200" y="150"/><use href="#clavel" x="250" y="142"/><use href="#clavel" x="300" y="150"/>
<use href="#clavel" x="170" y="194"/><use href="#clavel" x="225" y="190"/><use href="#clavel" x="280" y="190"/><use href="#clavel" x="332" y="194"/>
<use href="#clavel" x="198" y="234"/><use href="#clavel" x="250" y="232"/><use href="#clavel" x="302" y="234"/>
<path d="M138 248 L362 248 L286 456 L214 456 Z" fill="#C9A27A"/>
<path d="M250 248 L250 456 M190 248 L232 456 M310 248 L268 456" stroke="#B08560" stroke-width="3" fill="none" opacity=".6"/>
<g fill="#FAF6EE" stroke="#E3DACA" stroke-width="2"><ellipse cx="222" cy="326" rx="28" ry="13" transform="rotate(-18 222 326)"/><ellipse cx="278" cy="326" rx="28" ry="13" transform="rotate(18 278 326)"/><path d="M244 334 L226 382 L238 378 L248 388 Z"/><path d="M256 334 L274 382 L262 378 L252 388 Z"/><circle cx="250" cy="330" r="10"/></g>
</svg>
```

`public/productos/ramo-girasoles.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<ellipse id="petalo-girasol" cy="-32" rx="10" ry="22" fill="#F5B700"/>
<g id="girasol"><use href="#petalo-girasol"/><use href="#petalo-girasol" transform="rotate(30)"/><use href="#petalo-girasol" transform="rotate(60)"/><use href="#petalo-girasol" transform="rotate(90)"/><use href="#petalo-girasol" transform="rotate(120)"/><use href="#petalo-girasol" transform="rotate(150)"/><use href="#petalo-girasol" transform="rotate(180)"/><use href="#petalo-girasol" transform="rotate(210)"/><use href="#petalo-girasol" transform="rotate(240)"/><use href="#petalo-girasol" transform="rotate(270)"/><use href="#petalo-girasol" transform="rotate(300)"/><use href="#petalo-girasol" transform="rotate(330)"/><circle r="22" fill="#5A3A1A"/><circle r="14" fill="#6E4A24"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<path d="M150 250 L118 118 L250 168 L382 118 L350 250 Z" fill="#DDBF94"/>
<g fill="#5E8C68"><ellipse cx="160" cy="200" rx="16" ry="44" transform="rotate(-35 160 200)"/><ellipse cx="340" cy="200" rx="16" ry="44" transform="rotate(35 340 200)"/></g>
<use href="#girasol" x="250" y="140"/><use href="#girasol" x="180" y="205"/><use href="#girasol" x="320" y="205"/>
<path d="M138 248 L362 248 L286 456 L214 456 Z" fill="#C9A27A"/>
<path d="M250 248 L250 456 M190 248 L232 456 M310 248 L268 456" stroke="#B08560" stroke-width="3" fill="none" opacity=".6"/>
<g fill="#3F6B4A"><ellipse cx="222" cy="326" rx="28" ry="13" transform="rotate(-18 222 326)"/><ellipse cx="278" cy="326" rx="28" ry="13" transform="rotate(18 278 326)"/><path d="M244 334 L226 382 L238 378 L248 388 Z"/><path d="M256 334 L274 382 L262 378 L252 388 Z"/><circle cx="250" cy="330" r="10"/></g>
</svg>
```

- [ ] **Step 5: Gerberas y tulipanes (2 de 3)**

`public/productos/ramo-gerberas.svg` (los pétalos usan `currentColor`: cada `<use>` lleva su `color`):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<ellipse id="petalo-gerbera" cy="-25" rx="6" ry="16" fill="currentColor"/>
<g id="gerbera"><use href="#petalo-gerbera"/><use href="#petalo-gerbera" transform="rotate(22.5)"/><use href="#petalo-gerbera" transform="rotate(45)"/><use href="#petalo-gerbera" transform="rotate(67.5)"/><use href="#petalo-gerbera" transform="rotate(90)"/><use href="#petalo-gerbera" transform="rotate(112.5)"/><use href="#petalo-gerbera" transform="rotate(135)"/><use href="#petalo-gerbera" transform="rotate(157.5)"/><use href="#petalo-gerbera" transform="rotate(180)"/><use href="#petalo-gerbera" transform="rotate(202.5)"/><use href="#petalo-gerbera" transform="rotate(225)"/><use href="#petalo-gerbera" transform="rotate(247.5)"/><use href="#petalo-gerbera" transform="rotate(270)"/><use href="#petalo-gerbera" transform="rotate(292.5)"/><use href="#petalo-gerbera" transform="rotate(315)"/><use href="#petalo-gerbera" transform="rotate(337.5)"/><circle r="11" fill="#F7D774"/><circle r="6" fill="#3B2A1A"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<path d="M150 250 L118 118 L250 168 L382 118 L350 250 Z" fill="#DDBF94"/>
<g fill="#5E8C68"><ellipse cx="160" cy="190" rx="16" ry="44" transform="rotate(-35 160 190)"/><ellipse cx="340" cy="190" rx="16" ry="44" transform="rotate(35 340 190)"/></g>
<use href="#gerbera" x="250" y="135" color="#F5B700"/><use href="#gerbera" x="198" y="152" color="#F26B3A"/><use href="#gerbera" x="302" y="152" color="#E8467C"/>
<use href="#gerbera" x="165" y="208" color="#D7263D"/><use href="#gerbera" x="250" y="198" color="#F28FB0"/><use href="#gerbera" x="335" y="208" color="#F5A623"/>
<path d="M138 248 L362 248 L286 456 L214 456 Z" fill="#C9A27A"/>
<path d="M250 248 L250 456 M190 248 L232 456 M310 248 L268 456" stroke="#B08560" stroke-width="3" fill="none" opacity=".6"/>
<g fill="#F26B3A"><ellipse cx="222" cy="326" rx="28" ry="13" transform="rotate(-18 222 326)"/><ellipse cx="278" cy="326" rx="28" ry="13" transform="rotate(18 278 326)"/><path d="M244 334 L226 382 L238 378 L248 388 Z"/><path d="M256 334 L274 382 L262 378 L252 388 Z"/><circle cx="250" cy="330" r="10"/></g>
</svg>
```

`public/productos/ramo-tulipanes.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<g id="tulipan"><path d="M0 0 V90" stroke="#3F6B4A" stroke-width="6"/><path d="M-22 0 C-26 -28 -14 -44 -6 -36 L0 -46 L6 -36 C14 -44 26 -28 22 0 C14 12 -14 12 -22 0 Z" fill="currentColor"/><path d="M0 -40 C-8 -24 -8 -8 0 6 C8 -8 8 -24 0 -40 Z" fill="#000" opacity=".12"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<path d="M150 250 L118 118 L250 168 L382 118 L350 250 Z" fill="#DDBF94"/>
<g fill="#5E8C68"><ellipse cx="165" cy="200" rx="14" ry="48" transform="rotate(-25 165 200)"/><ellipse cx="335" cy="200" rx="14" ry="48" transform="rotate(25 335 200)"/></g>
<use href="#tulipan" x="190" y="170" color="#E8467C"/><use href="#tulipan" x="250" y="150" color="#F5B700"/><use href="#tulipan" x="310" y="170" color="#D7263D"/>
<use href="#tulipan" x="160" y="218" color="#A86BC9"/><use href="#tulipan" x="220" y="208" color="#F28FB0"/><use href="#tulipan" x="280" y="208" color="#F26B3A"/><use href="#tulipan" x="340" y="218" color="#E8467C"/>
<path d="M138 248 L362 248 L286 456 L214 456 Z" fill="#C9A27A"/>
<path d="M250 248 L250 456 M190 248 L232 456 M310 248 L268 456" stroke="#B08560" stroke-width="3" fill="none" opacity=".6"/>
<g fill="#A86BC9"><ellipse cx="222" cy="326" rx="28" ry="13" transform="rotate(-18 222 326)"/><ellipse cx="278" cy="326" rx="28" ry="13" transform="rotate(18 278 326)"/><path d="M244 334 L226 382 L238 378 L248 388 Z"/><path d="M256 334 L274 382 L262 378 L252 388 Z"/><circle cx="250" cy="330" r="10"/></g>
</svg>
```

- [ ] **Step 6: Los 4 centros (3 de 3)**

`public/productos/centro-lirios-blancos.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<path id="petalo-lirio" d="M0 0 C14 -18 10 -48 0 -60 C-10 -48 -14 -18 0 0 Z" fill="#FFFFFF" stroke="#E3DACA" stroke-width="2"/>
<g id="lirio"><use href="#petalo-lirio"/><use href="#petalo-lirio" transform="rotate(60)"/><use href="#petalo-lirio" transform="rotate(120)"/><use href="#petalo-lirio" transform="rotate(180)"/><use href="#petalo-lirio" transform="rotate(240)"/><use href="#petalo-lirio" transform="rotate(300)"/><circle r="6" fill="#F3E6B3"/><path d="M0 0 L-8 -22 M0 0 L8 -22 M0 0 L0 -26" stroke="#5E8C68" stroke-width="2"/><g fill="#C9832E"><circle cx="-8" cy="-22" r="3"/><circle cx="8" cy="-22" r="3"/><circle cy="-26" r="3"/></g></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<g fill="#3F6B4A"><ellipse cx="135" cy="320" rx="14" ry="40" transform="rotate(-60 135 320)"/><ellipse cx="365" cy="320" rx="14" ry="40" transform="rotate(60 365 320)"/></g>
<g fill="#5E8C68"><ellipse cx="165" cy="285" rx="12" ry="34" transform="rotate(-40 165 285)"/><ellipse cx="335" cy="285" rx="12" ry="34" transform="rotate(40 335 285)"/><ellipse cx="250" cy="175" rx="12" ry="34"/></g>
<use href="#lirio" transform="translate(250 225) scale(.9)"/>
<use href="#lirio" transform="translate(175 290) scale(.85)"/>
<use href="#lirio" transform="translate(325 290) scale(.85)"/>
<use href="#lirio" transform="translate(250 315) scale(.8)"/>
<path d="M140 362 H360 L338 424 Q250 440 162 424 Z" fill="#D8D2C4"/>
<rect x="128" y="348" width="244" height="18" rx="9" fill="#C4BDAE"/>
</svg>
```

`public/productos/centro-crisantemos-blancos.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<ellipse id="petalo-crisantemo" cy="-22" rx="5" ry="18" fill="#FFFFFF" stroke="#E3DACA" stroke-width="1.5"/>
<ellipse id="petalo-crisantemo-dentro" cy="-12" rx="4" ry="11" fill="#F6F1E4"/>
<g id="crisantemo">
<use href="#petalo-crisantemo"/><use href="#petalo-crisantemo" transform="rotate(15)"/><use href="#petalo-crisantemo" transform="rotate(30)"/><use href="#petalo-crisantemo" transform="rotate(45)"/><use href="#petalo-crisantemo" transform="rotate(60)"/><use href="#petalo-crisantemo" transform="rotate(75)"/><use href="#petalo-crisantemo" transform="rotate(90)"/><use href="#petalo-crisantemo" transform="rotate(105)"/><use href="#petalo-crisantemo" transform="rotate(120)"/><use href="#petalo-crisantemo" transform="rotate(135)"/><use href="#petalo-crisantemo" transform="rotate(150)"/><use href="#petalo-crisantemo" transform="rotate(165)"/><use href="#petalo-crisantemo" transform="rotate(180)"/><use href="#petalo-crisantemo" transform="rotate(195)"/><use href="#petalo-crisantemo" transform="rotate(210)"/><use href="#petalo-crisantemo" transform="rotate(225)"/><use href="#petalo-crisantemo" transform="rotate(240)"/><use href="#petalo-crisantemo" transform="rotate(255)"/><use href="#petalo-crisantemo" transform="rotate(270)"/><use href="#petalo-crisantemo" transform="rotate(285)"/><use href="#petalo-crisantemo" transform="rotate(300)"/><use href="#petalo-crisantemo" transform="rotate(315)"/><use href="#petalo-crisantemo" transform="rotate(330)"/><use href="#petalo-crisantemo" transform="rotate(345)"/>
<use href="#petalo-crisantemo-dentro"/><use href="#petalo-crisantemo-dentro" transform="rotate(30)"/><use href="#petalo-crisantemo-dentro" transform="rotate(60)"/><use href="#petalo-crisantemo-dentro" transform="rotate(90)"/><use href="#petalo-crisantemo-dentro" transform="rotate(120)"/><use href="#petalo-crisantemo-dentro" transform="rotate(150)"/><use href="#petalo-crisantemo-dentro" transform="rotate(180)"/><use href="#petalo-crisantemo-dentro" transform="rotate(210)"/><use href="#petalo-crisantemo-dentro" transform="rotate(240)"/><use href="#petalo-crisantemo-dentro" transform="rotate(270)"/><use href="#petalo-crisantemo-dentro" transform="rotate(300)"/><use href="#petalo-crisantemo-dentro" transform="rotate(330)"/>
<circle r="7" fill="#F0E2A8"/>
</g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<g fill="#3F6B4A"><ellipse cx="135" cy="320" rx="14" ry="40" transform="rotate(-60 135 320)"/><ellipse cx="365" cy="320" rx="14" ry="40" transform="rotate(60 365 320)"/></g>
<g fill="#5E8C68"><ellipse cx="165" cy="285" rx="12" ry="34" transform="rotate(-40 165 285)"/><ellipse cx="335" cy="285" rx="12" ry="34" transform="rotate(40 335 285)"/></g>
<use href="#crisantemo" x="250" y="222"/><use href="#crisantemo" x="198" y="252"/><use href="#crisantemo" x="302" y="252"/>
<use href="#crisantemo" x="168" y="310"/><use href="#crisantemo" x="250" y="300"/><use href="#crisantemo" x="332" y="310"/>
<path d="M140 362 H360 L338 424 Q250 440 162 424 Z" fill="#D8D2C4"/>
<rect x="128" y="348" width="244" height="18" rx="9" fill="#C4BDAE"/>
</svg>
```

`public/productos/centro-hortensias.svg` (cada bola es un círculo relleno con un patrón de florecillas de 4 pétalos):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<pattern id="hortensia-azul" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#9FB3E3"/><g fill="#C7D3F2"><circle cx="6" cy="11" r="5"/><circle cx="16" cy="11" r="5"/><circle cx="11" cy="6" r="5"/><circle cx="11" cy="16" r="5"/></g><circle cx="11" cy="11" r="1.8" fill="#6F86C4"/></pattern>
<pattern id="hortensia-lila" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#C3A9DE"/><g fill="#E2D3F2"><circle cx="6" cy="11" r="5"/><circle cx="16" cy="11" r="5"/><circle cx="11" cy="6" r="5"/><circle cx="11" cy="16" r="5"/></g><circle cx="11" cy="11" r="1.8" fill="#8E6FC1"/></pattern>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<g fill="#3F6B4A"><ellipse cx="130" cy="322" rx="16" ry="44" transform="rotate(-62 130 322)"/><ellipse cx="370" cy="322" rx="16" ry="44" transform="rotate(62 370 322)"/></g>
<g fill="#5E8C68"><ellipse cx="160" cy="250" rx="14" ry="38" transform="rotate(-30 160 250)"/><ellipse cx="340" cy="250" rx="14" ry="38" transform="rotate(30 340 250)"/></g>
<circle cx="250" cy="228" r="60" fill="url(#hortensia-azul)"/>
<circle cx="192" cy="282" r="62" fill="url(#hortensia-lila)"/>
<circle cx="308" cy="282" r="62" fill="url(#hortensia-azul)"/>
<circle cx="250" cy="228" r="60" fill="#000" opacity=".04"/>
<path d="M140 362 H360 L338 424 Q250 440 162 424 Z" fill="#B5653B"/>
<rect x="128" y="348" width="244" height="18" rx="9" fill="#9C5530"/>
</svg>
```

`public/productos/centro-margaritas-lavanda.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
<defs>
<g id="lavanda"><path d="M0 0 V-120" stroke="#5E8C68" stroke-width="4"/><g fill="#8E6FC1"><ellipse cx="-5" cy="-60" rx="5" ry="8"/><ellipse cx="5" cy="-70" rx="5" ry="8"/><ellipse cx="-5" cy="-80" rx="5" ry="8"/><ellipse cx="5" cy="-90" rx="5" ry="8"/><ellipse cx="-5" cy="-100" rx="5" ry="8"/><ellipse cx="5" cy="-110" rx="5" ry="8"/><ellipse cx="0" cy="-121" rx="4" ry="7"/></g></g>
<ellipse id="petalo-margarita" cy="-18" rx="6" ry="14" fill="#FFFFFF" stroke="#E3DACA" stroke-width="1.5"/>
<g id="margarita"><use href="#petalo-margarita"/><use href="#petalo-margarita" transform="rotate(30)"/><use href="#petalo-margarita" transform="rotate(60)"/><use href="#petalo-margarita" transform="rotate(90)"/><use href="#petalo-margarita" transform="rotate(120)"/><use href="#petalo-margarita" transform="rotate(150)"/><use href="#petalo-margarita" transform="rotate(180)"/><use href="#petalo-margarita" transform="rotate(210)"/><use href="#petalo-margarita" transform="rotate(240)"/><use href="#petalo-margarita" transform="rotate(270)"/><use href="#petalo-margarita" transform="rotate(300)"/><use href="#petalo-margarita" transform="rotate(330)"/><circle r="9" fill="#F5B700"/></g>
</defs>
<rect width="500" height="500" fill="#FAF6EE"/>
<use href="#lavanda" transform="translate(160 350) rotate(-14)"/><use href="#lavanda" transform="translate(185 350) rotate(-6)"/>
<use href="#lavanda" transform="translate(315 350) rotate(6)"/><use href="#lavanda" transform="translate(340 350) rotate(14)"/>
<g fill="#3F6B4A"><ellipse cx="135" cy="325" rx="14" ry="40" transform="rotate(-60 135 325)"/><ellipse cx="365" cy="325" rx="14" ry="40" transform="rotate(60 365 325)"/></g>
<use href="#margarita" x="250" y="250"/><use href="#margarita" x="205" y="278"/><use href="#margarita" x="295" y="278"/>
<use href="#margarita" x="180" y="322"/><use href="#margarita" x="228" y="320"/><use href="#margarita" x="272" y="320"/><use href="#margarita" x="320" y="322"/>
<path d="M140 362 H360 L338 424 Q250 440 162 424 Z" fill="#B5653B"/>
<rect x="128" y="348" width="244" height="18" rx="9" fill="#9C5530"/>
</svg>
```

- [ ] **Step 7: Comprobar que el test pasa**

Run: `npx vitest run tests/imagenes.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 8: Revisión visual: pasar las 10 a PNG y mirarlas**

Este script deja una hoja de contacto con las 10 ilustraciones en el scratchpad. Se usa Chrome en modo headless,
que ya está instalado:
```bash
SALIDA="$SCRATCH/ilustraciones"
mkdir -p "$SALIDA"
{
  echo '<html><body style="margin:0;background:#ddd;display:grid;grid-template-columns:repeat(5,250px);gap:8px;padding:8px">'
  for f in public/productos/*.svg; do echo "<figure style=\"margin:0\"><img src=\"$RAIZ_URL/$f\" width=250 height=250><figcaption style=\"font:12px sans-serif\">$(basename "$f")</figcaption></figure>"; done
  echo '</body></html>'
} > "$SALIDA/hoja.html"
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --window-size=1320,580 --screenshot="$(cygpath -w "$SALIDA/hoja.png")" "file:///$(cygpath -m "$SALIDA/hoja.html")"
```
Abrir `hoja.png` con la herramienta Read y comprobar que:
- cada flor se reconoce;
- los ramos tienen papel y lazo, y los centros su base;
- nada se sale del lienzo ni queda cortado de forma rara;
- las 10 tienen el mismo aire.

Si alguna falla, ajustar coordenadas o colores en su SVG (manteniendo el estilo común), volver a generar la hoja y volver a pasar el Step 7.

- [ ] **Step 9: Todos los tests y commit**

Run: `npm test`
Expected: 20 tests en verde.

```bash
git add -A public/productos tests/imagenes.test.ts
git commit -m "$(cat <<'EOF'
Ilustraciones propias de los 10 ramos y centros

SVG dibujados a mano (sin licencias de terceros); se quitan las 12 imagenes de Volta.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarea 4: Aspecto visual: colores, Fraunces, logo e icono

**Files:**
- Modify: `src/app/globals.css` (`@theme inline`, `:root` y `@layer base`)
- Modify: `src/app/layout.tsx` (fuentes)
- Create: `src/components/logo.tsx`
- Modify: `src/components/cabecera.tsx` (logo)
- Create: `src/app/icon.svg`
- Delete: `src/app/favicon.ico`, `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `export function Logo({ className }: { className?: string })` en `src/components/logo.tsx`. La variable CSS `--font-fraunces` y los títulos `h1`-`h3` en Fraunces. La Tarea 5 vuelve a tocar `layout.tsx` (metadatos) y `cabecera.tsx` (nombre y "Catálogo").

Esta tarea es visual y no tiene test unitario útil. Se verifica con tipos, lint, build y renderizando el logo.

- [ ] **Step 1: Colores en `:root`**

En `src/app/globals.css`, sustituir el bloque `:root { ... }` entero (de `--background` a `--sidebar-ring`) por:
```css
:root {
  /* El Rincon de las Flores: verde hoja sobre crema (referencias en hex al lado) */
  --background: oklch(0.974 0.011 84.6); /* #FAF6EE crema */
  --foreground: oklch(0.272 0.021 153.3); /* #1F2A22 */
  --card: oklch(0.974 0.011 84.6);
  --card-foreground: oklch(0.272 0.021 153.3);
  --popover: oklch(0.974 0.011 84.6);
  --popover-foreground: oklch(0.272 0.021 153.3);
  --primary: oklch(0.486 0.072 151); /* #3F6B4A verde hoja */
  --primary-foreground: oklch(0.974 0.011 84.6);
  --secondary: oklch(0.941 0.02 87.5); /* #F1EBDD */
  --secondary-foreground: oklch(0.272 0.021 153.3);
  --muted: oklch(0.941 0.02 87.5);
  --muted-foreground: oklch(0.511 0.026 151.2); /* #5C6B5F: 5,2:1 sobre crema */
  --accent: oklch(0.941 0.02 87.5);
  --accent-foreground: oklch(0.272 0.021 153.3);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.891 0.024 82.1); /* #E3DACA */
  --input: oklch(0.891 0.024 82.1);
  --ring: oklch(0.486 0.072 151);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.974 0.011 84.6);
  --sidebar-foreground: oklch(0.272 0.021 153.3);
  --sidebar-primary: oklch(0.486 0.072 151);
  --sidebar-primary-foreground: oklch(0.974 0.011 84.6);
  --sidebar-accent: oklch(0.941 0.02 87.5);
  --sidebar-accent-foreground: oklch(0.272 0.021 153.3);
  --sidebar-border: oklch(0.891 0.024 82.1);
  --sidebar-ring: oklch(0.486 0.072 151);
}
```
Contrastes comprobados: texto sobre crema 13,8:1; crema sobre verde 5,7:1; texto secundario sobre crema 5,2:1 y sobre `#F1EBDD` 4,7:1. Todos superan WCAG AA (4,5:1).
El bloque `.dark` no se toca.

- [ ] **Step 2: Fraunces en los títulos (CSS)**

En `src/app/globals.css`, dentro de `@theme inline`, cambiar:
```css
  --font-heading: var(--font-sans);
```
por:
```css
  --font-heading: var(--font-fraunces);
```
Y en `@layer base`, después del bloque `html { ... }`, añadir:
```css
  h1,
  h2,
  h3 {
    @apply font-heading;
  }
```

- [ ] **Step 3: Cargar Fraunces en el layout**

En `src/app/layout.tsx`:
- cambiar el import `import { Geist, Geist_Mono } from "next/font/google";` por `import { Fraunces, Geist, Geist_Mono } from "next/font/google";`;
- añadir, después de `geistMono`:
```tsx
// Fraunces (serif, licencia OFL) solo para los titulos: globals.css la aplica a h1-h3
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});
```
- en `<html>`, el `className` pasa a ser:
```tsx
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
```

- [ ] **Step 4: El logo**

`src/components/logo.tsx`:
```tsx
// Logo de la tienda: una flor de cinco petalos, crema sobre un cuadrado verde. El mismo dibujo que src/app/icon.svg.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <g className="fill-primary-foreground">
        <circle cx="16" cy="9.5" r="4.6" />
        <circle cx="22.18" cy="13.99" r="4.6" />
        <circle cx="19.82" cy="21.26" r="4.6" />
        <circle cx="12.18" cy="21.26" r="4.6" />
        <circle cx="9.82" cy="13.99" r="4.6" />
      </g>
      <circle cx="16" cy="16" r="3.2" className="fill-primary" />
    </svg>
  );
}
```

En `src/components/cabecera.tsx`:
- añadir `import { Logo } from "@/components/logo";` debajo del import de `IconoCarrito`;
- sustituir la línea
```tsx
          <span className="grid size-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">V</span>
```
por:
```tsx
          <Logo className="size-8" />
```

- [ ] **Step 5: El icono de la pestaña**

Borrar `src/app/favicon.ico` (`git rm -q src/app/favicon.ico`) y crear `src/app/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#3F6B4A"/><g fill="#FAF6EE"><circle cx="16" cy="9.5" r="4.6"/><circle cx="22.18" cy="13.99" r="4.6"/><circle cx="19.82" cy="21.26" r="4.6"/><circle cx="12.18" cy="21.26" r="4.6"/><circle cx="9.82" cy="13.99" r="4.6"/></g><circle cx="16" cy="16" r="3.2" fill="#3F6B4A"/></svg>
```
Next sirve `src/app/icon.svg` como icono de la pestaña sin configurar nada.

- [ ] **Step 6: Quitar los SVG de ejemplo de Next que nadie usa**

Run: `grep -rnE "file\.svg|globe\.svg|next\.svg|vercel\.svg|window\.svg" src README.md ; echo "fin"`
Expected: solo `fin`. Si sale alguna línea, NO borrar ese archivo y avisar.

Run: `git rm -q public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg`

- [ ] **Step 7: Verificar**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores; 20 tests en verde.

Run (con las variables ficticias del CI, como en `.github/workflows/ci.yml`):
```bash
DATABASE_URL=postgresql://ci:ci@localhost:5432/ci DIRECT_URL=postgresql://ci:ci@localhost:5432/ci \
STRIPE_SECRET_KEY=sk_test_ficticia_para_ci NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ficticia_para_ci \
NEXT_TELEMETRY_DISABLED=1 npm run build
```
Expected: `✓ Compiled successfully`, con `/icon.svg` en la lista de rutas. Si el build falla al intentar conectar con la base (por ejemplo, prerenderizando el catálogo), anotar el error tal cual y comparar con `git stash && npm run build && git stash pop`: si también falla sin los cambios, no es de esta tarea.

Renderizar el icono a 256 px y mirarlo:
```bash
"$CHROME" --headless=new --disable-gpu --window-size=256,256 \
  --screenshot="$(cygpath -w "$SCRATCH/icono.png")" "$RAIZ_URL/src/app/icon.svg"
```
Abrir el PNG con Read: debe verse una flor de cinco pétalos crema con el centro verde sobre un cuadrado verde redondeado.

La revisión de colores y fuentes en las páginas reales se hace en la Tarea 7, porque las páginas necesitan la base de datos.

- [ ] **Step 8: Commit**

```bash
git add -A src/app/globals.css src/app/layout.tsx src/components/logo.tsx src/components/cabecera.tsx src/app/icon.svg src/app/favicon.ico public
git commit -m "$(cat <<'EOF'
Aspecto de floristeria: verde hoja y crema, titulos en Fraunces y logo de flor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarea 5: Nombre de la tienda, textos con tildes y claves internas

**Files:**
- Create: `src/lib/tienda.ts`
- Test: `tests/marca.test.ts`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/carrito/page.tsx`, `src/app/checkout/exito/page.tsx`,
  `src/app/checkout/cancelado/page.tsx`, `src/app/producto/[id]/page.tsx`, `src/app/not-found.tsx`,
  `src/app/admin/page.tsx`, `src/app/admin/entrar/page.tsx`, `src/app/admin/actions.ts`, `src/app/checkout/actions.ts`,
  `src/components/cabecera.tsx`, `src/components/filtros.tsx`, `src/components/comprar-producto.tsx`,
  `src/components/vista-carrito.tsx`, `src/components/icono-carrito.tsx`, `src/lib/email.ts`, `src/lib/stripe.ts`,
  `src/lib/admin.ts`, `src/store/carrito.ts`, `prisma/schema.prisma` (solo el comentario de la línea 1)

**Interfaces:**
- Consumes: `Logo` y la cabecera de la Tarea 4.
- Produces: `export const TIENDA = { nombre: string; descripcion: string }` en `src/lib/tienda.ts`. La Tarea 6 lo cita en las notas.

- [ ] **Step 1: Escribir el test que falla**

`tests/marca.test.ts`:
```ts
// La tienda es El Rincon de las Flores: no queda nada de Volta, el nombre se escribe en UN solo sitio
// y las claves internas que dependian del nombre han cambiado.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { COOKIE_ADMIN } from "../src/lib/admin";
import { TIENDA } from "../src/lib/tienda";
import { useCarrito } from "../src/store/carrito";

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

  it("el carrito usa una clave nueva: los carritos de Volta (ids reutilizados) se ignoran", () => {
    expect(useCarrito.persist.getOptions().name).toBe("carrito-rincon");
  });

  it("la cookie del admin tiene nombre nuevo", () => {
    expect(COOKIE_ADMIN).toBe("admin_rincon");
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/marca.test.ts`
Expected: FAIL con `Cannot find module '../src/lib/tienda'`.

- [ ] **Step 3: Crear `src/lib/tienda.ts`**

```ts
// Nombre y descripcion de la tienda: el UNICO sitio donde se escriben (tests/marca.test.ts lo comprueba).
// Lo leen el layout (titulo de las pestanas), la cabecera, el catalogo, la entrada del admin y el email.
export const TIENDA = {
  nombre: "El Rincón de las Flores",
  descripcion: "Ramos y centros de mesa hechos a mano en el barrio",
};
```

- [ ] **Step 4: Plantilla de títulos en el layout**

En `src/app/layout.tsx`:
- añadir `import { TIENDA } from "@/lib/tienda";` debajo de `import { Toaster } ...`;
- sustituir el bloque `metadata` por:
```tsx
// Cada pagina pone solo su parte del titulo ("Carrito") y Next anade el nombre de la tienda
export const metadata: Metadata = {
  title: { default: TIENDA.nombre, template: `%s · ${TIENDA.nombre}` },
  description: TIENDA.descripcion,
};
```

- [ ] **Step 5: Títulos de las páginas (solo su parte)**

| Archivo | Antes | Después |
|---|---|---|
| `src/app/carrito/page.tsx` | `title: "Carrito · Tienda Volta"` | `title: "Carrito"` |
| `src/app/checkout/cancelado/page.tsx` | `title: "Pago cancelado · Tienda Volta"` | `title: "Pago cancelado"` |
| `src/app/checkout/exito/page.tsx` | `title: "Gracias por tu compra · Tienda Volta"` | `title: "Gracias por tu compra"` |
| `src/app/admin/page.tsx` | `title: "Pedidos · Admin · Tienda Volta"` | `title: "Pedidos · Admin"` |
| `src/app/producto/[id]/page.tsx` | `` title: producto ? `${producto.nombre} · Tienda Volta` : "Producto no encontrado" `` | `title: producto ? producto.nombre : "Producto no encontrado"` |

`src/app/admin/pedidos/[id]/page.tsx` ya da solo `Pedido #N · Admin` y no cambia.

- [ ] **Step 6: Cabecera, catálogo y entrada del admin**

`src/components/cabecera.tsx`:
- añadir `import { TIENDA } from "@/lib/tienda";`;
- `<span className="text-lg font-semibold tracking-tight">Tienda Volta</span>` pasa a `<span className="font-heading text-lg font-semibold tracking-tight">{TIENDA.nombre}</span>`;
- el enlace con el texto `Catalogo` pasa a `Catálogo`.

`src/app/page.tsx`:
- añadir `import { TIENDA } from "@/lib/tienda";`;
- sustituir `<h1 className="text-3xl font-bold tracking-tight">Catalogo</h1>` por:
```tsx
      <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
      <p className="mt-2 text-muted-foreground">{TIENDA.descripcion}</p>
```
- `Ningun producto coincide con la busqueda.` pasa a `Ningún producto coincide con la búsqueda.`

`src/app/admin/entrar/page.tsx`:
- añadir `import { TIENDA } from "@/lib/tienda";`;
- `Zona privada de Tienda Volta.` pasa a `Zona privada de {TIENDA.nombre}.`;
- `placeholder="Contrasena"` pasa a `placeholder="Contraseña"`.

- [ ] **Step 7: Email**

En `src/lib/email.ts`:
- añadir `import { TIENDA } from "@/lib/tienda";` debajo del import de `formatearPrecio`;
- en `plantillaConfirmacion`, sustituir las dos primeras líneas del HTML (`<div ...>` y `<h1 ...>`) y el párrafo siguiente por:
```ts
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1F2A22">
    <h1 style="font-size:22px;color:#3F6B4A">Gracias por tu compra en ${TIENDA.nombre}</h1>
    <p>Hemos recibido el pago de tu pedido <strong>#${p.id}</strong>. Te avisaremos cuando salga de la tienda.</p>
```
- en `enviarConfirmacion`:
```ts
    from: `${TIENDA.nombre} <onboarding@resend.dev>`,
    to: para,
    subject: `Pedido #${p.id} confirmado · ${TIENDA.nombre}`,
```

- [ ] **Step 8: Claves internas**

| Archivo | Antes | Después |
|---|---|---|
| `src/store/carrito.ts` | `name: "carrito-volta", // la clave en localStorage` | `name: "carrito-rincon", // la clave en localStorage. Cambiarla invalida los carritos guardados (ver NOTAS)` |
| `src/lib/admin.ts` | `export const COOKIE_ADMIN = "admin_volta";` | `export const COOKIE_ADMIN = "admin_rincon";` |
| `src/lib/admin.ts` | `` encode(`tienda-volta:${texto}`) `` | `` encode(`rincon-flores:${texto}`) `` |
| `src/lib/stripe.ts` | `appInfo: { name: "tienda-volta" },` | `appInfo: { name: "rincon-flores" },` |
| `prisma/schema.prisma` (línea 1) | `// Modelo de datos de la Tienda Volta.` | `// Modelo de datos de la floristeria.` |

`schema.prisma` solo cambia en un comentario: no genera migración. Comprobarlo con `npx prisma validate` (necesita `DIRECT_URL`; si falla por eso, basta con que `git diff prisma/schema.prisma` muestre solo esa línea).

- [ ] **Step 9: Tildes en el resto de textos visibles**

Cambiar exactamente estos textos (los comentarios no se tocan):

| Archivo | Antes | Después |
|---|---|---|
| `src/components/filtros.tsx` | `placeholder="auriculares, reloj, zapatillas..."` | `placeholder="rosas, girasoles, centro..."` |
| `src/components/filtros.tsx` | `Precio min. (€)` | `Precio mín. (€)` |
| `src/components/filtros.tsx` | `Precio max. (€)` | `Precio máx. (€)` |
| `src/app/producto/[id]/page.tsx` | `← Volver al catalogo` | `← Volver al catálogo` |
| `src/components/comprar-producto.tsx` | `aria-label="Mas"` | `aria-label="Más"` |
| `src/components/comprar-producto.tsx` | `"Anadir al carrito"` | `"Añadir al carrito"` |
| `src/components/vista-carrito.tsx` | `Tu carrito esta vacio.` | `Tu carrito está vacío.` |
| `src/components/vista-carrito.tsx` | `Ver el catalogo` | `Ver el catálogo` |
| `src/components/vista-carrito.tsx` | `aria-label="Mas"` | `aria-label="Más"` |
| `src/components/vista-carrito.tsx` | `{contarArticulos(lineas)} articulos` | `{contarArticulos(lineas)} artículos` |
| `src/components/icono-carrito.tsx` | `` aria-label={`Carrito: ${articulos} articulos`} `` | `` aria-label={`Carrito: ${articulos} artículos`} `` |
| `src/app/not-found.tsx` | `Puede que el enlace este mal o que el producto ya no exista.` | `Puede que el enlace esté mal o que el producto ya no exista.` |
| `src/app/not-found.tsx` | `Volver al catalogo` | `Volver al catálogo` |
| `src/app/checkout/exito/page.tsx` | `Si has pagado, te llegara un email de confirmacion.` | `Si has pagado, te llegará un email de confirmación.` |
| `src/app/checkout/exito/page.tsx` | `Recibiras un email en cuanto este listo.` | `Recibirás un email en cuanto esté listo.` |
| `src/app/checkout/actions.ts` | `{ error: "El carrito esta vacio" }` | `{ error: "El carrito está vacío" }` |
| `src/app/admin/actions.ts` | `{ error: "Contrasena incorrecta" }` | `{ error: "Contraseña incorrecta" }` |
| `src/app/admin/page.tsx` | `<TableHead className="text-right">Articulos</TableHead>` | `<TableHead className="text-right">Artículos</TableHead>` |

Después, buscar si queda alguno que se haya escapado:

Run:
```bash
grep -rnE "Catalogo|Contrasena|Anadir|articulos|Articulos|vacio|Ningun|busqueda|confirmacion|llegara|Recibiras|este listo|este mal" src --include=*.ts --include=*.tsx | grep -v "src/generated"
```
Expected: solo comentarios (`// ...`, `{/* ... */}`), imports (`@/lib/catalogo`) o identificadores (`articulos`, `contarArticulos`); esos se dejan. Si sale algún texto visible (JSX, `placeholder`, `aria-label`, un mensaje `error` o un toast), se corrige con el mismo criterio.

- [ ] **Step 10: Comprobar que el test pasa**

Run: `npx vitest run tests/marca.test.ts`
Expected: PASS, 5 tests. Si "no queda ninguna mención a Volta" falla, la lista dice en qué archivos queda.

- [ ] **Step 11: Verificación completa**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: sin errores; 25 tests en verde.

Run: `grep -rni volta src prisma public | grep -v "src/generated" ; echo "fin"`
Expected: solo `fin`.

- [ ] **Step 12: Commit**

```bash
git add -A src prisma/schema.prisma tests/marca.test.ts
git commit -m "$(cat <<'EOF'
Nombre El Rincon de las Flores en un solo sitio, textos con tildes y claves nuevas

- src/lib/tienda.ts: nombre y descripcion; el layout los usa como plantilla de titulos.
- Textos visibles con tildes y enes.
- Nuevas claves del carrito y de la cookie del admin: los carritos de Volta (ids reutilizados) se ignoran.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarea 6: Documentación

**Files:**
- Modify: `README.md` (completo), `docs/ESPECIFICACION.md` (completo), `docs/NOTAS-DEL-PROYECTO.md` (secciones nuevas), `CLAUDE.md` (línea 6)
- Create: `docs/arquitectura.svg`
- Delete: `docs/arquitectura.png`

**Interfaces:**
- Consumes: `TIENDA` (Tarea 5), `prisma/catalogo-datos.ts` (Tarea 2), `src/components/logo.tsx` y `src/app/icon.svg` (Tarea 4).
- Produces: documentación; en el README queda el marcador `URL_DE_LA_DEMO` (sección "Demo"), que la Tarea 8 sustituye por la URL real.

- [ ] **Step 1: `CLAUDE.md`**

Sustituir la línea `Tienda online "Tienda Volta" (ficticia, material de clase). La especificacion esta en \`docs/ESPECIFICACION.md\`.` por:
```
Tienda online "El Rincon de las Flores": floristeria de barrio (ramos y centros de mesa), adaptada de la plantilla
Tienda Volta del curso. La especificacion esta en `docs/ESPECIFICACION.md`.
```

- [ ] **Step 2: `docs/ESPECIFICACION.md`**

Sustituir el archivo entero por:
````markdown
# Especificacion · El Rincón de las Flores

Floristeria de barrio que vende ramos ya montados y centros de mesa por internet. Proyecto final del Master
Desarrollo Agentico, adaptado de la plantilla Tienda Volta del curso.

## Que hace la tienda

Un cliente entra, busca un ramo o un centro (por ocasion, precio o nombre), lo mete en el carrito y paga con tarjeta
(Stripe, modo test). El pedido se confirma cuando Stripe avisa al servidor (webhook) y el cliente recibe un email.
Si el pago se abandona, el pedido se cancela solo cuando caduca la sesion de pago.
La floristeria ve los pedidos y cambia su estado (pagado -> enviado -> entregado).

## Catalogo

4 categorias por ocasion: **Amor, Celebraciones, Condolencias y Para casa**. 10 productos (ramos y centros de mesa),
cada uno en una sola categoria y con precio por unidad. Los datos estan en `prisma/catalogo-datos.ts`.

## Paginas

| Ruta | Pagina | Quien la usa |
|---|---|---|
| `/` | Catalogo: rejilla de productos, busqueda, filtros (ocasion, precio) y orden | Cliente |
| `/producto/[id]` | Detalle: ilustracion, precio, stock, cantidad, anadir al carrito | Cliente |
| `/carrito` | Carrito: lineas, cantidades, total, boton de pagar | Cliente |
| `/checkout/exito` y `/checkout/cancelado` | Vuelta desde Stripe (solo informan) | Cliente |
| `/admin` | Panel de pedidos: lista, detalle y cambio de estado | Floristeria |
| `/api/webhooks/stripe` | Endpoint que recibe los eventos de Stripe (no es una pagina) | Stripe |

## Modelo de datos (resumen)

- **Categoria** 1 — N **Producto**
- **Pedido** 1 — N **LineaPedido** N — 1 **Producto**
- Un pedido tiene un **estado**: PENDIENTE, PAGADO, ENVIADO, ENTREGADO, CANCELADO.

## Fuera de alcance

Cuentas de cliente, cupones, varias monedas, gestion de stock en tiempo real, envios reales, flor suelta por tallos,
personalizar el ramo, marcas.

## Reglas que no se negocian

1. Los precios se guardan en **centimos** (enteros), nunca en decimales.
2. La clave secreta de Stripe vive solo en el servidor (`.env`), nunca en el navegador.
3. El pedido se marca como PAGADO en el **webhook**, no en la pagina de exito.
````

- [ ] **Step 3: Diagrama de arquitectura**

Borrar `docs/arquitectura.png` (`git rm -q docs/arquitectura.png`) y crear `docs/arquitectura.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" font-family="Segoe UI, Helvetica, Arial, sans-serif">
<rect width="1600" height="900" fill="#FAF6EE"/>
<text x="40" y="62" font-size="38" font-weight="700" fill="#1F2A22">El Rincón de las Flores: la arquitectura</text>
<text x="40" y="98" font-size="20" fill="#5C6B5F">Un solo proyecto Next.js 15 desplegado en Vercel, con tres servicios gestionados</text>
<g fill="#FFFFFF" stroke="#3F6B4A" stroke-width="3">
<rect x="40" y="170" width="220" height="110" rx="14"/>
<rect x="300" y="120" width="780" height="750" rx="22" fill="none" stroke="#C4BDAE" stroke-dasharray="10 8"/>
<rect x="330" y="170" width="350" height="110" rx="14"/><rect x="710" y="170" width="340" height="110" rx="14"/>
<rect x="330" y="340" width="350" height="110" rx="14"/><rect x="710" y="340" width="340" height="110" rx="14"/>
<rect x="330" y="510" width="350" height="110" rx="14"/><rect x="710" y="510" width="340" height="110" rx="14"/>
<rect x="330" y="700" width="350" height="110" rx="14"/><rect x="710" y="700" width="340" height="110" rx="14"/>
</g>
<g fill="#F1EBDD" stroke="#9C5530" stroke-width="3">
<rect x="1140" y="170" width="420" height="110" rx="14"/><rect x="1140" y="400" width="420" height="110" rx="14"/>
<rect x="1140" y="600" width="420" height="110" rx="14"/><rect x="1140" y="760" width="420" height="110" rx="14"/>
</g>
<g fill="none" stroke="#3F6B4A" stroke-width="3">
<path d="M260 225 H330"/><path d="M505 280 V340"/><path d="M505 450 V510"/><path d="M505 700 V620"/>
<path d="M680 565 H695 V310 H1110 V225 H1140"/><path d="M1050 565 H1110 V455 H1140"/><path d="M1050 755 H1110 V655 H1140"/>
</g>
<g fill="#5C6B5F" font-size="17"><text x="315" y="138">tienda-online/</text><text x="900" y="300">SQL (TLS)</text><text x="1060" y="520">API</text><text x="1060" y="700">email</text><text x="520" y="670">genera el cliente</text></g>
<g font-size="26" font-weight="700" fill="#1F2A22">
<text x="62" y="215">Navegador</text>
<text x="352" y="215">Páginas</text><text x="732" y="215">Catálogo y carrito</text>
<text x="352" y="385">Server Components</text><text x="732" y="385">Server Actions</text>
<text x="352" y="555">lib/prisma.ts</text><text x="732" y="555">lib/stripe.ts</text>
<text x="352" y="745">schema.prisma</text><text x="732" y="745">Webhook de Stripe</text>
<text x="1162" y="215">Neon · PostgreSQL</text><text x="1162" y="445">Stripe (modo test)</text>
<text x="1162" y="645">Resend (emails)</text><text x="1162" y="805">Vercel + GitHub Actions</text>
</g>
<g font-size="19" fill="#5C6B5F">
<text x="62" y="250">el cliente</text>
<text x="352" y="250">/, producto/[id], carrito, admin</text><text x="732" y="250">filtros en la URL · Zustand</text>
<text x="352" y="420">consultan en el servidor</text><text x="732" y="420">checkout + panel de admin</text>
<text x="352" y="590">cliente tipado + adapter pg</text><text x="732" y="590">server-only, sk_test_</text>
<text x="352" y="780">4 modelos, sin cambios</text><text x="732" y="780">firma · PAGADO · CANCELADO</text>
<text x="1162" y="250">4 ocasiones, 10 ramos y centros</text><text x="1162" y="480">Checkout + webhook firmado</text>
<text x="1162" y="680">confirmación de pedido</text><text x="1162" y="840">despliegue y CI en cada push</text>
</g>
</svg>
```

Renderizarlo y mirarlo:
```bash
"$CHROME" --headless=new --disable-gpu --window-size=1600,900 \
  --screenshot="$(cygpath -w "$SCRATCH/arquitectura.png")" "$RAIZ_URL/docs/arquitectura.svg"
```
Abrir el PNG con Read y comprobar que ningún texto se sale de su caja ni se solapa con una línea. Si pasa, ajustar el `x`/`y` de ese texto o el ancho de la caja.

- [ ] **Step 4: README de portfolio**

Sustituir `README.md` entero por:
````markdown
# El Rincón de las Flores · floristería online con Next.js, Stripe y Neon

Floristería de barrio con tienda online completa: catálogo de ramos y centros de mesa con búsqueda, filtros por
ocasión y precio y orden; carrito persistente; pago con Stripe confirmado por **webhook**; email de confirmación; y
panel para gestionar los pedidos. Desplegada en Vercel con CI.

**Demo:** URL_DE_LA_DEMO (Stripe en modo test: usa la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y
cualquier CVC; no se cobra nada)

> Proyecto final del Master Desarrollo Agéntico (The Power), adaptado de la plantilla Tienda Volta del curso.

![Arquitectura](docs/arquitectura.svg)

## Qué hace

- **Catálogo** de 10 ramos y centros en 4 ocasiones (Amor, Celebraciones, Condolencias, Para casa), con búsqueda por
  nombre, filtros de ocasión y precio, y orden por precio o nombre. Todo se resuelve en el servidor y vive en la URL,
  así que cualquier búsqueda se puede compartir.
- **Ficha de producto** con ruta dinámica, stock, estado de agotado y 404.
- **Carrito** con Zustand que sobrevive a recargar y a cerrar el navegador (localStorage).
- **Checkout** con Stripe desde una Server Action: los precios se releen de la base de datos, nunca del navegador.
- **Webhook firmado**: el único punto que marca un pedido como PAGADO, descuenta stock y envía el email (idempotente).
  Si el pago se abandona y la sesión de Stripe caduca, el mismo webhook cancela el pedido.
- **Email de confirmación** con Resend.
- **Panel de la floristería** protegido: pedidos por estado y cambios de estado (pagado -> enviado -> entregado).
- **Ilustraciones propias** en SVG para cada producto: sin fotos ni licencias de terceros.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui (Base UI), Geist y Fraunces |
| Estado del carrito | Zustand 5 + persist |
| Base de datos | PostgreSQL en Neon + Prisma 7 (driver adapter pg) |
| Pagos | Stripe Checkout + webhooks (modo test) |
| Emails | Resend |
| Calidad | ESLint, TypeScript estricto, Vitest, GitHub Actions |
| Despliegue | Vercel (deploy automático en cada push a main) |

## Decisiones de diseño

1. **Precios en céntimos** (enteros) en la base de datos y en Stripe: sin errores de coma flotante.
2. **El pedido se confirma en el webhook, no en la página de éxito**: si el cliente cierra el navegador tras pagar, el
   pedido se confirma igual. La página de éxito solo lee y cuenta el estado.
3. **Nada que venga del navegador es fiable**: el checkout recibe ids y cantidades y recalcula precios y stock.
4. **Idempotencia**: el webhook solo cambia pedidos en PENDIENTE; un evento repetido no descuenta stock dos veces.
5. **Secretos solo en el servidor**: `server-only` en `lib/stripe.ts` y `lib/email.ts`; cada Server Action del admin
   vuelve a comprobar la sesión (el middleware protege páginas, no acciones).
6. **La marca en un solo sitio**: el nombre está en `src/lib/tienda.ts` y los colores en `src/app/globals.css`.

Más detalle (por qué algo es así y qué tocar para cambiarlo) en `docs/NOTAS-DEL-PROYECTO.md`.

## Ejecutarlo en local

Necesitas Node.js 20+, una base PostgreSQL (Neon free tier o `docker compose up -d`), una cuenta de Stripe en modo test,
la [Stripe CLI](https://github.com/stripe/stripe-cli) y una cuenta de Resend.

```bash
npm install                 # dependencias + cliente de Prisma
cp .env.example .env        # y rellena los valores
npx prisma migrate deploy   # crea las tablas
npm run seed                # 4 ocasiones y 10 ramos y centros (borra los pedidos)
npm run dev                 # http://localhost:3000
# en otra terminal: reenviar los eventos de Stripe al webhook local
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe
```

Comprobaciones útiles: `npm run db:check`, `npm run stripe:check`, `npx tsx scripts/ver-pedidos.ts`, `npm test`.

## Desplegarlo en Vercel

1. Importa el repositorio en Vercel (Next.js se detecta solo; `postinstall` genera el cliente de Prisma).
2. Variables de entorno: `DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `RESEND_API_KEY`, `EMAIL_PRUEBAS`, `ADMIN_PASSWORD`.
3. En Stripe (Workbench > Webhooks > Add destination): eventos `checkout.session.completed` y `checkout.session.expired`,
   y URL `https://TU-DOMINIO/api/webhooks/stripe`. Copia su signing secret como `STRIPE_WEBHOOK_SECRET` en Vercel y
   redespliega.
4. Usa el dominio de producción (`*.vercel.app` sin hash): las URLs de cada despliegue están protegidas por Vercel.

## Estructura

```
src/app/                 páginas: catálogo, producto/[id], carrito, checkout (éxito/cancelado), admin
src/app/checkout/        Server Action del checkout
src/app/api/webhooks/    webhook de Stripe (la única API route)
src/components/          cabecera, logo, tarjetas, filtros, carrito, admin (y ui/ de shadcn)
src/lib/                 tienda (nombre), prisma, stripe, email, catálogo, orden, estados, admin, formato
src/store/carrito.ts     carrito con Zustand + persist
prisma/                  schema, migraciones, datos del catálogo y seed
public/productos/        ilustraciones SVG de los productos
tests/                   tests de reglas de negocio y de datos (Vitest)
.github/workflows/ci.yml lint + tipos + tests + build en cada push
```

Tienda de demostración: los pagos están en modo test y no se cobra nada.
````

- [ ] **Step 5: Notas del proyecto**

En `docs/NOTAS-DEL-PROYECTO.md`:

1. Sustituir la primera línea del título y la entradilla por:
```markdown
# Notas del proyecto · lo que conviene saber antes de cambiar algo

Las cosas de El Rincón de las Flores que no son evidentes leyendo el código por encima. Cada nota dice **dónde** está,
**por qué** es así y **qué tocar** si lo quieres cambiar. Se va ampliando a medida que se trabaja en el proyecto.
```

2. Insertar justo antes de `## Pedidos y pagos` esta sección nueva:
```markdown
## Marca de la tienda

| Qué | Dónde | Cómo cambiarlo |
|---|---|---|
| Nombre y descripción | `src/lib/tienda.ts` (`TIENDA`) | Cambia el texto ahí; el título de las pestañas, la cabecera, el catálogo, la entrada del admin y el email lo leen de ahí. `tests/marca.test.ts` falla si alguien lo escribe en otro archivo de `src/`. |
| Colores | `src/app/globals.css`, bloque `:root` | Están en oklch con su hex al lado. El verde es `--primary`; el crema, `--background`. Comprueba el contraste (4,5:1 mínimo para texto). |
| Fuentes | `src/app/layout.tsx` + `globals.css` | Geist para el texto; Fraunces para `h1`-`h3` (regla en `@layer base` y `--font-heading` en `@theme`). |
| Logo | `src/components/logo.tsx` y `src/app/icon.svg` | Son el mismo dibujo: si cambias uno, cambia el otro. `icon.svg` es el icono de la pestaña. |
| Ilustraciones | `public/productos/<slug>.svg` | Una por producto, con el nombre igual al slug. Para añadir un producto: entrada en `prisma/catalogo-datos.ts` + su SVG. `tests/imagenes.test.ts` falla si falta o sobra alguna. |
| Catálogo | `prisma/catalogo-datos.ts` | Los datos del seed, en céntimos. `npm run seed` los recarga, pero **borra también los pedidos**. |

**Claves que cambiaron al pasar de Volta a la floristería:**
- El carrito del navegador se guarda con la clave `carrito-rincon` (`src/store/carrito.ts`). Se cambió porque el seed
  reinicia los ids: un carrito antiguo con el id 1 habría mostrado un producto de Volta y Stripe habría cobrado el ramo
  que ahora tiene ese id. **Si algún día vuelves a recargar el catálogo con otros productos en producción**, cambia otra
  vez esta clave.
- La cookie del admin se llama `admin_rincon` y su huella usa la sal `rincon-flores:` (`src/lib/admin.ts`). Cambiar
  cualquiera de las dos cierra la sesión de todos los admins.

**Limitación conocida: la búsqueda distingue tildes.** Buscar "peonias" no encuentra "Ramo de peonías rosas", porque
`contains` con `mode: "insensitive"` ignora mayúsculas pero no tildes. Arreglarlo pide la extensión `unaccent` de
PostgreSQL (una migración) o guardar una columna con el nombre sin tildes. Por ahora, solo "peonías" lleva tilde.

---
```

3. En la sección `### Precios`, al final de su párrafo (termina en ``y `catalogo.ts` multiplica por 100.``), añadir
esta frase: ``Los datos del seed también están en céntimos, y `tests/catalogo-datos.test.ts` comprueba que ninguno se ha escrito en euros.``

- [ ] **Step 6: Comprobar enlaces y restos**

Run: `grep -n "arquitectura.png\|tienda-online-ecru\|12 productos" README.md docs/*.md CLAUDE.md ; echo "fin"`
Expected: solo `fin`.

Run: `grep -c "URL_DE_LA_DEMO" README.md`
Expected: `1` (lo sustituye la Tarea 8).

- [ ] **Step 7: Commit**

```bash
git add -A README.md CLAUDE.md docs/ESPECIFICACION.md docs/NOTAS-DEL-PROYECTO.md docs/arquitectura.svg docs/arquitectura.png
git commit -m "$(cat <<'EOF'
Documentacion de El Rincon de las Flores: README, especificacion, notas y diagrama

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarea 7: Cuentas, `.env` y prueba de punta a punta en local

Esta tarea la hace **el alumno con ayuda**: crear las cuentas son registros con su email. El agente le guía paso a
paso, rellena `.env` solo con los valores que el alumno le pegue (o le pide que lo edite él), y hace las comprobaciones.

**Files:**
- Create: `.env` (ignorado por git; nunca se hace commit)

**Interfaces:**
- Consumes: la rama `floristeria` con las Tareas 2 a 6.
- Produces: una base de Neon con las tablas y las 10 flores, y la tienda probada en local de punta a punta.

- [ ] **Step 1: Neon**

El alumno, en https://neon.tech, crea una cuenta y un proyecto en una región de la UE (por ejemplo, Frankfurt), con
una base llamada `tienda`. En *Dashboard › Connect* copia dos cadenas:
- con **Connection pooling** activado → `DATABASE_URL`;
- con él desactivado (sin `-pooler` en el host) → `DIRECT_URL`.

Crear `.env` copiando `.env.example` (`cp .env.example .env`) y pegar ambas.

- [ ] **Step 2: Stripe**

El alumno crea una cuenta en https://dashboard.stripe.com. No hace falta activar pagos reales: el modo test está desde el principio.
- *Developers › API keys*: copiar la **Secret key** (`sk_test_...`) en `STRIPE_SECRET_KEY` y la **Publishable key**
  (`pk_test_...`) en `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- *Settings › Business › Public details*: nombre público **El Rincón de las Flores**. Es lo que aparece arriba en la página de pago de Stripe.

Instalar la Stripe CLI con `winget install Stripe.StripeCLI` (el alumno puede ejecutarlo con `! winget install Stripe.StripeCLI`),
abrir una terminal nueva y ejecutar `stripe login`.

- [ ] **Step 3: Resend y admin**

- https://resend.com: crear cuenta y, en *API Keys*, una clave → `RESEND_API_KEY`. En `EMAIL_PRUEBAS`, el email con el que se registró.
- `ADMIN_PASSWORD`: una contraseña larga. Se puede generar con `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`.

- [ ] **Step 4: Comprobar el `.env` sin mostrar secretos**

Run: `node -e "require('dotenv').config(); for (const k of ['DATABASE_URL','DIRECT_URL','STRIPE_SECRET_KEY','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','RESEND_API_KEY','EMAIL_PRUEBAS','ADMIN_PASSWORD']) console.log(k.padEnd(36), process.env[k] ? 'ok' : 'FALTA')"`
Expected: todas `ok` (`STRIPE_WEBHOOK_SECRET` se rellena en el Step 6).

Run: `git status --porcelain | grep "\.env$" ; echo "fin"`
Expected: solo `fin` (`.env` está ignorado).

- [ ] **Step 5: Tablas y datos**

Run: `npm run db:check`
Expected: la conexión con Neon funciona.

Run: `npx prisma migrate deploy`
Expected: `All migrations have been successfully applied` (la migración `inicial`).

Run: `npm run seed`
Expected:
```
  Amor           3 productos
  Celebraciones  3 productos
  Condolencias   2 productos
  Para casa      2 productos
Seed completado: 4 categorias, 10 productos
```

Run: `npm run stripe:check`
Expected: la clave de Stripe es válida y de test.

- [ ] **Step 6: Arrancar en local con el webhook**

- Terminal 1 (en segundo plano): `stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe`. Copiar el `whsec_...` que imprime en `STRIPE_WEBHOOK_SECRET`.
- Terminal 2 (en segundo plano): `npm run dev`.

- [ ] **Step 7: Prueba de punta a punta**

Con el navegador (skill `run` o Claude in Chrome) en http://localhost:3000, comprobar y anotar cada punto:
1. El catálogo muestra 10 productos con sus ilustraciones, en verde y crema; "Catálogo" y los títulos de producto en Fraunces; logo de flor e icono de la pestaña.
2. La pestaña dice `El Rincón de las Flores`; en `/carrito` dice `Carrito · El Rincón de las Flores`.
3. Filtro "Condolencias" → 2 productos. `?orden=precio-desc` → el primero es el centro de lirios. Buscar "rosas" → 1.
4. La ficha del centro de margaritas muestra "Agotado" y el botón desactivado.
5. Añadir 2 ramos de girasoles, recargar: el carrito sigue ahí y dice "2 artículos".
6. Pagar con `4242 4242 4242 4242`: la página de éxito dice "Pago confirmado", `stripe listen` muestra `checkout.session.completed` → 200, llega el email a `EMAIL_PRUEBAS` con el nombre de la tienda en el asunto, y el stock de girasoles baja de 15 a 13.
7. Pagar otro pedido con `4000 0000 0000 0002`: Stripe muestra el rechazo y el pedido sigue PENDIENTE (`npx tsx scripts/ver-pedidos.ts`). Ejecutar `stripe checkout sessions expire <cs_test_...>` con el id de esa sesión: el pedido pasa a CANCELADO.
8. `/admin`: entrar con `ADMIN_PASSWORD`, ver los dos pedidos, pasar el pagado a "Enviado".
9. Vista móvil (375 px): la cabecera y la rejilla no se desbordan.
10. Revisar que en ninguna pantalla haya textos sin tildes ni restos de Volta.

Cualquier fallo se arregla en la rama `floristeria` (con su test si es lógica), con su propio commit.

- [ ] **Step 8: Dejar la base limpia para la demo**

Run: `npm run seed`
Expected: el mismo resumen del Step 5. Se borran los pedidos de prueba y la demo final de producción será el pedido #1.

---

### Tarea 8: GitHub, Vercel y demo final

**Files:**
- Modify: `README.md` (sustituir `URL_DE_LA_DEMO`)

**Interfaces:**
- Consumes: la rama `floristeria` probada (Tarea 7) y el `.env` (Tarea 7).
- Produces: `main` en GitHub, la tienda desplegada en Vercel y el README con la URL real.

- [ ] **Step 1: Build de producción e integración en `main`**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: todo en verde (el build usa el `.env` real).

```bash
git switch main
git merge --no-ff floristeria -m "$(cat <<'EOF'
El Rincon de las Flores: la floristeria sustituye a Tienda Volta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Repositorio en GitHub**

El alumno crea en https://github.com/new un repositorio **vacío**: sin README, sin .gitignore y sin licencia. El nombre
y si es público o privado los elige él (para portfolio, público). Pega la URL.

Antes de subir, confirmar con el alumno la URL y que se va a publicar todo el historial de `main`.

```bash
git remote add origin <URL-del-repositorio>
git push -u origin main
```
Expected: `main` subido. En la pestaña *Actions* de GitHub, el workflow CI se ejecuta y termina en verde.

- [ ] **Step 3: Vercel**

El alumno, en https://vercel.com, entra con su cuenta de GitHub y hace *Add New › Project › Import* del repositorio. En *Environment Variables* pone:
`DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `EMAIL_PRUEBAS`
(sin dominio propio, Resend solo entrega a ese email) y `ADMIN_PASSWORD`, con los mismos valores del `.env`.
Después pulsa *Deploy*.

Expected: despliegue correcto y una URL de producción `https://<nombre>.vercel.app`.

- [ ] **Step 4: Webhook de producción**

El alumno, en Stripe › *Workbench › Webhooks › Add destination*:
- eventos `checkout.session.completed` y `checkout.session.expired`;
- URL `https://<nombre>.vercel.app/api/webhooks/stripe`.

Copia el *signing secret* en Vercel como `STRIPE_WEBHOOK_SECRET` (es distinto del de `stripe listen`) y hace *Redeploy*.

- [ ] **Step 5: Demo final en producción**

En `https://<nombre>.vercel.app`: filtrar por una ocasión, añadir un ramo, pagar con 4242. Comprobar:
- la página de éxito dice "Pago confirmado";
- en Stripe › Webhooks, el evento se entregó con 200;
- llega el email;
- en `/admin` de producción aparece el **pedido #1** como PAGADO.

- [ ] **Step 6: URL en el README y push**

Sustituir `URL_DE_LA_DEMO` en `README.md` por `https://<nombre>.vercel.app`.

```bash
git add README.md
git commit -m "$(cat <<'EOF'
README: URL de la demo en produccion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push
```
Expected: Vercel redespliega solo con el push y el CI termina en verde.
