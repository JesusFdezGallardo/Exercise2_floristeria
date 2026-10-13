"use client";
// Formulario de entrega de /checkout/envio. El envio que se ve aqui es una VISTA PREVIA con los precios del carrito:
// el que se cobra lo recalcula crearCheckout con los de la BD. Al pagar manda ids, cantidades y la entrega (no precios).
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearCheckout } from "@/app/checkout/actions";
import { Campo } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { calcularEnvio, MAX_MENSAJE, primerCampoConError, type CampoEntrega, type DatosEntrega, type ErroresEntrega } from "@/lib/envio";
import { formatearPrecio } from "@/lib/formato";
import { calcularTotal, useCarrito } from "@/store/carrito";

const ENTRAR = "/entrar?callbackUrl=%2Fcheckout%2Fenvio";
const VACIO: DatosEntrega = { nombre: "", telefono: "", direccion: "", cp: "", ciudad: "", mensaje: "" };

export function FormularioEnvio() {
  const lineas = useCarrito((s) => s.lineas);
  const [datos, setDatos] = useState<DatosEntrega>(VACIO);
  const [errores, setErrores] = useState<ErroresEntrega>({});
  const [pendiente, empezar] = useTransition();
  const router = useRouter();

  if (lineas.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Tu carrito está vacío.</p>
        <Button render={<Link href="/" />} nativeButton={false}>
          Ver el catálogo
        </Button>
      </div>
    );
  }

  const subtotal = calcularTotal(lineas);
  // Vista previa en cuanto hay 5 cifras; antes no se dice nada (ni error)
  const envio = datos.cp.replaceAll(" ", "").length === 5 ? calcularEnvio(datos.cp, subtotal) : null;

  const cambiar = (campo: CampoEntrega) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDatos({ ...datos, [campo]: e.target.value });
    setErrores({ ...errores, [campo]: undefined }); // el error se va al corregir
  };

  function pagar(e: FormEvent) {
    e.preventDefault();
    empezar(async () => {
      // Si todo va bien, la accion redirige a Stripe y esta linea nunca devuelve nada
      const r = await crearCheckout(lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })), datos);
      if (r?.necesitaLogin) router.push(ENTRAR); // la sesion caduco mientras rellenaba
      else if (r?.errores) {
        setErrores(r.errores);
        // En el movil los campos quedan por encima del boton: sin esto, parece que "Pagar" no hace nada
        toast.error("Revisa los datos de entrega");
        const campo = primerCampoConError(r.errores);
        if (campo) document.getElementsByName(campo)[0]?.focus();
      }
      else if (r?.error) toast.error(r.error);
    });
  }

  return (
    <form onSubmit={pagar} className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Quién lo recibe" error={errores.nombre}>
          <Input name="nombre" autoComplete="name" maxLength={80} value={datos.nombre} onChange={cambiar("nombre")}
            aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo etiqueta="Teléfono de quien lo recibe" error={errores.telefono} ayuda="Por si el repartidor no encuentra a nadie">
          <Input name="telefono" type="tel" autoComplete="tel" maxLength={20} value={datos.telefono}
            onChange={cambiar("telefono")} aria-invalid={!!errores.telefono} />
        </Campo>
        <Campo etiqueta="Dirección" error={errores.direccion} ayuda="Calle, número, piso y puerta">
          <Input name="direccion" autoComplete="street-address" maxLength={150} value={datos.direccion}
            onChange={cambiar("direccion")} aria-invalid={!!errores.direccion} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Campo etiqueta="Código postal" error={errores.cp ?? (envio && !envio.ok ? envio.error : undefined)}>
            <Input name="cp" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={datos.cp}
              onChange={cambiar("cp")} aria-invalid={!!errores.cp || (envio !== null && !envio.ok)} />
          </Campo>
          <Campo etiqueta="Ciudad" error={errores.ciudad}>
            <Input name="ciudad" autoComplete="address-level2" maxLength={60} value={datos.ciudad}
              onChange={cambiar("ciudad")} aria-invalid={!!errores.ciudad} />
          </Campo>
        </div>
        <Campo etiqueta="Mensaje para la tarjeta (opcional)" error={errores.mensaje}
          ayuda={`${datos.mensaje.length}/${MAX_MENSAJE}`}>
          <textarea name="mensaje" rows={3} maxLength={MAX_MENSAJE} value={datos.mensaje} onChange={cambiar("mensaje")}
            aria-invalid={!!errores.mensaje}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30" />
        </Campo>
      </div>

      <aside className="flex h-fit flex-col gap-3 rounded-xl border p-5 text-sm">
        <ul className="space-y-1">
          {lineas.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span>{l.cantidad} × {l.nombre}</span>
              <span className="tabular-nums">{formatearPrecio(l.precio * l.cantidad)}</span>
            </li>
          ))}
        </ul>
        <Separator />
        <p className="flex justify-between"><span>Productos</span><span className="tabular-nums">{formatearPrecio(subtotal)}</span></p>
        <p className="flex justify-between gap-3">
          <span>{envio?.ok ? envio.nombre : "Envío"}</span>
          <span className="tabular-nums">
            {envio?.ok ? (envio.coste === 0 ? "Gratis" : formatearPrecio(envio.coste)) : "Según el código postal"}
          </span>
        </p>
        {envio?.ok && envio.faltaParaGratis !== null && (
          <p className="text-muted-foreground">Te faltan {formatearPrecio(envio.faltaParaGratis)} para el envío gratis.</p>
        )}
        <Separator />
        <p className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatearPrecio(subtotal + (envio?.ok ? envio.coste : 0))}</span>
        </p>
        <Button type="submit" size="lg" disabled={pendiente || (envio !== null && !envio.ok)}>
          {pendiente ? "Preparando el pago..." : "Pagar con tarjeta"}
        </Button>
        <p className="text-xs text-muted-foreground">Pago seguro con Stripe (modo test: no se cobra nada)</p>
      </aside>
    </form>
  );
}
