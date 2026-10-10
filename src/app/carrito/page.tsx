// Pagina del carrito. La pagina es de servidor, pero el contenido vive en el navegador (Zustand):
// por eso delega en un componente de cliente.
import type { Metadata } from "next";
import { VistaCarrito } from "@/components/vista-carrito";

export const metadata: Metadata = { title: "Carrito · Tienda Volta" };

export default function PaginaCarrito() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Tu carrito</h1>
      <VistaCarrito />
    </main>
  );
}
