import type { FloorPlan } from "@/lib/floor-plan/types";

// Descarga el plano completo como PNG: copia el SVG, lo encuadra al salón (sin el zoom actual) y lo dibuja en un canvas
export async function exportPlanImage(svg: SVGSVGElement, plan: FloorPlan, fileName: string) {
  const margin = 60;
  const { length, width } = plan.room;
  const pxPerCm = 1.5;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelector("[data-world]")?.removeAttribute("transform");
  clone.setAttribute("viewBox", `${-margin} ${-margin} ${length + margin * 2} ${width + margin * 2}`);
  clone.setAttribute("width", String((length + margin * 2) * pxPerCm));
  clone.setAttribute("height", String((width + margin * 2) * pxPerCm));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("class");

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f3f1ed";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  } finally {
    URL.revokeObjectURL(url);
  }
}
