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
- La cookie de sesión se llama `sesion_rincon` (`COOKIE_SESION` en `src/lib/cuentas.ts`). Cambiarla cierra la sesión
  de todo el mundo. (La antigua cookie del admin, `admin_rincon`, desapareció con las cuentas.)

**La búsqueda no distingue tildes ni mayúsculas.** "peonias", "PEONÍAS" y "peonías" encuentran "Ramo de peonías rosas".
Ver la sección *Búsqueda sin tildes* en Catálogo.

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
- Desde el admin (`/admin/productos/<id>`) el stock cambia de dos formas, cada una con su Server Action en
  `src/app/admin/productos/actions.ts`:
  - **Reponer** suma N con `increment`: es atómico en la BD y no pisa una venta que el webhook descuente a la vez.
  - **Corregir** fija N con `updateMany({ where: { id, stock: stockLeido } })`, donde `stockLeido` es el stock que
    tenía la página al pintarse (va en un campo oculto). Si entretanto cambió, no se guarda nada y se avisa con el
    valor nuevo. No hace falta una columna de versión: el propio stock hace de testigo.
- Cuando cualquiera de las dos deja un producto que estaba en 0 (o en negativo) con stock, llama a `alReponer`
  (`src/lib/reposicion.ts`). Es el gancho de los avisos de reposición; hoy solo escribe una línea en el log.

### Precios
Siempre en **céntimos** (`Int`): en la base de datos, en el carrito y en Stripe (`unit_amount`). Solo se convierten a
euros al pintarlos (`src/lib/formato.ts`) y al leer los filtros de precio del catálogo, donde el usuario escribe euros
y `catalogo.ts` multiplica por 100. Los datos del seed también están en céntimos, y `tests/catalogo-datos.test.ts`
comprueba que ninguno se ha escrito en euros.

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
  escribe el cliente. La plantilla importa con rutas relativas, no con `@/`, porque Vitest no conoce el alias.
- **Pedidos de antes de los envíos:** no tienen entrega (`entregaDelPedido` devuelve `null`) y su `gastosEnvio` vale
  0. Se pintan como antes.
- **La página de éxito no muestra la dirección:** la abre cualquiera que tenga el `session_id`.

---

## Catálogo

### Todo vive en la URL
Búsqueda, categoría, precio y orden son parámetros de la URL (`/?q=rosas&categoria=amor&orden=precio-desc`).
No hay estado en el navegador: `Filtros` es un Server Component, los chips son enlaces y la búsqueda es un `<Form>` GET.
Consecuencia: **si añades un parámetro nuevo**, hay que conservarlo en tres sitios de `src/components/filtros.tsx`:
la función `urlCon`, un `<input type="hidden">` dentro del formulario y su lectura en `leerFiltros` (`catalogo.ts`).

Para ver el SQL que genera Prisma con una búsqueda de ejemplo (rosas, de Amor, entre 40 y 60 €, sobre `nombreBusqueda`):
`npx tsx scripts/ver-sql-catalogo.ts`.

### Búsqueda sin tildes
- PostgreSQL, con `ILIKE`, trata "i" e "í" como letras distintas. Por eso cada producto guarda su nombre ya
  normalizado (minúsculas, sin tildes, diéresis ni virgulillas) en la columna **`nombreBusqueda`**, y el catálogo
  busca ahí con lo que escribe el cliente normalizado igual (`normalizar()` en `src/lib/busqueda.ts`).
- **Hay que mantenerla sincronizada:** la rellenan el seed y `guardarProducto` (el admin de productos, al renombrar).
  Si algún día se crean productos desde otro sitio, ese código tiene que guardar también
  `nombreBusqueda: normalizar(nombre)`, o el producto no saldrá en las búsquedas.
- La migración `20261011120000_busqueda_sin_tildes` rellenó las filas que ya existían con `translate()` en SQL, sin
  volver a sembrar (así se conservaron los pedidos). `tests/busqueda.test.ts` comprueba que esa tabla de letras da
  lo mismo que `normalizar()`.
- **Prisma no escapa los comodines de `LIKE`** en `contains`: sin `escaparLike()`, buscar `_` o `%` devolvía todo el
  catálogo. Se escapan `%`, `_` y la barra invertida (el carácter de escape por defecto en PostgreSQL).
