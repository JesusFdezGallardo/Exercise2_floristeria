# Gestión del catálogo en el admin (parte B) · diseño

Fecha: 2026-10-12 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Que la floristería pueda **editar sus productos y su stock desde `/admin`** sin tocar código ni ejecutar el seed.
Es la parte B que quedó pendiente en `2026-10-11-cuentas-design.md`, y el paso previo a los **avisos de reposición**
("avísame cuando vuelva a haber"), que tendrán su propia spec y se engancharán al punto de reposición que deja esta.

Criterios de éxito:
- El admin cambia nombre, descripción, precio, categoría y visibilidad de un producto, y la tienda lo refleja al momento.
- Reponer ("han llegado 10") nunca pisa las ventas que entran mientras tanto.
- Corregir el stock con un recuento no puede deshacer en silencio una venta hecha mientras se editaba.
- Un producto oculto no se ve ni se puede comprar, pero los pedidos antiguos que lo llevan se siguen viendo bien.
- Hay **un único punto** del código que sabe que un producto ha pasado de agotado a disponible (`alReponer`).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Alcance | Editar los productos existentes. **No** se crean ni se borran productos desde la web. |
| Productos nuevos | Siguen entrando por `prisma/catalogo-datos.ts` y su SVG en `public/productos/`. |
| Imágenes | Sin cambios: no hay subida de imágenes ni almacenamiento externo (Vercel Blob queda fuera). |
| Borrar | No se borra: se **oculta** con `visible = false` (los pedidos antiguos apuntan al producto). |
| Stock | Dos operaciones: **Reponer** (suma N, atómico) y **Corregir** (fija N si nadie lo cambió entretanto). |
| Slug e imagen | No se editan: renombrar un producto no cambia su URL ni su ilustración. |
| Roles | Gestionar roles desde la web queda fuera; el admin sigue creándose con `npm run crear-admin`. |
| Pantalla | Lista `/admin/productos` + ficha `/admin/productos/[id]` con tres formularios independientes. |

Enfoques descartados: edición en línea en la tabla (la descripción no cabe y en el móvil queda apretada) y un único
formulario con un solo "Guardar" (mezcla el stock con los datos: la comprobación de "nadie cambió el stock" haría
fallar también un cambio de descripción). También un único campo de stock con valor fijo: obliga a sumar de cabeza en
cada reposición y, sin protección, puede "recuperar" unidades ya vendidas.

## Modelo de datos

Un campo nuevo en `Producto`:

```prisma
visible Boolean @default(true) // false = oculto: fuera del catálogo y de la compra; los pedidos antiguos lo siguen viendo
```

- Migración: `ALTER TABLE "Producto" ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true`. Compatible con el código
  anterior (lo ignora y todo queda visible), así que puede aplicarse a producción antes del despliegue.
- No se añade columna de versión: para *Corregir* el propio `stock` hace de testigo (ver Acciones).
- `prisma/catalogo-datos.ts` y el seed no cambian: todos los productos nacen visibles.

### Dónde se filtra `visible`

| Sitio | Comportamiento con un producto oculto |
|---|---|
| `src/lib/catalogo.ts` (lista y búsqueda) | No aparece. El `where` se extrae a una función pura `whereDe(f)` en `src/lib/catalogo-where.ts` (sin Prisma, para testearla sin BD) que siempre lleva `visible: true`. |
| `src/app/producto/[id]/page.tsx` | `notFound()`: la 404 de la ficha. |
| `src/app/checkout/actions.ts` | Mismo error que un producto inexistente: "Un producto del carrito ya no está disponible". |
| Webhook de Stripe | **No filtra**: si se pagó antes de ocultarlo, el pedido se marca PAGADO y descuenta stock igual. |
| Admin (lista y ficha de productos) | Se ve, con la insignia *Oculto*, para poder volver a mostrarlo. |
| Pedidos (admin, Mis pedidos, emails) | Sin cambios: leen el producto por su relación con la línea. |

## Reglas puras (`src/lib/productos-admin.ts`)

Sin BD ni Node, con test en `tests/productos-admin.test.ts`.

