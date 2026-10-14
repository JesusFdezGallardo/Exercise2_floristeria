# Avisos de reposición · diseño

Fecha: 2026-10-13 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Que un cliente pueda pedir **"avísame cuando vuelva"** en un producto agotado y reciba un email cuando la floristería
lo reponga. Rellena el gancho `alReponer` (`src/lib/reposicion.ts`) que dejó la parte B
(`2026-10-12-catalogo-admin-design.md`), que hasta ahora solo escribe una línea en el log.

Criterios de éxito:
- Un cliente con cuenta pide el aviso desde la ficha de un producto agotado y lo ve (y lo puede quitar) en su cuenta.
- Al reponer, cada aviso pendiente se envía **una sola vez**, aunque dos reposiciones coincidan.
- Un email que no sale (Resend falla o no hay clave) **no** se da por enviado: el aviso sigue pendiente.
- Nunca se envía un aviso con un enlace a un producto oculto (daría 404).
- El admin ve cuántos avisos pendientes tiene cada producto y, al reponer, a cuántos clientes se ha avisado.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Quién | Solo clientes con cuenta. Sin sesión, el botón lleva a `/entrar` y vuelve a la ficha. |
| Vida del aviso | Se usa **una vez**: al enviarlo queda marcado con `enviadoEn`. Si se vuelve a agotar, se pide otra vez. |
| Admin | Solo el **número** de avisos pendientes por producto (sin emails ni fechas). |
| Cuándo se envía | En el momento, dentro de la acción del admin (`alReponer` espera a Resend y devuelve el resultado). |
| Envío | API por lotes de Resend (`resend.batch.send`, hasta 100 por llamada). |
| Productos ocultos | No se avisa mientras esté oculto; se avisa al volver a hacerlo visible con stock. |
| Enlace del email | Absoluto, con la cabecera `origin` de la petición del admin (como `crearCheckout`). Sin variable nueva. |

Enfoques descartados: avisos sin cuenta (exigen confirmar el email o aceptar que se apunten direcciones ajenas, y un
enlace de baja en cada email); avisos permanentes (un email en cada reposición acaba siendo spam); enviar después de
responder con `after()` (el admin no sabría si salieron); cola con cron (infraestructura que una floristería de barrio
no necesita). Mostrar al admin la lista de emails: más datos personales a la vista sin ayudar a decidir qué reponer.

Limitación conocida: sin dominio propio, Resend solo entrega a la dirección de la cuenta (o a `EMAIL_PRUEBAS`), así
que hoy todos los avisos llegan a esa dirección. Es la misma limitación que el email de confirmación del pedido.

## Modelo de datos

```prisma
model AvisoReposicion {
  id         Int       @id @default(autoincrement())
  usuario    Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  usuarioId  Int
  producto   Producto  @relation(fields: [productoId], references: [id], onDelete: Cascade)
  productoId Int
  creadoEn   DateTime  @default(now())
  enviadoEn  DateTime? // null = pendiente; con fecha = ya se avisó (una sola vez)

  @@unique([usuarioId, productoId])
  @@index([productoId, enviadoEn])
}
```

- Una fila como mucho por cliente y producto. Volver a pedir un aviso ya enviado reutiliza la fila: `upsert` que pone
  `enviadoEn = null` y `creadoEn = now()`.
- Cascada en las dos relaciones: borrar un usuario borra sus avisos, y el `TRUNCATE ... CASCADE` del seed no se rompe.
  El seed añade `"AvisoReposicion"` a su `TRUNCATE ... RESTART IDENTITY` para reiniciar también sus ids.
- La migración solo crea la tabla: funciona con el código anterior y se aplica a producción antes del push.

## Reglas puras (`src/lib/avisos.ts`)

- **`puedePedirAviso({ visible, stock })`** → `visible && stock <= 0`.
- **`debeAvisarAlGuardar(antes, despues)`** → `!antes.visible && despues.visible && despues.stock > 0`.
- **`enLotes(lista, tamano)`** → trocea en listas de como mucho `tamano` (100 para Resend).
- **`textoResultadoAvisos({ avisados, fallidos, oculto })`** → sufijo del mensaje del admin, o `""` si no hay nada que
  contar. Partes, en este orden y unidas con " · ", precedidas de " · ":
  - `oculto` → "el producto está oculto: avisaremos cuando lo hagas visible" (y nada más)
  - `avisados > 0` → "avisados 3 clientes" / "avisado 1 cliente"
  - `fallidos > 0` → "no se pudo avisar a 2 clientes (se reintentará al reponer)" / "… a 1 cliente …"

