# Especificacion · El Rincón de las Flores

Floristeria de barrio que vende ramos ya montados y centros de mesa por internet. Proyecto final del Master
Desarrollo Agentico, adaptado de la plantilla Tienda Volta del curso.

## Que hace la tienda

Un cliente entra, busca un ramo o un centro (por ocasion, precio o nombre), lo mete en el carrito y paga con tarjeta
(Stripe, modo test). El pedido se confirma cuando Stripe avisa al servidor (webhook) y el cliente recibe un email.
Si el pago se abandona, el pedido se cancela solo cuando caduca la sesion de pago.
La floristeria ve los pedidos y cambia su estado (pagado -> enviado -> entregado).

## Catalogo

4 categorias por ocasion: **Amor, Celebraciones, Condolencias y Para casa**. 10 productos (ramos y centros de mesa),
cada uno en una sola categoria y con precio por unidad. Los datos estan en `prisma/catalogo-datos.ts`.

## Paginas

| Ruta | Pagina | Quien la usa |
|---|---|---|
| `/` | Catalogo: rejilla de productos, busqueda, filtros (ocasion, precio) y orden | Cliente |
| `/producto/[id]` | Detalle: ilustracion, precio, stock, cantidad, anadir al carrito | Cliente |
| `/carrito` | Carrito: lineas, cantidades, total, boton de pagar | Cliente |
| `/checkout/exito` y `/checkout/cancelado` | Vuelta desde Stripe (solo informan) | Cliente |
| `/admin` | Panel de pedidos: lista, detalle y cambio de estado | Floristeria |
| `/api/webhooks/stripe` | Endpoint que recibe los eventos de Stripe (no es una pagina) | Stripe |

## Modelo de datos (resumen)

- **Categoria** 1 — N **Producto**
- **Pedido** 1 — N **LineaPedido** N — 1 **Producto**
- Un pedido tiene un **estado**: PENDIENTE, PAGADO, ENVIADO, ENTREGADO, CANCELADO.

## Fuera de alcance

Cuentas de cliente, cupones, varias monedas, gestion de stock en tiempo real, envios reales, flor suelta por tallos,
personalizar el ramo, marcas.

## Reglas que no se negocian

1. Los precios se guardan en **centimos** (enteros), nunca en decimales.
2. La clave secreta de Stripe vive solo en el servidor (`.env`), nunca en el navegador.
3. El pedido se marca como PAGADO en el **webhook**, no en la pagina de exito.
