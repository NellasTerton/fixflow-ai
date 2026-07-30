import { ArrowLeft, ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { randomUUID } from "node:crypto";

import { RequestForm } from "@/components/request/request-form";
import { listPublicServiceOptions } from "@/server/requests/repository";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const services = await listPublicServiceOptions();
  const now = new Date();
  const minDate = toDateInput(now);
  const maxDateValue = new Date(now);
  maxDateValue.setUTCDate(maxDateValue.getUTCDate() + 14);

  return (
    <main className="min-h-screen bg-[#f3f4ee] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#477233] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          На главную
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#102328]/10 bg-white shadow-xl shadow-[#102328]/6">
          <header className="bg-[#102328] px-6 py-7 text-white sm:px-8 sm:py-9">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#bbf451] text-[#102328]">
              <ClipboardPlus className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#bbf451]">
              FixFlow Service · публичное демо
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Создать заявку
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
              Заполните обычную форму. Заявка появится в публичной CRM сразу
              после создания.
            </p>
          </header>

          <div className="p-6 sm:p-8">
            {services.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Сейчас нет активных услуг. Запустите demo seed и обновите
                страницу.
              </p>
            ) : (
              <RequestForm
                services={services}
                idempotencyKey={randomUUID()}
                minDate={minDate}
                maxDate={toDateInput(maxDateValue)}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}
