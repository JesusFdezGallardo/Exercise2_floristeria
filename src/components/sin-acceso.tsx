// Lo que ve quien ha entrado con una cuenta que no es ADMIN al abrir el panel
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SinAcceso() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">No tienes acceso</h1>
      <p className="text-muted-foreground">Esta zona es solo para la floristería y tu cuenta no tiene permiso de administración.</p>
      <Button render={<Link href="/" />} nativeButton={false}>Volver al catálogo</Button>
    </main>
  );
}
