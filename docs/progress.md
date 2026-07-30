# Прогресс FixFlow AI

Обновлено: 30 июля 2026.

## Текущий этап

Этап 9 завершён: RAG использует Neon pgvector, демонстрационную базу знаний,
ограниченный Claude provider, проверку grounding и публичные источники ответа.

## Готово

- Инициализирован Next.js с App Router, TypeScript, `src` и alias `@/*`.
- Подключены Tailwind CSS, shadcn/ui, ESLint и Vitest.
- Создана минимальная главная страница FixFlow AI.
- Подключены `@neondatabase/serverless`, Drizzle ORM, Drizzle Kit и Zod.
- Добавлен server-only валидатор `DATABASE_URL`.
- Настроен отдельный `DATABASE_URL_DIRECT` для Drizzle Kit, миграций и Drizzle Studio.
- Runtime-подключение приложения построено через `drizzle-orm/neon-http`.
- `neon-serverless`, WebSocket, `ws`, `Pool` и `Client` не используются в runtime-подключении.
- Создана таблица `app_meta` с UUID, уникальным ключом, значением и временем создания.
- Сгенерирована и применена первая SQL-миграция.
- Создан `GET /api/health/db`, выполняющий реальный `SELECT 1` в Neon.
- Добавлен unit-тест подключения с mock-базой.
- Добавлены команды `db:generate`, `db:migrate` и `db:studio`.
- Обновлен `.env.example` без секретов.
- Созданы таблицы `services`, `customers`, `leads`, `availability_slots`,
  `bookings`, `tasks`, `conversations`, `messages`, `documents`,
  `document_chunks`, `ai_runs`, `integration_events` и `automation_logs`.
- Добавлены PostgreSQL enum для категорий, статусов, приоритетов, источников и
  технических состояний.
- Добавлены внешние ключи, индексы, уникальные ограничения и check constraints.
- Настроено безопасное поведение при удалении: `restrict` для основных
  сущностей, `set null` для необязательных связей и ограниченный `cascade`
  только для полностью зависимых данных.
- Все моменты времени хранятся как timezone-aware timestamps в UTC.
- Сгенерирована и применена миграция `0001_fixflow_data_model`.
- Добавлены тесты состава схемы, enum, UTC timestamp, внешних ключей,
  уникальных индексов и check constraints.
- Поля `is_seed` добавлены в услуги, клиентов, слоты и задачи; заявки уже
  использовали этот маркер.
- Созданы 12 услуг с демонстрационными диапазонами цен.
- Созданы 12 вымышленных клиентов с нерабочими телефонами, учебными адресами
  и email на `example.com`.
- Созданы 18 заявок во всех восьми статусах и трёх сервисных категориях.
- Созданы 20 свободных UTC-слотов на ближайшие 14 дней и 6 демонстрационных
  задач.
- Добавлены ручные команды `demo:seed` и `demo:reset`; seed не связан с
  миграциями и не запускается автоматически.
- Seed использует детерминированные UUID и PostgreSQL upsert.
- Сгенерирована и применена миграция `0002_demo_seed_markers`.
- Добавлены тесты безопасности состава и идемпотентности seed.
- Созданы публичные маршруты `/demo/crm`, `/demo/leads/[id]`,
  `/demo/knowledge`, `/demo/ai-runs` и `/demo/automations`.
- На всех страницах отображается заметное уведомление о публичном demo и
  вымышленных данных.
- На `/demo/crm` реализован read-only Kanban по восьми статусам без drag and
  drop.
- Добавлены SQL-фильтры по категории, статусу, приоритету и источнику, а также
  поиск по номеру, имени клиента и описанию проблемы.
- Добавлены ручное обновление и polling каждые 10 секунд через
  `GET /api/demo/leads` с `no-store`.
- Детальная карточка показывает цену, время, безопасные данные клиента,
  сообщения, AI runs, integration events и automation logs.
- Добавлены страницы базы знаний, AI runs и автоматизаций с реальными Neon
  запросами и честными empty states.
- Добавлены общие loading, error, empty и not-found states.
- Интерфейс адаптирован для мобильных экранов и горизонтального Kanban.
- Сырые телефоны и адреса исключены из публичных DTO; тексты дополнительно
  редактируются перед отправкой в браузер.
