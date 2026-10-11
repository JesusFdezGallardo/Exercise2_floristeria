# Notas del proyecto · lo que conviene saber antes de cambiar algo

Las cosas de El Rincón de las Flores que no son evidentes leyendo el código por encima. Cada nota dice **dónde** está,
**por qué** es así y **qué tocar** si lo quieres cambiar. Se va ampliando a medida que se trabaja en el proyecto.

---

## Marca de la tienda

| Qué | Dónde | Cómo cambiarlo |
|---|---|---|
| Nombre y descripción | `src/lib/tienda.ts` (`TIENDA`) | Cambia el texto ahí; el título de las pestañas, la cabecera, el catálogo, la entrada del admin y el email lo leen de ahí. `tests/marca.test.ts` falla si alguien lo escribe en otro archivo de `src/`, y también si aparece **sin tilde** ("Rincon de las Flores") en `src`, `prisma` o `public`, aunque sea en un comentario. |
| Colores | `src/app/globals.css`, bloque `:root` | Están en oklch con su hex al lado. El verde es `--primary`; el crema, `--background`. `tests/tema.test.ts` comprueba el contraste AA (4,5:1) de las combinaciones de texto; el rojo (`--destructive`) se oscureció por eso. |
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

## Pedidos y pagos

### El ciclo de vida de un pedido
```
crearCheckout()            webhook completed         admin           admin
   PENDIENTE  ───────────────►  PAGADO  ──────────►  ENVIADO  ────►  ENTREGADO
      │
      ├── webhook expired (el checkout caducó) ──► CANCELADO
      └── admin lo cancela a mano             ──► CANCELADO
```
- El pedido se crea **PENDIENTE** al pulsar "Pagar", antes de ir a Stripe (`src/app/checkout/actions.ts`).
  Por eso hay pedidos PENDIENTE de gente que nunca llegó a pagar.
- **Solo el webhook** lo pasa a PAGADO (`src/app/api/webhooks/stripe/route.ts`). La página `/checkout/exito`
  solo lee el estado, no lo cambia.
- Lo que puede hacer el admin está en `TRANSICIONES_ADMIN` (`src/lib/estados.ts`). Para permitir otro cambio
  (por ejemplo, cancelar un PAGADO), se toca esa tabla y su test en `tests/reglas.test.ts`.

### Pagos rechazados
Con la tarjeta de prueba `4000 0000 0000 0002`, Stripe muestra el error **en su propia página** y deja reintentar.
No llega ningún evento: el pedido sigue PENDIENTE y el stock no se toca. Si el cliente se va, la sesión de pago
**caduca a las 24 h** (lo que Stripe pone por defecto) y entonces llega `checkout.session.expired` y el pedido pasa a CANCELADO.

- Para que caduque antes, se pasa `expires_at` (mínimo 30 minutos) a `stripe.checkout.sessions.create` en `actions.ts`.
- Para probarlo sin esperar: `stripe checkout sessions expire <cs_test_...>` con la Stripe CLI.

### El webhook: eventos, idempotencia y eventos ajenos
- Escucha **dos eventos**: `checkout.session.completed` y `checkout.session.expired`. Si añades otro, hay que darlo
  de alta en **dos sitios fuera del código**: el comando `stripe listen --events ...` (local) y el destino del
  webhook en el Workbench de Stripe (producción). Si no, Stripe no lo envía y no verás ningún error.
- **Idempotencia:** los cambios se hacen con `updateMany({ where: { id, estado: "PENDIENTE" } })`. Si Stripe reenvía
  un evento, el pedido ya no está PENDIENTE y no pasa nada: no se descuenta stock dos veces ni se cancela un pagado.
- El webhook sabe qué pedido es gracias a `metadata.pedidoId`, que pone la Server Action al crear la sesión.
  Un evento **sin ese dato** (los de `stripe trigger`, o pagos creados fuera de la tienda) se registra y se ignora
  respondiendo 200. Ojo: `stripe trigger checkout.session.completed` **no** sirve para probar la tienda; hay que
  hacer una compra real en modo test.
- Siempre se responde 200 salvo si la firma falla. Si el email falla, el pedido sigue PAGADO (se registra el error).

