// Instancia de Stripe para el SERVIDOR. Usa la clave secreta: jamas debe llegar al navegador.
// "server-only" hace que el build FALLE si algun componente de cliente importa este fichero.
import "server-only";
import Stripe from "stripe";

const clave = process.env.STRIPE_SECRET_KEY;
if (!clave) throw new Error("Falta STRIPE_SECRET_KEY en .env");
if (!clave.startsWith("sk_test_")) {
  // En este proyecto solo trabajamos en modo test: una clave live aqui es un error
  throw new Error("STRIPE_SECRET_KEY no es de test (debe empezar por sk_test_)");
}

export const stripe = new Stripe(clave, {
  appInfo: { name: "tienda-volta" },
});
