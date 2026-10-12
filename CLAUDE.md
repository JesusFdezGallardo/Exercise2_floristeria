# CLAUDE.md · tienda-online

Contexto para el asistente de código. Léelo antes de tocar nada.

## Proyecto
Tienda online "El Rincón de las Flores": floristería de barrio (ramos y centros de mesa), adaptada de la plantilla
Tienda Volta del curso. Está desplegada en https://exercise2-floristeria.vercel.app (Stripe en modo test).
- Especificación: `docs/ESPECIFICACION.md`.
- Particularidades al detalle (por qué y dónde tocar): `docs/NOTAS-DEL-PROYECTO.md`. **Mantenlas al día** cuando
  cambies algo de lo que cuentan; lo de abajo es el resumen.

## Stack
- Next.js 15 con App Router, TypeScript y Tailwind (carpeta `src/`, alias `@/*`).
- Base de datos PostgreSQL gestionada en Neon; acceso con Prisma (`prisma/schema.prisma`).
- Pagos con Stripe en modo test; emails con Resend; UI con shadcn/ui; carrito con Zustand.

## Convenciones
- Todo en español: textos de la web, comentarios y mensajes de commit.
- Server Components por defecto; `"use client"` solo cuando haga falta (estado, eventos).
- Las escrituras en BD van en Server Actions, no en API routes (salvo el webhook de Stripe).
- Precios en céntimos (Int). Se formatean solo al pintarlos (`src/lib/formato.ts`).
- Una única instancia de Prisma en `src/lib/prisma.ts`; una de Stripe en `src/lib/stripe.ts`.
- Lógica nueva con su test en `tests/` (Vitest). Antes de dar algo por hecho: `npx tsc --noEmit && npm run lint && npm test`.

## Particularidades (lo que no se ve leyendo el código por encima)
- **Solo el webhook marca un pedido como PAGADO** (`src/app/api/webhooks/stripe/route.ts`): descuenta stock y envía
  el email. La página `/checkout/exito` solo lee el estado. El webhook es idempotente: solo cambia pedidos PENDIENTE.
- **El pedido se crea PENDIENTE** al pulsar "Pagar" (`src/app/checkout/actions.ts`), que relee precio y stock de la
  BD: nunca se fía del carrito. El id del pedido viaja a Stripe en `metadata.pedidoId`; sin él, el webhook ignora el evento.
- **Eventos de Stripe:** `checkout.session.completed` (pagado) y `checkout.session.expired` (cancelado). Uno nuevo
  hay que darlo de alta fuera del código en dos sitios: `stripe listen --events ...` y el destino del webhook en Stripe.
- **Solo claves de test:** `src/lib/stripe.ts` lanza un error si `STRIPE_SECRET_KEY` no empieza por `sk_test_`.
- **Estados del admin** en `TRANSICIONES_ADMIN` (`src/lib/estados.ts`), con su test en `tests/reglas.test.ts`.
- **Cuentas propias (email + contraseña):** contraseñas con scrypt (`src/lib/contrasenas.ts`); sesión con un token
  aleatorio en la cookie `sesion_rincon` y su SHA-256 en la tabla `Sesion` (`src/lib/sesion.ts`). `usuarioActual()` y
  `exigirAdmin()` leen el usuario y su **rol de la BD**. El middleware solo exige que exista la cookie en `/admin` y
  `/cuenta`: cada página y cada Server Action de admin vuelven a comprobar la sesión y el rol.
- **El admin se crea solo con `npm run crear-admin -- <email>`** (`--produccion` para la tienda publicada). La web
  solo crea clientes. Después de `npm run seed` hay que volver a crearlo.
- **Pagar exige sesión:** `crearCheckout` devuelve `necesitaLogin` sin usuario; el pedido nace con `usuarioId` y el
  email de la cuenta (`customer_email` en Stripe). El webhook ya no sobrescribe el email (salvo pedidos sin dueño).
- **Envíos por código postal:** la entrega se pide en `/checkout/envio`, antes de pagar. Las tarifas están solo en
  `TARIFAS_ENVIO` (`src/lib/envio.ts`) y `crearCheckout` recalcula el envío con los precios de la BD. El pedido
  copia la entrega y `gastosEnvio`, y `total` ya los incluye.
- **La marca en un solo sitio:** el nombre está solo en `src/lib/tienda.ts` (`tests/marca.test.ts` falla si aparece
  en otro archivo de `src/`, o escrito sin tilde en `src`, `prisma` o `public`, aunque sea en un comentario);
  los colores, en `:root` de `src/app/globals.css` (`tests/tema.test.ts` exige contraste AA).
