// Comprueba que las claves de Stripe (modo test) funcionan, sin cobrar nada.
//   npm run stripe:check
import "dotenv/config";
import Stripe from "stripe";

function tapar(clave = "") {
  return clave ? `${clave.slice(0, 8)}...${clave.slice(-4)}` : "(vacia)";
}

async function main() {
  const secreta = process.env.STRIPE_SECRET_KEY ?? "";
  const publica = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  console.log("Clave secreta   :", tapar(secreta));
  console.log("Clave publicable:", tapar(publica));
  if (!secreta.startsWith("sk_test_")) throw new Error("La clave secreta debe empezar por sk_test_");
  if (!publica.startsWith("pk_test_")) throw new Error("La clave publicable debe empezar por pk_test_");

  const stripe = new Stripe(secreta);
  const inicio = Date.now();
  const saldo = await stripe.balance.retrieve(); // llamada de solo lectura
  console.log("Conexion OK en", Date.now() - inicio, "ms");
  console.log("Modo            :", saldo.livemode ? "LIVE (cuidado!)" : "test");
  for (const s of saldo.available) {
    console.log(`Saldo disponible: ${(s.amount / 100).toFixed(2)} ${s.currency.toUpperCase()}`);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
