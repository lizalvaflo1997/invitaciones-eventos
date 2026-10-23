"use client";

import { useMemo, useReducer } from "react";
import type { FloorPlan } from "@/lib/floor-plan/types";

const LIMIT = 100;

type State = { past: FloorPlan[]; present: FloorPlan | null; future: FloorPlan[] };
type Action =
  | { type: "apply"; plan: FloorPlan }
  | { type: "live"; plan: FloorPlan }
  | { type: "commit"; before: FloorPlan }
  | { type: "replace"; plan: FloorPlan }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    // Un cambio completo (agregar, borrar, editar una propiedad): se puede deshacer
    case "apply":
      if (!state.present || action.plan === state.present) return { ...state, present: action.plan };
      return { past: [...state.past, state.present].slice(-LIMIT), present: action.plan, future: [] };
    // Mientras se arrastra: se ve en vivo, pero no llena el historial
    case "live":
      return { ...state, present: action.plan };
    // Al soltar: el arrastre completo cuenta como un solo paso
    case "commit":
      if (action.before === state.present) return state;
      return { past: [...state.past, action.before].slice(-LIMIT), present: state.present, future: [] };
    // Ajustes automáticos (p. ej. invitados que cambiaron): no se deshacen
    case "replace":
      return { ...state, present: action.plan };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous || !state.present) return state;
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    }
    case "redo": {
      const next = state.future[0];
      if (!next || !state.present) return state;
      return { past: [...state.past, state.present], present: next, future: state.future.slice(1) };
    }
  }
}

export function usePlanHistory(initial: FloorPlan | null) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] });
  // Las acciones nunca cambian; así los efectos que dependen de ellas no se vuelven a suscribir
  const actions = useMemo(
    () => ({
      apply: (plan: FloorPlan) => dispatch({ type: "apply", plan }),
      live: (plan: FloorPlan) => dispatch({ type: "live", plan }),
      commit: (before: FloorPlan) => dispatch({ type: "commit", before }),
      replace: (plan: FloorPlan) => dispatch({ type: "replace", plan }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
    }),
    [],
  );
  return { ...actions, actions, plan: state.present, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