### Stock
- El stock **solo se descuenta en el webhook**, al pagar. Al crear el pedido solo se comprueba que haya suficiente.
- No hay reserva: si dos personas compran a la vez la última unidad, las dos pueden pagar y el stock quedaría en
  negativo. Está asumido (la especificación deja la gestión de stock en tiempo real fuera de alcance).
- Un pedido CANCELADO no repone stock porque nunca se le descontó. Si algún día se permite cancelar pedidos PAGADOS,
  habrá que reponerlo.

### Precios
Siempre en **céntimos** (`Int`): en la base de datos, en el carrito y en Stripe (`unit_amount`). Solo se convierten a
euros al pintarlos (`src/lib/formato.ts`) y al leer los filtros de precio del catálogo, donde el usuario escribe euros
y `catalogo.ts` multiplica por 100. Los datos del seed también están en céntimos, y `tests/catalogo-datos.test.ts`
comprueba que ninguno se ha escrito en euros.

---

## Catálogo

### Todo vive en la URL
Búsqueda, categoría, precio y orden son parámetros de la URL (`/?q=rosas&categoria=amor&orden=precio-desc`).
No hay estado en el navegador: `Filtros` es un Server Component, los chips son enlaces y la búsqueda es un `<Form>` GET.
Consecuencia: **si añades un parámetro nuevo**, hay que conservarlo en tres sitios de `src/components/filtros.tsx`:
la función `urlCon`, un `<input type="hidden">` dentro del formulario y su lectura en `leerFiltros` (`catalogo.ts`).

Para ver el SQL que genera Prisma con una búsqueda de ejemplo (rosas, de Amor, entre 40 y 60 €):
`npx tsx scripts/ver-sql-catalogo.ts`.

### Orden (`?orden=`)
- Los órdenes válidos están en la lista `ORDENES` de `src/lib/orden.ts`. **Para añadir uno** (por ejemplo, nombre Z-A)
  basta con una entrada nueva ahí: el enlace aparece solo. Añade también su caso en `tests/orden.test.ts`.
- Un valor desconocido en la URL no llega a Prisma: cae en el orden por defecto (`precio-asc`), que no se escribe en
  la URL para que `/` siga siendo `/`. Para cambiar el orden por defecto, se cambia `ORDEN_POR_DEFECTO`.
- Todos los órdenes desempatan por `id` para que dos productos con el mismo precio no cambien de sitio entre recargas.

### Páginas 404
- Hay **dos**: la general (`src/app/not-found.tsx`, "No encontramos esa página") y la de la ficha
  (`src/app/producto/[id]/not-found.tsx`, "No encontramos ese producto"). Next usa la más cercana a la ruta que llamó
  a `notFound()`; el resto de rutas inexistentes, y un pedido inexistente en el admin, caen en la general.
- Las dos pintan el mismo bloque (`src/components/pagina-404.tsx`), que recibe título y texto. Para una 404 propia de
  otra sección, crea un `not-found.tsx` en su carpeta que use ese componente.
- La 404 de la ficha llega **en streaming**: como la página tiene `generateMetadata` asíncrono, el HTML inicial no
  trae el texto y React lo pinta en el navegador (el estado HTTP sí es 404). Por eso `curl` no lo ve; para
  comprobarla, usa un navegador (o Chrome con `--headless --dump-dom`).

---

## Carrito
- Vive solo en el navegador (`localStorage`, clave `carrito-rincon`, `src/store/carrito.ts`). No hay carrito en la base
  de datos ni cuentas de cliente.
- Guarda una **copia** del precio y del stock del momento en que se añadió. Por eso el checkout **no se fía** de esos
  datos: vuelve a leer precio y stock de la base de datos. Si cambias precios, el carrito puede mostrar el viejo hasta
  que se pague; Stripe cobrará el nuevo.
- Si cambias la forma de `LineaCarrito`, los carritos guardados con la forma antigua siguen en el navegador de la gente.
  Para invalidarlos, cambia `name` en `persist` (o usa `version` + `migrate` de Zustand).

---

## Admin
- La protección es sencilla, pensada para una demo: una contraseña (`ADMIN_PASSWORD`) y una cookie con su huella
  SHA-256 (`src/lib/admin.ts`). **Cambiar la contraseña cierra todas las sesiones**, porque la huella deja de coincidir.
