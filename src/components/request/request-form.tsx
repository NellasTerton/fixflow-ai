"use client";

import { AlertTriangle, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  categoryLabels,
  crmCategories,
  type CrmCategory,
} from "@/lib/crm/constants";
import type { PublicServiceOption } from "@/server/requests/repository";
import {
  submitPublicRequest,
  type RequestFormState,
} from "@/app/request/actions";

export function RequestForm({
  services,
  idempotencyKey,
  minDate,
  maxDate,
}: {
  services: PublicServiceOption[];
  idempotencyKey: string;
  minDate: string;
  maxDate: string;
}) {
  const initialRequestFormState: RequestFormState = {
    status: "idle",
  };
  const [state, action, pending] = useActionState(
    submitPublicRequest,
    initialRequestFormState,
  );
  const [category, setCategory] = useState<CrmCategory | "">("");
  const availableServices = useMemo(
    () => services.filter((service) => service.category === category),
    [category, services],
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="absolute -left-[10000px] top-auto size-px overflow-hidden">
        <label htmlFor="company">Компания</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              Это публичное демо. Не вводите реальные персональные данные
            </p>
            <p className="mt-1 text-amber-800/80">
              Используйте вымышленное имя, demo-телефон и только название
              района — без дома и квартиры.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Демонстрационное имя"
          name="demoName"
          error={state.errors?.demoName?.[0]}
        >
          <input
            id="demoName"
            name="demoName"
            required
            minLength={2}
            maxLength={60}
            autoComplete="off"
            placeholder="Например, Тестовый Клиент"
            className={inputClass}
          />
        </Field>

        <Field
          label="Безопасный demo-телефон"
          name="phone"
          hint="Нерабочий код 00 защищает от случайного реального номера"
          error={state.errors?.phone?.[0]}
        >
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={30}
            autoComplete="off"
            inputMode="tel"
            placeholder="+380 00 000 1042"
            className={inputClass}
          />
        </Field>

        <Field
          label="Категория"
          name="category"
          error={state.errors?.category?.[0]}
        >
          <select
            id="category"
            name="category"
            required
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CrmCategory | "")
            }
            className={inputClass}
          >
            <option value="">Выберите направление</option>
            {crmCategories
              .filter((value) => value !== "common")
              .map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
          </select>
        </Field>

        <Field
          label="Тип услуги"
          name="serviceId"
          error={state.errors?.serviceId?.[0]}
        >
          <select
            key={category}
            id="serviceId"
            name="serviceId"
            required
            disabled={!category}
            className={inputClass}
          >
            <option value="">
              {category ? "Выберите услугу" : "Сначала выберите категорию"}
            </option>
            {availableServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Описание проблемы"
        name="problemDescription"
        hint="От 10 до 1000 символов"
        error={state.errors?.problemDescription?.[0]}
      >
        <textarea
          id="problemDescription"
          name="problemDescription"
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          placeholder="Опишите вымышленную неисправность и её признаки"
          className={`${inputClass} min-h-32 resize-y py-3`}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Район или общий адрес"
          name="area"
          hint="Без номера дома и квартиры"
          error={state.errors?.area?.[0]}
        >
          <input
            id="area"
            name="area"
            required
            minLength={2}
            maxLength={120}
            autoComplete="off"
            placeholder="Демо-район Северный"
            className={inputClass}
          />
        </Field>

        <Field
          label="Желательная дата"
          name="preferredDate"
          error={state.errors?.preferredDate?.[0]}
        >
          <input
            id="preferredDate"
            name="preferredDate"
            type="date"
            required
            min={minDate}
            max={maxDate}
            className={inputClass}
          />
        </Field>
      </div>

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-[#102328]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-[#6b777a]">
          <ShieldCheck
            className="size-4 text-[#477233]"
            aria-hidden="true"
          />
          Заявка удаляется через 48 часов
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 bg-[#102328] px-5 text-white hover:bg-[#1d363c]"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
          {pending ? "Создаём заявку…" : "Создать demo-заявку"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={name} className="text-sm font-semibold text-[#263a3f]">
          {label}
        </label>
        {hint ? <span className="text-xs text-[#849093]">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#102328]/12 bg-[#f8f9f4] px-3 text-sm text-[#263a3f] outline-none transition placeholder:text-[#96a0a2] focus:border-[#6f9b45] focus:ring-2 focus:ring-[#bbf451]/30 disabled:cursor-not-allowed disabled:opacity-55";
