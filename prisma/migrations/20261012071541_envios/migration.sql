-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "envioCiudad" TEXT,
ADD COLUMN     "envioCp" TEXT,
ADD COLUMN     "envioDireccion" TEXT,
ADD COLUMN     "envioNombre" TEXT,
ADD COLUMN     "envioTelefono" TEXT,
ADD COLUMN     "envioZona" TEXT,
ADD COLUMN     "gastosEnvio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mensajeTarjeta" TEXT;
