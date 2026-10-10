// Pagina 404 de toda la tienda: la usa notFound() y cualquier URL que no exista.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">No encontramos ese producto</h1>
      <p className="text-muted-foreground">Puede que el enlace este mal o que el producto ya no exista.</p>
      {/* Base UI (el shadcn actual): un enlace con aspecto de boton = render + nativeButton={false} */}
      <Button render={<Link href="/" />} nativeButton={false}>
        Volver al catalogo
      </Button>
    </main>
  );
}
