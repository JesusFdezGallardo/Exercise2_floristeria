# Diseño · Cuentas con Google (parte A)

Fecha: 2026-10-11 · Estado: pendiente de revisión

## Objetivo

Añadir cuentas de cliente con el login de Google. Entrar es **opcional** para navegar y llenar el carrito, pero
**obligatorio para pagar**. Con sesión, el cliente ve su historial de pedidos y tiene su propio carrito. El acceso al
panel de admin deja de ser una contraseña compartida y pasa a depender de la cuenta de Google y de su rol.

Esta es la **parte A**. La **parte B** (crear y editar productos, precios y stock desde el admin) tendrá su propia
spec y su propio plan después de esta.

**Hay éxito cuando:**
- Un cliente sin sesión navega y añade al carrito. Al ir a pagar se le pide entrar con Google, vuelve a `/carrito` con
  su carrito sumado y paga en Stripe con el email de su cuenta.
- En "Mis pedidos" ve sus pedidos y su detalle, y no puede ver los de otro (404).
- Una cuenta cuyo email está en `ADMIN_EMAILS` entra en `/admin` y cambia estados. Otra cuenta no puede entrar en las
  páginas ni ejecutar las Server Actions del admin.
- Funciona en local y en producción (Vercel), con el CI en verde.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Librería | **Auth.js (`next-auth` v5)** con proveedor Google, sesión en **JWT**, **sin** adaptador de Prisma |
| Quién es admin | Rol en la BD (`Usuario.rol`), que es lo que manda. `ADMIN_EMAILS` es una **semilla**: al entrar, ese email pasa a ADMIN |
| Carrito | Sigue en `localStorage` (Zustand), pero **uno por usuario**. Al entrar, el anónimo se **suma** al del usuario |
| Email del pedido | El de la cuenta de Google, fijo en Stripe (`customer_email`) |
| Pedidos antiguos | `Pedido.usuarioId` opcional: los que ya existen se quedan sin dueño |
| Admin con contraseña | Desaparece (`ADMIN_PASSWORD`, cookie `admin_rincon`, `/admin/entrar`, `src/lib/admin.ts`) |

## Qué no cambia

- Solo el webhook marca un pedido como PAGADO, y sigue siendo idempotente con los dos mismos eventos de Stripe.
- El checkout relee precio y stock de la BD y nunca se fía del carrito.
- Las transiciones de estado del admin (`TRANSICIONES_ADMIN`) y el resto del panel.
- Las reglas de `docs/ESPECIFICACION.md`: céntimos, secretos solo en el servidor, PAGADO solo en el webhook.

## 1. Datos

Una migración, compatible con el código anterior (solo añade una tabla, un enum y una columna opcional):

```prisma
enum Rol {
  CLIENTE
  ADMIN
}

model Usuario {
  id       Int      @id @default(autoincrement())
  email    String   @unique // el de Google, en minúsculas
  nombre   String?
  imagen   String? // foto de Google, para el avatar de la cabecera
  rol      Rol      @default(CLIENTE)
  creadoEn DateTime @default(now())
  pedidos  Pedido[]
}

model Pedido {
  // ...campos actuales...
  usuario   Usuario? @relation(fields: [usuarioId], references: [id])
  usuarioId Int? // opcional: los pedidos anteriores a las cuentas no tienen dueño

  @@index([usuarioId])
}
```

`npm run seed` borra también los usuarios de la base de desarrollo, igual que hace con los pedidos. Al volver a entrar
con Google, el usuario se crea otra vez.

## 2. Autenticación

**`src/auth.ts`** es la única configuración de Auth.js y exporta `auth`, `signIn`, `signOut` y `handlers`.
- Proveedor: Google. Solo se aceptan cuentas con `email_verified`.
- Sesión: estrategia `jwt`, en una cookie cifrada con `AUTH_SECRET`.
- Callback `signIn`: hace `upsert` de `Usuario` por email (en minúsculas) y actualiza `nombre` e `imagen`. Si
  `esEmailAdmin(email, process.env.ADMIN_EMAILS)` da verdadero, pone `rol = ADMIN`. Si no, **no toca** el rol.
