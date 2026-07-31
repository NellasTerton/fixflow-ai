# FixFlow AI

AI-диспетчер и операционная система для выездных сервисных компаний,
показанные через публичное тестовое рабочее пространство с вымышленными
данными.

## Локальная настройка

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Скопируйте `.env.example` в `.env.local` и добавьте два Neon connection
   string:

   - `DATABASE_URL` — pooled URL для приложения;
   - `DATABASE_URL_DIRECT` — direct URL для миграций.

   Для Claude также задайте:

   - `LLM_BASE_URL` — `https://api.anthropic.com` или полный Messages endpoint;
   - `LLM_API_KEY` — секретный Claude API key;
   - `LLM_MODEL` — доступная вашему ключу модель.

3. Примените миграции и запустите приложение:

   ```bash
   npm run db:migrate
   npm run dev
   ```

По умолчанию приложение доступно на
[http://localhost:3000](http://localhost:3000). Проверка базы:
`GET /api/health/db`.

Публичная клиентская часть:

```text
/
/chat
/request
/request/success
```

Гибридный чат работает через `POST /api/chat/start` и
`POST /api/chat/message`. Claude классифицирует запрос и извлекает данные, но
сервер самостоятельно проверяет поля и выбирает действие. При ошибке или
отсутствии LLM автоматически используется детерминированный сценарий.

Обычная форма принимает только вымышленные данные и безопасные
демонстрационные телефоны с кодом `+380 00`. После отправки она показывает
номер заявки и предлагает свободное время; новая запись сразу доступна в CRM.

Публичное рабочее пространство доступно без регистрации и логина:

```text
/workspace/leads
/workspace/leads/[id]
/workspace/knowledge
/workspace/ai-runs
/workspace/automations
```

## Команды базы данных

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Демонстрационные данные

```bash
npm run demo:seed
npm run demo:reset
npm run knowledge:seed
```

`demo:seed` идемпотентно создаёт канонический набор вымышленных данных
FixFlow Service. `demo:reset` удаляет только записи с `is_seed=true` и создаёт
этот набор заново. Команды не запускаются автоматически и не изменяют схему.

`knowledge:seed` читает только `.md` и `.txt` из `knowledge/demo`, создаёт
chunks и 1536-мерные embeddings и идемпотентно сохраняет их в Neon. При
информационном вопросе чат ищет максимум пять chunks выбранной категории и
`common`, а затем показывает пользователю источники ответа.

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

Подробности находятся в каталоге `docs`. Целевая платформа размещения —
Netlify.
