// Módulos del panel de cada evento. `path` es la ruta dentro de /panel/<evento>; los que no
// tienen ruta todavía aparecen en el menú como "Pronto".
export const MODULES = [
  { key: "home", icon: "home", path: "" },
  { key: "invitation", icon: "mail", path: "/invitacion" },
  { key: "guests", icon: "users", path: "/invitados" },
  { key: "tables", icon: "table", path: "/mesas" },
  { key: "album", icon: "photo" },
  { key: "gifts", icon: "gift" },
  { key: "budget", icon: "wallet", path: "/presupuesto" },
  { key: "agenda", icon: "checklist" },
  { key: "floorPlan", icon: "map" },
  { key: "collaborators", icon: "team" },
  { key: "guestbook", icon: "book" },
  { key: "settings", icon: "settings" },
] as const satisfies readonly { key: string; icon: string; path?: string }[];

export type ModuleKey = (typeof MODULES)[number]["key"];
export type ModuleIcon = (typeof MODULES)[number]["icon"];

type Module = (typeof MODULES)[number];
type UpcomingModule = Exclude<Module, { path: string }>;

export const UPCOMING_MODULES = MODULES.filter((m): m is UpcomingModule => !("path" in m));