- Callback `jwt`: guarda en el token solo el `usuarioId`. Callback `session`: lo expone como `session.user.id`.
  **El rol nunca va en la cookie**: se lee de la BD cada vez que hace falta, así que quitárselo a alguien en la BD
  tiene efecto inmediato.
- Páginas propias: `pages.signIn = "/entrar"`, y los errores también van a `/entrar`.

**`src/app/api/auth/[...nextauth]/route.ts`** reexporta `handlers`. Es la segunda API route permitida, junto al
webhook, porque Google tiene que volver a una URL.

**`src/lib/sesion.ts`** (solo servidor):
- `usuarioActual(): Promise<Usuario | null>` lee la sesión y devuelve el `Usuario` de la BD.
- `exigirAdmin(): Promise<Usuario | null>` devuelve el usuario si su rol en la BD es ADMIN y, si no, `null`.
  Cada Server Action de admin lo llama primero; si da `null`, devuelve `{ error: "No autorizado" }`.

**`src/lib/cuentas.ts`** (funciones puras, con test):
- `esEmailAdmin(email, lista)`: la lista va separada por comas, no distingue mayúsculas y quita espacios. Si la lista
  está vacía o no existe, no hace admin a nadie.
- `puedeVerPedido(usuario, pedido)`: verdadero si el pedido es suyo o si el usuario es ADMIN.

**Middleware:** comprueba solo que **hay sesión** en `/admin/:path*` y `/cuenta/:path*`. Si no la hay, redirige a
`/entrar?callbackUrl=<ruta>`. No mira el rol, porque no consulta la BD: eso lo hacen la página y la acción.
El middleware no puede importar Prisma, así que la configuración se parte en dos, como recomienda Auth.js:
`src/auth.config.ts` (proveedor, páginas y callbacks sin BD, que es lo que usa el middleware) y `src/auth.ts` (la
amplía con los callbacks que usan Prisma).

**Variables nuevas:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` y `ADMIN_EMAILS`. Van en `.env`,
`.env.example` (sin valores), Vercel y CI (con valores ficticios). Se quita `ADMIN_PASSWORD`. En Google Cloud
Console, en el cliente OAuth de tipo "Aplicación web", hay que dar de alta como URIs de redirección
`http://localhost:3000/api/auth/callback/google` y `https://exercise2-floristeria.vercel.app/api/auth/callback/google`.

## 3. Carrito por usuario

En `src/store/carrito.ts`:
- La clave de `persist` depende de la identidad: `carrito-rincon` sin sesión y `carrito-rincon:<usuarioId>` con
  sesión. Se crea con `skipHydration` y se rehidrata cuando se conoce la identidad.
- El componente cliente **`SincronizarCarrito`**, montado en el layout, recibe `usuarioId | null` del servidor.
  Cuando cambia:
  - **De anónimo a usuario:** lee las dos listas guardadas, las junta con `juntarCarritos(anonimo, usuario)`, guarda
    el resultado en la clave del usuario, **vacía la anónima** y carga el store con él.
  - **De usuario a anónimo** (al salir): cambia a la clave anónima y la carga (estará vacía). El carrito del usuario
    se queda guardado en ese navegador.
- **`juntarCarritos`** es una función pura, con test. Para cada producto suma las cantidades sin pasar del stock
  guardado (el mayor de los dos que haya), conserva el orden (primero las líneas del usuario y después las nuevas) y
  devuelve una lista vacía si las dos lo están.
- Los componentes que usan `useCarrito()` no cambian.

## 4. Checkout y webhook

**`crearCheckout`** (`src/app/checkout/actions.ts`):
- Lo primero que hace es llamar a `usuarioActual()`. Sin usuario devuelve `{ necesitaLogin: true }`; la acción se
  puede llamar desde fuera, así que no basta con que el botón lo impida.
- El pedido nace con `usuarioId` y `email` del usuario (desaparece `"pendiente@checkout"`).
- La sesión de Stripe lleva `customer_email: usuario.email`.

**`BotonPagar`** recibe `conSesion` desde la página del carrito. Sin sesión, muestra **"Entrar con Google para
pagar"** y lanza `signIn("google", { callbackUrl: "/carrito" })`. No va directo a Stripe: así el cliente ve el carrito
ya sumado antes de pagar. Si la acción devuelve `necesitaLogin` (por ejemplo, porque la sesión caducó), hace lo mismo.