- Solo se busca en el nombre, no en la descripción. Para buscar también ahí, haría falta otra columna normalizada.

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
- **Qué es Zustand:** una librería pequeña de estado compartido en el navegador. `src/store/carrito.ts` define el store
  (las `lineas` y las acciones `anadir`, `cambiarCantidad`, `quitar`, `vaciar`) y cualquier componente lo usa con
  `useCarrito()`, sin Provider ni Context: el icono de la cabecera, la ficha y `/carrito` se repintan solos. Se eligió
  por eso: menos código que un Context y un selector (`useCarrito((s) => ...)`) que evita repintados de más.
- **`persist`** copia el estado en `localStorage`. Hay **un carrito por identidad**: `carrito-rincon` sin sesión y
  `carrito-rincon:<usuarioId>` con sesión. No hay carrito en la base de datos ni se sincroniza entre dispositivos.
- El store se crea con `skipHydration`: no se carga solo. Lo carga `SincronizarCarrito` (en el layout), que recibe el
  `usuarioId` del servidor. **Al entrar o registrarse**, suma el carrito anónimo al del usuario (`juntarCarritos`:
  mismo producto = una línea, sin pasar del stock) y borra el anónimo. **Al salir**, carga el anónimo (vacío); el del
  usuario queda guardado en ese navegador.
- Guarda una **copia** del precio y del stock del momento en que se añadió. Por eso el checkout **no se fía** de esos
  datos: vuelve a leer precio y stock de la base de datos. Si cambias precios, el carrito puede mostrar el viejo hasta
  que se pague; Stripe cobrará el nuevo.
- Si cambias la forma de `LineaCarrito`, los carritos guardados con la forma antigua siguen en el navegador de la gente.
  Para invalidarlos, cambia `CLAVE_CARRITO` (o usa `version` + `migrate` de Zustand).

---

## Cuentas
- Email y contraseña, gestionados por la tienda (sin servicios externos ni dependencias). El email hace de nombre de
  usuario. Registro en `/registro` (siempre CLIENTE), entrada en `/entrar`; las acciones están en `src/app/entrar/actions.ts`.
- **Contraseñas:** scrypt de `node:crypto` con una sal aleatoria por usuario; se guarda `sal:hash` en hexadecimal y se
  compara con `timingSafeEqual` (`src/lib/contrasenas.ts`). Entre 8 y 200 caracteres (el máximo evita scrypt con textos
  enormes).
- **Sesión:** al entrar se genera un token aleatorio de 32 bytes. Va en la cookie `httpOnly` `sesion_rincon` (30 días) y
  en la tabla `Sesion` se guarda **su SHA-256**, no el token: quien lea la BD no puede fabricar cookies. "Salir" borra
  la fila, así que la cookie deja de valer aunque alguien la hubiera copiado.
- `usuarioActual()` va envuelto en `cache()` de React: layout, cabecera y página lo piden en la misma petición y la BD
  se consulta una vez. Devuelve el usuario **sin** el hash de la contraseña (`omit`).
- "Email o contraseña incorrectos" sale igual si el email no existe o si la contraseña está mal, y en los dos casos se
  calcula un scrypt: así no se puede averiguar quién tiene cuenta.
- `destinoSeguro` solo deja volver (`callbackUrl`) a rutas de la tienda.
- Pagar exige sesión. Sin ella, el botón del carrito lleva a `/entrar?callbackUrl=/carrito`, para que el cliente vea
  el carrito ya sumado antes de pagar.
- "Mis pedidos" (`/cuenta/pedidos`) muestra los pedidos con `usuarioId` del usuario. Un pedido ajeno da **404**. Los
  pedidos de antes de las cuentas no tienen dueño y solo los ve el admin.
- **Tras una migración, reinicia `npm run dev`:** `src/lib/prisma.ts` guarda el cliente en `globalThis` y el servidor
  que ya estaba abierto no conoce las tablas nuevas (`Cannot read properties of undefined (reading 'findUnique')`).
- **Pendiente (fuera de alcance):** limitar los intentos de login, recuperar o cambiar la contraseña desde la web y
  verificar el email.

---

