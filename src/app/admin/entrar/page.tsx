"use client";
// Pagina de entrada al panel: un formulario que llama a la Server Action "entrar".
import { useActionState } from "react";
import { entrar } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Entrar() {
  const [estado, accion, pendiente] = useActionState(entrar, { error: "" });
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24">
      <h1 className="text-2xl font-bold tracking-tight">Panel de admin</h1>
      <p className="text-sm text-muted-foreground">Zona privada de Tienda Volta.</p>
      <form action={accion} className="flex flex-col gap-3">
        <Input name="clave" type="password" placeholder="Contrasena" autoComplete="current-password" required />
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Comprobando..." : "Entrar"}
        </Button>
        {estado?.error && <p className="text-sm text-destructive">{estado.error}</p>}
      </form>
    </main>
  );
}
