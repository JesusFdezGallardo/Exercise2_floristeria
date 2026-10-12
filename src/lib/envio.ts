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

// ---- La entrega: a quien y donde se lleva el ramo ----

export const MAX_MENSAJE = 200; // caracteres de la tarjeta (el textarea usa el mismo limite)

export type CampoEntrega = "nombre" | "telefono" | "direccion" | "cp" | "ciudad" | "mensaje";
export type DatosEntrega = Record<CampoEntrega, string>; // tal cual lo escribe el formulario
export type Entrega = Omit<DatosEntrega, "mensaje"> & { mensaje: string | null }; // normalizada; sin mensaje = null
export type ErroresEntrega = Partial<Record<CampoEntrega, string>>;

// Orden de los campos en el formulario: el primero con error es al que se lleva el foco
const ORDEN_CAMPOS: CampoEntrega[] = ["nombre", "telefono", "direccion", "cp", "ciudad", "mensaje"];
export const primerCampoConError = (errores: ErroresEntrega): CampoEntrega | null =>
  ORDEN_CAMPOS.find((c) => errores[c]) ?? null;

// Lo que llega a la Server Action puede ser cualquier cosa: lo que no es texto cuenta como vacio
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Sin espacios, guiones, puntos ni +34 tienen que quedar 9 cifras que empiecen por 6, 7, 8 o 9 (moviles y fijos)
function normalizarTelefono(bruto: string): string | null {
  if (bruto.length > 25) return null; // acotar antes de recorrer
  let t = "";
  for (const c of bruto) if (c !== " " && c !== "-" && c !== ".") t += c;
  if (t.startsWith("+34")) t = t.slice(3);
  if (t.length !== 9 || !"6789".includes(t[0])) return null;
  return [...t].every((c) => c >= "0" && c <= "9") ? t : null;
}

export function validarEntrega(
  datos: Partial<Record<CampoEntrega, unknown>>,
): { ok: true; entrega: Entrega } | { ok: false; errores: ErroresEntrega } {
  const errores: ErroresEntrega = {};

  const nombre = texto(datos.nombre);
  if (nombre.length < 2) errores.nombre = "Escribe el nombre de quien recibe el ramo";
  else if (nombre.length > 80) errores.nombre = "El nombre es demasiado largo";

  const telefono = normalizarTelefono(texto(datos.telefono));
  if (telefono === null) errores.telefono = "Escribe un teléfono español de 9 cifras";

  const direccion = texto(datos.direccion);
  if (direccion.length < 5) errores.direccion = "Escribe la calle, el número y el piso";
  else if (direccion.length > 150) errores.direccion = "La dirección es demasiado larga";

  const cp = texto(datos.cp).replaceAll(" ", "");
  const envio = calcularEnvio(cp, 0); // aqui solo importa si hay reparto; el coste se calcula con el subtotal real
  if (!envio.ok) errores.cp = envio.error;

  const ciudad = texto(datos.ciudad);
  if (ciudad.length < 2) errores.ciudad = "Escribe la ciudad";
  else if (ciudad.length > 60) errores.ciudad = "El nombre de la ciudad es demasiado largo";

  const mensaje = texto(datos.mensaje);
  if (mensaje.length > MAX_MENSAJE) errores.mensaje = `El mensaje no puede pasar de ${MAX_MENSAJE} caracteres`;

  if (Object.keys(errores).length > 0 || telefono === null) return { ok: false, errores };
  return { ok: true, entrega: { nombre, telefono, direccion, cp, ciudad, mensaje: mensaje === "" ? null : mensaje } };
}

// Los campos de entrega tal como se guardan en Pedido
export type CamposEntregaPedido = {
  envioNombre: string | null;
  envioTelefono: string | null;
  envioDireccion: string | null;
  envioCp: string | null;
  envioCiudad: string | null;
  mensajeTarjeta: string | null;
};

// La entrega de un pedido, o null si es de antes de los envios (no tiene)
export function entregaDelPedido(p: CamposEntregaPedido): Entrega | null {
  if (!p.envioNombre || !p.envioTelefono || !p.envioDireccion || !p.envioCp || !p.envioCiudad) return null;
  return {
    nombre: p.envioNombre,
    telefono: p.envioTelefono,
    direccion: p.envioDireccion,
    cp: p.envioCp,
    ciudad: p.envioCiudad,
    mensaje: p.mensajeTarjeta,
  };
}
