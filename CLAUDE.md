# CLAUDE.md · tienda-online

Contexto para el asistente de codigo. Leelo antes de tocar nada.

## Proyecto
Tienda online "El Rincon de las Flores": floristeria de barrio (ramos y centros de mesa), adaptada de la plantilla
Tienda Volta del curso. La especificacion esta en `docs/ESPECIFICACION.md`.
Las particularidades (decisiones no evidentes y donde tocar) estan en `docs/NOTAS-DEL-PROYECTO.md`: mantenlas al dia.

## Stack
- Next.js 15 con App Router, TypeScript y Tailwind (carpeta `src/`, alias `@/*`).
- Base de datos PostgreSQL gestionada en Neon; acceso con Prisma (`prisma/schema.prisma`).
- Pagos con Stripe en modo test; emails con Resend; UI con shadcn/ui; carrito con Zustand.

## Convenciones
- Todo en espanol: textos de la web, comentarios y mensajes de commit.
- Server Components por defecto; `"use client"` solo cuando haga falta (estado, eventos).
- Las escrituras en BD van en Server Actions, no en API routes (salvo el webhook de Stripe).
- Precios en centimos (Int). Se formatean solo al pintarlos.
- Una unica instancia de Prisma en `src/lib/prisma.ts`; una de Stripe en `src/lib/stripe.ts`.

## Seguridad
- Secretos solo en `.env` (ignorado por git). `.env.example` lleva los nombres sin valores.
- Nunca uses variables `NEXT_PUBLIC_` para claves secretas.

## Comandos
- `npm run dev` arranca en http://localhost:3000
- `npx prisma migrate dev` aplica cambios del schema; `npx prisma studio` abre el visor de tablas
- `npm run seed` rellena la base de datos con productos de ejemplo
