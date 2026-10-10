// Etiqueta de color para el estado de un pedido
import type { EstadoPedido } from "@/generated/prisma/enums";
import { ETIQUETA } from "@/lib/estados";

const COLOR: Record<EstadoPedido, string> = {
  PENDIENTE: "bg-amber-50 text-amber-800 ring-amber-200",
  PAGADO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ENVIADO: "bg-sky-50 text-sky-800 ring-sky-200",
  ENTREGADO: "bg-violet-50 text-violet-800 ring-violet-200",
  CANCELADO: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export function BadgeEstado({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${COLOR[estado]}`}>
      {ETIQUETA[estado]}
    </span>
  );
}
