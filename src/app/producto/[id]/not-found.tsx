// 404 de la ficha de producto: Next la usa cuando producto/[id]/page.tsx llama a notFound().
import { Pagina404 } from "@/components/pagina-404";

export default function ProductoNoEncontrado() {
  return <Pagina404 titulo="No encontramos ese producto" texto="Puede que el enlace esté mal o que el producto ya no exista." />;
}
