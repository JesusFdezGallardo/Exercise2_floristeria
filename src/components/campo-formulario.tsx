// Piezas comunes de los formularios: etiqueta + campo + ayuda o error debajo, y el mensaje de resultado de una accion.
import type { ReactNode } from "react";

export function Campo({ etiqueta, error, ayuda, children }: { etiqueta: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {etiqueta}
      {children}
      {error ? <span className="font-normal text-destructive">{error}</span>
        : ayuda && <span className="font-normal text-muted-foreground">{ayuda}</span>}
    </label>
  );
}

// Resultado de una Server Action: el error en rojo o la confirmacion en verde (role para los lectores de pantalla)
export function MensajeResultado({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (ok) return <p role="status" className="text-sm text-emerald-700">{ok}</p>;
  return null;
}