- El middleware (`src/middleware.ts`) protege **las páginas** de `/admin`, pero **no las Server Actions**: cada acción
  de `src/app/admin/actions.ts` vuelve a comprobar `esAdmin`. Si añades una acción de admin, tiene que hacer lo mismo.
- **Toda la fila de la lista abre el pedido** (`src/app/admin/page.tsx`): el enlace del número lleva un `::after`
  absoluto que se estira sobre la fila (`relative`), sin JavaScript en el navegador. Si añades un botón o un enlace
  dentro de una fila, el `::after` lo taparía: dale `relative z-10` para que quede por encima.

---

## Base de datos y entorno
- **Dos URLs de Neon:** `DATABASE_URL` (con pooler, la usa la app) y `DIRECT_URL` (sin pooler, la usan las migraciones,
  ver `prisma.config.ts`). Si las migraciones se cuelgan o fallan raro, revisa que `DIRECT_URL` no lleve `-pooler`.
- El cliente de Prisma se **genera** en `src/generated/prisma` (ignorado por git) al hacer `npm install`
  (script `postinstall`). Tras cambiar `schema.prisma`, `npx prisma migrate dev` lo regenera; si los tipos no cuadran,
  `npx prisma generate`.
- **Emails:** sin dominio propio verificado, Resend solo envía a la dirección de tu cuenta. Si `EMAIL_PRUEBAS` tiene
  valor, **todos** los emails van ahí en vez de al cliente (`src/lib/email.ts`). En producción con dominio propio,
  déjalo vacío y cambia el `from`.
- **CI** (`.github/workflows/ci.yml`) usa claves ficticias: el build necesita que existan, pero no se conecta a nada.
  Si añades una variable de entorno que el build necesite, añádela también ahí (con un valor falso) y en Vercel.

---

## Producción

Lo que se aprendió al desplegar (octubre de 2026). La tienda está en https://exercise2-floristeria.vercel.app.

- **Una sola base de datos para local y producción.** El `.env` local y Vercel apuntan al mismo proyecto de Neon:
  un pedido hecho en `localhost` sale en el admin de producción, y `npm run seed` en local vacía la tienda publicada.
  Si eso molesta, crea una rama de Neon para desarrollo y pon su URL solo en el `.env`.
- **Claves de test en Vercel.** `src/lib/stripe.ts` se niega a arrancar con una clave que no empiece por `sk_test_`.
  Ocurrió: se copió la `sk_live_` con el panel de Stripe en modo real y el checkout y el webhook fallaron con
  "STRIPE_SECRET_KEY no es de test". El destino del webhook también tiene que estar creado en **modo de prueba**.
- **Dos secretos de webhook distintos.** `stripe listen` da uno (local, en `.env`) y el destino de producción en
  Stripe da otro (en Vercel). Con el equivocado, Stripe recibe 400 "Firma no valida", el pedido se queda PENDIENTE
  y la página de éxito muestra el aviso ámbar de "Estamos confirmando tu pago".
- **Cómo comprobar una entrega sin fiarse del panel:** `stripe events list` muestra `pending_webhooks` (0 = entregado).
  Tras arreglar el secreto y redesplegar, `stripe events resend <evt_…> --webhook-endpoint=<we_…>` lo reenvía; por la
  idempotencia del webhook, reenviar nunca duplica nada.
- **Una variable nueva en Vercel no se aplica sola:** hace falta *Redeploy*.
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` como "Config", no "Sensitive":** Vercel avisa de que el prefijo la expone al
  navegador; para la clave publicable es correcto. La tienda en realidad no la usa (el pago redirige desde el servidor);
  solo la lee `npm run stripe:check`.
- **URLs de Vercel:** la de producción es la que no lleva hash. Las de cada despliegue (`…-<hash>-gall3.vercel.app`)
  piden iniciar sesión en Vercel (302).
- **`npm run build` con `npm run dev` en marcha** falla con errores raros al prerenderizar (`reading 'call'`): los dos
  escriben en `.next`. Para el dev, borra `.next` y vuelve a compilar.
