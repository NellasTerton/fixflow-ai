# Автоматизации FixFlow AI

Документ описывает контур автоматизаций: события Next.js, сценарии Make,
Telegram-уведомления и обратные callback.

Граница ответственности неизменна: Next.js создаёт бизнес-события и отправляет
webhook. Расписание, задержки, Telegram и маршрутизация находятся в Make.
Next.js не запускает cron, таймеры и отложенные действия.

## События

| Событие | Когда создаётся | entity_type | urgency |
| --- | --- | --- | --- |
| `lead.created` | создана заявка через форму или чат | `lead` | normal |
| `booking.created` | слот забронирован | `lead` | normal |
| `handoff.required` | AI передаёт вопрос человеку | `lead` | urgent |
| `lead.followup_due` | заявка без бронирования дольше порога | `lead` | normal |
| `booking.reminder_due` | выезд начинается внутри окна напоминания | `lead` | normal |

Все события хранятся в `integration_events` и отправляются одним и тем же
Custom Webhook в Make. Конверт запроса одинаков для всех типов:

```json
{
  "version": "1.0",
  "eventId": "uuid",
  "eventType": "lead.created",
  "entityType": "lead",
  "entityId": "uuid",
  "occurredAt": "2026-07-31T09:00:00.000Z",
  "callbackUrl": "https://fixflow-ai-661.netlify.app/api/integrations/make/callback",
  "urgency": "normal",
  "telegramMessage": "готовый текст сообщения",
  "payload": { "publicNumber": "FF-1047" }
}
```

Уникальный индекс `integration_events_type_entity_unique`
(`event_type`, `entity_type`, `entity_id`) гарантирует, что для одной заявки
существует ровно одно событие каждого типа. Отложенные события физически не
могут повториться.

## Сценарий 1. FixFlow AI — Telegram notifications

Мгновенные уведомления. Триггер — Custom Webhook, дальше Router с
**пятью** ветками.

### Обязательные правила маршрутизации

1. У каждой ветки есть собственный фильтр.
2. Фильтр всегда строгий: `eventType` `Text: Equal to` конкретное значение.
3. Ветки без фильтра запрещены.
4. Fallback-маршрут запрещён.
5. Фильтры вида `contains`, `not equal` и фильтры по `urgency` запрещены:
   `urgency = normal` совпадает сразу с четырьмя типами событий.

### Ветки

| Ветка | Фильтр `eventType` | Telegram | callback `action` |
| --- | --- | --- | --- |
| 1 | `lead.created` | `sendMessage` | `telegram.lead_created` |
| 2 | `booking.created` | `sendMessage` | `telegram.booking_created` |
| 3 | `handoff.required` | `sendMessage` | `telegram.handoff_required` |
| 4 | `lead.followup_due` | `sendMessage` | `telegram.lead_followup_due` |
| 5 | `booking.reminder_due` | `sendMessage` | `telegram.booking_reminder_due` |

Telegram-модуль отправляет `telegramMessage` без изменений: текст уже собран и
отредактирован на сервере, телефоны замаскированы, точный адрес скрыт.

Callback-модуль выполняет `POST` на `callbackUrl` из конверта:

```json
{
  "eventId": "{{1.eventId}}",
  "platform": "make",
  "workflowName": "FixFlow AI — Telegram notifications",
  "action": "telegram.lead_created",
  "status": "success",
  "externalRunId": "{{executionId}}",
  "details": { "chat": "demo-dispatcher" }
}
```

Заголовок `x-fixflow-callback-secret` содержит `AUTOMATION_CALLBACK_SECRET`.

Уникальные `action` у каждой ветки обязательны. `automation_logs` содержит
уникальный индекс (`integration_event_id`, `platform`, `workflow_name`,
`action`): одинаковый `action` в двух ветках схлопнется в одну строку, и
дублирующая ветка останется незаметной в `/workspace/automations`.

### Разобранный случай двойных уведомлений

Симптом: `handoff.required` приходил один раз, `lead.created` и
`booking.created` — по два, история Make показывала 5 операций вместо 3.

Расчёт операций для одного события: Webhook 1 + Telegram 1 + callback 1 = 3.
Router операции не тратит. 5 операций означают, что отработали две ветки.

Причина оказалась в третьей ветке. Её фильтр `handoff.required` был привязан к
пустому модулю `placeholder:Placeholder`, который стоял первым в ветке.
Placeholder не выполняется, поэтому его фильтр ничего не ограничивал, а
следовавшие за ним Telegram и callback срабатывали на каждое событие:

- `lead.created` — ветка 1 плюс ветка 3 = 5 операций;
- `booking.created` — ветка 2 плюс ветка 3 = 5 операций;
- `handoff.required` — только ветка 3 = 3 операции и одно сообщение.

Дубли не были видны в `/workspace/automations`, потому что все три callback
отправляли один и тот же `action=telegram.send`, а уникальный индекс
`automation_logs` схлопывал их в одну строку.

Исправление: placeholder удалён, фильтр перенесён на первый реальный модуль
ветки, каждому callback задан собственный `action`.

Инвариант, который нужно удерживать при любых правках Router:

1. Ровно пять веток, по одной на тип события.
2. У первого модуля каждой ветки есть фильтр `eventType` `Text: Equal to`.
3. На последующих модулях ветки фильтров нет.
4. Ни одной ветки без фильтра, ни одного placeholder, ни одного fallback.
5. Пять разных значений `action` в callback-модулях.