- Добавлен фирменный social preview `public/og.png`.
- Добавлены тесты публичных маршрутов и маскирования чувствительных данных.
- Созданы маршруты `/request` и `/request/success` с обычной формой заявки и
  выбором реальных свободных слотов из Neon.
- Поля формы валидируются Zod, ограничены по длине, а телефон нормализуется и
  принимается только в заведомо демонстрационном диапазоне `+380 00`.
- Добавлены honeypot, постоянный rate limit в Neon и UUID-ключ
  идемпотентности для защиты от спама и двойной отправки.
- Клиент и заявка создаются одной HTTP-транзакцией Neon; номер выдаётся
  PostgreSQL sequence в формате `FF-1042`.
- Пользовательская заявка получает `source=website_form`, `is_seed=false` и
  срок жизни ровно 48 часов.
- Бронирование выполняется одним атомарным SQL statement: слот резервируется,
  создаётся booking и статус заявки становится `booked`.
- Уникальные ограничения на `bookings.lead_id` и `bookings.slot_id` вместе с
  условным обновлением слота не позволяют забронировать его повторно.
- Добавлен конкурентный тест бронирования.
- Сгенерирована и применена миграция `0003_public_request_flow`.
- Создан публичный маршрут `/chat` с мобильным интерфейсом диалога и заметным
  предупреждением не вводить реальные персональные данные.
- Добавлены `POST /api/chat/start` и `POST /api/chat/message` с Zod-валидацией,
  безопасными ответами и `no-store`.
- Детерминированный конечный автомат собирает описание, категорию, услугу,
  имя, demo-телефон, район, дату и время и не повторяет уже заполненные поля.
- Категории, активные услуги и реальные свободные слоты отображаются кнопками.
- Каждая пара сообщений сохраняется в `messages`, а шаг и собранные данные —
  в `conversations`.
- После последнего текстового ответа одним атомарным SQL statement создаются
  или обновляются demo-customer, lead с `source=ai_chat` и связь conversation.
- Выбор слота атомарно резервирует `availability_slots`, создаёт booking,
  переводит lead в `booked`, а conversation — в `completed`.
- LLM, AI runs, RAG и webhook из чата не вызываются.
- Добавлены три полных теста сценария: бытовая техника, сантехника и
  кондиционеры.
- Добавлены server-only Claude Messages provider и отдельные переменные
  `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.
- LLM получает только роль классификатора, экстрактора данных и формулировщика
  вопроса; инструменты, Neon и операции записи ей не передаются.
- Ответ модели проверяется строгой Zod-схемой, а `proposedAction` считается
  только предложением и повторно решается конечным автоматом.
- Добавлен timeout 7 секунд и fallback при отсутствующей конфигурации,
  недоступном provider, неправильном JSON, ошибке схемы и низкой confidence.
- Успешные и ошибочные обращения сохраняются в `ai_runs`; input summary не
  содержит текст сообщения, а телефон, адрес и имя редактируются в
  `parsed_output`.
- Добавлен mock provider и тесты valid output, invalid JSON, invalid schema,
  timeout, provider unavailable и low confidence.
- Добавлен RAG через Neon pgvector: `vector(1536)`, HNSW cosine index,
  category + common retrieval, порог similarity и максимум 5 chunks.
- Созданы 12 demo-документов в `knowledge/demo`; поддерживаются только
  вставленный текст, `.md` и `.txt`, PDF не поддерживается.
- `npm run knowledge:seed` создаёт chunks размером примерно 700–1000 символов
  с overlap около 120 символов и идемпотентно сохраняет embeddings.
- Информационные ответы проходят grounding-проверку: неподтверждённые цены,
  гарантии, зона обслуживания и обещание точной цены отклоняются.
- Чат возвращает источники, `/demo/ai-runs` показывает вопрос, chunks,
  similarity, ответ, модель, duration и action.
- В карточке заявки появился раздел «Почему AI так ответил?» с источниками.

## Проверки

- `.env.local` загружает `DATABASE_URL`; hostname runtime-подключения pooled.
- `.env.local` загружает `DATABASE_URL_DIRECT`; hostname migration-подключения direct.
- Полные строки подключения и пароли не выводились в логах.
- Прямой `neon(...).query("select 1")` успешно выполнился в Neon.
- Drizzle `neon-http` успешно выполнил `SELECT 1` в Neon.
- `http://localhost:3001/` — HTTP 200.
- `http://localhost:3001/api/health/db` — HTTP 200 и тело `{"status":"ok","database":"connected"}`.
- Neon подтверждает наличие всех 13 новых доменных таблиц.
- Два последовательных запуска `npm run demo:seed` сохранили точные количества:
  12 услуг, 12 клиентов, 18 заявок, 20 слотов и 6 задач.
