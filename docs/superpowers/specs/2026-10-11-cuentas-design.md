# Diseño · Cuentas con usuario y contraseña (parte A)

Fecha: 2026-10-11 · Estado: pendiente de revisión

> Primera versión: login con Google (Auth.js). Se cambió a usuario y contraseña dentro de la propia aplicación
> porque Google exige configurar un cliente OAuth fuera de la aplicación (Google Cloud Console).

## Objetivo

Añadir cuentas de cliente con **email y contraseña**, gestionadas por la propia tienda. Entrar es **opcional** para
navegar y llenar el carrito, pero **obligatorio para pagar**. Con sesión, el cliente ve su historial de pedidos y tiene
su propio carrito. El acceso al panel de admin deja de ser una contraseña compartida y pasa a depender del **rol** de la
cuenta.

Esta es la **parte A**. La **parte B** (crear y editar productos, precios y stock desde el admin) tendrá su propia
spec y su propio plan después de esta.

**Hay éxito cuando:**
- Un cliente sin sesión navega y añade al carrito. Al ir a pagar se le pide entrar o crear una cuenta, vuelve a
  `/carrito` con su carrito sumado y paga en Stripe con el email de su cuenta.
- En "Mis pedidos" ve sus pedidos y su detalle, y no puede ver los de otro (404).
- Una cuenta creada con `npm run crear-admin` entra en `/admin` y cambia estados. Una cuenta de cliente no puede entrar
  en las páginas ni ejecutar las Server Actions del admin.
- Ninguna contraseña se guarda en claro; la cookie de sesión no sirve de nada a quien lea la BD.
- Funciona en local y en producción (Vercel), con el CI en verde.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Identificación | **Email + contraseña**; el email hace de nombre de usuario (hace falta para los emails del pedido) |
| Contraseñas | Hash **scrypt** de `node:crypto`, sal aleatoria por usuario, comparación con `timingSafeEqual`. Sin dependencias |
| Sesión | **Propia**: tabla `Sesion` + cookie `httpOnly` `sesion_rincon` con un token aleatorio; en la BD se guarda el SHA-256 del token |
| Registro | Abierto en `/registro`; toda cuenta nueva es CLIENTE |
| Quién es admin | `Usuario.rol` en la BD. Se crea o asciende **solo** con `npm run crear-admin` (nunca desde la web) |
| Carrito | Sigue en `localStorage` (Zustand), pero **uno por usuario**. Al entrar, el anónimo se **suma** al del usuario |
| Email del pedido | El de la cuenta, fijo en Stripe (`customer_email`) |
| Pedidos antiguos | `Pedido.usuarioId` opcional: los que ya existen se quedan sin dueño |
| Admin con contraseña compartida | Desaparece (`ADMIN_PASSWORD`, cookie `admin_rincon`, `huella()`, `/admin/entrar`, `src/lib/admin.ts`) |

## Qué no cambia

- Solo el webhook marca un pedido como PAGADO, y sigue siendo idempotente con los dos mismos eventos de Stripe.
- El checkout relee precio y stock de la BD y nunca se fía del carrito.
- Las transiciones de estado del admin (`TRANSICIONES_ADMIN`) y el resto del panel.
- Las reglas de `docs/ESPECIFICACION.md`: céntimos, secretos solo en el servidor, PAGADO solo en el webhook.
- No hay variables de entorno nuevas; se quita `ADMIN_PASSWORD`.

## 1. Datos

Una migración, compatible con el código anterior (solo añade dos tablas, un enum y una columna opcional):