## Admin
- Es admin quien tiene `Usuario.rol = ADMIN` en la BD. Solo se pone con `npm run crear-admin -- <email>`
  (`--produccion` usa `.env.produccion`): crea la cuenta o asciende una existente, le pone la contraseña que se
  escribe en la terminal y cierra sus sesiones abiertas. Para quitar el rol, Prisma Studio.
- El middleware (`src/middleware.ts`) solo exige que exista la cookie en `/admin`. La sesión y el rol los comprueban
  las páginas (sin rol: `SinAcceso`) y **cada Server Action** de `src/app/admin/actions.ts` con `exigirAdmin()`. Si
  añades una acción de admin, tiene que hacer lo mismo.
- **Toda la fila de la lista abre el pedido** (`src/app/admin/page.tsx`): el enlace del número lleva un `::after`
  absoluto que se estira sobre la fila (`relative`), sin JavaScript en el navegador. Si añades un botón o un enlace
  dentro de una fila, el `::after` lo taparía: dale `relative z-10` para que quede por encima.
- **Productos** (`/admin/productos`): lista con los agotados arriba y ficha con tres formularios (datos, reponer y
  corregir stock). No se crean ni se borran productos desde la web: uno nuevo entra por `prisma/catalogo-datos.ts`
  con su SVG. "Borrar" es **ocultar** (`Producto.visible = false`), porque los pedidos antiguos apuntan al producto.
- Un producto oculto se filtra en tres sitios: `whereDe` (`src/lib/catalogo-where.ts`, catálogo y búsqueda), la ficha
  pública (`findFirst` con `visible: true`, da 404) y `crearCheckout` (no se puede pagar aunque siga en un carrito: `lineasDelCarrito` de `src/lib/pago.ts` devuelve
  "<nombre> ya no está disponible: quítalo del carrito", para que el cliente sepa qué línea quitar).
  El webhook no filtra: lo que se pagó antes de ocultarlo se cobra y descuenta stock igual. Un sitio nuevo que liste
  productos para la tienda tiene que filtrar también.
- El slug y la imagen no se editan: renombrar un producto no cambia su URL ni su ilustración.

---

## Base de datos y entorno
- **Dos URLs de Neon:** `DATABASE_URL` (con pooler, la usa la app) y `DIRECT_URL` (sin pooler, la usan las migraciones,
  ver `prisma.config.ts`). Si las migraciones se cuelgan o fallan raro, revisa que `DIRECT_URL` no lleve `-pooler`.
- **Dos bases: desarrollo y producción** (ramas `desarrollo` y `main` del proyecto de Neon).
  - `.env` → rama `desarrollo`. Es la que usan `npm run dev`, `npm run seed`, los scripts y `prisma migrate dev`.
  - `.env.produccion` → rama `main`, solo con `DATABASE_URL` y `DIRECT_URL`. Lo ignora git (`.env*`); vive solo en tu
    máquina. Lo usa únicamente `npm run migrar:produccion`.
  - Vercel tiene sus propias variables, que apuntan a `main`.
  - `npm run db:check` dice "desarrollo" o "PRODUCCION" comparando el servidor del `.env` con el de `.env.produccion`.
- **Flujo de una migración:** cambiar `schema.prisma` → `npx prisma migrate dev --name <nombre>` (en desarrollo) →
  probar → `npm run migrar:produccion` → push. Vercel **no** aplica migraciones al desplegar, así que el orden
  importa: la migración va primero y tiene que funcionar también con el código que aún está publicado (añadir una
  columna con valor o rellenarla en el mismo SQL, como en `20261011120000_busqueda_sin_tildes`; nunca borrar una
  columna que el código publicado todavía lee).
- **Volver a copiar producción en desarrollo:** en Neon, rama `desarrollo` › *Reset from parent*. Se pierde lo que
  hubiera en desarrollo; producción no se toca. Después, `npm run seed` si la quieres sin pedidos.
- La rama `desarrollo` tiene su propio servidor (se suspende solo si no se usa). La primera consulta tras un rato
  sin usarla tarda un par de segundos más.
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

- **Desarrollo y producción en ramas distintas de Neon.** Al principio compartían base (un pedido en `localhost`
  salía en el admin de producción y `npm run seed` vaciaba la tienda publicada). Ahora el proyecto de Neon tiene dos
  ramas: `main` (producción, la usa Vercel) y `desarrollo` (copia de `main`, la usa el `.env` local).
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
