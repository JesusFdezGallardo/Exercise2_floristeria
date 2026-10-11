// Datos del catalogo de la floristeria: los carga prisma/seed.ts.
// Van en un modulo aparte, sin Prisma, para poder testearlos sin base de datos (tests/catalogo-datos.test.ts).
// La imagen de cada producto es /productos/<slug>.svg (tests/imagenes.test.ts comprueba que existe).

export type CategoriaSeed = { nombre: string; slug: string };
export type ProductoSeed = { cat: string; nombre: string; slug: string; precio: number; stock: number; descripcion: string };

// Por ocasion: es como busca el cliente de una floristeria
export const CATEGORIAS: CategoriaSeed[] = [
  { nombre: "Amor", slug: "amor" },
  { nombre: "Celebraciones", slug: "celebraciones" },
  { nombre: "Condolencias", slug: "condolencias" },
  { nombre: "Para casa", slug: "para-casa" },
];

// precio en CENTIMOS
export const PRODUCTOS: ProductoSeed[] = [
  { cat: "amor", nombre: "Ramo de 12 rosas rojas", slug: "ramo-rosas-rojas", precio: 4500, stock: 20,
    descripcion: "Doce rosas rojas de tallo largo con eucalipto, envueltas en papel kraft. Unos 50 cm de alto. Incluye tarjeta para tu mensaje." },
  { cat: "amor", nombre: "Ramo de peonías rosas", slug: "ramo-peonias-rosas", precio: 5200, stock: 8,
    descripcion: "Peonías rosas bien abiertas, el ramo más romántico de la tienda. Duran de 5 a 7 días si cambias el agua cada dos." },
  { cat: "amor", nombre: "Ramo de claveles rojos", slug: "ramo-claveles-rojos", precio: 2400, stock: 15,
    descripcion: "Diez claveles rojos, el clásico de toda la vida. Aguantan hasta dos semanas en agua fresca." },
  { cat: "celebraciones", nombre: "Ramo de girasoles", slug: "ramo-girasoles", precio: 3200, stock: 15,
    descripcion: "Girasoles grandes para alegrar cualquier celebración. Unos 60 cm de alto: ponlos en un jarrón alto." },
  { cat: "celebraciones", nombre: "Ramo de gerberas multicolor", slug: "ramo-gerberas", precio: 2800, stock: 18,
    descripcion: "Gerberas naranjas, rosas, amarillas y rojas. Ideal para cumpleaños. Incluye tarjeta para tu mensaje." },
  { cat: "celebraciones", nombre: "Ramo de tulipanes variados", slug: "ramo-tulipanes", precio: 3500, stock: 12,
    descripcion: "Siete tulipanes de colores. Siguen creciendo en el jarrón: córtales un poco el tallo cada dos días." },
  { cat: "condolencias", nombre: "Centro de lirios blancos", slug: "centro-lirios-blancos", precio: 6500, stock: 6,
    descripcion: "Lirios blancos con verde de temporada sobre base de cerámica. Sobrio y elegante. Incluye tarjeta para el mensaje." },
  { cat: "condolencias", nombre: "Centro de crisantemos blancos", slug: "centro-crisantemos-blancos", precio: 5500, stock: 5,
    descripcion: "Crisantemos blancos, la flor tradicional del recuerdo, sobre base de cerámica. Unos 40 cm de ancho. Incluye tarjeta." },
  { cat: "para-casa", nombre: "Centro de mesa de hortensias", slug: "centro-hortensias", precio: 4200, stock: 7,
    descripcion: "Hortensias azules y lilas en maceta de barro. Unos 35 cm de ancho: perfecto para la mesa del comedor." },
  { cat: "para-casa", nombre: "Centro de margaritas y lavanda", slug: "centro-margaritas-lavanda", precio: 2900, stock: 0,
    descripcion: "Margaritas y lavanda en maceta de barro: huele a campo. Agotado hasta primavera." },
];
