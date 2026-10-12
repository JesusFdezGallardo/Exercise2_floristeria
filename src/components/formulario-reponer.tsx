"use client";
// Reponer: suma las unidades que han llegado. En la BD es un increment atomico: no pisa las ventas que entren a la vez.
import { useActionState } from "react";
import { reponerStock, type EstadoStock } from "@/app/admin/productos/actions";
import { Campo, MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormularioReponer({ id, stock }: { id: number; stock: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoStock, FormData>(reponerStock, {});
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">Stock actual: <span className="font-semibold tabular-nums">{stock}</span></p>
      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Unidades que han llegado">
          <Input name="unidades" inputMode="numeric" maxLength={4} required className="w-32" />
        </Campo>
        <Button type="submit" disabled={pendiente}>{pendiente ? "Añadiendo..." : "Añadir"}</Button>
      </div>
      <MensajeResultado ok={estado.ok} error={estado.error} />
    </form>
  );
}
