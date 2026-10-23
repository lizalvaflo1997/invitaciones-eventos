# Invitaciones de boda

Invitaciones de boda digitales con confirmación de asistencia (RSVP) y panel de invitados para los novios.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma.

## Arrancar en local

```bash
pnpm install
pnpm db:migrate   # crea la base de datos y carga datos de ejemplo
pnpm dev
```

- Invitación de ejemplo: http://localhost:3000/i/demo-perez
- Panel de los novios: http://localhost:3000/panel (pide iniciar sesión)

## Cuentas

Los novios entran con correo y contraseña en `/entrar` y se registran en `/registro`.
La cuenta de prueba que crea el seed (correo y contraseña en `prisma/seed.ts`) es dueña de la boda de ejemplo.

- Las contraseñas se guardan con `scrypt` (`src/lib/password.ts`).
- La sesión es una cookie `httpOnly` de 30 días; en la base de datos solo se guarda el hash del token (`src/lib/auth.ts`).
- Cada panel solo lo abre la cuenta dueña de la boda; para cualquier otra responde 404.

## Base de datos

En desarrollo se usa SQLite (`prisma/dev.db`). Para producción cambia `provider` a `"postgresql"`
en `prisma/schema.prisma` y pon la cadena de conexión en `DATABASE_URL`.

## Estructura

- `prisma/schema.prisma`: `Event` (con su tipo: boda, XV años, bautizo, primera comunión, cumpleaños u otro), `Guest`, `EventTable`, `Expense`, `Template`, `User` y `Session`. El plano del salón se guarda como JSON en `Event.floorPlan`
- `src/templates/`: una plantilla por archivo, registrada en `src/templates/index.ts`
- `src/app/i/[token]`: invitación personalizada por invitado y su confirmación
- `src/app/panel`: lista de eventos y alta de un evento nuevo (`/panel/nuevo`)
- `src/app/panel/[adminToken]/(modulos)`: panel de cada evento, un módulo por carpeta (Inicio, Invitación, Invitados, Presupuesto)
- `src/lib/modules.ts`: los módulos del menú; los que aún no tienen ruta aparecen como "Pronto"
- `src/lib/event-copy.ts`: textos que cambian según el tipo de evento ("Nuestra boda", "Mis XV años"…)
- `src/lib/money.ts`: el dinero se guarda en centavos (enteros, en MXN) para que las sumas sean exactas

### Plano del salón (módulo Mesas)

`/panel/<evento>/mesas` es un editor a pantalla completa, fuera del marco de módulos.

- `src/lib/floor-plan/`: la lógica sin interfaz. Todo se mide en centímetros.
  - `geometry.ts`: sillas (46 × 42 cm), zona ocupada (60 cm desde el borde de la mesa para sentarse) y distancias exactas
    (mesas y elementos giran en pasos de 90°, así todo es círculo o rectángulo alineado).
  - `validation.ts`: mesas encimadas, demasiado cerca (según la circulación), fuera del salón o invadiendo un elemento.
  - `seating.ts`: un grupo de invitados ocupa varias sillas; mover a una silla ocupada intercambia lugares.
  - `layout.ts`: distribución automática, capacidad estimada y búsqueda de huecos libres.
  - `sanitize.ts`: valida el JSON que llega del navegador antes de guardarlo.
- `src/components/floor-plan/`: el editor (plano SVG, paneles, vista de asientos, deshacer/rehacer, exportar PNG).
- Al guardar se sincronizan `EventTable` y `Guest.tableId`, para que Invitados e Inicio muestren la mesa de cada quien.

### Agregar un módulo

1. Crea su carpeta en `src/app/panel/[adminToken]/(modulos)/<ruta>/page.tsx` y usa `getOwnedEvent` para obtener el evento.
2. En `src/lib/modules.ts`, agrégale `path: "/<ruta>"` a su entrada; deja de mostrarse como "Pronto".
