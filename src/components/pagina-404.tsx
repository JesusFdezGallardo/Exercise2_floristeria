// Bloque visual de las paginas 404: lo usan app/not-found.tsx (general) y producto/[id]/not-found.tsx (ficha).
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagina404({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="text-muted-foreground">{texto}</p>
      {/* Base UI (el shadcn actual): un enlace con aspecto de boton = render + nativeButton={false} */}
      <Button render={<Link href="/" />} nativeButton={false}>
        Volver al catálogo
      </Button>
    </main>
  );
}
