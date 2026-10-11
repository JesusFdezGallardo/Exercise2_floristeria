// Crea una cuenta de administrador o asciende una que ya existe. Es la UNICA forma de tener un ADMIN:
// la web solo crea clientes.
//   npm run crear-admin -- ana@ejemplo.com               (base de desarrollo, la del .env)
//   npm run crear-admin -- ana@ejemplo.com --produccion  (base de produccion, la de .env.produccion)
// Pide la contraseña por la terminal sin mostrarla. Si la cuenta existe, le pone esa contraseña nueva.
import { config } from "dotenv";
import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { cifrarContrasena } from "../src/lib/contrasenas";
import { MAXIMO_CONTRASENA, MINIMO_CONTRASENA } from "../src/lib/cuentas";

const args = process.argv.slice(2);
const produccion = args.includes("--produccion");
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();

config({ path: produccion ? ".env.produccion" : ".env", quiet: true });

// Un solo readline para todas las preguntas, leido con su iterador: guarda las lineas hasta que se piden
// (si la contraseña llega por una tuberia, las dos lineas llegan de golpe y no se pierde la segunda).
// terminal solo si stdin es una terminal de verdad: con una tuberia no hay teclas que ocultar
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
// Lo que se escribe no se muestra: readline no pinta nada; la pregunta la escribimos nosotros
(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
const lineas = rl[Symbol.asyncIterator]();

async function preguntarOculto(pregunta: string): Promise<string> {
  process.stdout.write(pregunta);
  const { value, done } = await lineas.next();
  process.stdout.write("\n");
  if (done) throw new Error("No se recibió la contraseña");
  return value;
}

async function main() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Uso: npm run crear-admin -- <email> [--produccion]");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error(`Falta DATABASE_URL en ${produccion ? ".env.produccion" : ".env"}`);
  console.log(`Base: ${produccion ? "PRODUCCION (la tienda publicada)" : "desarrollo (.env)"}`);

  const contrasena = await preguntarOculto("Contraseña: ");
  if (contrasena.length < MINIMO_CONTRASENA || contrasena.length > MAXIMO_CONTRASENA) {
    throw new Error(`La contraseña debe tener entre ${MINIMO_CONTRASENA} y ${MAXIMO_CONTRASENA} caracteres`);
  }
  if ((await preguntarOculto("Repítela: ")) !== contrasena) throw new Error("Las contraseñas no coinciden");
  rl.close();

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const hash = await cifrarContrasena(contrasena);
    const usuario = await prisma.usuario.upsert({
      where: { email },
      create: { email, nombre: "Admin", contrasena: hash, rol: "ADMIN" },
      update: { contrasena: hash, rol: "ADMIN" },
    });
    // Las sesiones abiertas con la contraseña anterior se cierran
    await prisma.sesion.deleteMany({ where: { usuarioId: usuario.id } });
    console.log(`OK: ${usuario.email} es ADMIN (id ${usuario.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
}).finally(() => rl.close());
