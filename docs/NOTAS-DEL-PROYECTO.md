# Notas del proyecto · lo que conviene saber antes de cambiar algo

Las cosas de El Rincón de las Flores que no son evidentes leyendo el código por encima. Cada nota dice **dónde** está,
**por qué** es así y **qué tocar** si lo quieres cambiar. Se va ampliando a medida que se trabaja en el proyecto.

---

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

## Pedidos y pagos

### El ciclo de vida de un pedido
```
crearCheckout()            webhook completed         admin           admin
   PENDIENTE  ───────────────►  PAGADO  ──────────►  ENVIADO  ────►  ENTREGADO
      │
      ├── webhook expired (el checkout caduco) ──► CANCELADO
      └── admin lo cancela a mano             ──► CANCELADO
```
- El pedido se crea **PENDIENTE** al pulsar "Pagar", antes de ir a Stripe (`src/app/checkout/actions.ts`).
  Por eso hay pedidos PENDIENTE de gente que nunca llego a pagar.
- **Solo el webhook** lo pasa a PAGADO (`src/app/api/webhooks/stripe/route.ts`). La pagina `/checkout/exito`
  solo lee el estado, no lo cambia.
- Lo que puede hacer el admin esta en `TRANSICIONES_ADMIN` (`src/lib/estados.ts`). Para permitir otro cambio
  (por ejemplo, cancelar un PAGADO), se toca esa tabla y su test en `tests/reglas.test.ts`.

### Pagos rechazados
Con la tarjeta de prueba `4000 0000 0000 0002`, Stripe muestra el error **en su propia pagina** y deja reintentar.
No llega ningun evento: el pedido sigue PENDIENTE y el stock no se toca. Si el cliente se va, la sesion de pago
**caduca a las 24 h** (lo que Stripe pone por defecto) y entonces llega `checkout.session.expired` y el pedido pasa a CANCELADO.

- Para que caduque antes, se pasa `expires_at` (minimo 30 minutos) a `stripe.checkout.sessions.create` en `actions.ts`.
- Para probarlo sin esperar: `stripe checkout sessions expire <cs_test_...>` con la Stripe CLI.

### El webhook: eventos, idempotencia y eventos ajenos
- Escucha **dos eventos**: `checkout.session.completed` y `checkout.session.expired`. Si anades otro, hay que darlo
  de alta en **dos sitios fuera del codigo**: el comando `stripe listen --events ...` (local) y el destino del
  webhook en el Workbench de Stripe (produccion). Si no, Stripe no lo envia y no veras ningun error.
- **Idempotencia:** los cambios se hacen con `updateMany({ where: { id, estado: "PENDIENTE" } })`. Si Stripe reenvia
  un evento, el pedido ya no esta PENDIENTE y no pasa nada: no se descuenta stock dos veces ni se cancela un pagado.
- El webhook sabe que pedido es gracias a `metadata.pedidoId`, que pone la Server Action al crear la sesion.
  Un evento **sin ese dato** (los de `stripe trigger`, o pagos creados fuera de la tienda) se registra y se ignora
  respondiendo 200. Ojo: `stripe trigger checkout.session.completed` **no** sirve para probar la tienda; hay que
  hacer una compra real en modo test.
- Siempre se responde 200 salvo si la firma falla. Si el email falla, el pedido sigue PAGADO (se registra el error).

### Stock
- El stock **solo se descuenta en el webhook**, al pagar. Al crear el pedido solo se comprueba que haya suficiente.
- No hay reserva: si dos personas compran a la vez la ultima unidad, las dos pueden pagar y el stock quedaria en
  negativo. Esta asumido (la especificacion deja la gestion de stock en tiempo real fuera de alcance).
- Un pedido CANCELADO no repone stock porque nunca se le desconto. Si algun dia se permite cancelar pedidos PAGADOS,
  habra que reponerlo.

