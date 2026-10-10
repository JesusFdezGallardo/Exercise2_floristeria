# Diseño · De Tienda Volta a El Rincón de las Flores

Fecha: 2026-10-10 · Estado: pendiente de revisión

## Objetivo

Convertir la plantilla del curso, Tienda Volta (audio, relojes, ropa, calzado), en la tienda propia del alumno:
**El Rincón de las Flores**, una floristería de barrio que vende ramos y centros de mesa. Es el ejercicio final del
proyecto, así que el resultado tiene que quedar **desplegado en su cuenta** y servir como pieza de portfolio.

**Hay éxito cuando:**
- La tienda está en una URL de Vercel propia, con las 10 flores, y se ve verde y crema, con ilustraciones propias.
- Una compra de prueba con la tarjeta 4242 llega a PAGADO por el webhook y envía el email de confirmación.
- El pedido aparece en el panel de admin de producción.
- El código está en un repositorio de GitHub del alumno, con el CI en verde y un README que cuenta la floristería.

## Qué no cambia

La lógica de la tienda se queda como está: catálogo con filtros y orden en la URL, carrito con Zustand,
checkout por Server Action, webhook firmado e idempotente (pagado y caducado), email con Resend y panel de admin.
**El schema de Prisma no cambia**: no hay migración nueva. Las reglas de `docs/ESPECIFICACION.md`
(céntimos, secretos en el servidor, PAGADO solo en el webhook) siguen vigentes.

## Fuera de alcance

- El modelo `Marca`: descartado, porque una floristería no tiene marcas.
- Flor suelta por tallos, plantas en maceta, personalización del ramo y mensajes en la tarjeta.
- Dominio propio para la web y para el email.
- Modo oscuro: la tienda no tiene forma de activarlo y `.dark` se deja como está.
- `PROMPTS.md`, que es material del curso y no se toca.

---

## 1. Catálogo

Hay 4 categorías por ocasión y 10 productos, cada uno en una sola categoría. El precio es por unidad (un ramo o un centro),
guardado en céntimos.

| Categoría (slug) | Producto | slug | Precio | Stock |
|---|---|---|---|---|
| Amor (`amor`) | Ramo de 12 rosas rojas | `ramo-rosas-rojas` | 4500 | 20 |
| | Ramo de peonías rosas | `ramo-peonias-rosas` | 5200 | 8 |
| | Ramo de claveles rojos | `ramo-claveles-rojos` | 2400 | 15 |
| Celebraciones (`celebraciones`) | Ramo de girasoles | `ramo-girasoles` | 3200 | 15 |
| | Ramo de gerberas multicolor | `ramo-gerberas` | 2800 | 18 |
| | Ramo de tulipanes variados | `ramo-tulipanes` | 3500 | 12 |
| Condolencias (`condolencias`) | Centro de lirios blancos | `centro-lirios-blancos` | 6500 | 6 |
| | Centro de crisantemos blancos | `centro-crisantemos-blancos` | 5500 | 5 |
| Para casa (`para-casa`) | Centro de mesa de hortensias | `centro-hortensias` | 4200 | 7 |
| | Centro de margaritas y lavanda | `centro-margaritas-lavanda` | 2900 | 0 |

- **Descripciones:** cada producto lleva una o dos frases con información útil para el cliente: tamaño aproximado,
  cuánto dura y cómo cuidarlo, y que incluye tarjeta para el mensaje. La del centro de margaritas dice que está
  **agotado hasta primavera** (stock 0, para que se sigan viendo los estados de agotado).
- **Seed:** `prisma/seed.ts` mantiene su estructura (TRUNCATE con RESTART IDENTITY, creación por categoría y resumen
  final); solo cambian `CATEGORIAS` y `PRODUCTOS`. La imagen sigue siendo `/productos/<slug>.svg`.
- Con estos datos, `?orden=precio-desc` muestra primero el centro de lirios (65 €).

## 2. Aspecto visual

**Colores:** solo las variables de `:root` en `src/app/globals.css`. Se escriben en oklch, como el resto del archivo.

