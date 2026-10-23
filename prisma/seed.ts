import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const clasico = await prisma.template.upsert({
    where: { slug: "clasico" },
    update: {},
    create: {
      slug: "clasico",
      name: "Clásico elegante",
      description: "Tonos marfil y dorado, tipografía caligráfica.",
    },
  });
  await prisma.template.upsert({
    where: { slug: "minimalista" },
    update: {},
    create: {
      slug: "minimalista",
      name: "Minimalista moderno",
      description: "Blanco, negro y mucho aire. Limpio y actual.",
    },
  });

  // Cuenta de prueba solo para desarrollo local: entra con este correo y contraseña en /entrar
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@selloysobre.test" },
    update: {},
    create: { email: "demo@selloysobre.test", name: "Ana y Luis", passwordHash: await hashPassword("prueba-demo-2027") },
  });

  const wedding = await prisma.event.upsert({
    where: { slug: "ana-y-luis" },
    update: { musicUrl: "/musica/demo.wav", userId: demoUser.id },
    create: {
      userId: demoUser.id,
      type: "BODA",
      slug: "ana-y-luis",
      adminToken: "demo-panel",
      honoreeOne: "Ana",
      honoreeTwo: "Luis",
      date: new Date("2027-04-17T23:00:00Z"),
      ceremonyVenue: "Parroquia de San Juan Bautista",
      ceremonyAddress: "Plaza Hidalgo s/n, Coyoacán, CDMX",
      ceremonyTime: "5:00 p.m.",
      receptionVenue: "Hacienda Los Laureles",
      receptionAddress: "Camino Real 120, Tlalpan, CDMX",
      receptionTime: "7:30 p.m.",
      dressCode: "Formal",
      message: "Con la bendición de Dios y de nuestros padres, queremos compartir contigo el día más especial de nuestras vidas.",
      giftRegistry: "Liverpool · Evento 51234567",
      musicUrl: "/musica/demo.wav",
      rsvpDeadline: new Date("2027-03-17T06:00:00Z"),
      plan: "COMPLETO",
      templateId: clasico.id,
    },
  });

  const guests = [
    { name: "Familia Pérez", phone: "5512345678", seats: 4, token: "demo-perez" },
    { name: "Mariana López", phone: "5587654321", seats: 2, token: "demo-mariana" },
    { name: "Carlos y Sofía", seats: 2, token: "demo-carlos" },
    // Se muestra dentro del teléfono de la página de inicio
    { name: "Familia Ramírez", seats: 3, token: "muestra" },
    // Invitados ficticios para probar el plano del salón (unas 40 personas en total)
    { name: "Ana Torres", seats: 1, token: "demo-g01", status: "CONFIRMADO" as const, attending: 1 },
    { name: "Carlos López", seats: 1, token: "demo-g02" },
    { name: "Mariana Ruiz", seats: 2, token: "demo-g03", status: "CONFIRMADO" as const, attending: 2 },
    { name: "Juan Pérez", seats: 1, token: "demo-g04" },
    { name: "Familia Hernández", seats: 4, token: "demo-g05", status: "CONFIRMADO" as const, attending: 4 },
    { name: "Lucía y Diego", seats: 2, token: "demo-g06" },
    { name: "Familia Castillo", seats: 5, token: "demo-g07", status: "CONFIRMADO" as const, attending: 5 },
    { name: "Sofía Méndez", seats: 1, token: "demo-g08" },
    { name: "Roberto y Elena", seats: 2, token: "demo-g09", status: "CONFIRMADO" as const, attending: 2 },
    { name: "Familia Ortega", seats: 3, token: "demo-g10" },
    { name: "Valeria Núñez", seats: 1, token: "demo-g11", status: "DECLINADO" as const, attending: 0 },
    { name: "Amigos de la universidad", seats: 4, token: "demo-g12", status: "CONFIRMADO" as const, attending: 4 },
    { name: "Tío Fernando", seats: 2, token: "demo-g13" },
  ];
  for (const g of guests) {
    await prisma.guest.upsert({
      where: { token: g.token },
      update: {},
      create: { ...g, eventId: wedding.id },
    });
  }

  // Un evento de una sola persona, para ver cómo cambian los textos según el tipo
  await prisma.event.upsert({
    where: { slug: "xv-valentina" },
    update: {},
    create: {
      userId: demoUser.id,
      type: "XV_ANOS",
      slug: "xv-valentina",
      adminToken: "demo-xv",
      honoreeOne: "Valentina",
      date: new Date("2027-06-13T01:00:00Z"),
      ceremonyVenue: "Parroquia de Santa Rosa de Lima",
      ceremonyAddress: "Av. Revolución 300, San Ángel, CDMX",
      ceremonyTime: "7:00 p.m.",
      receptionVenue: "Salón Jardín Imperial",
      receptionAddress: "Insurgentes Sur 1800, CDMX",
      receptionTime: "9:00 p.m.",
      dressCode: "Etiqueta",
      message: "Con mucha ilusión quiero compartir contigo esta noche tan especial.",
      templateId: clasico.id,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