## Сценарий 2. FixFlow AI — Delayed automations

Отложенные бизнес-автоматизации: follow-up по заявке без бронирования и
напоминание перед выездом. Сценарий создан (id `6773592`, зона `eu1`, team
`2239329`) и настроен, но остаётся выключенным: тарифный план Make допускает
только два активных сценария одновременно, и оба слота заняты.

Сценарий состоит из расписания и одного HTTP-модуля. Задержку держит
расписание Make, а не Next.js.

- Триггер: `Schedule` — каждые 15 минут.
- Модуль: `HTTP → Make a request`.
- Метод: `POST`.
- URL: `https://fixflow-ai-661.netlify.app/api/integrations/automation/scan`.
- Заголовок: `x-fixflow-automation-secret: <AUTOMATION_CALLBACK_SECRET>`.
- Тело (`application/json`), необязательное:

```json
{ "followUpAfterMinutes": 30, "reminderWithinMinutes": 120, "limit": 20 }
```

Ответ:

```json
{
  "status": "ok",
  "followUpAfterMinutes": 30,
  "reminderWithinMinutes": 120,
  "followUpCandidates": 2,
  "followUpEventsCreated": 2,
  "reminderCandidates": 1,
  "reminderEventsCreated": 1,
  "createdEventIds": ["uuid", "uuid", "uuid"]
}
```

Что делает endpoint:

1. Находит заявки без бронирования: не seed, статус `new`, `qualifying` или
   `waiting_booking`, созданы раньше порога, срок жизни не истёк, брони нет.
2. Находит ближайшие выезды: бронирование `pending` или `confirmed`, старт в
   будущем и внутри окна напоминания.
3. Создаёт события `lead.followup_due` и `booking.reminder_due` через
   `insert ... on conflict do nothing`.
4. Передаёт только новые события в тот же outbox, что и мгновенные события.

Поэтому отложенные уведомления приходят в тот же Custom Webhook, проходят тот
же Router и возвращают callback тем же способом. Отдельный Telegram-контур не
нужен.

Пороги:

- `followUpAfterMinutes` — от 5 до 1440, по умолчанию 30;
- `reminderWithinMinutes` — от 15 до 2880, по умолчанию 120;
- `limit` — от 1 до 50, по умолчанию 20.

Seed-заявки исключены: 18 демонстрационных заявок без бронирования иначе
превратились бы в 18 сообщений при первом запуске.

Повторный запуск сканирования безопасен. Кандидаты, для которых событие уже
создано, отбрасываются в SQL, а гонку закрывает уникальный индекс.
Follow-up отправляется по заявке ровно один раз, напоминание — ровно одно на
бронирование.

## Секреты

| Переменная | Кто использует |
| --- | --- |
| `AUTOMATION_WEBHOOK_URL` | Next.js: адрес Custom Webhook Make |
| `AUTOMATION_WEBHOOK_SECRET` | Next.js: заголовки `x-make-apikey` и HMAC-подпись |
| `AUTOMATION_CALLBACK_SECRET` | Make: `x-fixflow-callback-secret` и `x-fixflow-automation-secret` |

Секреты хранятся только в `.env.local` и переменных Netlify. В репозиторий,
логи, чат и скриншоты они не попадают.

## Результат production-проверки 31 июля 2026

| Событие | Заявка | Операций Make | Telegram | automation_logs |
| --- | --- | --- | --- | --- |
| `lead.created` | FF-1048 | 3 | 1 | 1 · `telegram.lead_created` |
| `booking.created` | FF-1048 | 3 | 1 | 1 · `telegram.booking_created` |
| `handoff.required` | — | 3 | 1 | 1 · `telegram.handoff_required` |
| `lead.followup_due` | FF-1043, FF-1044 | 3 + 3 | 2 | 2 · `telegram.lead_followup_due` |
| `booking.reminder_due` | FF-1046 | 3 | 1 | 1 · `telegram.booking_reminder_due` |

Все шесть событий получили `delivery_status=delivered` и HTTP 200. Повторный
запуск сканирования вернул нули по обоим типам отложенных событий.

## План production-проверки

1. `lead.created`: создать заявку на `/request`. Ожидание — 3 операции Make,
   одно сообщение в Telegram, один `automation_log` с
   `action=telegram.lead_created`.
2. `booking.created`: выбрать слот. Ожидание — 3 операции, одно сообщение.
3. `handoff.required`: задать в `/chat` вопрос вне зоны услуг. Ожидание — 3
   операции, одно сообщение.
4. `lead.followup_due`: заявка без бронирования старше 30 минут; запустить
   сценарий 2 вручную кнопкой `Run once`. Ожидание — `followUpEventsCreated`
   больше нуля и столько же сообщений.
5. `booking.reminder_due`: запустить сценарий 2 с телом
   `{"reminderWithinMinutes": 2880}`, чтобы попасть в ближайшее
   демонстрационное бронирование.
6. Повторно запустить сценарий 2. Ожидание — `followUpEventsCreated` и
   `reminderEventsCreated` равны нулю, новых сообщений нет.
7. Открыть `/workspace/automations` и проверить, что все события имеют статус
   `delivered`, а у каждого есть ровно один `automation_log`.