- `npm run demo:reset` удалил только seed-строки и восстановил те же количества.
- Все пять публичных CRM-страниц отвечают HTTP 200 без логина.
- Каждая CRM-страница содержит обязательное demo-уведомление.
- Публичный API вернул 18 реальных заявок из Neon и не содержит полей
  `phone` или `address`.
- Настоящая форма создала в Neon заявку `FF-1042`; страница результата и CRM
  ответили HTTP 200.
- Neon подтвердил для заявки `source=website_form`, `is_seed=false`,
  `expires_at` через 48 часов, созданное бронирование и статус `booked`.
- Публичный CRM API не раскрыл полный телефон или введённую локацию заявки.
- Реальный API-диалог создал заявку `FF-1045`, сохранил 18 сообщений, создал
  booking и завершил conversation.
- Neon подтвердил `source=ai_chat`, `is_seed=false`, lead `booked`,
  conversation `completed` и `current_step=complete`.
- Legacy-запись `claude_api - …` в `.env.local` безопасно преобразована в
  `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`; выбран доступный
  `claude-sonnet-5`.
- Живой API подтвердил fallback при отсутствующей конфигурации, а после
  настройки — реальный Claude-вызов, category `plumbing`, переход сразу к
  `show_services` и успешный `ai_runs` за 2513 мс.
- `npm run lint` — успешно после этапа 8.
- `npm run typecheck` — успешно после этапа 8.
- `npm test` — успешно, 31 тест после этапа 8.
- `npm run build` — успешно после этапа 8.
- Миграция `0004_powerful_cobalt_man` включила pgvector при необходимости,
  добавила `document_chunks.embedding vector(1536)` и HNSW cosine index.
- Два последовательных запуска `npm run knowledge:seed` сохранили одинаковый
  результат: 12 документов и 12 chunks без дубликатов.
- Контрольный вопрос «Сколько стоит устранить протечку?» вернул диапазон
  `900–1 800 ₴` из `prices-plumbing.md` и два источника.
- На вопрос о пожизненной гарантии AI ответил отрицательно и сослался на
  `warranty.md` со сроком до 90 дней.
- Вопрос о ремонте автомобилей вернул `handoff_to_human` без выдуманной услуги.
- `npm run lint`, `npm run typecheck`, 40 тестов и `npm run build` успешно
  прошли после этапа 9.
- `/chat`, `/demo/knowledge`, `/demo/ai-runs` и `/api/health/db` отвечают
  HTTP 200 на `http://localhost:3001`.

## Следующие этапы

- Подключить исходящие webhooks к Make или n8n.

Claude provider и RAG подключены и проверены реальными запросами. Внешние API
автоматизаций пока не подключены.

## Netlify production deploy

- GitHub `main` published to Netlify project `fixflow-ai-661`.
- Root directory is the repository root; build command is `npm run build`.
- Manual Netlify Next runtime is configured with `@netlify/plugin-nextjs` and
  `publish = ".next"` because the API-created site did not deploy server
  functions with automatic detection alone.
- GitHub push webhook is active and the deploy for commit `1bb2998` was started
  automatically.
- Production deploy includes Netlify server functions and `plugin_state=success`.
- Verified production routes on `https://fixflow-ai-661.netlify.app`:
  `/`, `/chat`, `/request`, `/demo/crm`, `/demo/knowledge`, `/demo/ai-runs`,
  `/demo/automations`, `/api/health/db`.
- Production `/api/health/db` returned HTTP 200 with
  `{"status":"ok","database":"connected"}`.
