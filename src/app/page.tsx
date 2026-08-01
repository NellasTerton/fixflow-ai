import {
  AirVent,
  ArrowRight,
  BadgeCheck,
  Bot,
  Clock3,
  Droplets,
  Refrigerator,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { HeroChat } from "@/components/home/hero-chat";
import { formatPriceRange } from "@/lib/crm/presentation";
import { listPublicServiceOptionsWithPrices } from "@/server/crm/queries";

export const dynamic = "force-dynamic";

const categoryMeta = {
  appliance_repair: {
    icon: Refrigerator,
    title: "Бытовая техника",
    blurb: "Стиральные и посудомоечные машины, холодильники, духовые шкафы.",
  },
  plumbing: {
    icon: Droplets,
    title: "Сантехника",
    blurb: "Протечки, засоры, замена смесителей и установка сантехники.",
  },
  air_conditioning: {
    icon: AirVent,
    title: "Кондиционеры",
    blurb: "Диагностика, чистка, заправка и монтаж сплит-систем.",
  },
} as const;

const guarantees = [
  {
    icon: Clock3,
    title: "Выезд в день обращения",
    text: "Свободное время видно сразу в чате — без ожидания перезвона.",
  },
  {
    icon: Wallet,
    title: "Цена известна заранее",
    text: "Диапазон стоимости называем до выезда, по прайсу, а не «на месте».",
  },
  {
    icon: BadgeCheck,
    title: "Гарантия до 90 дней",
    text: "На выполненные работы и установленные запчасти.",
  },
];

export default async function Home() {
  const services = await listPublicServiceOptionsWithPrices();
  const byCategory = (["appliance_repair", "plumbing", "air_conditioning"] as const).map(
    (category) => ({
      category,
      meta: categoryMeta[category],
      items: services.filter((service) => service.category === category).slice(0, 4),
    }),
  );

  return (
    <main className="min-h-screen bg-white">
      <section className="hero-grid relative overflow-hidden bg-[#071a1f] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#bbf451] text-[#071a1f]">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            FixFlow Service
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/request"
              className="hidden text-white/60 transition hover:text-white sm:block"
            >
              Оставить заявку
            </Link>
            <Link
              href="/workspace/leads"
              className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Кабинет диспетчера
            </Link>
          </nav>
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1fr_460px] lg:items-center lg:px-8 lg:pb-28 lg:pt-16">
          <div>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Мастер приедет тогда, когда вам удобно
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-white/60">
              Ремонт бытовой техники, сантехника и кондиционеры в Москве.
              Опишите проблему в чате — диспетчер подберёт услугу, назовёт цену
              и запишет мастера на свободное время.
            </p>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6">
              <div>
                <dt className="text-2xl font-semibold text-[#bbf451]">12</dt>
                <dd className="mt-1 text-sm text-white/50">видов работ</dd>
              </div>
              <div>
                <dt className="text-2xl font-semibold text-[#bbf451]">90</dt>
                <dd className="mt-1 text-sm text-white/50">дней гарантии</dd>
              </div>
              <div>
                <dt className="text-2xl font-semibold text-[#bbf451]">12</dt>
                <dd className="mt-1 text-sm text-white/50">районов Москвы</dd>
              </div>
            </dl>
          </div>

          <HeroChat />
        </div>
      </section>

      <section className="border-b border-[#102328]/8 px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {guarantees.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f5ce] text-[#315b2d]">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#102328]">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[#5f6e72]">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f7f8f3] px-6 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[#102328] sm:text-4xl">
              Услуги и цены
            </h2>
            <p className="mt-3 text-base leading-7 text-[#5f6e72]">
              Точная стоимость зависит от неисправности и подтверждается после
              диагностики.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {byCategory.map(({ category, meta, items }) => (
              <div
                key={category}
                className="rounded-2xl border border-[#102328]/10 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8f5ce] text-[#315b2d]">
                    <meta.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold text-[#102328]">
                    {meta.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5f6e72]">
                  {meta.blurb}
                </p>

                <ul className="mt-5 space-y-2.5 border-t border-[#102328]/8 pt-5">
                  {items.map((service) => (
                    <li
                      key={service.id}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="text-[#43555a]">{service.name}</span>
                      <span className="shrink-0 font-medium text-[#102328]">
                        {formatPriceRange(service.priceFrom, service.priceTo)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-[#102328] px-8 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Опишите проблему — остальное сделаем мы
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/60">
            Диспетчер работает без выходных: подберёт услугу, назовёт цену и
            запишет мастера на ближайшее свободное время.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/chat"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#bbf451] px-6 text-sm font-semibold text-[#071a1f] transition hover:bg-[#d0ff78]"
            >
              Написать диспетчеру
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/request"
              className="inline-flex h-11 items-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Заполнить форму
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#102328]/8 px-6 py-10 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[#7a878a] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#102328] text-[#bbf451]">
              <Bot className="size-4" aria-hidden="true" />
            </span>
            <span className="font-semibold text-[#102328]">FixFlow Service</span>
          </div>
          <p className="flex items-start gap-2 sm:max-w-md sm:text-right">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Витрина продукта FixFlow AI. Компания и заявки вымышленные, телефоны
            нерабочие — настоящие данные вводить не нужно.
          </p>
        </div>
      </footer>
    </main>
  );
}
