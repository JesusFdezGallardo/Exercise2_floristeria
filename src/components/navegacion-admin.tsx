// Pestañas del panel de admin: Pedidos y Productos. Solo enlaces (Server Component).
import Link from "next/link";

const PESTANAS = [
  { clave: "pedidos", href: "/admin", texto: "Pedidos" },
  { clave: "productos", href: "/admin/productos", texto: "Productos" },
] as const;

export function NavegacionAdmin({ activa }: { activa: (typeof PESTANAS)[number]["clave"] }) {
  return (
    <nav aria-label="Secciones del admin" className="flex gap-2 text-sm">
      {PESTANAS.map((p) => (
        <Link key={p.clave} href={p.href} aria-current={p.clave === activa ? "page" : undefined}
          className={`rounded-full border px-3 py-1 ${p.clave === activa ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}
