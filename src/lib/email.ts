// Envio del email de confirmacion con Resend. Solo se llama desde el WEBHOOK (el punto fiable). La plantilla, en plantilla-email.ts.
import "server-only";
import { Resend } from "resend";
import { plantillaConfirmacion, type PedidoEmail } from "@/lib/plantilla-email";
import { TIENDA } from "@/lib/tienda";

export async function enviarConfirmacion(p: PedidoEmail) {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("[email] sin RESEND_API_KEY: no se envia");
    return;
  }
  // Sin dominio propio verificado, Resend solo deja enviar DESDE onboarding@resend.dev
  // y SOLO A la direccion con la que te registraste. En desarrollo la ponemos en EMAIL_PRUEBAS.
  const para = process.env.EMAIL_PRUEBAS || p.email;
  const resend = new Resend(clave);
  const { data, error } = await resend.emails.send({
    from: `${TIENDA.nombre} <onboarding@resend.dev>`,
    to: para,
    subject: `Pedido #${p.id} confirmado · ${TIENDA.nombre}`,
    html: plantillaConfirmacion(p),
  });
  if (error) console.error("[email] Resend devolvio un error:", error.message);
  else console.log(`[email] confirmacion del pedido ${p.id} enviada (id ${data?.id})`);
}
