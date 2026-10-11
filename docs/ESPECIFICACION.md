# Especificación · El Rincón de las Flores

Floristería de barrio que vende ramos ya montados y centros de mesa por internet. Proyecto final del Máster
Desarrollo Agéntico, adaptado de la plantilla Tienda Volta del curso.

## Qué hace la tienda

Un cliente entra, busca un ramo o un centro (por ocasión, precio o nombre), lo mete en el carrito y paga con tarjeta
(Stripe, modo test). El pedido se confirma cuando Stripe avisa al servidor (webhook) y el cliente recibe un email.
Si el pago se abandona, el pedido se cancela solo cuando caduca la sesión de pago.
La floristería ve los pedidos y cambia su estado (pagado → enviado → entregado).
Para pagar hay que tener cuenta (email y contraseña); con ella, el cliente ve sus pedidos.

## Catálogo

4 categorías por ocasión: **Amor, Celebraciones, Condolencias y Para casa**. 10 productos (ramos y centros de mesa),
cada uno en una sola categoría y con precio por unidad. Los datos están en `prisma/catalogo-datos.ts`.

## Páginas

| Ruta | Página | Quién la usa |
|---|---|---|
| `/` | Catálogo: rejilla de productos, búsqueda, filtros (ocasión, precio) y orden | Cliente |
| `/producto/[id]` | Detalle: ilustración, precio, stock, cantidad, añadir al carrito | Cliente |
| `/carrito` | Carrito: líneas, cantidades, total, botón de pagar | Cliente |
| `/checkout/exito` y `/checkout/cancelado` | Vuelta desde Stripe (solo informan) | Cliente |
| `/entrar` y `/registro` | Entrar o crear una cuenta | Cliente |
| `/cuenta/pedidos` y `/cuenta/pedidos/[id]` | Mis pedidos: lista y detalle | Cliente con sesión |
| `/admin` | Panel de pedidos: lista (cada fila abre su pedido), detalle y cambio de estado | Floristería (cuenta con rol ADMIN) |
| `/api/webhooks/stripe` | Endpoint que recibe los eventos de Stripe (no es una página) | Stripe |
| Cualquier otra ruta | 404 "No encontramos esa página"; un producto inexistente tiene su propia 404 | Cliente |

## Modelo de datos (resumen)

- **Categoria** 1 — N **Producto**
- **Pedido** 1 — N **LineaPedido** N — 1 **Producto**
- Un pedido tiene un **estado**: PENDIENTE, PAGADO, ENVIADO, ENTREGADO, CANCELADO.
- **Usuario** 1 — N **Pedido** (opcional: los pedidos antiguos no tienen dueño) y 1 — N **Sesion**. Un usuario tiene
  un **rol**: CLIENTE o ADMIN.

## Fuera de alcance

Recuperar la contraseña, cupones, varias monedas, gestión de stock en tiempo real, envíos reales, flor suelta por tallos,
personalizar el ramo, marcas.

## Reglas que no se negocian

1. Los precios se guardan en **céntimos** (enteros), nunca en decimales.
2. La clave secreta de Stripe vive solo en el servidor (`.env`), nunca en el navegador.
3. El pedido se marca como PAGADO en el **webhook**, no en la página de éxito.
