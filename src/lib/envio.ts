// Gastos de envio por codigo postal. Las tarifas se cambian SOLO aqui, en centimos, y afectan a los pedidos nuevos:
// cada pedido guarda una copia de la entrega, la zona y el coste con los que se cobro.
// Lo usan el formulario de /checkout/envio (vista previa) y crearCheckout (el calculo que vale).
// Los dos primeros digitos del CP son la provincia: 08 = Barcelona, 07 = Baleares, 35 y 38 = Canarias, 51 = Ceuta, 52 = Melilla.

export type ZonaEnvio = "SABADELL" | "PROVINCIA" | "PENINSULA";

type Tarifa = { nombre: string; coste: number; gratisDesde: number | null };

export const TARIFAS_ENVIO: Record<ZonaEnvio, Tarifa> = {
  SABADELL: { nombre: "Reparto en Sabadell", coste: 390, gratisDesde: 4000 }, // reparto propio: CP 08201 a 08208
  PROVINCIA: { nombre: "Mensajería · provincia de Barcelona", coste: 690, gratisDesde: 7000 },
  PENINSULA: { nombre: "Mensajería 24 h · península", coste: 990, gratisDesde: null }, // sin envio gratis
};

// Baleares, Las Palmas, Santa Cruz de Tenerife, Ceuta y Melilla: flor fresca con transbordo o aduana, no se envia
const PROVINCIAS_SIN_ENVIO = ["07", "35", "38", "51", "52"];

export type ResultadoEnvio =
  | { ok: true; zona: ZonaEnvio; nombre: string; coste: number; faltaParaGratis: number | null }
  | { ok: false; error: string };

const cpNoValido = (): ResultadoEnvio => ({ ok: false, error: "Código postal no válido" });

// subtotal = lo que suman los productos, en centimos. faltaParaGratis: lo que falta para el envio gratis (null si ya
// lo es o si la zona no tiene envio gratis)
export function calcularEnvio(cpBruto: string, subtotal: number): ResultadoEnvio {
  if (cpBruto.length > 20) return cpNoValido(); // acotar antes de recorrer nada
  const cp = cpBruto.trim().replaceAll(" ", "");
  if (cp.length !== 5 || ![...cp].every((c) => c >= "0" && c <= "9")) return cpNoValido();

  const provincia = cp.slice(0, 2);
  if (provincia < "01" || provincia > "52") return cpNoValido();
  if (PROVINCIAS_SIN_ENVIO.includes(provincia)) return { ok: false, error: "No repartimos en ese código postal" };

  // Textos de 5 digitos: compararlos como texto es compararlos como numero
  const zona: ZonaEnvio = cp >= "08201" && cp <= "08208" ? "SABADELL" : provincia === "08" ? "PROVINCIA" : "PENINSULA";
  const { nombre, coste, gratisDesde } = TARIFAS_ENVIO[zona];
  const gratis = gratisDesde !== null && subtotal >= gratisDesde;
  return {
    ok: true,
    zona,
    nombre,
    coste: gratis ? 0 : coste,
    faltaParaGratis: gratisDesde === null || gratis ? null : gratisDesde - subtotal,
  };
}
