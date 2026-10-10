// Comprueba que la base de datos responde (equivale a "docker ps" + "pg_isready" en la version con Docker).
//   npx tsx scripts/comprobar-db.ts
import "dotenv/config";
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
  console.log("Base     :", r.base);
  console.log("Usuario  :", r.usuario);
  console.log("Version  :", String(r.version).split(" on ")[0]);
  console.log("Hora BD  :", new Date(r.hora).toISOString());
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
