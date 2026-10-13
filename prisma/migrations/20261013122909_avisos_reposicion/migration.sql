-- CreateTable
CREATE TABLE "AvisoReposicion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEn" TIMESTAMP(3),

    CONSTRAINT "AvisoReposicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvisoReposicion_productoId_enviadoEn_idx" ON "AvisoReposicion"("productoId", "enviadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "AvisoReposicion_usuarioId_productoId_key" ON "AvisoReposicion"("usuarioId", "productoId");

-- AddForeignKey
ALTER TABLE "AvisoReposicion" ADD CONSTRAINT "AvisoReposicion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoReposicion" ADD CONSTRAINT "AvisoReposicion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