### Precios
Siempre en **centimos** (`Int`): en la base de datos, en el carrito y en Stripe (`unit_amount`). Solo se convierten a
euros al pintarlos (`src/lib/formato.ts`) y al leer los filtros de precio del catalogo, donde el usuario escribe euros
y `catalogo.ts` multiplica por 100. Los datos del seed también están en céntimos, y `tests/catalogo-datos.test.ts` comprueba que ninguno se ha escrito en euros.

---

## Catalogo

### Todo vive en la URL
Busqueda, categoria, precio y orden son parametros de la URL (`/?q=reloj&categoria=relojes&orden=precio-desc`).
No hay estado en el navegador: `Filtros` es un Server Component, los chips son enlaces y la busqueda es un `<Form>` GET.
Consecuencia: **si anades un parametro nuevo**, hay que conservarlo en tres sitios de `src/components/filtros.tsx`:
la funcion `urlCon`, un `<input type="hidden">` dentro del formulario y su lectura en `leerFiltros` (`catalogo.ts`).

### Orden (`?orden=`)
- Los ordenes validos estan en la lista `ORDENES` de `src/lib/orden.ts`. **Para anadir uno** (por ejemplo, nombre Z-A)
  basta con una entrada nueva ahi: el enlace aparece solo. Anade tambien su caso en `tests/orden.test.ts`.
- Un valor desconocido en la URL no llega a Prisma: cae en el orden por defecto (`precio-asc`), que no se escribe en
  la URL para que `/` siga siendo `/`. Para cambiar el orden por defecto, se cambia `ORDEN_POR_DEFECTO`.
- Todos los ordenes desempatan por `id` para que dos productos con el mismo precio no cambien de sitio entre recargas.

---

## Carrito
- Vive solo en el navegador (`localStorage`, clave `carrito-volta`, `src/store/carrito.ts`). No hay carrito en la base
  de datos ni cuentas de cliente.
- Guarda una **copia** del precio y del stock del momento en que se anadio. Por eso el checkout **no se fia** de esos
  datos: vuelve a leer precio y stock de la base de datos. Si cambias precios, el carrito puede mostrar el viejo hasta
  que se pague; Stripe cobrara el nuevo.
- Si cambias la forma de `LineaCarrito`, los carritos guardados con la forma antigua siguen en el navegador de la gente.
  Para invalidarlos, cambia `name` en `persist` (o usa `version` + `migrate` de Zustand).

---

## Admin
- La proteccion es sencilla, pensada para una demo: una contrasena (`ADMIN_PASSWORD`) y una cookie con su huella
  SHA-256 (`src/lib/admin.ts`). **Cambiar la contrasena cierra todas las sesiones**, porque la huella deja de coincidir.
- El middleware (`src/middleware.ts`) protege **las paginas** de `/admin`, pero **no las Server Actions**: cada accion
  de `src/app/admin/actions.ts` vuelve a comprobar `esAdmin`. Si anades una accion de admin, tiene que hacer lo mismo.

---

## Base de datos y entorno
- **Dos URLs de Neon:** `DATABASE_URL` (con pooler, la usa la app) y `DIRECT_URL` (sin pooler, la usan las migraciones,
  ver `prisma.config.ts`). Si las migraciones se cuelgan o fallan raro, revisa que `DIRECT_URL` no lleve `-pooler`.
- El cliente de Prisma se **genera** en `src/generated/prisma` (ignorado por git) al hacer `npm install`
  (script `postinstall`). Tras cambiar `schema.prisma`, `npx prisma migrate dev` lo regenera; si los tipos no cuadran,
  `npx prisma generate`.
- **Emails:** sin dominio propio verificado, Resend solo envia a la direccion de tu cuenta. Si `EMAIL_PRUEBAS` tiene
  valor, **todos** los emails van ahi en vez de al cliente (`src/lib/email.ts`). En produccion con dominio propio,
  dejalo vacio y cambia el `from`.
- **CI** (`.github/workflows/ci.yml`) usa claves ficticias: el build necesita que existan, pero no se conecta a nada.
  Si anades una variable de entorno que el build necesite, anadela tambien ahi (con un valor falso) y en Vercel.
