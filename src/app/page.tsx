import { AirVent, ArrowRight, Bot, Droplets, Refrigerator, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { serviceCategories, workflowStages } from "@/lib/demo";

const serviceIcons = {
  appliance: Refrigerator,
  plumbing: Droplets,
  climate: AirVent,
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="hero-grid relative border-b border-white/10 bg-[#071a1f] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#bbf451] text-[#071a1f]">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            FixFlow AI
          </div>
          <Link
            href="/workspace/leads"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Открыть рабочее пространство
          </Link>
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#bbf451]/30 bg-[#bbf451]/10 px-3 py-1.5 text-sm text-[#d9ff98]">
              <span className="size-1.5 rounded-full bg-[#bbf451]" />
              AI-диспетчер и рабочее пространство работают
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Заявка на выезд без потерянных деталей
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-white/65">
              FixFlow AI — AI-диспетчер и операционная система для выездных
              сервисных компаний. Принимает обращения, квалифицирует клиента,
              отвечает по базе знаний, записывает на выезд и передаёт заявку
              диспетчеру.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/chat"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#bbf451] px-5 text-sm font-semibold text-[#071a1f] transition hover:bg-[#d0ff78]"
              >
                Попробовать AI-диспетчера
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/workspace/leads"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Открыть рабочее пространство
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/55">
              <Link href="/request" className="underline-offset-4 hover:underline">
                Обычная форма заявки
              </Link>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="size-4 text-[#bbf451]"
                  aria-hidden="true"
                />
                Только вымышленные и маскированные данные
              </div>
            </div>
          </div>

          <div className="relative self-end rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-medium">Сценарий обработки</p>
                <p className="mt-1 text-xs text-white/45">От чата до follow-up</p>
              </div>
              <span className="rounded-full bg-[#bbf451]/15 px-2.5 py-1 text-xs text-[#d9ff98]">
                8 шагов
              </span>
            </div>
            <ol className="space-y-2">
              {workflowStages.map((stage, index) => (
                <li
                  key={stage}
                  className="flex items-center gap-3 rounded-xl bg-black/10 px-3 py-2.5 text-sm text-white/75"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] text-white/45">
                    {index + 1}
                  </span>
                  {stage}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-[#f3f4ee] px-6 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#477233]">
              Направления сервиса
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102328] sm:text-4xl">
              Один диспетчер для трёх типов работ
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {serviceCategories.map((service) => {
              const Icon = serviceIcons[service.id];

              return (
                <article
                  key={service.id}
                  className="rounded-2xl border border-[#102328]/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#e8f5ce] text-[#315b2d]">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-[#102328]">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#526166]">
                    {service.description}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="mt-10 text-sm text-[#6b777a]">
            Обычная форма заявки создаёт запись в Neon, позволяет выбрать
            свободное время и сразу показывает результат в рабочем
            пространстве.
          </p>
        </div>
      </section>
    </main>
  );
}
