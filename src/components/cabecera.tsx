// Cabecera de la tienda (Server Component). El icono del carrito y el menu de la cuenta necesitan el navegador.
import Link from "next/link";
import { IconoCarrito } from "@/components/icono-carrito";
import { Logo } from "@/components/logo";
import { MenuCuenta } from "@/components/menu-cuenta";
import { usuarioActual } from "@/lib/sesion";
import { TIENDA } from "@/lib/tienda";

export async function Cabecera() {
  const usuario = await usuarioActual();
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8" />
          <span className="font-heading text-lg font-semibold tracking-tight">{TIENDA.nombre}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Catálogo
          </Link>
          <IconoCarrito />
          {usuario ? (
            <MenuCuenta nombre={usuario.nombre} esAdmin={usuario.rol === "ADMIN"} />
          ) : (
            <Link href="/entrar" className="text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