## Envío (`src/lib/reposicion.ts`)

**`alReponer(productoId, origen): Promise<ResultadoAvisos>`** con `ResultadoAvisos = { avisados, fallidos, oculto }`:

1. Lee el producto (`nombre`, `precio`, `visible`, `stock`). Si no existe o `stock <= 0` (se vendió entre medias) →
   `{ 0, 0, false }`. Si está oculto → `{ 0, 0, true }`, sin tocar los avisos.
2. **Reserva atómica** con una sola consulta:
   `UPDATE "AvisoReposicion" SET "enviadoEn" = now() WHERE "productoId" = $1 AND "enviadoEn" IS NULL RETURNING id, "usuarioId"`
   (con `$queryRaw`). Cada aviso lo reserva una sola reposición aunque coincidan dos. Luego lee el email y el nombre
   de esos usuarios.
3. Envía con `enviarAvisosReposicion` (abajo) en lotes de 100. Cada lote que falla (o todos, si no hay
   `RESEND_API_KEY`) vuelve a `enviadoEn = null` con `updateMany({ where: { id: { in: idsDelLote } } })`.
4. Devuelve cuántos salieron y cuántos fallaron, y deja una línea en el log
   (`[reposicion] producto 10: avisados 3, fallidos 0`).

**Quién lo llama** (`src/app/admin/productos/actions.ts`), y el resultado se añade al mensaje con
`textoResultadoAvisos`:
- `reponerStock` y `corregirStock`: siempre que el stock queda en positivo.
  Ejemplo: "Stock: 0 → 5 · avisados 3 clientes".
- `guardarProducto`, **nuevo**: siempre que el producto queda visible.
  Ejemplo: "Guardado · avisados 3 clientes".
- (Cambio tras la revisión final: antes solo al pasar de agotado a disponible o de oculto a visible. Así un aviso
  que falló, o que se pidió justo mientras se reponía, sale en la siguiente operación en vez de quedarse varado.
  Sin pendientes cuesta una consulta. El aviso de "oculto" solo sale si hay alguien esperando, y si `alReponer`
  lanza, el admin lee "no se pudieron enviar los avisos" con el stock ya guardado.)
- El `origen` sale de `(await headers()).get("origin") ?? "http://localhost:3000"`, igual que en `crearCheckout`.

`alReponer` es el único punto que envía avisos.

## Email (`src/lib/email.ts` y `src/lib/plantilla-email.ts`)

- **`plantillaAvisoReposicion({ nombreCliente, nombreProducto, precio, url })`**: saludo con el nombre, el producto
  con su precio formateado (`src/lib/formato.ts`), botón "Ver el producto" con `url` (`<origen>/producto/<id>`) y la
  línea "Te avisamos una sola vez; puedes ver tus avisos en tu cuenta". Nombres pasados por `escaparHtml`. La marca,
  con `TIENDA` (`src/lib/tienda.ts`).
- **`enviarAvisosReposicion(emails): Promise<boolean>`**: un `resend.batch.send` con la lista (como mucho 100).
  Asunto: "Vuelve a haber <producto> · <TIENDA.nombre>". Remitente `onboarding@resend.dev`. Destinatario
  `EMAIL_PRUEBAS || email`, como los demás emails. Devuelve `false` si no hay clave o Resend devuelve error (y lo
  escribe en el log); `true` si el lote salió.

## Pantallas

**Ficha del producto** (`src/app/producto/[id]/page.tsx`):
- "Agotado" pasa a calcularse con `stock <= 0` (antes `=== 0`: con stock negativo decía "En stock: -1 unidades").
- Si está agotado, un componente `AvisoReposicion` (cliente, con `useActionState`) bajo el texto de stock:
  - sin sesión: enlace-botón "Avísame cuando vuelva" a `/entrar?callbackUrl=/producto/<id>`;
  - con sesión y sin aviso pendiente: botón "Avísame cuando vuelva" (`pedirAviso`);
  - con aviso pendiente: "Te avisaremos por email a <email>" y botón "Quitar aviso" (`quitarAviso`).
- La página consulta si el usuario actual tiene aviso pendiente de ese producto.

**Acciones del cliente** (`src/app/producto/[id]/actions.ts`): `pedirAviso` y `quitarAviso`.
- Leen el usuario con `usuarioActual()` (si no hay: "Entra en tu cuenta para pedir el aviso") y validan el id
  (entero positivo).
- `pedirAviso` relee el producto: si no existe o está oculto → "El producto no existe"; si `!puedePedirAviso` →
  "Ya hay stock de este producto" y refresca la ficha. Si se puede: `upsert` sobre `(usuarioId, productoId)`.
