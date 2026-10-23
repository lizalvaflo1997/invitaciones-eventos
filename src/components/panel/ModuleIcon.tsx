import type { ModuleIcon as IconName } from "@/lib/modules";

// Íconos de línea del menú del panel (24×24, mismo grosor que el resto del sitio)
const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9",
  mail: "M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14.8c1.7.8 2.8 2.6 3 5.2",
  table: "M12 4.5c4.7 0 8.5 1.6 8.5 3.5S16.7 11.5 12 11.5 3.5 9.9 3.5 8 7.3 4.5 12 4.5zM12 11.5v8M8 19.5h8M3.5 8v1.5M20.5 8v1.5",
  photo: "M3.5 5.5h17v13h-17zM3.5 15l5-4.5 4 3.5 3-2.5 5 4M15.5 9.5h.01",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1s5 1 5 1zm0 0c1.5-3 5-3.5 5-1s-5 1-5 1z",
  wallet: "M4 6.5h14.5v2H4zM4 8.5h16v11H4zM4 6.5v13M16 14h.01",
  checklist: "M9 6.5h11M9 12h11M9 17.5h11M4 6l1 1 2-2M4 11.5l1 1 2-2M4 17l1 1 2-2",
  map: "M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2zM9 4.5v13M15 6.5v13",
  team: "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 19.5c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8M5 10.5a2.3 2.3 0 1 0 0-4.6M19 10.5a2.3 2.3 0 1 1 0-4.6M2.5 16c.3-1.6 1.2-2.6 2.5-3M21.5 16c-.3-1.6-1.2-2.6-2.5-3",
  book: "M12 6.5C10 5 6.5 4.5 3.5 5v13c3-.5 6.5 0 8.5 1.5 2-1.5 5.5-2 8.5-1.5V5c-3-.5-6.5 0-8.5 1.5zM12 6.5v13",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};

export function ModuleIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
