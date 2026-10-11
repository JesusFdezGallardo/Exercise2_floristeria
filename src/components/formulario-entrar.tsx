"use client";
// Formulario de entrada: llama a la Server Action "entrar" y muestra su error sin recargar la pagina.
import { useActionState } from "react";
import Link from "next/link";
import { entrar } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormularioEntrar({ destino }: { destino: string }) {
  const [estado, accion, pendiente] = useActionState(entrar, { error: "" });
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="destino" value={destino} />
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required
        defaultValue={estado.valores?.email} />
      <Input name="contrasena" type="password" placeholder="Contraseña" autoComplete="current-password" required />
      <Button type="submit" disabled={pendiente}>{pendiente ? "Comprobando..." : "Entrar"}</Button>
      {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
      <p className="text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro?callbackUrl=${encodeURIComponent(destino)}`} className="underline underline-offset-4">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
