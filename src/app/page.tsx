import { DemoShowcase } from "@/components/landing/DemoShowcase";
import { EnvelopeHero } from "@/components/landing/EnvelopeHero";
import { SiteNav } from "@/components/landing/SiteNav";
import { getDictionary } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Home() {
  const templates = await db.template.findMany({ where: { isCustom: false }, orderBy: { name: "asc" } });
  const { landing } = await getDictionary();
  const loggedIn = Boolean(await getCurrentUser());

  return (
    <main className="bg-[#f8f2e8] text-[#4a2a2e]">
      <SiteNav loggedIn={loggedIn} />
      <EnvelopeHero loggedIn={loggedIn} />

      <DemoShowcase demoUrl="/i/muestra" />

      <section id="plantillas" className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-20">
        <h2 className="text-center font-serif text-4xl text-[#6b1d29]">{landing.templatesTitle}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {templates.map((template) => {
            const copy = landing.templates[template.slug] ?? template;
            return (
              <div key={template.id} className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-6">
                <h3 className="font-serif text-2xl">{copy.name}</h3>
                <p className="mt-2 text-sm opacity-80">{copy.description}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm opacity-80">{landing.customNote}</p>
      </section>

      <section id="paquetes" className="scroll-mt-24 bg-[#fffaf2] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-serif text-4xl text-[#6b1d29]">{landing.plansTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {landing.plans.map((p) => (
              <div key={p.name} className="rounded-2xl border border-[#c9a35f]/40 bg-[#f8f2e8] p-6">
                <h3 className="font-serif text-2xl">{p.name}</h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f}>
                      <span className="text-[#b08d57]">✦</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
