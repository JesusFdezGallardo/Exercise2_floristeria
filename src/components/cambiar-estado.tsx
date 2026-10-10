"use client";
// Botones con los cambios de estado permitidos. Llaman a la Server Action cambiarEstado.
import { useTransition } from "react";
import { toast } from "sonner";
import { cambiarEstado } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { ETIQUETA } from "@/lib/estados";

export function CambiarEstado({ pedidoId, posibles }: { pedidoId: number; posibles: EstadoPedido[] }) {
  const [pendiente, empezar] = useTransition();

  if (posibles.length === 0) return <p className="text-sm text-muted-foreground">Este pedido ya no admite cambios.</p>;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Cambiar a:</span>
      {posibles.map((e) => (
        <Button key={e} disabled={pendiente} variant={e === "CANCELADO" ? "outline" : "default"}
          onClick={() =>
            empezar(async () => {
              const r = await cambiarEstado(pedidoId, e);
              if (r.error) toast.error(r.error);
              else toast.success(`Pedido #${pedidoId}: ${ETIQUETA[e]}`);
            })
          }>
          {ETIQUETA[e]}
        </Button>
      ))}
    </div>
  );
}
