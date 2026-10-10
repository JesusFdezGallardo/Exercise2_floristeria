// Cabecera de la tienda (Server Component). Solo el icono del carrito necesita el navegador.
import Link from "next/link";
import { IconoCarrito } from "@/components/icono-carrito";

export function Cabecera() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">V</span>
          <span className="text-lg font-semibold tracking-tight">Tienda Volta</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Catalogo
          </Link>
          <IconoCarrito />
        </nav>
      </div>
    </header>
  );
}
