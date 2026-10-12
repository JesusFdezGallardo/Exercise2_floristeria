"use server";
// Server Action del checkout: se ejecuta SOLO en el servidor, aunque la llame un boton del navegador.
// Del carrito solo nos fiamos de QUE productos y CUANTOS. Precios y stock se leen de la base de datos.
// La entrega y el envio tambien se validan y se calculan aqui: lo que enseña el formulario es solo una vista previa.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { calcularEnvio, validarEntrega, type CampoEntrega, type ErroresEntrega } from "@/lib/envio";
import { prepararPago, subtotalDe } from "@/lib/pago";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/sesion";
import { stripe } from "@/lib/stripe";

export type ArticuloCheckout = { id: number; cantidad: number };
export type ResultadoCheckout = { error?: string; errores?: ErroresEntrega; necesitaLogin?: true };

export async function crearCheckout(
  articulos: ArticuloCheckout[],
  datosEntrega: Partial<Record<CampoEntrega, unknown>>,
): Promise<ResultadoCheckout> {
  // 0. Para pagar hay que haber entrado. Se comprueba aqui y no solo en el boton: la accion se puede llamar desde fuera
  const usuario = await usuarioActual();
  if (!usuario) return { necesitaLogin: true };

  // 1. La entrega, lo primero: asi el cliente ve todos los errores del formulario de una vez
  const validada = validarEntrega(datosEntrega ?? {});
  if (!validada.ok) return { errores: validada.errores };
  const { entrega } = validada;

  // 2. Validar lo que llega del navegador (lo puede haber tocado cualquiera)
  const limpios = (Array.isArray(articulos) ? articulos : []).filter(
    (a) => Number.isInteger(a?.id) && Number.isInteger(a?.cantidad) && a.cantidad > 0,
  );
  if (limpios.length === 0) return { error: "El carrito está vacío" };

  // 3. Precios y stock de VERDAD, desde la base de datos
  const productos = await prisma.producto.findMany({ where: { id: { in: limpios.map((a) => a.id) } } });
  const lineas = [];
  for (const a of limpios) {
    const p = productos.find((x) => x.id === a.id);
    if (!p) return { error: "Un producto del carrito ya no existe" };
    if (p.stock < a.cantidad) return { error: `Solo quedan ${p.stock} unidades de ${p.nombre}` };
    lineas.push({ producto: p, cantidad: a.cantidad });
  }
  const lineasPago = lineas.map((l) => ({ nombre: l.producto.nombre, precio: l.producto.precio, cantidad: l.cantidad }));

  // 4. El envio con el subtotal REAL (el de la BD): el envio gratis no se decide con los precios del navegador
  const envio = calcularEnvio(entrega.cp, subtotalDe(lineasPago));
  if (!envio.ok) return { errores: { cp: envio.error } };
  const { total, lineItems, shippingOptions } = prepararPago(lineasPago, envio);

  // 5. El pedido nace PENDIENTE, con su entrega y su envio copiados. Solo el webhook lo pasara a PAGADO
  const pedido = await prisma.pedido.create({
    data: {
      email: usuario.email, // el de su cuenta; Stripe lo muestra fijo
      usuarioId: usuario.id,
      total, // productos + envio
      gastosEnvio: envio.coste,
      envioZona: envio.nombre,
      envioNombre: entrega.nombre,
      envioTelefono: entrega.telefono,
      envioDireccion: entrega.direccion,
      envioCp: entrega.cp,
      envioCiudad: entrega.ciudad,
      mensajeTarjeta: entrega.mensaje,
      lineas: {
        create: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad, precioUnitario: l.producto.precio })),
      },
    },
  });

  // 6. La sesion de Stripe Checkout: la pagina de pago la pone Stripe, no nosotros
  const origen = (await headers()).get("origin") ?? "http://localhost:3000";
  const sesion = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: usuario.email, // el cliente no puede cambiarlo en la pagina de Stripe
    line_items: lineItems,
    shipping_options: shippingOptions, // Stripe lo suma: amount_total = total
    metadata: { pedidoId: String(pedido.id) }, // el webhook lo usara para saber que pedido confirmar
    success_url: `${origen}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origen}/checkout/cancelado`,
  });

  await prisma.pedido.update({ where: { id: pedido.id }, data: { stripeSessionId: sesion.id } });

  // 7. redirect() FUERA de cualquier try/catch: funciona lanzando un error especial que Next captura
  redirect(sesion.url!);
}