**Webhook:** el evento `completed` ya **no sobrescribe** `email` y envía la confirmación a `pedido.email`. Todo lo
demás sigue igual.

## 5. Páginas

| Ruta | Qué hace | Quién |
|---|---|---|
| `/entrar` | Botón "Entrar con Google" y mensajes de error de Auth.js en español | Cualquiera |
| `/cuenta/pedidos` | Pedidos del usuario: número, fecha, estado (`BadgeEstado`) y total, del más reciente al más antiguo | Con sesión |
| `/cuenta/pedidos/[id]` | Detalle con sus líneas. Si `puedeVerPedido` es falso, `notFound()` (404, no 403) | Con sesión |
| `/admin`, `/admin/pedidos/[id]` | Igual que ahora. Si el usuario no es ADMIN, se muestra "No tienes acceso" con enlace al catálogo | ADMIN |

- **Cabecera:** sin sesión, botón "Entrar". Con sesión, avatar y nombre con un menú: "Mis pedidos", "Panel de admin"
  (solo si es ADMIN) y "Salir". La cabecera sigue siendo Server Component; el menú es un componente cliente pequeño.
- **"Salir"** usa `signOut` con vuelta al catálogo y sustituye a `salir()` del admin.
- Se borra `src/app/admin/entrar/`.

## 6. Errores

| Caso | Comportamiento |
|---|---|
| El usuario cancela en Google o la cuenta no tiene email verificado | Vuelve a `/entrar` con un mensaje ("Has cancelado el acceso", "No se pudo entrar con esa cuenta") |
| Sin sesión en `/cuenta` o `/admin` | El middleware redirige a `/entrar?callbackUrl=...` |
| Con sesión pero sin ser ADMIN en `/admin` | Página "No tienes acceso" |
| Acción de admin sin ser ADMIN | `{ error: "No autorizado" }` |
| Pedido de otro en `/cuenta/pedidos/[id]` | 404 |
| La sesión caduca justo al pagar | `crearCheckout` devuelve `necesitaLogin` y el botón lanza el login |
| Faltan las variables `AUTH_*` | Auth.js falla al arrancar con su error de configuración |

## 7. Pruebas

- **Vitest** (`tests/cuentas.test.ts` y `tests/carrito.test.ts`): `esEmailAdmin`, `puedeVerPedido` y `juntarCarritos`.
- Los tests de marca, tema e imágenes siguen pasando: los textos nuevos usan `TIENDA` y no repiten el nombre.
- **A mano en local**, con `stripe listen`: entrar, sumar carritos, pagar con 4242, ver el pedido PAGADO en "Mis
  pedidos", entrar al admin con un email de `ADMIN_EMAILS` y comprobar que otra cuenta ve "No tienes acceso".
- **A mano en producción**, después de `npm run migrar:produccion`, configurar las variables en Vercel y hacer push:
  el mismo recorrido.
- Antes de darlo por hecho: `npx tsc --noEmit && npm run lint && npm test` y `npm run build`.

## 8. Documentación

- `CLAUDE.md`: se cambia la viñeta del admin (Google + rol en la BD + `exigirAdmin` en cada acción). Viñetas nuevas:
  "quitar un email de `ADMIN_EMAILS` no quita el rol: hay que cambiarlo en la BD", "el pedido nace con el usuario y
  el checkout exige sesión" y "las URIs de redirección de Google van fuera del código".
- `docs/NOTAS-DEL-PROYECTO.md`: sección "Cuentas" nueva, "Admin" y "Carrito" reescritas (con un párrafo sobre qué es
  Zustand y por qué se usa).
- `docs/ESPECIFICACION.md`: las cuentas salen de "Fuera de alcance" y las páginas nuevas entran en la tabla.
  Modelo de datos con `Usuario`.
- `README.md` y `.env.example`: variables nuevas y pasos para crear el cliente OAuth en Google Cloud.

## Fuera de alcance (parte A)

- Editar productos, precios y stock desde el admin, y gestionar roles desde la web: **parte B**.
- Otros proveedores de login (email y contraseña, GitHub...).
- Guardar el carrito en la BD o sincronizarlo entre dispositivos.
- Asignar a usuarios los pedidos antiguos que no tienen dueño.
- Borrar la cuenta o exportar los datos del usuario.
