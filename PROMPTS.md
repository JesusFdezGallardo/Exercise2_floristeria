# Proyecto Ecommerce · Sesión 1 · Especificaciones, arquitectura y estructura · Prompts para Claude Code

Estos son los prompts que usamos en la práctica, en el mismo orden que en clase. Cópialos y pégalos en Claude Code uno a uno.

**Cómo usarlos**
1. Pega el prompt del paso y deja que Claude Code proponga los cambios.
2. **Lee el código antes de aceptar** (y los comandos, como `npm install` o `prisma migrate`, antes de permitirlos).
3. Ejecuta y compara con el apartado *Qué deberías ver*.
4. Si no sale lo esperado, vuelve a pedírselo con lo que has aprendido.

> Antes de empezar: Node.js 20 o superior (vale el zip portable de nodejs.org, sin instalar), Git, una cuenta gratuita de [Neon](https://console.neon.tech) con una base de datos llamada `tienda` (o Docker, con el `docker-compose.yml` del material) y una cuenta de [Stripe](https://dashboard.stripe.com/register) en **modo test**. Las URLs de la base y las claves `pk_test_` / `sk_test_` van en el `.env` (plantilla en `.env.example`). **Nunca compartas ni subas tu `.env`.** Abre Claude Code en una carpeta vacía.

El resultado de referencia, con todo el código comentado, está en la carpeta `codigo/tienda-online` del material.

---

## Paso 1 · Especificar el proyecto y crear el repo

**Qué construye**

- Especificacion: paginas, modelo, reglas
- Next.js 15 + App Router + TypeScript
- Tailwind y ESLint de serie
- CLAUDE.md con stack y convenciones

**Prompt**

```text
Vamos a construir una tienda online. Ayudame a escribir una breve especificacion (que paginas tiene: catalogo, producto, carrito, checkout, admin) y crea un proyecto Next.js 15 con App Router, TypeScript y Tailwind. Crea tambien un CLAUDE.md con el contexto del proyecto y las convenciones. Arrancalo en local y ensename la pagina inicial.
```

**Qué deberías ver**

323 paquetes en 2 minutos y un repositorio Git ya inicializado. Next 15.5.25, React 19.

---

## Paso 2 · Base de datos: Neon (Docker, alternativa)

**Qué construye**

- docker-compose.yml listo para quien tenga Docker
- En clase: base 'tienda' en Neon (free tier)
- Dos URLs en el .env: con pooler y directa
- Script que comprueba la conexion

**Prompt**

```text
Vamos a usar PostgreSQL gestionado en Neon (free tier), en una base de datos llamada tienda. Preparame el .env con dos URLs, DATABASE_URL (con pooler, para la app) y DIRECT_URL (directa, para las migraciones), y un .env.example sin valores que si se suba a git. Crea tambien un docker-compose.yml con PostgreSQL (imagen alpine, variables de entorno, volumen persistente) como alternativa local, explicando cada parte para un principiante. Por ultimo, un script npm run db:check que conecte y muestre base, usuario y version, para verificar que la base responde.
```

**Qué deberías ver**

Base 'tienda', PostgreSQL 18.6 y 331 ms de ida y vuelta. El host sale tapado: es parte de un secreto.

---

## Paso 3 · Modelar datos con Prisma

**Qué construye**

- Prisma 7 + driver pg (adapter)
- Categoria, Producto, Pedido, LineaPedido
- Enum con los estados del pedido
- migrate dev: SQL generado y aplicado en Neon

**Prompt**

```text
Instala y configura Prisma conectado a la base de datos Postgres. Define el schema con tres modelos y sus relaciones: Categoria (una categoria tiene muchos productos), Producto (nombre, descripcion, precio, imagen, stock, categoria) y Pedido (con sus lineas de pedido y un estado). Ejecuta la migracion y abre Prisma Studio para ver las tablas.
```

**Qué deberías ver**

La migracion 20260925220813_inicial se crea y se aplica en Neon en un solo comando.

---

## Paso 4 · Datos de ejemplo y conectar Stripe

**Qué construye**

- Seed: 4 categorias y 12 productos Volta
- Imagenes SVG en public/productos
- Stripe en modo test: claves en .env
- lib/stripe.ts con server-only

**Prompt**

```text
Crea un script de seed que rellene la base de datos con unas categorias y varios productos de ejemplo. Luego prepara la integracion de Stripe en modo test: instala el SDK, guarda las claves en un .env (con .gitignore) y crea un fichero lib/stripe.ts con la instancia del servidor. Recuerdame que la secret key nunca va al cliente.
```

**Qué deberías ver**

3 productos por categoria. Las chanclas tienen stock 0: nos servira para probar 'agotado'.

### Variación en vivo: ¿Y si un componente de cliente importa lib/stripe.ts?

```text
Crea una pagina de prueba con "use client" que importe la instancia de Stripe de lib/stripe.ts, ensename que error da Next.js y explicame por que server-only protege la clave secreta. Luego borra la pagina.
```

**Qué demuestra**

El build se para con un error claro que senala la linea de server-only. La clave nunca llega a empaquetarse para el navegador.

---

## Paso 5 · Repaso de arquitectura y cierre

**Qué construye**

- El mapa: lo hecho y lo que falta
- Linter limpio antes de cerrar
- Un commit por paso con mensajes claros
- README con como arrancarlo

**Prompt**

```text
Hazme un repaso de la arquitectura montada: estructura de carpetas de Next.js, el modelo de datos de Prisma y como encaja Stripe. Deja todo commiteado en Git con mensajes claros. Resume que construiremos en la proxima sesion (catalogo, busqueda y carrito).
```

**Qué deberías ver**

6 commits, uno por paso. Y check-ignore confirma que el .env y el cliente generado se quedan fuera.

---

## Antes de la Sesion 2 · un modelo mas

**Qué construye**

- Modelo Marca 1-N Producto
- Migracion nueva
- Seed actualizado

**Prompt**

```text
Anade al schema de Prisma un modelo Marca (nombre y slug unicos) con una relacion 1 a N con Producto. Crea la migracion con un nombre descriptivo, actualiza el seed para que cada producto tenga su marca y ensename las tablas en Prisma Studio. Explica que SQL ha generado la migracion.
```

**Qué deberías ver**

Una migracion nueva en prisma/migrations y la columna marcaId en la tabla Producto.

---

*Material del Master Desarrollo Agéntico · Proyecto Ecommerce · The Power · Ignacio de Pastors*

# Proyecto Ecommerce · Sesión 2 · Catálogo, búsqueda con filtros y carrito · Prompts para Claude Code

Estos son los prompts que usamos en la práctica, en el mismo orden que en clase. Cópialos y pégalos en Claude Code uno a uno.

**Cómo usarlos**
1. Pega el prompt del paso y deja que Claude Code proponga los cambios.
2. **Lee el código antes de aceptar** (y los comandos, como `npm install` o `prisma migrate`, antes de permitirlos).
3. Ejecuta y compara con el apartado *Qué deberías ver*.
4. Si no sale lo esperado, vuelve a pedírselo con lo que has aprendido.

> Antes de empezar: el proyecto `tienda-online` tal como quedó en la Sesión 1 (Next.js 15, Prisma, Neon con los 12 productos y Stripe en modo test). Hoy se instalan shadcn/ui (`npx shadcn@latest init`) y Zustand (`npm install zustand`). Ojo: el shadcn actual usa Base UI, no Radix, así que los ejemplos con `asChild` de tutoriales antiguos no te valen. Abre Claude Code en la carpeta del proyecto.

El resultado de referencia, con todo el código comentado, está en la carpeta `codigo/tienda-online` del material.

---

## Paso 1 · UI base con shadcn/ui

**Qué construye**

- shadcn init + card, badge, input...
- Cabecera con logo e icono del carrito
- Tarjeta: imagen, categoria, precio, agotado
- Rejilla de 2, 3 o 4 columnas segun la pantalla

**Prompt**

```text
Instala shadcn/ui en el proyecto y monta la UI base de la tienda: una cabecera con el logo y el icono del carrito, y una pagina de catalogo con una rejilla responsive de tarjetas de producto. Usa el componente Image de Next.js para las imagenes. Trae los productos reales desde la base de datos (Server Component).
```

**Qué deberías ver**

Los 12 productos de Neon, ordenados por precio. Las chanclas, con su badge de agotado.

---

## Paso 2 · Busqueda y filtros

**Qué construye**

- Busqueda por nombre (sin distinguir mayusculas)
- Chips de categoria
- Rango de precio en euros
- Todo en la URL: compartible y sin estado

**Prompt**

```text
Anade busqueda y filtros al catalogo: una barra de busqueda por nombre y filtros por categoria y rango de precio. Resuelve el filtrado en el servidor con Prisma usando los search params de la URL, para que sea compartible y funcione sin recargar. Explica como usas los searchParams en el App Router.
```

**Qué deberías ver**

La URL lleva los cuatro filtros a la vez: reloj, relojes, 50 y 100 euros. Un resultado.

### Variación en vivo: ¿Y si alguien escribe SQL en el buscador?

```text
Prueba a buscar en el catalogo el texto '; DROP TABLE "Producto"; -- y explicame por que no pasa nada. Ensename el SQL que genera Prisma con el log de consultas activado.
```

**Qué demuestra**

0 productos y la tabla intacta. Prisma envia el texto como parametro: Postgres lo trata como un dato, nunca como una orden.

---

## Paso 3 · Pagina de producto

**Qué construye**

- Ruta dinamica /producto/[id]
- Imagen grande, precio, descripcion y stock
- Selector de cantidad y boton
- 404 si el producto no existe

**Prompt**

```text
Crea la pagina de detalle de producto con ruta dinamica (app/producto/[id]). Muestra la imagen grande, nombre, descripcion, precio y stock, con un selector de cantidad y un boton 'anadir al carrito'. Si el producto no existe, muestra un 404. Comenta como funciona el enrutado dinamico.
```

**Qué deberías ver**

El titulo de la pestana dice 'Auriculares Volta Pulse · Tienda Volta': lo genera generateMetadata.

---

## Paso 4 · Carrito con Zustand

**Qué construye**

- Store: anadir, cambiar cantidad, quitar, vaciar
- Total y numero de articulos calculados
- Icono con el numero en vivo
- Pagina /carrito

**Prompt**

```text
Monta el carrito con Zustand: un store con las acciones anadir, quitar y cambiar cantidad, y el total calculado. Conecta el icono del carrito de la cabecera para que muestre en vivo el numero de articulos, y crea una pagina de carrito que liste lo anadido. Explica por que Zustand es mas simple que Context para esto.
```

**Qué deberías ver**

2 auriculares (99,80) + 1 reloj (89,90) = 189,70 €. El icono de arriba marca 3.

---

## Paso 5 · Persistencia del carrito

**Qué construye**

- persist de Zustand sobre localStorage
- Solo se guardan las lineas
- Prueba: recargar, cerrar y reabrir
- Commit y cierre de la sesion

**Prompt**

```text
Haz que el carrito persista cuando cierro la aplicacion o el navegador, usando el middleware persist de Zustand sobre localStorage. Comprueba que si anado productos, cierro y reabro, siguen ahi. Deja todo commiteado y resume que viene en la Sesion 3 (checkout con Stripe).
```

**Qué deberías ver**

Edge cerrado y vuelto a abrir con el mismo perfil: los 3 articulos siguen ahi.

---

## Antes de la Sesion 3 · ordenar el catalogo

**Qué construye**

- Parametro orden en la URL
- Validacion en el servidor
- Compatible con los filtros

**Prompt**

```text
Anade al catalogo un selector para ordenar por precio (ascendente y descendente) y por nombre. El orden debe ir en la URL (?orden=precio-asc, por ejemplo), validarse en el servidor y convivir con los filtros que ya tenemos. Ensename el SQL que genera Prisma para uno de los ordenes.
```

**Qué deberías ver**

La misma URL con ?orden=precio-desc muestra primero el reloj de 159 €.

---

*Material del Master Desarrollo Agéntico · Proyecto Ecommerce · The Power · Ignacio de Pastors*

# Proyecto Ecommerce · Sesión 3 · Checkout y confirmaciones · Prompts para Claude Code

Estos son los prompts que usamos en la práctica, en el mismo orden que en clase. Cópialos y pégalos en Claude Code uno a uno.

**Cómo usarlos**
1. Pega el prompt del paso y deja que Claude Code proponga los cambios.
2. **Lee el código antes de aceptar** (y los comandos, como `npm install` o `prisma migrate`, antes de permitirlos).
3. Ejecuta y compara con el apartado *Qué deberías ver*.
4. Si no sale lo esperado, vuelve a pedírselo con lo que has aprendido.

> Antes de empezar: la tienda de la Sesión 2 y tus claves de Stripe en modo test. Hoy necesitas la Stripe CLI (un .exe de github.com/stripe/stripe-cli, sin instalar) y una cuenta gratuita de [Resend](https://resend.com) con una API key de solo envío. Ojo: la Stripe CLI 1.52 exige `--events` en `stripe listen`, y Resend sin dominio propio solo envía al email de tu cuenta (ponlo en `EMAIL_PRUEBAS`). Repositorio de referencia: https://github.com/ignaciothepower/tienda-online. **Nunca subas tu `.env`.**

El resultado de referencia, con todo el código comentado, está en la carpeta `codigo/tienda-online` del material.

---

## Paso 1 · Checkout con Stripe (Server Action)

**Qué construye**

- Validar lo que llega del navegador
- Precios y stock desde la base de datos
- Pedido PENDIENTE + sesion de Stripe
- redirect a la pagina de pago

**Prompt**

```text
Crea el checkout con Stripe usando una Server Action (no una API route): a partir de los productos del carrito, crea una Stripe Checkout Session en modo 'payment' con sus line_items, guarda en metadata lo que necesitare luego (p.ej. el id del pedido) y redirige a session.url. Explica por que el redirect va fuera del try/catch en Next.js.
```

**Qué deberías ver**

Stripe Checkout en modo Sandbox: 189,70 €, con los precios que calculo nuestro servidor.

---

## Paso 2 · El webhook de confirmacion

**Qué construye**

- Endpoint POST /api/webhooks/stripe
- Firma verificada con STRIPE_WEBHOOK_SECRET
- Pedido PENDIENTE -> PAGADO
- Descontar stock (una sola vez)

**Prompt**

```text
Crea el endpoint del webhook de Stripe (app/api/webhooks/stripe) que escucha el evento de pago completado. MUY IMPORTANTE: verifica la firma con el STRIPE_WEBHOOK_SECRET antes de fiarte del evento, y solo entonces marca el pedido como pagado en la base de datos. Explica por que no se confirma el pedido en la pagina de exito sino aqui.
```

**Qué deberías ver**

Dos 400 (sin firma y con firma falsa) y luego el pago real: PAGADO. Al repetirse, se ignora.

---

## Paso 3 · Probar el pago de punta a punta

**Qué construye**

- Stripe CLI (un .exe, sin instalar)
- stripe listen reenvia los eventos a localhost
- Pago real con 4242 4242 4242 4242
- El pedido pasa a PAGADO y baja el stock

**Prompt**

```text
Guiame para probar el flujo completo en local: instala la Stripe CLI, usa 'stripe listen' para reenviar los eventos a mi webhook local, y haz un pago de prueba con una tarjeta de test de Stripe. Ensename como ver que el pedido pasa a estado pagado en la base de datos. Dame las tarjetas de test mas utiles.
```

**Qué deberías ver**

Cada pago: una flecha --> (el evento llega) y otra <-- [200] (nuestro webhook contesto bien).

---

## Paso 4 · Emails de confirmacion con Resend

**Qué construye**

- Cuenta gratuita de Resend y API key
- Plantilla con lineas y total
- Envio desde el webhook
- Si el email falla, el pedido sigue pagado

**Prompt**

```text
Integra Resend (free tier) para enviar un email de confirmacion cuando el webhook confirma el pago: un correo con el resumen del pedido y el total. Configura la API key en el .env y crea una plantilla de email sencilla. Recuerda que el envio debe dispararse desde el webhook, que es el punto fiable.
```

**Qué deberías ver**

Pedido #9: 2 auriculares y un reloj, 189,70 €. Este HTML llego a un buzon de Gmail de verdad.

---

## Paso 5 · Paginas de exito/cancelacion y cierre

**Qué construye**

- Exito: lee el pedido y cuenta su estado
- Vacia el carrito del navegador
- Cancelado: nada cobrado, carrito intacto
- Commit y repo publico en GitHub

**Prompt**

```text
Crea las paginas de exito y de cancelacion a las que Stripe redirige tras el pago. En la de exito, muestra un mensaje de gracias y el resumen, pero deja claro (en el codigo) que esta pagina NO confirma el pedido, solo informa: la confirmacion ya la hizo el webhook. Vacia el carrito tras un pago con exito. Commit y resumen de la Sesion 4.
```

**Qué deberías ver**

Pedido #11 PAGADO: la pagina lo LEE de la base. El icono del carrito ya no marca nada.

---

## Antes de la Sesion 4 · pagos rechazados

**Qué construye**

- Probar un pago rechazado
- Evento checkout.session.expired
- Pedidos caducados -> CANCELADO

**Prompt**

```text
Paga con la tarjeta de prueba de Stripe que simula un rechazo (4000 0000 0000 0002) y explicame que pasa con el pedido en nuestra base de datos. Anade al webhook el evento checkout.session.expired para marcar como CANCELADO un pedido cuyo checkout caduco, manteniendo la verificacion de firma y la idempotencia.
```

**Qué deberías ver**

El pedido del pago rechazado sigue PENDIENTE y el stock no cambia.

---

*Material del Master Desarrollo Agéntico · Proyecto Ecommerce · The Power · Ignacio de Pastors*

# Proyecto Ecommerce · Sesión 4 · Despliegue: panel de admin + CI/CD · Prompts para Claude Code

Estos son los prompts que usamos en la práctica, en el mismo orden que en clase. Cópialos y pégalos en Claude Code uno a uno.

**Cómo usarlos**
1. Pega el prompt del paso y deja que Claude Code proponga los cambios.
2. **Lee el código antes de aceptar** (y los comandos, como `npm install` o `prisma migrate`, antes de permitirlos).
3. Ejecuta y compara con el apartado *Qué deberías ver*.
4. Si no sale lo esperado, vuelve a pedírselo con lo que has aprendido.

> Antes de empezar: la tienda de la Sesión 3 en GitHub (repositorio propio) y una cuenta de [Vercel](https://vercel.com) creada con GitHub (plan Hobby, gratis). Si `npm install -D vitest` da ERESOLVE, sube los tipos: `npm i -D @types/node@24`. En Vercel usa el dominio de producción (sin hash) y crea en Stripe un webhook propio de producción: su secreto es DISTINTO del de `stripe listen`. Demo de referencia: https://tienda-online-ecru.vercel.app

El resultado de referencia, con todo el código comentado, está en la carpeta `codigo/tienda-online` del material.

---

## Paso 1 · Panel de administrador de pedidos

**Qué construye**

- /admin protegido (contrasena de demo)
- Lista: numero, fecha, cliente, estado, total
- Filtro por estado con contadores
- Detalle de cada pedido

**Prompt**

```text
Crea un panel de administrador en /admin donde el administrador pueda ver la lista de todos los pedidos con su estado, cliente y total, y entrar al detalle de cada uno. Protege la ruta con una comprobacion sencilla (una contrasena de admin en variable de entorno para la demo). Usa componentes de shadcn/ui para la tabla.
```

**Qué deberías ver**

Los 12 pedidos de las pruebas: 7 pendientes (checkouts abandonados) y 5 pagados.

---

## Paso 2 · Gestionar el estado de los pedidos

**Qué construye**

- Transiciones permitidas en un solo sitio
- Botones solo con los cambios posibles
- Server Action + revalidatePath
- Aviso de confirmacion

**Prompt**

```text
Anade al panel de admin la posibilidad de cambiar el estado de un pedido (por ejemplo de pagado a enviado o entregado) usando una Server Action que actualiza la base de datos y refresca la vista. Explica como revalidas los datos tras el cambio con revalidatePath.
```

**Qué deberías ver**

Pedido #11: de Pagado a Enviado con un clic, y el aviso 'Pedido #11: Enviado' abajo a la derecha.

---

## Paso 3 · Preparar produccion: secretos, tests y CI

**Qué construye**

- Secretos solo en variables de entorno
- 5 tests de reglas (Vitest)
- npm run build sin errores
- CI: lint + tipos + tests + build

**Prompt**

```text
Prepara el proyecto para produccion (como en la sesion de CI/CD): revisa que todas las claves esten en variables de entorno y fuera del codigo, anade un par de tests basicos, y crea un workflow de GitHub Actions que instale, pase el linter y ejecute los tests en cada push. Comprueba que el check sale en verde.
```

**Qué deberías ver**

Primera ejecucion del CI: 'calidad' en verde en 1 min 13 s.

---

## Paso 4 · Deploy con CI/CD

**Qué construye**

- Vercel (free tier) conectado a GitHub
- Variables de entorno de produccion
- Webhook de Stripe apuntando a Vercel
- Cada push a main = deploy automatico

**Prompt**

```text
Despliega la tienda en Vercel (free tier): conecta el repositorio para que cada push a main haga deploy automatico, configura las variables de entorno (base de datos gestionada, claves de Stripe) y da de alta la URL del webhook de Stripe en produccion. Comprueba que la tienda funciona online de punta a punta.
```

**Qué deberías ver**

Congratulations: la tienda en internet, con los 12 productos de Neon, al primer intento.

---

## Paso 5 · Demo final y cierre del proyecto

**Qué construye**

- Compra en produccion con la tarjeta 4242
- Webhook de Vercel: pedido PAGADO
- Email en el buzon
- El pedido en el admin de produccion

**Prompt**

```text
Hagamos la demo final de punta a punta en produccion: navegar el catalogo con filtros, anadir al carrito, pagar con una tarjeta de test, recibir el email de confirmacion y ver el pedido en el panel de admin. Escribe un README de portfolio que explique la arquitectura, el stack y como ejecutarlo. Deja el proyecto listo como pieza de portfolio.
```

**Qué deberías ver**

Pedido #13, PAGADO: el webhook de produccion llego antes de que el cliente volviera.

---

## Ejercicio del proyecto · tu tienda online

**Qué construye**

- Catalogo propio
- Pago confirmado por webhook
- Email y admin
- Desplegada con CI y README

**Prompt**

```text
Quiero adaptar el proyecto tienda-online a mi propia tienda: [describe tu marca y tus productos]. Cambia el seed con mis categorias y productos (precios en centimos), ajusta textos y colores, y comprueba que todo sigue funcionando: catalogo con filtros, carrito persistente, pago con Stripe en modo test confirmado por webhook, email con Resend y panel de admin. Despliegala en Vercel con su webhook de produccion y deja el README de portfolio con mi arquitectura y la URL de la demo.
```

**Qué deberías ver**

Tu URL de Vercel con tus productos y un pedido de prueba que llega a PAGADO y te envia el email.

---

*Material del Master Desarrollo Agéntico · Proyecto Ecommerce · The Power · Ignacio de Pastors*

