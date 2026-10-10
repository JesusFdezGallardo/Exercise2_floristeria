// Catalogo (Server Component): busqueda y filtros resueltos en el servidor a partir de la URL.
import Link from "next/link";
import { Filtros } from "@/components/filtros";
import { TarjetaProducto } from "@/components/tarjeta-producto";
import { buscarProductos, leerFiltros, listarCategorias } from "@/lib/catalogo";

// En Next 15 searchParams es una Promise: hay que esperarla
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Catalogo({ searchParams }: Props) {
  const filtros = leerFiltros(await searchParams);
  const [productos, categorias] = await Promise.all([buscarProductos(filtros), listarCategorias()]);
  const hayFiltros = Boolean(filtros.q || filtros.categoria || filtros.min !== null || filtros.max !== null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Catalogo</h1>
      <div className="mt-6">
        <Filtros filtros={filtros} categorias={categorias} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {productos.length} {productos.length === 1 ? "producto" : "productos"}
        {hayFiltros && (
          <>
            {" · "}
            <Link href="/" className="underline underline-offset-4">
              quitar filtros
            </Link>
          </>
        )}
      </p>

      {productos.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">Ningun producto coincide con la busqueda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} />
          ))}
        </div>
      )}
    </main>
  );
}
