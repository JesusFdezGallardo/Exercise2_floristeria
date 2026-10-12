// Lineas, productos, envio y total de un pedido (ResumenPedido) y a quien y donde se entrega (BloqueEntrega).
// Los usan el detalle del admin, el de "Mis pedidos" y la pagina de exito. Los pedidos de antes de los envios
// (envioZona null) se pintan como antes: sin linea de envio.
import type { ReactNode } from "react";
import type { Entrega } from "@/lib/envio";
import { formatearPrecio } from "@/lib/formato";

type Linea = { id: number; cantidad: number; precioUnitario: number; producto: { nombre: string } };
type Props = { lineas: Linea[]; total: number; gastosEnvio: number; envioZona: string | null; cabecera?: ReactNode };

export function ResumenPedido({ lineas, total, gastosEnvio, envioZona, cabecera }: Props) {
  return (
    <div className="rounded-xl border p-5">
      {cabecera}
      <ul className={`space-y-1 text-sm ${cabecera ? "mt-3" : ""}`}>
        {lineas.map((l) => (
          <li key={l.id} className="flex justify-between">
            <span>{l.cantidad} × {l.producto.nombre}</span>
            <span className="tabular-nums">{formatearPrecio(l.precioUnitario * l.cantidad)}</span>
          </li>
        ))}
      </ul>
      {envioZona && (
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <p className="flex justify-between"><span>Productos</span><span className="tabular-nums">{formatearPrecio(total - gastosEnvio)}</span></p>
          <p className="flex justify-between">
            <span>Envío · {envioZona}</span>
            <span className="tabular-nums">{gastosEnvio === 0 ? "Gratis" : formatearPrecio(gastosEnvio)}</span>
          </p>
        </div>
      )}
      <p className="mt-3 flex justify-between border-t pt-3 font-semibold">
        <span>Total</span><span className="tabular-nums">{formatearPrecio(total)}</span>
      </p>
    </div>
  );
}

export function BloqueEntrega({ entrega }: { entrega: Entrega }) {
  return (
    <div className="rounded-xl border p-5 text-sm">
      <h2 className="mb-2 font-semibold">Entrega</h2>
      <p>{entrega.nombre} · {entrega.telefono}</p>
      <p>{entrega.direccion}</p>
      <p>{entrega.cp} {entrega.ciudad}</p>
      {entrega.mensaje && (
        <p className="mt-3 whitespace-pre-line italic text-muted-foreground">Tarjeta: «{entrega.mensaje}»</p>
      )}
    </div>
  );
}