```prisma
enum Rol {
  CLIENTE
  ADMIN
}

model Usuario {
  id         Int      @id @default(autoincrement())
  email      String   @unique // en minúsculas; hace de nombre de usuario
  nombre     String
  contrasena String // hash scrypt "sal:hash" en hexadecimal, nunca la contraseña en claro
  rol        Rol      @default(CLIENTE)
  creadoEn   DateTime @default(now())
  pedidos    Pedido[]
  sesiones   Sesion[]
}

model Sesion {
  id        String   @id // SHA-256 del token de la cookie: con la BD filtrada, las cookies no se pueden fabricar
  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  usuarioId Int
  caduca    DateTime

  @@index([usuarioId])
}

model Pedido {
  // ...campos actuales...
  usuario   Usuario? @relation(fields: [usuarioId], references: [id])
  usuarioId Int? // opcional: los pedidos anteriores a las cuentas no tienen dueño

  @@index([usuarioId])
}
```

`npm run seed` borra también los usuarios y las sesiones de la base de desarrollo, igual que hace con los pedidos.
Después del seed hay que volver a crear el admin (`npm run crear-admin`) y las cuentas de prueba.

## 2. Autenticación

**`src/lib/contrasenas.ts`** (sin BD, con test):
- `cifrarContrasena(texto): Promise<string>` genera una sal de 16 bytes, calcula `scrypt(texto, sal, 64)` y devuelve
  `"<sal hex>:<hash hex>"`.
- `comprobarContrasena(texto, guardada): Promise<boolean>` separa sal y hash, recalcula y compara con
  `timingSafeEqual`. Si `guardada` está mal formada devuelve `false`, nunca lanza.

**`src/lib/cuentas.ts`** (funciones puras, con test):
- `validarRegistro({ nombre, email, contrasena, repetir })` → `{ ok: true, datos: { nombre, email } }` con el nombre
  recortado y el email en minúsculas, o `{ ok: false, error }` con el primer error en español: nombre vacío, email sin
  formato válido, contraseña de menos de 8 caracteres o que no coincide al repetirla.