- **Catálogo:** datos en `prisma/catalogo-datos.ts` (en céntimos) y una ilustración por producto en
  `public/productos/<slug>.svg` (`tests/imagenes.test.ts` comprueba que no falte ni sobre ninguna).
- **`npm run seed` borra también los pedidos, usuarios y sesiones** y reinicia los ids. Si se recarga otro catálogo en
  producción, cambia la clave del carrito (`CLAVE_CARRITO` = `carrito-rincon` en `src/store/carrito.ts`; con sesión,
  cada usuario usa `carrito-rincon:<id>`) para que los carritos viejos no apunten a otro producto.
- **Filtros del catálogo en la URL:** un parámetro nuevo se conserva en tres sitios (`urlCon` y un `input hidden` en
  `src/components/filtros.tsx`, y `leerFiltros` en `src/lib/catalogo.ts`).
- **Dos páginas 404:** la general (`src/app/not-found.tsx`) y la de la ficha (`src/app/producto/[id]/not-found.tsx`),
  las dos con `src/components/pagina-404.tsx`. La de la ficha llega en streaming: `curl` no ve el texto, un navegador sí.
- **Lista del admin:** toda la fila abre el pedido con un `::after` estirado (`src/app/admin/page.tsx`); un botón
  nuevo dentro de la fila necesita `relative z-10` para no quedar tapado.
- **Búsqueda sin tildes:** el catálogo busca en `Producto.nombreBusqueda` (nombre en minúsculas y sin tildes, con
  `normalizar()` y `escaparLike()` de `src/lib/busqueda.ts`). Quien cree o renombre productos tiene que rellenarla;
  hoy solo lo hace el seed.
- **Emails:** sin dominio propio, Resend solo envía desde `onboarding@resend.dev` y a la dirección de la cuenta; si
  `EMAIL_PRUEBAS` tiene valor, todos los emails van ahí (`src/lib/email.ts`).

## Producción y entorno
- **Dos bases separadas (ramas de Neon):** el `.env` local apunta a la rama `desarrollo`; Vercel, a `main`
  (producción). `npm run seed` y las pruebas en local no tocan la tienda publicada. `npm run db:check` dice en qué
  entorno estás (compara con `.env.produccion`).
- **Migraciones:** se crean y prueban en desarrollo (`npx prisma migrate dev`); a producción **no llegan solas**:
  `npm run migrar:produccion` (usa las URLs de `.env.produccion`, solo local e ignorado por git), y después el push.
  Vercel no ejecuta migraciones. Una migración tiene que funcionar con el código anterior (va antes del despliegue).
- Dos URLs de Neon: `DATABASE_URL` (con `-pooler`, la app) y `DIRECT_URL` (sin pooler, las migraciones).
- El `whsec_` de producción (destino del webhook en Stripe) es **distinto** del que imprime `stripe listen`. Si el
  webhook responde 400 "Firma no valida", el secreto de Vercel no es el del destino.
- Usa la URL de producción sin hash: las de cada despliegue (`…-gall3.vercel.app`) están protegidas y dan 302.
- Para saber si un evento llegó: `stripe events list` y su `pending_webhooks` (0 = entregado). Para reenviarlo:
  `stripe events resend <evt_…> --webhook-endpoint=<we_…>`.
- El CI (`.github/workflows/ci.yml`) usa claves ficticias. Una variable que necesite el build va también ahí y en Vercel.
- No ejecutes `npm run build` con `npm run dev` en marcha: comparten `.next` y el build falla con errores raros.

## Seguridad
- Secretos solo en `.env` (ignorado por git). `.env.example` lleva los nombres sin valores.
- Nunca uses variables `NEXT_PUBLIC_` para claves secretas (la publicable de Stripe sí puede llevarlo).
- Al mostrar el `.env`, oculta los valores: nunca imprimas una cadena de conexión ni una clave.

## Comandos
- `npm run dev` arranca en http://localhost:3000
- `stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe` (webhook en local)
- `npx prisma migrate dev` aplica cambios del schema en desarrollo; `npx prisma studio` abre el visor de tablas
- `npm run migrar:produccion` aplica las migraciones pendientes a la base de producción
- `npm run seed` rellena la base de datos de desarrollo con el catálogo (y borra sus pedidos, usuarios y sesiones)
- `npm run crear-admin -- <email> [--produccion]` crea o asciende un administrador (pide la contraseña)
- `npm run db:check`, `npm run stripe:check`, `npx tsx scripts/ver-pedidos.ts`: comprobaciones rápidas
- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
