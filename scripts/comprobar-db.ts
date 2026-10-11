// Comprueba que la base de datos responde (equivale a "docker ps" + "pg_isready" en la version con Docker).
//   npx tsx scripts/comprobar-db.ts
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env");

  const inicio = Date.now();
  const db = new Client({ connectionString: url });
  await db.connect();
  const { rows } = await db.query(
    "select current_database() as base, current_user as usuario, version() as version, now() as hora"
  );
  await db.end();

  const r = rows[0];
  console.log("Conexion OK en", Date.now() - inicio, "ms");
  console.log("Servidor :", new URL(url).hostname.replace(/^ep-[^.]+/, "ep-****"));
  console.log("Entorno  :", entorno(url));
  console.log("Base     :", r.base);
  console.log("Usuario  :", r.usuario);
  console.log("Version  :", String(r.version).split(" on ")[0]);
  console.log("Hora BD  :", new Date(r.hora).toISOString());
}

// ¿Esta URL es la de produccion? Se compara el servidor (sin "-pooler") con el de .env.produccion, si existe.
// Asi se ve si el .env local apunta a la rama de desarrollo de Neon o, por error, a la de produccion.
function entorno(url: string): string {
  const servidor = (u: string) => new URL(u.replace(/^"|"$/g, "")).hostname.replace("-pooler", "");
  if (!existsSync(".env.produccion")) return "desconocido (no hay .env.produccion para comparar)";
  const prod = readFileSync(".env.produccion", "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1];
  if (!prod) return "desconocido (.env.produccion no tiene DATABASE_URL)";
  return servidor(url) === servidor(prod) ? "PRODUCCION (cuidado: es la base de la tienda publicada)" : "desarrollo (no es la de produccion)";
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
