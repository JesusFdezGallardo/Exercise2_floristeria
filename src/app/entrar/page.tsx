// Pagina de entrada. Aqui manda el middleware (con ?callbackUrl=) y el carrito sin sesion.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioEntrar } from "@/components/formulario-entrar";
import { destinoSeguro } from "@/lib/cuentas";
import { usuarioActual } from "@/lib/sesion";
import { TIENDA } from "@/lib/tienda";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function Entrar({ searchParams }: Props) {
  const destino = destinoSeguro((await searchParams).callbackUrl);
  if (await usuarioActual()) redirect(destino); // ya ha entrado: nada que hacer aqui

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24">
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <p className="text-sm text-muted-foreground">Entra con tu cuenta de {TIENDA.nombre} para pagar y ver tus pedidos.</p>
      <FormularioEntrar destino={destino} />
    </main>
  );
}
