# Envíos por código postal · diseño

Fecha: 2026-10-12 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Que cada pedido lleve una **dirección de entrega** y unos **gastos de envío** que dependen de dónde se entrega,
calculados a partir del código postal. La floristería está en Sabadell (CP 08208): reparte con medios propios en la
ciudad y por mensajería (tipo GLS) al resto de la península.

Criterios de éxito:
- El cliente introduce la dirección **antes** de pagar y ve el envío y el total antes de ir a Stripe.
- Stripe cobra exactamente `subtotal + envío`, y ese importe es el `total` del pedido.
- El envío lo calcula siempre el servidor; nada de lo que mande el navegador decide el precio.
- La floristería ve en el admin adónde llevar el ramo, a quién y qué escribir en la tarjeta.
- Cambiar una tarifa es editar un archivo y desplegar; los pedidos ya hechos no cambian.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Momento | La dirección se pide antes del pago, en una página propia (`/checkout/envio`). |
| Criterio | Zonas por código postal (los 2 primeros dígitos son la provincia). |
| Tarifas | En código (`src/lib/envio.ts`), no en BD. Pasarlas a BD/admin queda para más adelante (parte B). |
| Coste real del transportista | Fuera: la tienda cobra su propia tarifa por zona; no se consulta la API de GLS. |
| Guardado | La entrega se copia en el `Pedido` (foto del momento), sin tabla `Direccion`. |
| Extras | Solo el mensaje de tarjeta. Fecha de entrega y "recordar dirección" quedan fuera. |
| Stripe | El envío viaja como `shipping_options` con un único importe ya calculado. |

Enfoques descartados: que Stripe pida la dirección (`shipping_address_collection`), porque las opciones de envío se
fijan antes de conocer el CP y el cliente podría pagar la tarifa de Sabadell con una dirección de Sevilla; y el
envío dinámico de Checkout embebido (`onShippingDetailsChange`), porque obliga a cambiar de Checkout por redirección
a embebido y añadir un endpoint, demasiada complejidad para lo que aporta.

## Tarifas

| Zona | Cómo se detecta | Envío | Gratis desde |
|---|---|---|---|
| Reparto en Sabadell (propio) | CP de 08201 a 08208 | 3,90 € | 40,00 € |
| Mensajería · provincia de Barcelona | empieza por 08 (y no es Sabadell) | 6,90 € | 70,00 € |
| Mensajería · península | cualquier otro CP válido | 9,90 € | sin envío gratis |
| No se envía | empieza por 07, 35, 38, 51 o 52 | — | — |

Un CP es válido si tiene 5 dígitos y sus dos primeros están entre 01 y 52. El umbral de envío gratis se compara con
el subtotal de productos: **igual o mayor** que el umbral = gratis (40,00 € justos es gratis; 39,99 € no).

## Unidades

### `src/lib/envio.ts` (lógica pura, sin BD ni Stripe)

- `TARIFAS_ENVIO`: constante con las zonas, en céntimos. Es el único sitio donde se cambian precios y umbrales.
- `calcularEnvio(cp: string, subtotal: number)` →
  `{ ok: true, zona: string, nombre: string, coste: number }` o `{ ok: false, error: string }`.
  Limpia espacios del CP. Errores: "Código postal no válido" y "No repartimos en ese código postal".
  `nombre` es el texto que se guarda en el pedido y se muestra en Stripe (p. ej. "Reparto en Sabadell").
- `validarEntrega(datos)` → `{ ok: true, entrega }` (normalizada) o `{ ok: false, errores: Record<campo, string> }`.
  Campos y reglas:
  - `nombre` (destinatario): 2–80 caracteres tras recortar.
  - `telefono`: se quitan espacios, guiones y un `+34` inicial; quedan 9 dígitos que empiezan por 6, 7, 8 o 9.
  - `direccion`: 5–150 caracteres.
  - `cp`: el de `calcularEnvio` (válido y con reparto).
  - `ciudad`: 2–60 caracteres.
  - `mensaje` (tarjeta): opcional, máximo 200 caracteres; vacío se guarda como `null`.

  Solo comprobaciones de longitud y de caracteres uno a uno: ninguna expresión regular con riesgo de backtracking.
  La longitud se acota **antes** de cualquier otra comprobación.

La usan el formulario (vista previa y errores al momento) y la Server Action (la decisión de verdad).

### Función pura de parámetros de Stripe

El armado de `line_items` y `shipping_options` y el cálculo de `total` se sacan de `crearCheckout` a una función
pura, `prepararPago(lineas, envio)` en `src/lib/pago.ts`, que devuelve `{ total, lineItems, shippingOptions }`.
Así un test comprueba que `total === Σ(precio × cantidad) + coste del envío` sin llamar a Stripe.

```ts
shipping_options: [{ shipping_rate_data: {
  type: "fixed_amount",
  display_name: envio.nombre,
  fixed_amount: { amount: envio.coste, currency: "eur" },
} }]
```

Con coste 0 se envía igual (Stripe muestra "Gratis").

## Modelo de datos

Campos nuevos en `Pedido` (`prisma/schema.prisma`), todos opcionales o con valor por defecto para no romper los
pedidos existentes ni el código anterior:

```prisma
  // Entrega (se copian al comprar; null en los pedidos anteriores a los envios)
  envioNombre    String?  // quien recibe el ramo
  envioTelefono  String?
  envioDireccion String?  // calle, numero, piso
  envioCp        String?  // texto: "08208" (un Int perderia el 0 inicial)
  envioCiudad    String?
  envioZona      String?  // nombre de la zona tal como se cobro: "Reparto en Sabadell"
  gastosEnvio    Int      @default(0) // en centimos; 0 si fue gratis
  mensajeTarjeta String?  // opcional, maximo 200 caracteres
```

