"use client";
// Formulario de registro: llama a la Server Action "registrarse". Los textos se conservan si hay un error.
import { useActionState } from "react";
import Link from "next/link";
import { registrarse } from "@/app/entrar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MINIMO_CONTRASENA } from "@/lib/cuentas";

export function FormularioRegistro({ destino }: { destino: string }) {
  const [estado, accion, pendiente] = useActionState(registrarse, { error: "" });
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="destino" value={destino} />
      <Input name="nombre" placeholder="Nombre" autoComplete="name" required defaultValue={estado.valores?.nombre} />
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required
        defaultValue={estado.valores?.email} />
      <Input name="contrasena" type="password" placeholder={`Contraseña (mínimo ${MINIMO_CONTRASENA} caracteres)`}
        autoComplete="new-password" minLength={MINIMO_CONTRASENA} required />
      <Input name="repetir" type="password" placeholder="Repite la contraseña" autoComplete="new-password"
        minLength={MINIMO_CONTRASENA} required />
      <Button type="submit" disabled={pendiente}>{pendiente ? "Creando la cuenta..." : "Crear cuenta"}</Button>
      {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/entrar?callbackUrl=${encodeURIComponent(destino)}`} className="underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
