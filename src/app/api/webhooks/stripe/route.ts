// Webhook de Stripe: Stripe llama a esta URL desde SUS servidores cuando pasa algo.
// Escuchamos dos eventos (hay que darlos de alta en `stripe listen` y en el destino de produccion):
//   - checkout.session.completed -> pedido PAGADO. Es el UNICO sitio donde pasa: el cliente puede cerrar el navegador, el webhook llega igual.
//   - checkout.session.expired   -> pedido CANCELADO. La sesion de pago caduco (24 h por defecto) sin pagarse.
// Un pago RECHAZADO (tarjeta 4000 0000 0000 0002) no genera ninguno de los dos: Stripe muestra el error en su pagina,
// la sesion sigue abierta para reintentar y el pedido sigue PENDIENTE hasta que se pague o caduque.
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { enviarConfirmacion } from "@/lib/email";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  // 1. El cuerpo EXACTO, como texto: la firma se calcula sobre estos bytes
  const cuerpo = await req.text();
  const firma = req.headers.get("stripe-signature");
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!firma || !secreto) return new Response("Falta la firma o el secreto", { status: 400 });

  // 2. Verificar que el evento viene de Stripe y no de cualquiera que conozca la URL
  let evento: Stripe.Event;
  try {
    evento = stripe.webhooks.constructEvent(cuerpo, firma, secreto);
  } catch (e) {
    console.warn("[webhook] firma NO valida:", (e as Error).message);
    return new Response("Firma no valida", { status: 400 });
  }

  // 3. Pago completado
  if (evento.type === "checkout.session.completed") {
    const sesion = evento.data.object;
    const pedidoId = leerPedidoId(sesion);
    if (pedidoId === null) return Response.json({ recibido: true });

    // updateMany con estado PENDIENTE: si Stripe reenvia el evento, no se procesa dos veces (idempotencia)
    const { count } = await prisma.pedido.updateMany({
      where: { id: pedidoId, estado: "PENDIENTE" },
      data: { estado: "PAGADO", email: sesion.customer_details?.email ?? "sin-email" },
    });

    if (count === 1) {
      // Descontamos el stock de lo vendido
      const lineas = await prisma.lineaPedido.findMany({ where: { pedidoId }, include: { producto: true } });
      for (const l of lineas) {
        await prisma.producto.update({ where: { id: l.productoId }, data: { stock: { decrement: l.cantidad } } });
      }
      console.log(`[webhook] pedido ${pedidoId} PAGADO (${sesion.amount_total} centimos, ${sesion.customer_details?.email})`);

      // El email sale de AQUI, del webhook: si el cliente cierra el navegador tras pagar, lo recibe igual.
      // Si el email falla, el pedido sigue pagado: lo registramos y respondemos 200 a Stripe.
      try {
        await enviarConfirmacion({
          id: pedidoId,
          email: sesion.customer_details?.email ?? "",
          total: sesion.amount_total ?? 0,
          lineas: lineas.map((l) => ({ nombre: l.producto.nombre, cantidad: l.cantidad, precioUnitario: l.precioUnitario })),
        });
      } catch (e) {
        console.error("[email] no se pudo enviar:", (e as Error).message);
      }
    } else {
      console.log(`[webhook] pedido ${pedidoId} ya estaba procesado: se ignora`);
    }
  }

  // 4. Sesion de pago caducada: el pedido abandonado pasa a CANCELADO
  if (evento.type === "checkout.session.expired") {
    const pedidoId = leerPedidoId(evento.data.object);
    if (pedidoId === null) return Response.json({ recibido: true });

    // Misma idempotencia que arriba: solo se cancela si sigue PENDIENTE (nunca uno ya pagado).
    // No se repone stock: solo se descuenta al pagar, y este pedido nunca se pago.
    const { count } = await prisma.pedido.updateMany({
      where: { id: pedidoId, estado: "PENDIENTE" },
      data: { estado: "CANCELADO" },
    });
    console.log(
      count === 1
        ? `[webhook] pedido ${pedidoId} CANCELADO: su checkout caduco sin pagarse`
        : `[webhook] pedido ${pedidoId} no estaba PENDIENTE: se ignora la caducidad`,
    );
  }

  // 5. Responder 200 rapido: si no, Stripe reintenta durante dias
  return Response.json({ recibido: true });
}

// El pedidoId viaja en metadata desde la Server Action del checkout. Un evento sin el (por ejemplo, uno lanzado
// con `stripe trigger`, o una sesion creada fuera de la tienda) no es nuestro: se registra y se responde 200,
// porque un error 500 haria que Stripe lo reintentase durante dias sin arreglar nada.
function leerPedidoId(sesion: Stripe.Checkout.Session): number | null {
  const pedidoId = Number(sesion.metadata?.pedidoId);
  if (Number.isInteger(pedidoId) && pedidoId > 0) return pedidoId;
  console.warn(`[webhook] sesion ${sesion.id} sin pedidoId valido en metadata: se ignora`);
  return null;
}
