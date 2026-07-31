import {
  AirVent,
  ArrowRight,
  BookOpenText,
  Bot,
  Droplets,
  KanbanSquare,
  Radio,
  Refrigerator,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { CopyExample } from "@/components/home/copy-example";
import { serviceCategories, workflowStages } from "@/lib/demo";

const evaluationSteps = [
  {
    title: "Опишите проблему в чате с AI",
    description:
      "AI определит направление и предложит услугу по базе знаний. Пример сообщения можно скопировать одним кликом.",
    example: "Не работает стиральная машина, вода не сливается после стирки",
  },
  {
    title: "Ответьте на пару вопросов",
    description:
      "Имя, телефон для теста и район — сервер принимает только заведомо тестовые значения.",
    example: "+380 00 000 1042",
  },
  {
    title: "Выберите время выезда",
    description:
      "Дата и слот бронируются атомарно; заявка сразу получает номер вида FF-1042.",
    example: null,
  },
  {
    title: "Посмотрите результат в рабочем пространстве",
    description:
      "В карточке заявки — раздел «Почему AI так ответил?» с источниками RAG, а в разделе автоматизаций — webhook в Make и Telegram.",
    example: null,
  },
] as const;

const exploreLinks = [
  {
    href: "/workspace/leads",
    icon: KanbanSquare,
    title: "Заявки",
    description: "Kanban по восьми статусам, фильтры и поиск.",
  },
  {
    href: "/workspace/ai-runs",
    icon: Sparkles,
    title: "AI runs",
    description: "Каждый вызов LLM: вход, confidence, найденные RAG-чанки.",
  },
  {
    href: "/workspace/automations",
    icon: Radio,
    title: "Автоматизации",
    description: "Webhook-события и callback от сценариев Make.",
  },
  {
    href: "/workspace/knowledge",
    icon: BookOpenText,
    title: "База знаний",
    description: "Документы, из которых AI берёт цены и условия.",
  },
] as const;

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

      <section className="border-b border-[#102328]/8 bg-white px-6 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#477233]">
              Как это работает
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102328] sm:text-4xl">
              Пройдите путь клиента за 3 минуты
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-[#526166]">
              Ниже — четыре шага от первого сообщения в чате до заявки в
              рабочем пространстве. Примеры можно скопировать одним кликом:
              сервер принимает только заведомо тестовые данные.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 lg:grid-cols-2">
            {evaluationSteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-[#102328]/10 bg-[#f7f8f3] p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#102328] text-sm font-semibold text-[#bbf451]">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold text-[#102328]">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#526166]">
                  {step.description}
                </p>
                {step.example ? (
                  <div className="mt-4">
                    <CopyExample text={step.example} />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/chat"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#102328] px-5 text-sm font-semibold text-white transition hover:bg-[#1d363c]"
            >
              Начать чат с AI-диспетчером
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
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

      <section className="border-t border-[#102328]/8 bg-white px-6 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#477233]">
              Без чата
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102328] sm:text-4xl">
              Заглянуть внутрь напрямую
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-[#526166]">
              Все разделы рабочего пространства публичны и доступны без входа
              в систему — открывайте их сразу, если хотите посмотреть без
              диалога с AI.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-2xl border border-[#102328]/10 bg-[#f7f8f3] p-6 transition hover:border-[#477233]/30 hover:bg-[#eef4e9]"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#e8f5ce] text-[#315b2d]">
                  <link.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 flex items-center gap-1.5 text-base font-semibold text-[#102328]">
                  {link.title}
                  <ArrowRight
                    className="size-4 -translate-x-1 text-[#477233] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#526166]">
                  {link.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
