// Estados del pedido y que cambios puede hacer el ADMIN. (PENDIENTE -> PAGADO solo lo hace el webhook.)
import type { EstadoPedido } from "@/generated/prisma/enums";

export const TRANSICIONES_ADMIN: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE: ["CANCELADO"], // un checkout abandonado se puede cancelar
  PAGADO: ["ENVIADO"],
  ENVIADO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

export function puedeCambiar(de: EstadoPedido, a: EstadoPedido): boolean {
  return TRANSICIONES_ADMIN[de].includes(a);
}

export const ETIQUETA: Record<EstadoPedido, string> = {
  PENDIENTE: "Pendiente de pago",
  PAGADO: "Pagado",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const ESTADOS = Object.keys(TRANSICIONES_ADMIN) as EstadoPedido[];
