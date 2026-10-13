"use client";
// Corregir: fija el stock a un valor (para recuentos). Lleva en un campo oculto el stock que se vio al pintar la
// pagina (stockLeido): si ha cambiado (una venta, una reposicion en otra pestaña), la accion no guarda y avisa.
// El campo visible es controlado y sigue al stock del servidor: si no, tras reponer seguiria mostrando el numero
// viejo y al guardar se volveria a el sin aviso (stockLeido ya seria el nuevo).
import { useActionState, useState } from "react";
import { corregirStock, type EstadoStock } from "@/app/admin/productos/actions";
import { Campo, MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormularioCorregirStock({ id, stock }: { id: number; stock: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoStock, FormData>(corregirStock, {});
  const [valor, setValor] = useState(String(stock));
  // Si el stock cambia en el servidor, el campo pasa al valor nuevo (patron de React para ajustar estado a una prop)
  const [visto, setVisto] = useState(stock);
  if (visto !== stock) {
    setVisto(stock);
    setValor(String(stock));
  }

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stockLeido" value={stock} />
      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Stock real">
          <Input name="stock" inputMode="numeric" maxLength={4} required className="w-32" value={valor}
            onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Button type="submit" variant="outline" disabled={pendiente}>{pendiente ? "Guardando..." : "Guardar recuento"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Para recuentos. Para lo que llega, usa Reponer.</p>
      <MensajeResultado ok={estado.ok} error={estado.error} />
    </form>
  );
}