| Variable | Uso | Color de referencia |
|---|---|---|
| `--background`, `--card`, `--popover` | Fondo de la página y de las tarjetas | crema `#FAF6EE` |
| `--foreground` y sus `-foreground` | Texto | `#1F2A22` |
| `--primary`, `--ring` | Botones, chips activos, foco | verde hoja `#3F6B4A` |
| `--primary-foreground` | Texto sobre el verde | crema `#FAF6EE` |
| `--secondary`, `--muted`, `--accent` | Fondos suaves y hover | `#F1EBDD` |
| `--muted-foreground` | Texto secundario | gris verdoso con contraste AA sobre crema |
| `--border`, `--input` | Bordes | `#E3DACA` |

El texto normal tiene que cumplir un contraste WCAG AA (4,5:1) sobre el fondo crema, y el texto de los botones sobre el verde.

**Tipografía:** Geist se mantiene para el texto. Los **títulos** pasan a **Fraunces** (Google Fonts, licencia OFL),
cargada con `next/font/google` en `layout.tsx` en la variable `--font-fraunces`. En `globals.css`, el `@theme`
pasa de `--font-heading: var(--font-sans)` a `--font-heading: var(--font-fraunces)`, y una regla de `@layer base`
aplica `font-heading` a `h1`, `h2` y `h3`. Así no hay que tocar cada página.

**Logo y favicon:** una flor sencilla de cinco pétalos en SVG, crema sobre un cuadrado verde. Sustituye a la "V" de la cabecera.
Se borra `src/app/favicon.ico` y se crea `src/app/icon.svg` con la misma flor (Next lo sirve como icono de la pestaña).

**Ilustraciones:** 10 SVG propios en `public/productos/<slug>.svg`, de 500×500, dibujados a mano. Sin licencias de terceros.
- Fondo crema y formas planas sin degradados, como las imágenes de ahora.
- **Los ramos** van envueltos en papel kraft con un lazo; **los centros**, en una base baja de barro o cerámica.
- Cada flor tiene su forma reconocible (girasol con el centro oscuro, tulipán en copa, lirio en estrella, hortensia en bola de
  florecillas, lavanda en espigas…) y su color real. Tallos y hojas en el verde de la tienda.
- Se borran las 12 SVG de Volta y los SVG de ejemplo de Next que no se usan (`file`, `globe`, `next`, `vercel`, `window`),
  después de comprobar con grep que nada los usa.

## 3. Textos y nombre

**`src/lib/tienda.ts`** es el único sitio con el nombre de la tienda:
```ts
export const TIENDA = {
  nombre: "El Rincón de las Flores",
  descripcion: "Ramos y centros de mesa hechos a mano en el barrio",
};
```
- **`layout.tsx`:** `metadata.title = { default: TIENDA.nombre, template: "%s · " + TIENDA.nombre }` y la descripción.
  Las páginas pasan a dar solo su parte (`"Carrito"`, `"Pago cancelado"`, el nombre del producto…).
- **Cabecera, entrada del admin y email** (remitente `"<nombre> <onboarding@resend.dev>"`, asunto y título) leen `TIENDA`.
- **Catálogo:** la descripción aparece bajo el título. El placeholder del buscador pasa a "rosas, girasoles, centro...".

**Tildes:** todo lo que ve el cliente o el admin (páginas, botones, mensajes, toasts, títulos, email) se escribe con
tildes y eñes correctas ("Catálogo", "Ningún producto coincide", "Añadir al carrito"…). Los comentarios del
código y los identificadores siguen como están.

**Identificadores internos que cambian:**

| Dónde | Antes | Después | Por qué |
|---|---|---|---|
| `src/store/carrito.ts` (clave en localStorage) | `carrito-volta` | `carrito-rincon` | Los ids vuelven a empezar en 1: un carrito viejo mostraría un producto de Volta y Stripe cobraría la flor con ese id |
| `src/lib/admin.ts` (cookie y sal de la huella) | `admin_volta`, `tienda-volta:` | `admin_rincon`, `rincon-flores:` | Que no quede nada de Volta; obliga a volver a entrar en el admin una vez |
| `src/lib/stripe.ts` (`appInfo.name`) | `tienda-volta` | `rincon-flores` | Solo sale en los registros de Stripe |

**Criterio de terminado:** `grep -ri volta src prisma public` no devuelve nada (salvo `src/generated`, que se
regenera). Se permite "Volta" solo en `PROMPTS.md` y en el historial de git.

## 4. Documentación

