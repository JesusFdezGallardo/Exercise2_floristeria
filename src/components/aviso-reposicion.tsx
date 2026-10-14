"use client";
// "Avisame cuando vuelva" en la ficha de un producto agotado, y el boton "Quitar" que tambien usa Mis avisos.
// Sin sesion es un enlace a /entrar que vuelve a la ficha (el aviso se pide con un clic mas, ya con sesion).
import Link from "next/link";
import { useActionState } from "react";
import { pedirAviso, quitarAviso, type EstadoAviso } from "@/app/producto/[id]/actions";
import { MensajeResultado } from "@/components/campo-formulario";
import { Button } from "@/components/ui/button";

type Props = { productoId: number; email: string | null; pendiente: boolean };

export function AvisoReposicion({ productoId, email, pendiente }: Props) {
  if (!email) {
    const entrar = `/entrar?callbackUrl=${encodeURIComponent(`/producto/${productoId}`)}`;
    return (
      <Button variant="outline" className="self-start" render={<Link href={entrar} />} nativeButton={false}>
        Avísame cuando vuelva
      </Button>
    );
  }
  if (pendiente) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p>Te avisaremos por email a <span className="font-medium">{email}</span></p>
        <QuitarAviso productoId={productoId} etiqueta="Quitar aviso" />
      </div>
    );
  }
  return <PedirAviso productoId={productoId} />;
}

function PedirAviso({ productoId }: { productoId: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoAviso, FormData>(pedirAviso, {});
  return (
    <form action={accion} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={productoId} />
      <Button type="submit" variant="outline" disabled={pendiente}>
        {pendiente ? "Guardando..." : "Avísame cuando vuelva"}
      </Button>
      <MensajeResultado error={estado.error} />
    </form>
  );
}

export function QuitarAviso({ productoId, etiqueta }: { productoId: number; etiqueta: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAviso, FormData>(quitarAviso, {});
  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="id" value={productoId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pendiente}>{pendiente ? "Quitando..." : etiqueta}</Button>
      <MensajeResultado error={estado.error} />
    </form>
  );
}
