// Criptografia de las cuentas, con node:crypto (sin dependencias). Solo servidor.
//  - Contraseñas: scrypt con una sal aleatoria por usuario. Se guarda "sal:hash" en hexadecimal, nunca el texto.
//  - Tokens de sesion: en la BD se guarda su SHA-256, asi quien lea la BD no puede fabricar cookies validas.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const LARGO_HASH = 64;
const LARGO_SAL = 16;

function scryptAsync(texto: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(texto, sal, LARGO_HASH, (error, hash) => (error ? reject(error) : resolve(hash))),
  );
}

export async function cifrarContrasena(texto: string): Promise<string> {
  const sal = randomBytes(LARGO_SAL);
  const hash = await scryptAsync(texto, sal);
  return `${sal.toString("hex")}:${hash.toString("hex")}`;
}

// timingSafeEqual: compara en tiempo constante, para no dar pistas por lo que tarda
export async function comprobarContrasena(texto: string, guardada: string): Promise<boolean> {
  const partes = guardada.split(":");
  if (partes.length !== 2) return false;
  const [salHex, hashHex] = partes;
  if (!/^[0-9a-f]{32}$/.test(salHex) || !/^[0-9a-f]{128}$/.test(hashHex)) return false;
  const calculado = await scryptAsync(texto, Buffer.from(salHex, "hex"));
  return timingSafeEqual(calculado, Buffer.from(hashHex, "hex"));
}

export function huellaToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
