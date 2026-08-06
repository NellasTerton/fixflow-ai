"use client";

import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { inputSettings } from "./input-settings";
import { useChatSession } from "./use-chat-session";

export function ChatClient() {
  const {
    result,
    messages,
    pending,
    error,
    isFinished,
    showOptions,
    sendMessage,
  } = useChatSession();
  const [value, setValue] = useState("");

  const nextField = result?.missingFields[0] ?? "problemDescription";
  const input = useMemo(() => inputSettings(nextField), [nextField]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(value);
    setValue("");
  }

  return (
    <main className="min-h-screen bg-[#f3f4ee] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#477233] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          На главную
        </Link>

        <div className="mt-5 grid overflow-hidden rounded-3xl border border-[#102328]/10 bg-white shadow-xl shadow-[#102328]/7 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="bg-[#102328] p-6 text-white sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#bbf451] text-[#102328]">
              <Bot className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#bbf451]">
              FixFlow Service
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Заявка на мастера
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/65">
              Опишите проблему — подберём услугу, назовём диапазон цены и
              запишем мастера на свободное время.
            </p>

            <div className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 size-5 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <p className="text-sm leading-5 text-amber-50">
                  Не указывайте настоящее имя, телефон и точный адрес —
                  заявки из этого чата попадают в публичную базу.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3 text-sm text-white/60">
              <p className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-[#bbf451]" />
                Ответы только по нашему прайсу
              </p>
              <p className="flex items-center gap-3">
                <CalendarDays className="size-4 text-[#bbf451]" />
                Только реально свободные слоты
              </p>
            </div>
          </aside>

          <section className="flex min-h-[680px] flex-col">
            <header className="border-b border-[#102328]/8 px-5 py-4 sm:px-7">
              <p className="text-sm font-semibold text-[#102328]">
                Диспетчер FixFlow
              </p>
              <p className="mt-0.5 text-xs text-[#738083]">
                Обычно отвечает сразу
              </p>
            </header>

            <div
              className="flex-1 space-y-4 overflow-y-auto bg-[#fafbf7] px-4 py-6 sm:px-7"
              aria-live="polite"
            >
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex items-end gap-2 ${
                    message.sender === "customer"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {message.sender === "assistant" && (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#102328] text-[#bbf451]">
                      <Bot className="size-4" aria-hidden="true" />
                    </span>
                  )}
                  <p
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.sender === "customer"
                        ? "rounded-br-md bg-[#477233] text-white"
                        : "rounded-bl-md border border-[#102328]/8 bg-white text-[#263a3f]"
                    }`}
                  >
                    {message.content}
                  </p>
                  {message.sender === "customer" && (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dce3d8] text-[#477233]">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                  )}
                </article>
              ))}

              {pending && (
                <div className="flex items-center gap-2 text-xs text-[#738083]">
                  <LoaderCircle className="size-4 animate-spin" />
                  Печатает…
                </div>
              )}

            </div>

            <footer className="border-t border-[#102328]/8 bg-white p-4 sm:p-6">
              {error && (
                <p
                  className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {showOptions && result ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void sendMessage(option.value, option.label)
                      }
                      className="rounded-xl border border-[#102328]/12 bg-[#f7f8f3] px-4 py-3 text-left text-sm font-semibold text-[#263a3f] transition hover:border-[#477233]/40 hover:bg-[#eef4e9] disabled:opacity-50"
                    >
                      {option.label}
                      {option.description && (
                        <span className="mt-1 block text-xs font-normal text-[#738083]">
                          {option.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : isFinished ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {result?.collectedData.leadId && (
                    <Link
                      href={`/workspace/leads/${result.collectedData.leadId}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-[#102328] px-5 text-sm font-semibold text-white"
                    >
                      Открыть {result.collectedData.publicNumber}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="h-11 rounded-xl border border-[#102328]/12 px-5 text-sm font-semibold text-[#263a3f]"
                  >
                    Новая заявка
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <label className="sr-only" htmlFor="chat-answer">
                    {input.label}
                  </label>
                  <input
                    id="chat-answer"
                    type={input.type}
                    value={value}
                    min={input.min}
                    max={input.max}
                    maxLength={input.maxLength}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={input.placeholder}
                    disabled={pending}
                    required
                    className="min-w-0 flex-1 rounded-xl border border-[#102328]/14 bg-white px-4 py-3 text-sm text-[#102328] outline-none transition placeholder:text-[#8c989a] focus:border-[#477233] focus:ring-3 focus:ring-[#477233]/12"
                  />
                  <button
                    type="submit"
                    disabled={pending || !value.trim()}
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#bbf451] text-[#102328] transition hover:bg-[#aeea3c] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Отправить"
                  >
                    {pending ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <Send className="size-5" />
                    )}
                  </button>
                </form>
              )}
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
