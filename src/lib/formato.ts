// Los precios viajan en centimos (4990) y solo se formatean al pintarlos: "49,90 €"
const euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatearPrecio(centimos: number): string {
  return euros.format(centimos / 100);
}
