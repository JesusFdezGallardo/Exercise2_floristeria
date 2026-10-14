// Envio de emails con Resend: la confirmacion del pedido (solo desde el WEBHOOK, el punto fiable) y los avisos de
// reposicion (solo desde alReponer). Las plantillas, en plantilla-email.ts.
import "server-only";
import { Resend } from "resend";
import { plantillaAvisoReposicion, plantillaConfirmacion, type DatosAviso, type PedidoEmail } from "@/lib/plantilla-email";
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

export type AvisoEmail = DatosAviso & { email: string };

// Un lote de avisos (como mucho 100, el limite de Resend) en una sola llamada. Devuelve si salio:
// con false, alReponer devuelve esos avisos a pendientes para reintentarlo en la siguiente reposicion.
export async function enviarAvisosReposicion(avisos: AvisoEmail[]): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("[email] sin RESEND_API_KEY: los avisos de reposicion se quedan pendientes");
    return false;
  }
  const resend = new Resend(clave);
  const { error } = await resend.batch.send(
    avisos.map((a) => ({
      from: `${TIENDA.nombre} <onboarding@resend.dev>`,
      to: process.env.EMAIL_PRUEBAS || a.email, // sin dominio propio, Resend solo entrega a la cuenta (ver arriba)
      subject: `Vuelve a haber ${a.nombreProducto} · ${TIENDA.nombre}`,
      html: plantillaAvisoReposicion(a),
    })),
  );
  if (error) {
    console.error("[email] Resend devolvio un error con los avisos:", error.message);
    return false;
  }
  return true;
}
