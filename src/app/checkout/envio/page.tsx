// Paso de entrega: entre el carrito y Stripe. Sin sesion no se puede pagar, asi que se manda a entrar y de vuelta aqui.
// La pagina es de servidor; el formulario es de cliente porque el carrito vive en el navegador (Zustand).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioEnvio } from "@/components/formulario-envio";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entrega" };

export default async function PaginaEnvio() {
  if (!(await usuarioActual())) redirect("/entrar?callbackUrl=%2Fcheckout%2Fenvio");
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">¿Adónde llevamos el ramo?</h1>
      <FormularioEnvio />
    </main>
  );
}