- `quitarAviso` borra con `deleteMany({ where: { usuarioId, productoId, enviadoEn: null } })` (solo los suyos y
  pendientes).
- Las dos hacen `revalidatePath` de la ficha y de `/cuenta/avisos`.

**Mis avisos** (`src/app/cuenta/avisos/page.tsx`), enlazada desde el menú de la cuenta tras "Mis pedidos":
- Exige sesión como `/cuenta/pedidos` (el middleware ya cubre `/cuenta`).
- **Pendientes**: nombre del producto (con enlace a la ficha si es visible; sin enlace si está oculto), fecha en que
  se pidió y botón "Quitar".
- **Enviados en los últimos 30 días**: "Te avisamos el 13/10/2026" y enlace a la ficha si es visible.
- Sin avisos: "No tienes avisos. Cuando un producto esté agotado, pulsa «Avísame cuando vuelva» en su ficha."

**Admin** (`/admin/productos` y `/admin/productos/[id]`):
- Junto al stock, "3 avisos pendientes" / "1 aviso pendiente" si hay alguno. En la lista, un único `groupBy` por
  `productoId` con `enviadoEn: null`; en la ficha, un `count`.

## Tests (Vitest, `tests/avisos.test.ts`)

- `puedePedirAviso`: visible con 0 y con -1 sí; con stock 3 no; oculto con 0 no.
- `debeAvisarAlGuardar`: oculto→visible con stock 2 sí; oculto→visible con 0 no; visible→visible no; visible→oculto no.
- `enLotes`: 0, 1, 100, 101 y 250 elementos con tamaño 100.
- `textoResultadoAvisos`: vacío; oculto; 1 y 3 avisados; 1 y 2 fallidos; avisados y fallidos a la vez.
- `plantillaAvisoReposicion`: escapa `<b>` en los nombres, lleva la `url` y el precio formateado.
- `tests/marca.test.ts` ya cubre que la plantilla no escriba la marca a mano.

La reserva atómica y la vuelta atrás se prueban a mano (dependen de la BD y de Resend).

**Prueba manual en local** (con `EMAIL_PRUEBAS`):
1. Cliente pide aviso de un agotado → aparece en `/cuenta/avisos` y la ficha dice "Te avisaremos…". Quitar y volver a
   pedir funciona.
2. Admin ve "1 aviso pendiente". Reponer → "Stock: 0 → 5 · avisado 1 cliente" y llega el email con enlace a la ficha.
   En `/cuenta/avisos` pasa a "Te avisamos el …".
3. Reponer otra vez → no llega nada y el mensaje no habla de avisos.
4. Con aviso pendiente, ocultar el producto y reponer → "… el producto está oculto: avisaremos cuando lo hagas
   visible". Hacerlo visible → "Guardado · avisado 1 cliente" y llega el email.
5. Pedir aviso de un producto con stock llamando a la acción (cambiando el `id` del formulario por el de uno con
   stock) → "Ya hay stock de este producto".
6. Sin `RESEND_API_KEY` (comentada en `.env`, reiniciando `npm run dev`): reponer → "no se pudo avisar a 1 cliente" y
   el aviso sigue pendiente; con la clave de vuelta, la siguiente reposición lo envía.

## Documentación

- `src/lib/reposicion.ts`: el comentario de cabecera explica el envío, la reserva atómica y el nuevo significado.
- `CLAUDE.md` ("Particularidades"): un punto de avisos de reposición (una vez, reserva atómica, ocultos, quién llama a
  `alReponer`), y el punto del admin de productos menciona que `guardarProducto` también lo llama.
- `docs/NOTAS-DEL-PROYECTO.md`: sección "Avisos de reposición".
- `docs/ESPECIFICACION.md`: fila de `/cuenta/avisos`.

## Despliegue

Rama `avisos-reposicion` desde `main`. Al terminar:
1. `npm run migrar:produccion` (solo crea la tabla).
2. Fusionar en `main`, `npx tsc --noEmit && npm run lint && npm test` y push.
3. Comprobar en producción: pedir un aviso con una cuenta de cliente y reponer como admin.

## Fuera de alcance

- Avisos sin cuenta.
- Dominio propio en Resend (entregar a cualquier dirección).
- Enlace de baja dentro del email: se gestiona en `/cuenta/avisos`.
- El botón en las tarjetas del catálogo: solo en la ficha.
- La lista de emails de los avisos en el admin.
- Cancelar un aviso porque el cliente compró el producto por otra vía.
