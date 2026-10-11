// Pagina de registro. Toda cuenta nueva es de cliente; los admins se crean con "npm run crear-admin".
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioRegistro } from "@/components/formulario-registro";
import { destinoSeguro } from "@/lib/cuentas";
import { usuarioActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Crear cuenta" };

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function Registro({ searchParams }: Props) {
  const destino = destinoSeguro((await searchParams).callbackUrl);
  if (await usuarioActual()) redirect(destino);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24">
      <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
      <p className="text-sm text-muted-foreground">Con tu cuenta podrás pagar y ver el historial de tus pedidos.</p>
      <FormularioRegistro destino={destino} />
    </main>
  );
}
