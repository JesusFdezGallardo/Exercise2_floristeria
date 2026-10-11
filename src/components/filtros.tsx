// Barra de busqueda y filtros. Es un Server Component: no hay estado en el navegador,
// todo vive en la URL (?q=...&categoria=...&min=...&max=...&orden=...).
import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Filtros as TFiltros } from "@/lib/catalogo";
import { LISTA_ORDENES, ORDEN_POR_DEFECTO } from "@/lib/orden";

type Props = { filtros: TFiltros; categorias: { nombre: string; slug: string }[] };

// Construye la URL del catalogo cambiando solo un parametro y conservando el resto
function urlCon(f: TFiltros, cambio: Partial<Record<keyof TFiltros, string>>) {
  const p = new URLSearchParams();
  // el orden por defecto no se escribe: el catalogo sin parametros sigue siendo "/"
  const orden = f.orden === ORDEN_POR_DEFECTO ? "" : f.orden;
  const v = { q: f.q, categoria: f.categoria, min: f.min?.toString() ?? "", max: f.max?.toString() ?? "", orden, ...cambio };
  for (const [k, val] of Object.entries(v)) if (val) p.set(k, val);
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}

export function Filtros({ filtros, categorias }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* next/form: un formulario GET que navega sin recargar la pagina (y funciona sin JavaScript) */}
      <Form action="/" className="flex flex-wrap items-end gap-3">
        {filtros.categoria && <input type="hidden" name="categoria" value={filtros.categoria} />}
        {filtros.orden !== ORDEN_POR_DEFECTO && <input type="hidden" name="orden" value={filtros.orden} />}
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Buscar
          <Input name="q" defaultValue={filtros.q} placeholder="rosas, girasoles, centro..." className="min-w-56" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Precio mín. (€)
          <Input name="min" type="number" min={0} defaultValue={filtros.min ?? ""} className="w-28" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Precio máx. (€)
          <Input name="max" type="number" min={0} defaultValue={filtros.max ?? ""} className="w-28" />
        </label>
        <Button type="submit">Filtrar</Button>
      </Form>

      {/* Categorias: enlaces normales. Cada filtro es una URL que se puede compartir */}
      <div className="flex flex-wrap gap-2">
        <Chip href={urlCon(filtros, { categoria: "" })} activo={!filtros.categoria}>
          Todas
        </Chip>
        {categorias.map((c) => (
          <Chip key={c.slug} href={urlCon(filtros, { categoria: c.slug })} activo={filtros.categoria === c.slug}>
            {c.nombre}
          </Chip>
        ))}
      </div>

      {/* Orden: tambien enlaces, conservando busqueda, categoria y precios */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Ordenar por:</span>
        {LISTA_ORDENES.map((o) => (
          <Chip
            key={o.valor}
            href={urlCon(filtros, { orden: o.valor === ORDEN_POR_DEFECTO ? "" : o.valor })}
            activo={filtros.orden === o.valor}
          >
            {o.etiqueta}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        activo ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
}
