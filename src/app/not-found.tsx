// Pagina 404 general: cualquier URL que no exista y los notFound() sin un not-found.tsx mas cercano
// (por ejemplo, un pedido inexistente en el admin). La ficha de producto tiene la suya en producto/[id]/not-found.tsx.
import { Pagina404 } from "@/components/pagina-404";

export default function NoEncontrado() {
  return <Pagina404 titulo="No encontramos esa página" texto="Puede que el enlace esté mal o que la página ya no exista." />;
}
