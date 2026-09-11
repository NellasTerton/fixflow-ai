import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { categoryLabels } from "../../lib/crm/constants";
import { formatPriceRange } from "../../lib/crm/presentation";
import { db } from "../db";
import { documents, services } from "../db/schema";

/**
 * Facts baked directly into the prompt instead of retrieved at query time —
 * the whole knowledge base is 12 short documents plus a small service
 * catalog, easily small enough to always be present. This is the direct fix
 * for the RAG dead-ends/mismatches this session kept hitting: there is no
 * retrieval step left to be ungrounded, disagree with anything, or fail.
 */
export async function buildSystemPrompt(
  activeLead?: { publicNumber: string } | null,
): Promise<string> {
  const [serviceRows, documentRows] = await Promise.all([
    db
      .select({
        category: services.category,
        name: services.name,
        priceFrom: services.priceFrom,
        priceTo: services.priceTo,
      })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.category), asc(services.priceFrom)),
    db
      .select({ title: documents.title, content: documents.content })
      .from(documents)
      .where(and(eq(documents.status, "published"), eq(documents.isDemo, true)))
      .orderBy(asc(documents.title)),
  ]);

  const servicesByCategory = new Map<string, typeof serviceRows>();
  for (const row of serviceRows) {
    const list = servicesByCategory.get(row.category) ?? [];
    list.push(row);
    servicesByCategory.set(row.category, list);
  }

  const servicesText = [...servicesByCategory.entries()]
    .map(([category, rows]) => {
      const label = categoryLabels[category as keyof typeof categoryLabels];
      const lines = rows
        .map(
          (row) =>
            `  - ${row.name}: ${formatPriceRange(row.priceFrom, row.priceTo)}`,
        )
        .join("\n");
      return `${label}:\n${lines}`;
    })
    .join("\n\n");

  const knowledgeText = documentRows
    .map((doc) => `### ${doc.title}\n${doc.content}`)
    .join("\n\n");

  const activeLeadText = activeLead
    ? `\nДля этого диалога уже создана заявка ${activeLead.publicNumber} — не вызывай create_lead повторно. Можно продолжать (например check_availability/book_slot), если клиент ещё не выбрал время.`
    : "";

  return `Ты — диспетчер FixFlow Service, компании по выездному ремонту бытовой техники, сантехники и кондиционеров в Москве. Отвечаешь клиентам в чате на сайте.

Правила:
- Понимай проблему клиента своими словами и сам веди разговор естественно — уточняй по одному-два пункта за раз, а не списком, и не переспрашивай то, что клиент уже сказал.
- Отвечай только на основе фактов ниже (прайс и база знаний). Если ответа там нет — прямо скажи, что не знаешь, и предложи, что уточнит мастер на месте или оператор по телефону.
- Никогда не называй точную окончательную цену — только диапазон из прайса, с пометкой, что мастер подтвердит сумму на месте.
- Пиши кратко, по-деловому и дружелюбно, на русском языке.

Оформление заявки:
- Чтобы создать заявку (create_lead), нужны все пять полей: категория, конкретная услуга из прайса, имя, телефон, район (без дома и квартиры) и описание проблемы.
- Услугу сопоставляй с прайсом по смыслу (например «течёт кран» → «Замена смесителя»). Если проблема не подходит ни под одну конкретную позицию, стоит нескольких работ сразу или клиент не уверен — используй общую позицию вроде диагностики/выезда, если такая есть в прайсе для категории, либо создай заявку с тем описанием, что есть, и предупреди, что мастер уточнит объём на месте.
- После создания заявки предложи клиенту выбор: самому назвать удобное время (тогда вызови check_availability и предложи 1-3 реальных варианта, а после выбора — book_slot) или чтобы просто перезвонил оператор и согласовал детали. Не навязывай один вариант — прими то, что удобнее клиенту.
- Если слот из check_availability при вызове book_slot оказался уже занят — сразу предложи другой реальный вариант из ответа инструмента, не сообщай клиенту техническую ошибку.
- slot_id актуален только в том же ответе, где ты его получил от check_availability — в новом сообщении клиента (даже если он выбирает время, которое ты называл раньше) сначала вызови check_availability заново и возьми slot_id из этого нового результата, только потом book_slot. Никогда не используй slot_id, упомянутый в более раннем сообщении переписки, — вызов провалится.
- После успешного book_slot подтверди в таком духе: «Записал вас на [услуга], [когда], мастер приедет, до встречи!» После create_lead без брони: «Заявка [номер] создана, оператор перезвонит и согласует время». Не упоминай сами инструменты или технические детали клиенту.${activeLeadText}

=== ПРАЙС ===

${servicesText}

=== БАЗА ЗНАНИЙ ===

${knowledgeText}`;
}
