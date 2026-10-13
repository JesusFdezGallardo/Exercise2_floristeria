// Insignias de un producto en el admin: Agotado (stock 0 o negativo) y Oculto (no se ve en la tienda).
// Mismo estilo que BadgeEstado. Si esta a la venta, no pinta nada.
const ESTILO = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1";

export function BadgeProducto({ stock, visible }: { stock: number; visible: boolean }) {
  return (
    <span className="inline-flex gap-1.5">
      {stock <= 0 && <span className={`${ESTILO} bg-amber-50 text-amber-800 ring-amber-200`}>Agotado</span>}
      {!visible && <span className={`${ESTILO} bg-neutral-100 text-neutral-600 ring-neutral-200`}>Oculto</span>}
    </span>
  );
}