- **`validarProducto({ nombre, descripcion, precio, categoriaId, visible })`** →
  `{ ok: true, datos } | { ok: false, errores }`, con `errores` por campo (como `validarEntrega`).
  - `nombre`: tras `trim`, de 1 a 80 caracteres.
  - `descripcion`: tras `trim`, de 1 a 1000 caracteres.
  - `precio`: texto en euros, leído con `leerPrecio`.
  - `categoriaId`: entero positivo (que exista lo comprueba la acción).
  - `visible`: casilla marcada o no (`"on"` o ausente).
- **`leerPrecio(texto)`** → céntimos o `null`. Acepta coma o punto decimal y como mucho dos decimales
  (`"45,90"` → 4590, `"45.9"` → 4590, `"45"` → 4500). Rango de 0,50 € a 1.000,00 €. Rechaza vacío, negativos,
  más de dos decimales, notación científica y cualquier otro carácter. Se calcula sin coma flotante (partes entera
  y decimal por separado).
- **`leerUnidades(texto, { min, max })`** → entero o `null`. Solo dígitos. Reponer usa `{ min: 1, max: 500 }`;
  Corregir, `{ min: 0, max: 500 }`.
- **`esReposicion(antes, despues)`** → `antes <= 0 && despues > 0`. Con `<= 0` y no `=== 0`: sin reserva de stock,
  dos ventas a la vez de la última unidad dejan el stock en -1, y reponer desde ahí también es una reposición.

## Acciones (`src/app/admin/productos/actions.ts`)

Las tres empiezan con `exigirAdmin()` (una Server Action es un endpoint público), reciben el id del producto en un
`input hidden` llamado `id` (validado como entero positivo), devuelven un estado para `useActionState` y terminan con `revalidatePath` de `/admin/productos`, `/admin/productos/[id]`, `/producto/[id]` y `/`.

1. **`guardarProducto(estadoPrevio, formData)`**: valida con `validarProducto`, comprueba que el producto y la
   categoría existen y actualiza nombre, descripción, precio, categoría y `visible`. Recalcula
   `nombreBusqueda = normalizar(nombre)`. **No toca el stock.** Devuelve `{ errores }` o `{ ok: "Guardado" }`.
2. **`reponerStock(estadoPrevio, formData)`**: lee N con `leerUnidades(…, { min: 1, max: 500 })` y hace
   `update({ data: { stock: { increment: N } } })`, que devuelve el stock nuevo. Si `esReposicion(nuevo - N, nuevo)`,
   llama a `alReponer(id)`. Devuelve `{ ok: "Stock: 3 → 13" }`.
3. **`corregirStock(estadoPrevio, formData)`**: lee N con `leerUnidades(…, { min: 0, max: 500 })` y el
   `stockLeido` del campo oculto, y hace `updateMany({ where: { id, stock: stockLeido }, data: { stock: N } })`.
   - Si cuenta 0 filas: relee el producto. Si no existe, `{ error: "El producto no existe" }`; si existe, devuelve
     `{ error: "El stock ha cambiado mientras editabas: ahora hay X" }` y revalida la página, que se vuelve a pintar
     con X (también en `stockLeido`).
   - Si cuenta 1: si `esReposicion(stockLeido, N)`, llama a `alReponer(id)`. Devuelve `{ ok: "Stock: 5 → 4" }`.

**`alReponer(productoId)`** (`src/lib/reposicion.ts`): en esta parte solo escribe una línea en el log del servidor
(sirve para comprobarlo a mano), con un comentario que explica que es el gancho de los avisos de reposición. Es el único sitio que sabe que un producto ha vuelto a estar disponible.

Quién cambia el stock tras esta parte: `reponerStock`, `corregirStock`, el webhook (descuenta al pagar) y el seed.

## Pantallas

**Navegación.** `src/components/navegacion-admin.tsx`: pestañas *Pedidos* (`/admin`) y *Productos*
(`/admin/productos`), encima del título de las páginas del admin. Las páginas existentes no cambian por lo demás.

**Permisos.** Como hoy: el middleware exige la cookie en `/admin`; cada página llama a `usuarioActual()`, redirige a
`/entrar?callbackUrl=…` sin sesión y muestra `<SinAcceso />` si el rol no es ADMIN.

