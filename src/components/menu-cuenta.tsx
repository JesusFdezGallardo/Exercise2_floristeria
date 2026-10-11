"use client";
// Menu del usuario en la cabecera: inicial, "Mis pedidos", "Panel de admin" (solo admins) y "Salir".
// Es un <details> nativo; el cliente solo hace falta para cerrarlo al navegar.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { salir } from "@/app/entrar/actions";

const opcion = "rounded-md px-3 py-2 text-left hover:bg-muted";

export function MenuCuenta({ nombre, esAdmin }: { nombre: string; esAdmin: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const ruta = usePathname();
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [ruta]);

  return (
    <details ref={menu} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2" aria-label="Tu cuenta">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{nombre}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 flex w-48 flex-col rounded-lg border bg-background p-1 shadow-md">
        <Link href="/cuenta/pedidos" className={opcion}>Mis pedidos</Link>
        {esAdmin && <Link href="/admin" className={opcion}>Panel de admin</Link>}
        <form action={salir}>
          <button type="submit" className={`w-full ${opcion}`}>Salir</button>
        </form>
      </div>
    </details>
  );
}
