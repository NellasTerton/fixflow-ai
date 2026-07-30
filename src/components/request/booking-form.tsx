"use client";

import { CalendarCheck, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/crm/presentation";
import type { PublicAvailabilitySlot } from "@/server/requests/booking";
import {
  bookPublicSlot,
  type BookingFormState,
} from "@/app/request/success/actions";

export function BookingForm({
  leadId,
  slots,
}: {
  leadId: string;
  slots: PublicAvailabilitySlot[];
}) {
  const initialBookingFormState: BookingFormState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    bookPublicSlot,
    initialBookingFormState,
  );

  if (state.status === "booked") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <CalendarCheck className="size-7" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">{state.message}</h2>
        <p className="mt-1 text-sm text-emerald-800">
          {formatDateTime(state.startsAt ?? null)} UTC. Статус заявки изменён
          на booked.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="leadId" value={leadId} />
      <fieldset disabled={pending}>
        <legend className="text-lg font-semibold text-[#102328]">
          Выберите свободное время
        </legend>
        <p className="mt-1 text-sm leading-6 text-[#6b777a]">
          Слоты читаются из Neon в реальном времени. Один слот нельзя
          забронировать дважды.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {slots.map((slot) => (
            <label
              key={slot.id}
              className="cursor-pointer rounded-xl border border-[#102328]/12 bg-[#f8f9f4] p-4 transition has-checked:border-[#6f9b45] has-checked:bg-[#e8f5ce] has-checked:ring-2 has-checked:ring-[#bbf451]/40"
            >
              <input
                type="radio"
                name="slotId"
                value={slot.id}
                required
                className="mr-2 accent-[#477233]"
              />
              <span className="text-sm font-semibold text-[#263a3f]">
                {formatDateTime(slot.startsAt)} UTC
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="mt-5 h-11 bg-[#102328] px-5 text-white hover:bg-[#1d363c]"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <CalendarCheck className="size-4" aria-hidden="true" />
        )}
        {pending ? "Бронируем…" : "Забронировать время"}
      </Button>
    </form>
  );
}
