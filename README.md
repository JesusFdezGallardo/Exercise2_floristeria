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
