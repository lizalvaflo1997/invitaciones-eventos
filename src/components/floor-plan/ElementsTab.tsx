"use client";

import { useI18n } from "@/i18n/client";
import { ELEMENT_CATALOG } from "@/lib/floor-plan/catalog";
import { makeElement } from "@/lib/floor-plan/factory";
import { ELEMENT_TYPES, type ElementType } from "@/lib/floor-plan/types";
import { useEditor } from "./editor-context";
import { Section } from "./fields";

export function ElementsTab() {
  const { plan, apply, select, selection, eventType } = useEditor();
  const { floorPlan: t } = useI18n().t;
  const copy = t.elements;
  const label = (type: ElementType) => (type === "headTable" && eventType === "BODA" ? copy.headTableWedding : copy.types[type]);

  const add = (type: ElementType) => {
    const element = makeElement(type, label(type), plan.room.length / 2, plan.room.width / 2);
    apply({ ...plan, elements: [...plan.elements, element] });
    select({ kind: "element", id: element.id });
  };

  return (
    <div>
      <Section title={t.tabs.elements}>
        <p className="mb-3 text-xs text-[#8a7d74]">{copy.hint}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {ELEMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => add(type)}
              className="flex items-center gap-2 rounded-lg border border-[#e3ddd5] bg-white px-2.5 py-2 text-left text-sm text-[#3f2a2d] transition hover:border-[#c9b9a6] hover:bg-[#faf8f5]"
            >
              <span className="size-3.5 shrink-0 rounded" style={{ background: ELEMENT_CATALOG[type].fill, border: `1px solid ${ELEMENT_CATALOG[type].stroke}` }} />
              <span className="truncate">{label(type)}</span>
            </button>
          ))}
        </div>
      </Section>

      {plan.elements.length > 0 && (
        <Section title={`${t.tabs.elements} (${plan.elements.length})`}>
          <ul className="space-y-1">
            {plan.elements.map((el) => (
              <li key={el.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: "element", id: el.id })}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                    selection?.id === el.id ? "bg-[#6b1d29]/8 font-medium" : "hover:bg-[#f6f3ef]"
                  }`}
                >
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: ELEMENT_CATALOG[el.type].stroke }} />
                  <span className="truncate text-[#3f2a2d]">{el.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-[#8a7d74]">
                    {el.w / 100} × {el.h / 100} m
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