- `puedeVerPedido(usuario, pedido)`: verdadero si el pedido es suyo o si el usuario es ADMIN.
- `destinoSeguro(valor)`: solo rutas de la tienda (empiezan por `/`, no por `//` ni `/\`); si no, `/`.
- `huellaToken(token)`: SHA-256 en hexadecimal (la usan `Sesion.id` y la búsqueda de la sesión).

**`src/lib/sesion.ts`** (solo servidor):
- `COOKIE_SESION = "sesion_rincon"`, duración 30 días.
- `iniciarSesion(usuarioId)` genera un token de 32 bytes aleatorios (`randomBytes`), guarda `Sesion` con
  `id = huellaToken(token)` y la caducidad, y pone la cookie (`httpOnly`, `sameSite: "lax"`, `secure` en producción,
  `path: "/"`, `maxAge` de 30 días).
- `usuarioActual(): Promise<Usuario | null>` (cacheado por petición con `cache` de React) lee la cookie, busca la
  `Sesion` por `huellaToken(token)` con su usuario y devuelve `null` si no existe o ha caducado.
- `exigirAdmin(): Promise<Usuario | null>` devuelve el usuario si su rol en la BD es ADMIN y, si no, `null`.
  Cada Server Action de admin lo llama primero; si da `null`, devuelve `{ error: "No autorizado" }`.
- `cerrarSesion()` borra la fila de `Sesion` y la cookie.

**Server Actions** (`src/app/entrar/actions.ts`), con estado para `useActionState`:
- `registrarse(_, FormData)`: `validarRegistro`. Si el email ya existe: "Ya hay una cuenta con ese email: entra".
  Crea el `Usuario` (CLIENTE) con `cifrarContrasena`, llama a `iniciarSesion` y redirige a `destinoSeguro(destino)`.
- `entrar(_, FormData)`: busca por email (en minúsculas) y `comprobarContrasena`. Si falla cualquiera de las dos cosas,
  el mismo mensaje: "Email o contraseña incorrectos". Si va bien, `iniciarSesion` y redirige.
- `salir()`: `cerrarSesion` y redirige a `/`.

**Middleware:** en `/admin/:path*` y `/cuenta/:path*` comprueba solo que **exista la cookie** `sesion_rincon`; si no,
redirige a `/entrar?callbackUrl=<ruta>`. No consulta la BD: la página y la acción comprueban la sesión y el rol.

**`scripts/crear-admin.ts`** (`npm run crear-admin -- <email>`; con `--produccion` usa `.env.produccion`):
- Dice en qué base va a escribir ("desarrollo" o "PRODUCCION") antes de pedir nada.
- Pide la contraseña dos veces por la terminal sin mostrarla. Mínimo 8 caracteres.
- Si el email no existe, crea la cuenta como ADMIN (nombre "Admin"); si existe, le pone `rol = ADMIN` y la contraseña
  nueva.

## 3. Carrito por usuario

En `src/store/carrito.ts`:
- La clave de `persist` depende de la identidad: `carrito-rincon` sin sesión y `carrito-rincon:<usuarioId>` con
  sesión. Se crea con `skipHydration` y se carga cuando se conoce la identidad.
- El componente cliente **`SincronizarCarrito`**, montado en el layout, recibe `usuarioId | null` del servidor:
  - **Con usuario:** si el carrito anónimo tiene algo, lo suma al del usuario con `juntarCarritos`, guarda el resultado
    en la clave del usuario y **vacía la anónima**. Después carga el store con el carrito del usuario.
  - **Sin usuario** (al salir): carga la clave anónima (estará vacía). El carrito del usuario se queda guardado en ese
    navegador.
- **`juntarCarritos(anonimo, usuario)`** es una función pura, con test. Para cada producto suma las cantidades sin pasar
  del stock guardado (el mayor de los dos), conserva el orden (primero las líneas del usuario y después las nuevas),
  descarta líneas sin unidades y no modifica sus entradas.
- Los componentes que usan `useCarrito()` no cambian.

## 4. Checkout y webhook

**`crearCheckout`** (`src/app/checkout/actions.ts`):
- Lo primero que hace es llamar a `usuarioActual()`. Sin usuario devuelve `{ necesitaLogin: true }`; la acción se
  puede llamar desde fuera, así que no basta con que el botón lo impida.
- El pedido nace con `usuarioId` y `email` del usuario (desaparece `"pendiente@checkout"`).
- La sesión de Stripe lleva `customer_email: usuario.email`.

**`BotonPagar`** recibe `conSesion` desde la página del carrito. Sin sesión, es un enlace **"Entrar para pagar"** a
`/entrar?callbackUrl=/carrito`. Si la acción devuelve `necesitaLogin` (la sesión caducó), lleva a esa misma URL.

**Webhook:** el evento `completed` ya **no sobrescribe** `email` y envía la confirmación a `pedido.email`. Excepción:
un pedido sin dueño (anterior a las cuentas) toma el email que da Stripe, como hasta ahora.

## 5. Páginas

| Ruta | Qué hace | Quién |
|---|---|---|
| `/entrar` | Email y contraseña, errores en el propio formulario, enlace a "Crear cuenta" (conserva `callbackUrl`) | Cualquiera |
| `/registro` | Nombre, email, contraseña y repetirla; enlace a "Ya tengo cuenta" (conserva `callbackUrl`) | Cualquiera |
| `/cuenta/pedidos` | Pedidos del usuario: número, fecha, estado (`BadgeEstado`) y total, del más reciente al más antiguo | Con sesión |
| `/cuenta/pedidos/[id]` | Detalle con sus líneas. Si `puedeVerPedido` es falso, `notFound()` (404, no 403) | Con sesión |
| `/admin`, `/admin/pedidos/[id]` | Igual que ahora. Si el usuario no es ADMIN, se muestra "No tienes acceso" con enlace al catálogo | ADMIN |

- Con sesión iniciada, `/entrar` y `/registro` redirigen al destino.
- **Cabecera:** sin sesión, enlace "Entrar". Con sesión, la inicial del nombre en un círculo y el nombre, con un menú:
  "Mis pedidos", "Panel de admin" (solo si es ADMIN) y "Salir". La cabecera sigue siendo Server Component; el menú
  es un componente cliente pequeño.
- Se borra `src/app/admin/entrar/` y el botón "Salir" propio del panel (pasa al menú).

## 6. Errores

| Caso | Comportamiento |
|---|---|
| Email o contraseña incorrectos | "Email o contraseña incorrectos" (el mismo mensaje en los dos casos) |
| Registro con email ya usado | "Ya hay una cuenta con ese email: entra" |
| Registro con datos inválidos | El primer error de `validarRegistro`, en el formulario; los campos de texto conservan lo escrito |
| Sin cookie en `/cuenta` o `/admin` | El middleware redirige a `/entrar?callbackUrl=...` |
| Cookie con sesión borrada o caducada | `usuarioActual()` da `null`: las páginas de `/cuenta` y `/admin` redirigen a `/entrar?callbackUrl=...` |
| Con sesión pero sin ser ADMIN en `/admin` | Página "No tienes acceso" |
| Acción de admin sin ser ADMIN | `{ error: "No autorizado" }` |
| Pedido de otro en `/cuenta/pedidos/[id]` | 404 |
| La sesión caduca justo al pagar | `crearCheckout` devuelve `necesitaLogin` y el botón lleva a `/entrar?callbackUrl=/carrito` |

## 7. Pruebas

- **Vitest:** `tests/contrasenas.test.ts` (la misma contraseña valida; otra no; dos hashes de la misma contraseña son
  distintos; un valor guardado mal formado da `false` sin lanzar), `tests/cuentas.test.ts` (`validarRegistro`,
  `puedeVerPedido`, `destinoSeguro`, `huellaToken`) y `tests/carrito.test.ts` (`claveCarrito`, `juntarCarritos`).
- Los tests de marca, tema e imágenes siguen pasando: los textos nuevos usan `TIENDA` y no repiten el nombre.
- **A mano en local**, con `stripe listen`: registrarse, sumar carritos, pagar con 4242, ver el pedido PAGADO en "Mis
  pedidos", entrar al admin con la cuenta de `crear-admin` y comprobar que una cuenta de cliente ve "No tienes acceso".
- **A mano en producción**, después de `npm run migrar:produccion`, `npm run crear-admin -- <email> --produccion` y el
  push: el mismo recorrido.
- Antes de darlo por hecho: `npx tsc --noEmit && npm run lint && npm test` y `npm run build`.

## 8. Documentación

- `CLAUDE.md`: se cambia la viñeta del admin (sesión propia + rol en la BD + `exigirAdmin` en cada acción). Viñetas
  nuevas: "el admin se crea solo con `npm run crear-admin`", "el pedido nace con el usuario y el checkout exige
  sesión" y "`npm run seed` borra también usuarios y sesiones".
- `docs/NOTAS-DEL-PROYECTO.md`: sección "Cuentas" nueva (contraseñas con scrypt, sesión con token y su huella,
  mensajes que no revelan si existe un email, pendiente: limitar intentos), "Admin" y "Carrito" reescritas (con un
  párrafo sobre qué es Zustand y por qué se usa).
- `docs/ESPECIFICACION.md`: las cuentas salen de "Fuera de alcance" y las páginas nuevas entran en la tabla.
  Modelo de datos con `Usuario` y `Sesion`.
- `README.md` y `.env.example`: se quita `ADMIN_PASSWORD`; se explica `npm run crear-admin`.

## Fuera de alcance (parte A)

- Editar productos, precios y stock desde el admin, y gestionar roles desde la web: **parte B**.
- Recuperar la contraseña, cambiarla desde la web y verificar el email (sin dominio propio, Resend solo envía a la
  dirección de la cuenta).
- Limitar los intentos de login (queda apuntado como mejora pendiente en las notas).
- Login con Google u otros proveedores.
- Guardar el carrito en la BD o sincronizarlo entre dispositivos.
- Asignar a usuarios los pedidos antiguos que no tienen dueño.
- Borrar la cuenta o exportar los datos del usuario.
