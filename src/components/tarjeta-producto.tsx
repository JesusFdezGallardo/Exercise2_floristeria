// Tarjeta de producto de la rejilla del catalogo (Server Component).
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatearPrecio } from "@/lib/formato";

type Props = {
  producto: { id: number; nombre: string; precio: number; imagen: string; stock: number; categoria: { nombre: string } };
};

export function TarjetaProducto({ producto }: Props) {
  const agotado = producto.stock === 0;
  return (
    <Link href={`/producto/${producto.id}`} className="group">
      <Card className="h-full pt-0 transition-shadow group-hover:shadow-md">
        {/* next/image: reserva el hueco (width/height) y carga la imagen solo cuando se ve */}
        <Image
          src={producto.imagen}
          alt={producto.nombre}
          width={500}
          height={500}
          className={`aspect-square w-full object-cover ${agotado ? "opacity-50" : ""}`}
        />
        <CardContent className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{producto.categoria.nombre}</Badge>
            {agotado && <Badge variant="destructive">Agotado</Badge>}
          </div>
          <h3 className="font-medium leading-snug">{producto.nombre}</h3>
          <p className="mt-auto text-lg font-semibold">{formatearPrecio(producto.precio)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
