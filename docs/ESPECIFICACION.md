# Especificacion · Tienda Volta

Tienda online ficticia (material de clase). Es la misma tienda a la que atendia el agente
de la S13 del Master: vende audio, relojes, ropa y calzado, y tiene una marca propia, **Volta**.

## Que hace la tienda

Un cliente entra, busca productos, los mete en el carrito y paga con tarjeta (Stripe, modo test).
El pedido se confirma cuando Stripe avisa al servidor (webhook) y el cliente recibe un email.
El administrador ve los pedidos y cambia su estado (pagado -> enviado -> entregado).

## Paginas

| Ruta | Pagina | Quien la usa | Sesion |
|---|---|---|---|
| `/` | Catalogo: rejilla de productos, busqueda y filtros (categoria, precio) | Cliente | S2 |
| `/producto/[id]` | Detalle del producto: imagen, precio, stock, cantidad, anadir al carrito | Cliente | S2 |
| `/carrito` | Carrito: lineas, cantidades, total, boton de pagar | Cliente | S2 |
| `/checkout/exito` y `/checkout/cancelado` | Vuelta desde Stripe (solo informan) | Cliente | S3 |
| `/admin` | Panel de pedidos: lista, detalle y cambio de estado | Administrador | S4 |
| `/api/webhooks/stripe` | Endpoint que recibe los eventos de Stripe (no es una pagina) | Stripe | S3 |

## Modelo de datos (resumen)

- **Categoria** 1 — N **Producto**
- **Pedido** 1 — N **LineaPedido** N — 1 **Producto**
- Un pedido tiene un **estado**: PENDIENTE, PAGADO, ENVIADO, ENTREGADO, CANCELADO.

## Fuera de alcance

Cuentas de cliente, cupones, varias monedas, gestion de stock en tiempo real, envios reales.

## Reglas que no se negocian

1. Los precios se guardan en **centimos** (enteros), nunca en decimales.
2. La clave secreta de Stripe vive solo en el servidor (`.env`), nunca en el navegador.
3. El pedido se marca como PAGADO en el **webhook**, no en la pagina de exito.
