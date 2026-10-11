// Busqueda sin tildes: PostgreSQL con ILIKE distingue "i" de "í", asi que guardamos el nombre ya normalizado
// en Producto.nombreBusqueda y buscamos en esa columna con lo que escribe el cliente normalizado igual.
// Funcion pura (sin Prisma): la usan el seed, el catalogo y los tests.
// OJO: la migracion 20261011120000_busqueda_sin_tildes rellena las filas existentes con translate() en SQL; si cambias
// lo que hace esta funcion, las filas viejas no cambian solas (npm run seed las regenera, pero borra los pedidos).
export function normalizar(texto: string): string {
  // NFD separa "í" en "i" + tilde combinable (U+0300-U+036F), que luego se quita. Igual con ü y ñ.
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Prisma NO escapa los comodines de LIKE en `contains`: sin esto, buscar "_" devolveria todo el catalogo.
// En PostgreSQL el caracter de escape de LIKE por defecto es la barra invertida, asi que se escapa ella tambien.
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, "\\$&");
}
