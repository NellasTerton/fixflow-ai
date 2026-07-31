import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BookingForm } from "@/components/request/booking-form";
import {
  formatDateTime,
  formatPriceRange,
} from "@/lib/crm/presentation";
import { getPublicLeadDetail } from "@/server/crm/queries";
import { listAvailableSlots } from "@/server/requests/booking";

export const dynamic = "force-dynamic";

export default async function RequestSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: leadParam } = await searchParams;
  const parsedLeadId = z.uuid().safeParse(leadParam);

  if (!parsedLeadId.success) {
    notFound();
  }

  const lead = await getPublicLeadDetail(parsedLeadId.data);

  if (!lead || lead.source !== "website_form") {
    notFound();
  }

  const slots =
    lead.status === "booked"
      ? []
      : await listAvailableSlots(lead.category);

  return (
    <main className="min-h-screen bg-[#f3f4ee] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-3xl border border-[#102328]/10 bg-white shadow-xl shadow-[#102328]/6">
          <header className="bg-[#102328] p-7 text-white sm:p-9">
            <CheckCircle2 className="size-10 text-[#bbf451]" aria-hidden="true" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#bbf451]">
              Заявка создана
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {lead.publicNumber}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Это номер тестовой заявки в рабочем пространстве. Данные будут
              считаться временными в течение 48 часов.
            </p>
          </header>

          <div className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary
                label="Услуга"
                value={lead.serviceType}
              />
              <Summary
                label="Оценка"
                value={formatPriceRange(
                  lead.estimatedPriceFrom,
                  lead.estimatedPriceTo,
                )}
              />
              <Summary label="Статус" value={lead.status} />
            </div>

            <div className="mt-7 rounded-2xl border border-[#102328]/10 p-5 sm:p-6">
              {lead.bookingStartsAt ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
                  <CalendarCheck className="size-7" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-semibold">
                    Время уже забронировано
                  </h2>
                  <p className="mt-1 text-sm text-emerald-800">
                    {formatDateTime(lead.bookingStartsAt)} UTC
                  </p>
                </div>
              ) : slots.length > 0 ? (
                <BookingForm leadId={lead.id} slots={slots} />
              ) : (
                <div className="text-center">
                  <Clock3
                    className="mx-auto size-7 text-[#477233]"
                    aria-hidden="true"
                  />
                  <h2 className="mt-4 font-semibold text-[#102328]">
                    Свободных слотов пока нет
                  </h2>
                  <p className="mt-1 text-sm text-[#6b777a]">
                    Заявка уже находится в CRM. Время можно выбрать позже.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/workspace/leads/${lead.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102328] px-5 text-sm font-semibold text-white transition hover:bg-[#1d363c]"
              >
                Открыть заявку в CRM
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/request"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#102328]/12 px-5 text-sm font-semibold text-[#263a3f] transition hover:bg-[#f3f4ee]"
              >
                Создать ещё одну
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f5f6f1] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a878a]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-[#102328]">
        {value}
      </p>
    </div>
  );
}
