"use server";
// Server Action del checkout: se ejecuta SOLO en el servidor, aunque la llame un boton del navegador.
// Del carrito solo nos fiamos de QUE productos y CUANTOS. Precios y stock se leen de la base de datos.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export type ArticuloCheckout = { id: number; cantidad: number };

export async function crearCheckout(articulos: ArticuloCheckout[]): Promise<{ error: string }> {
  // 1. Validar lo que llega del navegador (lo puede haber tocado cualquiera)
  const limpios = articulos.filter((a) => Number.isInteger(a.id) && Number.isInteger(a.cantidad) && a.cantidad > 0);
  if (limpios.length === 0) return { error: "El carrito esta vacio" };

  // 2. Precios y stock de VERDAD, desde la base de datos
  const productos = await prisma.producto.findMany({ where: { id: { in: limpios.map((a) => a.id) } } });
  const lineas = [];
  for (const a of limpios) {
    const p = productos.find((x) => x.id === a.id);
    if (!p) return { error: "Un producto del carrito ya no existe" };
    if (p.stock < a.cantidad) return { error: `Solo quedan ${p.stock} unidades de ${p.nombre}` };
    lineas.push({ producto: p, cantidad: a.cantidad });
  }
  const total = lineas.reduce((t, l) => t + l.producto.precio * l.cantidad, 0);

  // 3. El pedido nace PENDIENTE. Solo el webhook lo pasara a PAGADO
  const pedido = await prisma.pedido.create({
    data: {
      email: "pendiente@checkout", // Stripe nos dara el email real al pagar
      total,
      lineas: {
        create: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad, precioUnitario: l.producto.precio })),
      },
    },
  });

  // 4. La sesion de Stripe Checkout: la pagina de pago la pone Stripe, no nosotros
  const origen = (await headers()).get("origin") ?? "http://localhost:3000";
  const sesion = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineas.map((l) => ({
      quantity: l.cantidad,
      price_data: {
        currency: "eur",
        unit_amount: l.producto.precio, // centimos, igual que en nuestra base
        product_data: { name: l.producto.nombre },
      },
    })),
    metadata: { pedidoId: String(pedido.id) }, // el webhook lo usara para saber que pedido confirmar
    success_url: `${origen}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origen}/checkout/cancelado`,
  });

  await prisma.pedido.update({ where: { id: pedido.id }, data: { stripeSessionId: sesion.id } });

  // 5. redirect() FUERA de cualquier try/catch: funciona lanzando un error especial que Next captura
  redirect(sesion.url!);
}
