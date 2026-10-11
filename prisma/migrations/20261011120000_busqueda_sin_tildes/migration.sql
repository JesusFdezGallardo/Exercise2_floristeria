-- Busqueda sin tildes: columna con el nombre en minusculas y sin tildes (ver src/lib/busqueda.ts).
-- 1. La columna se crea admitiendo NULL, porque ya hay productos.
ALTER TABLE "Producto" ADD COLUMN "nombreBusqueda" TEXT;

-- 2. Se rellena con lo mismo que hace normalizar() en JavaScript: quitar tildes, dieresis y virgulillas, y minusculas.
--    Las mayusculas acentuadas se quitan antes de lower() para no depender de la collation de la base.
UPDATE "Producto" SET "nombreBusqueda" = lower(translate(
  "nombre",
  'áéíóúàèìòùâêîôûäëïöüñçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑÇ',
  'aeiouaeiouaeiouaeiouncaeiouaeiouaeiouaeiounc'
));

-- 3. Ya rellena, pasa a obligatoria (como dice schema.prisma).
ALTER TABLE "Producto" ALTER COLUMN "nombreBusqueda" SET NOT NULL;
