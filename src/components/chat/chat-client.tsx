"use client";

import {
  ArrowLeft,
  BookOpenText,
  Bot,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";

import type {
  ChatField,
  ChatResponse,
} from "@/lib/chat/contracts";

interface TranscriptMessage {
  id: number;
  sender: "assistant" | "customer";
  content: string;
}

const initialMessages: TranscriptMessage[] = [
  {
    id: 1,
    sender: "assistant",
    content:
      "Здравствуйте! Опишите, что случилось. Я помогу оформить заявку, а сервер проверит каждый шаг.",
  },
];

export function ChatClient() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [messages, setMessages] =
    useState<TranscriptMessage[]>(initialMessages);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextMessageId = useRef(2);

  const nextField = result?.missingFields[0] ?? "problemDescription";
  const input = useMemo(() => inputSettings(nextField), [nextField]);
  const showOptions =
    result &&
    ["show_categories", "show_services", "show_slots"].includes(
      result.action,
    ) &&
    result.options.length > 0;
  const isFinished =
    result?.action === "complete" ||
    result?.action === "handoff_to_human";

  async function sendMessage(
    submittedValue: string,
    displayValue = submittedValue,
  ) {
    const normalized = submittedValue.trim();

    if (!normalized || pending || isFinished) {
      return;
    }

    setPending(true);
    setError(null);
    appendMessage("customer", displayValue);
    setValue("");

    try {
      const response = await fetch(
        conversationId ? "/api/chat/message" : "/api/chat/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            conversationId
              ? { conversationId, message: normalized }
              : { message: normalized },
          ),
        },
      );
      const body = (await response.json()) as ChatResponse | { error?: string };

      if (!response.ok || !("conversationId" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Не удалось отправить сообщение",
        );
      }

      setConversationId(body.conversationId);
      setResult(body);
      appendMessage("assistant", body.reply);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось отправить сообщение",
      );
    } finally {
      setPending(false);
    }
  }

  function appendMessage(
    sender: TranscriptMessage["sender"],
    content: string,
  ) {
    const id = nextMessageId.current++;
    setMessages((current) => [...current, { id, sender, content }]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(value);
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
              FixFlow AI · hybrid
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Клиентский чат
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/65">
              LLM распознаёт намерение и данные, а детерминированный сервер
              проверяет поля, создаёт заявку и бронирует реальный слот.
            </p>

            <div className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 size-5 shrink-0 text-amber-300"
                  aria-hidden="true"
                />
                <p className="text-sm leading-5 text-amber-50">
                  Это тестовое рабочее пространство. Не вводите реальные
                  персональные данные.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3 text-sm text-white/60">
              <p className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-[#bbf451]" />
                Безопасный fallback при ошибке LLM
              </p>
              <p className="flex items-center gap-3">
                <CalendarDays className="size-4 text-[#bbf451]" />
                Только реальные свободные слоты
              </p>
            </div>
          </aside>

          <section className="flex min-h-[680px] flex-col">
            <header className="border-b border-[#102328]/8 px-5 py-4 sm:px-7">
              <p className="text-sm font-semibold text-[#102328]">
                Диспетчер FixFlow
              </p>
              <p className="mt-0.5 text-xs text-[#738083]">
                LLM-подсказки · решения по фиксированным правилам
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
                  Сохраняю ответ…
                </div>
              )}

              {result?.sources && result.sources.length > 0 ? (
                <aside className="rounded-2xl border border-[#477233]/15 bg-[#eef4e9] p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#477233]">
                    <BookOpenText className="size-4" aria-hidden="true" />
                    Источники ответа
                  </p>
                  <div className="mt-3 grid gap-2">
                    {result.sources.map((source) => (
                      <article
                        key={`${source.source}-${source.similarity}`}
                        className="rounded-xl bg-white p-3 text-xs text-[#5f6e72]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-[#263a3f]">
                            {source.title}
                          </p>
                          <span className="shrink-0 font-mono text-[#477233]">
                            {(source.similarity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="mt-1.5 leading-5">{source.excerpt}</p>
                        <p className="mt-2 font-mono text-[10px] text-[#829093]">
                          {source.source}
                        </p>
                      </article>
                    ))}
                  </div>
                </aside>
              ) : null}
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

              {showOptions ? (
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
                      Открыть {result.collectedData.publicNumber} в CRM
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="h-11 rounded-xl border border-[#102328]/12 px-5 text-sm font-semibold text-[#263a3f]"
                  >
                    Начать новый чат
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

function inputSettings(field: ChatField) {
  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setUTCDate(maxDate.getUTCDate() + 14);

  const common = {
    min: undefined as string | undefined,
    max: undefined as string | undefined,
  };

  switch (field) {
    case "problemDescription":
      return {
        ...common,
        label: "Описание проблемы",
        type: "text",
        placeholder: "Например: демо-стиральная машина не сливает воду",
        maxLength: 1000,
      };
    case "demoName":
      return {
        ...common,
        label: "Демонстрационное имя",
        type: "text",
        placeholder: "Например: Алексей Тестовый",
        maxLength: 60,
      };
    case "phone":
      return {
        ...common,
        label: "Демонстрационный телефон",
        type: "tel",
        placeholder: "+380 00 000 1042",
        maxLength: 30,
      };
    case "area":
      return {
        ...common,
        label: "Район",
        type: "text",
        placeholder: "Например: Демо-район Северный",
        maxLength: 120,
      };
    case "preferredDate":
      return {
        label: "Желательная дата",
        type: "date",
        placeholder: "",
        min: now.toISOString().slice(0, 10),
        max: maxDate.toISOString().slice(0, 10),
        maxLength: undefined,
      };
    case "preferredTime":
      return {
        ...common,
        label: "Желательное время",
        type: "time",
        placeholder: "",
        maxLength: undefined,
      };
    default:
      return {
        ...common,
        label: "Ответ",
        type: "text",
        placeholder: "Введите ответ",
        maxLength: 1000,
      };
  }
}