- **README:** reescrito como portfolio de El Rincón de las Flores, con qué hace, stack, decisiones, cómo ejecutarlo en local,
  cómo desplegarlo y la URL de la demo cuando exista. Se quita la demo del curso (`tienda-online-ecru.vercel.app`).
- **Diagrama:** `docs/arquitectura.png` se sustituye por `docs/arquitectura.svg`, dibujado a mano con la misma estructura
  (navegador, piezas del proyecto Next, Neon, Stripe, Resend, Vercel + GitHub Actions) y los textos de la floristería.
- **`docs/ESPECIFICACION.md`:** tienda, categorías y catálogo de la floristería; mismas páginas y mismas reglas.
- **`CLAUDE.md`:** el nombre del proyecto.
- **`docs/NOTAS-DEL-PROYECTO.md`:** una sección "Marca de la tienda" con dónde están el nombre, los colores, las fuentes,
  el logo y las ilustraciones, y por qué cambiaron las claves del carrito y del admin.

## 5. Cuentas, git y despliegue

El alumno tiene GitHub y crea él mismo el resto de cuentas, porque son registros con su email.
El plan de implementación incluye una guía con este orden:

| Paso | Servicio | Qué hacer | Variables del `.env` |
|---|---|---|---|
| 1 | Neon | Crear un proyecto con una base `tienda` en la región UE | `DATABASE_URL` (con pooler), `DIRECT_URL` (sin `-pooler`) |
| 2 | Stripe | Cuenta en modo test; en *Settings › Public details*, el nombre "El Rincón de las Flores" | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| 3 | Stripe CLI | `stripe login` y `stripe listen --events checkout.session.completed,checkout.session.expired ...` | `STRIPE_WEBHOOK_SECRET` (el de local) |
| 4 | Resend | Cuenta y clave API | `RESEND_API_KEY`, `EMAIL_PRUEBAS` (su email) |
| 5 | — | Inventar una contraseña larga para el admin | `ADMIN_PASSWORD` |

Con el `.env` completo: `npx prisma migrate deploy` y `npm run seed` contra Neon. La base empieza vacía,
así que no hay pedidos que conservar.

**Git y GitHub** (`gh` no está instalado: el repositorio se crea desde la web):
1. `git init` en esta carpeta y un primer commit con el proyecto tal como está hoy (que incluye el orden del
   catálogo, el webhook de caducidad y las notas). Antes de cada commit se comprueba que `.env` y `node_modules`
   no van dentro.
2. La floristería se hace en una rama `floristeria`, con commits pequeños en español por apartado
   (catálogo, aspecto visual, textos, documentación), y se integra en `main` al terminar.
3. El alumno crea en GitHub un repositorio **vacío** (nombre y visibilidad a su elección). Se añade como `origin` y se sube `main`.

**Vercel:**
1. Importar el repositorio de GitHub (Next.js se detecta solo).
2. Configurar las variables de producción: las mismas del `.env` salvo `STRIPE_WEBHOOK_SECRET`. `EMAIL_PRUEBAS` también
   va en producción: sin dominio propio, Resend solo entrega al email de la cuenta, así que el email de la demo
   llega ahí y no al email que se escriba en Stripe.
3. En el Workbench de Stripe, crear el destino del webhook con `https://<su-dominio>.vercel.app/api/webhooks/stripe` y los
   eventos `checkout.session.completed` y `checkout.session.expired`. Copiar su secreto como `STRIPE_WEBHOOK_SECRET`
   en Vercel y redesplegar.
4. Poner la URL de producción en el README.

## 6. Verificación

| Momento | Qué se comprueba |
|---|---|
| En cada apartado | `npx tsc --noEmit`, `npm run lint`, `npm test` |
| Antes de integrar en `main` | `npm run build` con las variables ficticias del CI |
| En local, con `.env` | Catálogo con filtros y orden (lirios primero con `precio-desc`), ficha de producto, centro agotado, carrito que persiste, compra con 4242 que llega a PAGADO y envía el email, panel de admin y tildes en todas las pantallas |
| Revisión visual | Las 10 ilustraciones, el logo y el favicon a tamaño real, el contraste de los colores y la vista en móvil (375 px) |
| En producción | La demo final: compra con 4242 que llega a PAGADO por el webhook de Vercel, email recibido y pedido #1 en el admin |

Los tests actuales (`tests/reglas.test.ts`, `tests/orden.test.ts`) no dependen del catálogo y no cambian.
