"use client";
// Formulario de los datos de un producto en el admin: nombre, descripcion, precio, categoria y visible.
// El stock NO va aqui: tiene sus propios formularios (reponer y corregir). Llama a la Server Action guardarProducto.
// Los campos son no controlados: tras enviar, React los reinicia a su defaultValue, que es lo que devuelve la accion.
import { useActionState, useEffect } from "react";
import { guardarProducto, type EstadoDatos, type ValoresProducto } from "@/app/admin/productos/actions";
import { Campo, MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_DESCRIPCION, MAX_NOMBRE, primerCampoConErrorProducto } from "@/lib/productos-admin";

// Mismo aspecto que Input para el textarea y el select
const CLASE_CAMPO =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

type Props = { id: number; categorias: { id: number; nombre: string }[]; inicial: ValoresProducto };

export function FormularioProducto({ id, categorias, inicial }: Props) {
  const [estado, accion, pendiente] = useActionState<EstadoDatos, FormData>(guardarProducto, {});
  const v = estado.valores ?? inicial;
  const errores = estado.errores ?? {};

  // Tras un error, el foco va al primer campo que lo tiene (en el movil puede quedar fuera de la pantalla)
  useEffect(() => {
    const campo = primerCampoConErrorProducto(estado.errores ?? {});
    if (campo) document.getElementsByName(campo)[0]?.focus();
  }, [estado]);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <Campo etiqueta="Nombre" error={errores.nombre}>
        <Input name="nombre" maxLength={MAX_NOMBRE} defaultValue={v.nombre} aria-invalid={!!errores.nombre} />
      </Campo>
      <Campo etiqueta="Descripción" error={errores.descripcion}>
        <textarea name="descripcion" rows={4} maxLength={MAX_DESCRIPCION} defaultValue={v.descripcion}
          aria-invalid={!!errores.descripcion} className={CLASE_CAMPO} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Precio (€)" error={errores.precio} ayuda="Por ejemplo: 45,90">
          <Input name="precio" inputMode="decimal" maxLength={12} defaultValue={v.precio} aria-invalid={!!errores.precio} />
        </Campo>
        <Campo etiqueta="Categoría" error={errores.categoriaId}>
          <select name="categoriaId" defaultValue={v.categoriaId} aria-invalid={!!errores.categoriaId} className={CLASE_CAMPO}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="visible" defaultChecked={v.visible} className="size-4" />
        Visible en la tienda
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendiente}>{pendiente ? "Guardando..." : "Guardar"}</Button>
        <MensajeResultado ok={estado.ok} error={estado.error} />
      </div>
    </form>
  );
}
