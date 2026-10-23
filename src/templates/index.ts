import type { ComponentType } from "react";
import { Clasico } from "./clasico";
import { Minimalista } from "./minimalista";
import type { TemplateProps } from "./types";

// Cada plantilla (incluidas las personalizadas) se registra aquí con el slug de la tabla Template
export const templates: Record<string, ComponentType<TemplateProps>> = {
  clasico: Clasico,
  minimalista: Minimalista,
};