- `total` pasa a ser `subtotal + gastosEnvio` (lo que cobra Stripe). El subtotal se obtiene sumando las líneas.
  En los pedidos antiguos `gastosEnvio = 0`, así que su `total` sigue siendo correcto.
- La zona se guarda como texto para que renombrar zonas en el código no exija migración ni altere pedidos viejos.
- La obligatoriedad de la dirección la impone `crearCheckout`, no la BD.
- Sin provincia (se deduce del CP) ni país (solo España).

## Flujo

1. **Carrito** (`src/components/boton-pagar.tsx`): el botón pasa a ser un enlace "Continuar con el envío" a
   `/checkout/envio`. Sin sesión: `/entrar?callbackUrl=%2Fcheckout%2Fenvio`.
2. **`/checkout/envio`** (`src/app/checkout/envio/page.tsx`, Server Component): sin `usuarioActual()` redirige a
   `/entrar` con vuelta aquí. Renderiza `FormularioEnvio` (cliente), que:
   - lee el carrito de Zustand y muestra líneas y subtotal; con el carrito vacío, aviso y enlace al catálogo;
   - pide destinatario, teléfono, dirección, CP, ciudad y mensaje (contador de 200);
   - con un CP de 5 dígitos muestra zona, envío ("Gratis" si aplica) y total, y "Te faltan X € para el envío
     gratis" cuando la zona tiene umbral y no se alcanza; si no hay reparto, muestra el error y desactiva "Pagar";
   - "Pagar con tarjeta" llama a `crearCheckout(articulos, entrega)` y pinta los errores por campo que devuelva.
3. **`crearCheckout`** (`src/app/checkout/actions.ts`), en este orden:
   sesión (`necesitaLogin`) → `validarEntrega` (`{ errores }`) → precios y stock de la BD (como hoy) →
   `calcularEnvio(cp, subtotalReal)` → crea el pedido PENDIENTE con los campos de entrega, `gastosEnvio`,
   `envioZona` y `total` → sesión de Stripe con `shipping_options` → guarda `stripeSessionId` → `redirect`.
   Devuelve `{ error?: string; errores?: Record<string, string>; necesitaLogin?: true }`.
4. **Webhook** (`src/app/api/webhooks/stripe/route.ts`): la lógica de estados no cambia. Pasa al email la entrega,
   el mensaje y los gastos de envío.
5. **Dónde se ve la entrega**: email de confirmación (`src/lib/email.ts`), detalle del pedido en el admin y detalle
   en "Mis pedidos". Todos muestran subtotal, envío (con el nombre de la zona) y total, más la dirección y el mensaje.
   Pedidos sin `envioCp` (anteriores a esta función): no se muestra el bloque de entrega.

## Errores

| Situación | Qué pasa |
|---|---|
| Campo inválido o CP sin reparto | Error junto al campo; no se crea pedido. |
| Stock insuficiente / producto inexistente | Toast con el mensaje, como hoy. |
| Sesión caducada al pagar | Se manda a `/entrar` con vuelta a `/checkout/envio`. |
| Llamada manipulada (CP falso, subtotal inflado) | Sin efecto: el servidor valida y recalcula todo. |
| Carrito vacío en `/checkout/envio` | Aviso y enlace al catálogo; no se muestra el formulario. |

## Pruebas

- `tests/envio.test.ts`:
  - `calcularEnvio`: cada zona; 08201 y 08208 en Sabadell; 08200 y 08209 en provincia; umbral exacto (4000 gratis,
    3999 no; 7000 en provincia); península sin envío gratis; 07, 35, 38, 51 y 52 rechazados; `00123`, `53000`,
    4 dígitos y letras inválidos; espacios alrededor del CP aceptados.
  - `validarEntrega`: límites de cada campo; `+34 612 34 56 78` → `612345678`; teléfono que empieza por 5
    rechazado; mensaje de 200 aceptado y de 201 rechazado; mensaje vacío → `null`.
  - Parámetros de Stripe: `total` = suma de líneas + envío; `shipping_options` con el importe y el nombre de la zona.
- `npx tsc --noEmit && npm run lint && npm test` en verde.
- Manual en local con `stripe listen`: compra en Sabadell con envío pagado, otra con envío gratis, otra a Madrid;
  el importe de Stripe coincide con `total`; la entrega aparece en admin, "Mis pedidos" y email; un CP de Mallorca
  se rechaza.
- `tests/marca.test.ts` sigue pasando (el nombre de la tienda no se escribe en los archivos nuevos).

## Documentación

- `docs/NOTAS-DEL-PROYECTO.md`: sección "Envíos" (dónde están las tarifas, cómo cambiarlas, que solo afectan a
  pedidos nuevos y por qué el servidor recalcula el envío).
- `CLAUDE.md`: una línea en Particularidades.
- `docs/ESPECIFICACION.md`: matizar "envíos reales" en lo que queda fuera: entran tarifas propias por CP; siguen
  fuera la integración con transportista, las etiquetas y la fecha de entrega.

## Despliegue

- Migración creada y probada en desarrollo (`npx prisma migrate dev`); solo añade columnas, compatible con el código
  anterior. Después `npm run migrar:produccion` y luego el push.
- Sin eventos nuevos de Stripe ni variables de entorno nuevas: CI, Vercel y el destino del webhook no cambian.

## Fuera de alcance

Tarifas editables desde el admin, consulta de precios a GLS u otro transportista, etiquetas de envío, seguimiento,
fecha y franja de entrega, recordar direcciones de la cuenta, envíos a Baleares, Canarias, Ceuta, Melilla o fuera de
España, peso o volumen de los productos.