**`/admin/productos`** (Server Component, `force-dynamic`):
- Tabla con Producto (enlace), Categoría, Precio, Stock y Estado.
- Estado: insignia *Agotado* (stock 0 o negativo) y/o *Oculto* (`visible = false`); nada si está a la venta.
- Orden: primero los agotados, después por nombre.
- Toda la fila abre la ficha con el `::after` estirado, como la lista de pedidos.
- Sin filtros ni paginación (son unos diez productos).

**`/admin/productos/[id]`** (Server Component; id no numérico o inexistente → `notFound()`):
- Cabecera: miniatura del SVG, nombre, "Ver en la tienda" (si está visible) y "← Productos".
- Tres tarjetas, cada una con su componente cliente y su propio `useActionState`:
  1. **Datos** (`src/components/formulario-producto.tsx`): nombre, descripción (textarea), precio en euros
     (precargado como "45,90"), categoría (select) y "Visible en la tienda". Los errores se muestran bajo cada campo
     y el foco va al primero con error, como en el formulario de entrega. Los valores escritos se conservan tras un error.
  2. **Reponer** (`src/components/formulario-reponer.tsx`): "Stock actual: N", campo de unidades y botón "Añadir".
  3. **Corregir stock** (`src/components/formulario-corregir-stock.tsx`): campo precargado con el stock y
     `input hidden` con `stockLeido`, los dos tomados del stock con que se pinta la página. El campo visible es
     controlado y sigue a ese stock: tras reponer o tras un conflicto pasa al valor nuevo (si no, guardaría el viejo).
     Texto de ayuda: "Para recuentos. Para lo que llega, usa Reponer."

## Tests

- `tests/productos-admin.test.ts`:
  - `leerPrecio`: válidos `"45,90"`, `"45.9"`, `"45"`, `"0,50"`, `"1000"`; inválidos `"45,999"`, `"-3"`, `"0,10"`,
    `"1000,01"`, `"abc"`, `""`, `"1e3"`, `" "`.
  - `leerUnidades`: límites de Reponer y Corregir; rechaza decimales, signos y texto.
  - `validarProducto`: un error por campo, `trim`, límites de longitud, casilla `visible`.
  - `esReposicion`: 0→5 y -1→4 sí; 0→0, -2→0, 3→8 y 5→0 no.
- `tests/catalogo.test.ts` (nuevo): `whereDe(f)` lleva siempre `visible: true`, también combinado con búsqueda,
  categoría y precio, y conserva los filtros que ya había.
- Prueba manual (acciones y páginas tocan BD y sesión):
  1. Reponer un producto agotado → aparece en la tienda como disponible.
  2. Corregir con dos pestañas abiertas sobre el mismo producto → la segunda recibe el aviso con el valor nuevo.
  3. Ocultar un producto que está en un carrito → desaparece del catálogo, su ficha da 404 y no se puede pagar.
  4. Renombrar con tildes ("Ramo de peonías") y buscarlo sin ellas ("peonias").
  5. Entrar como cliente en `/admin/productos` → "No tienes acceso".
- Antes de darlo por hecho: `npx tsc --noEmit && npm run lint && npm test`.

## Documentación

- `CLAUDE.md`: particularidad nueva ("el stock solo cambia en `reponerStock`, `corregirStock`, el webhook y el seed;
  `alReponer` es el gancho de reposición"; los tres sitios que filtran `visible`). La de "Búsqueda sin tildes" pasa a
  decir que `nombreBusqueda` la rellenan el seed y `guardarProducto`.
- `docs/NOTAS-DEL-PROYECTO.md`: el detalle (por qué `visible` y no borrar, el testigo `stockLeido`, dónde se filtra).
- Memoria del asistente: parte B hecha; siguiente, avisos de reposición.

## Despliegue

- Se empieza **después de fusionar la rama `envios`**, en una rama `catalogo-admin` desde `main`.
- Migración creada y probada en desarrollo (`npx prisma migrate dev`); a producción con `npm run migrar:produccion`
  **antes** del push.
- Sin variables de entorno nuevas, sin cambios en el CI ni en Stripe.

## Fuera de alcance

- Crear y borrar productos, subir imágenes, editar slug.
- Gestionar categorías y roles desde la web.
- Historial de movimientos de stock.
- Los avisos de reposición: siguiente subproyecto, que rellenará `alReponer`.
