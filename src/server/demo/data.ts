import type {
  availabilitySlots,
  customers,
  leads,
  services,
  tasks,
} from "../db/schema";

export type DemoServiceSeed = typeof services.$inferInsert;
export type DemoCustomerSeed = typeof customers.$inferInsert;
export type DemoLeadSeed = typeof leads.$inferInsert;
export type DemoAvailabilitySlotSeed = typeof availabilitySlots.$inferInsert;
export type DemoTaskSeed = typeof tasks.$inferInsert;

export interface DemoSeedData {
  services: DemoServiceSeed[];
  customers: DemoCustomerSeed[];
  leads: DemoLeadSeed[];
  availabilitySlots: DemoAvailabilitySlotSeed[];
  tasks: DemoTaskSeed[];
}

function demoId(group: number, index: number) {
  return `${group}0000000-0000-4000-8000-${index
    .toString()
    .padStart(12, "0")}`;
}

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function startOfNextUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate() + 1,
    ),
  );
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

/**
 * Prices are stored in kopiykas, so 120_000 renders as 1 200 ₴. A lead's
 * estimate is always derived from its service's published range (see
 * `estimateFor`), so the number on a card can be traced back to the price
 * list instead of looking arbitrary.
 */
const serviceRecords: DemoServiceSeed[] = [
  {
    id: demoId(1, 1),
    category: "appliance_repair",
    name: "Ремонт стиральной машины",
    description:
      "Диагностика, замена подшипников, насоса, ТЭНа и модуля управления.",
    priceFrom: 120_000,
    priceTo: 450_000,
    durationMinutes: 90,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 2),
    category: "appliance_repair",
    name: "Ремонт посудомоечной машины",
    description: "Устранение протечек, засоров слива и ошибок электроники.",
    priceFrom: 130_000,
    priceTo: 480_000,
    durationMinutes: 90,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 3),
    category: "appliance_repair",
    name: "Ремонт холодильника",
    description: "Заправка контура, замена компрессора, термостата и датчиков.",
    priceFrom: 150_000,
    priceTo: 650_000,
    durationMinutes: 120,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 4),
    category: "appliance_repair",
    name: "Ремонт духового шкафа",
    description: "Замена нагревательных элементов, термопары и переключателей.",
    priceFrom: 110_000,
    priceTo: 420_000,
    durationMinutes: 90,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 5),
    category: "plumbing",
    name: "Устранение протечки",
    description: "Поиск источника течи, замена уплотнений и участков трубы.",
    priceFrom: 80_000,
    priceTo: 250_000,
    durationMinutes: 60,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 6),
    category: "plumbing",
    name: "Прочистка засора",
    description: "Механическая и гидродинамическая прочистка канализации.",
    priceFrom: 90_000,
    priceTo: 300_000,
    durationMinutes: 75,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 7),
    category: "plumbing",
    name: "Замена смесителя",
    description: "Демонтаж старого смесителя, установка и проверка нового.",
    priceFrom: 100_000,
    priceTo: 280_000,
    durationMinutes: 60,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 8),
    category: "plumbing",
    name: "Установка унитаза",
    description: "Демонтаж, подключение к канализации, герметизация и проверка.",
    priceFrom: 220_000,
    priceTo: 550_000,
    durationMinutes: 120,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 9),
    category: "air_conditioning",
    name: "Диагностика кондиционера",
    description: "Проверка давления, электрики и кодов ошибок сплит-системы.",
    priceFrom: 70_000,
    priceTo: 150_000,
    durationMinutes: 45,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 10),
    category: "air_conditioning",
    name: "Чистка кондиционера",
    description: "Антибактериальная чистка внутреннего и внешнего блоков.",
    priceFrom: 120_000,
    priceTo: 300_000,
    durationMinutes: 90,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 11),
    category: "air_conditioning",
    name: "Заправка кондиционера",
    description: "Проверка на утечки, вакуумирование и заправка фреоном.",
    priceFrom: 180_000,
    priceTo: 450_000,
    durationMinutes: 90,
    isActive: true,
    isSeed: true,
  },
  {
    id: demoId(1, 12),
    category: "air_conditioning",
    name: "Установка кондиционера",
    description: "Монтаж блоков, трассы и пусконаладка сплит-системы под ключ.",
    priceFrom: 450_000,
    priceTo: 1_200_000,
    durationMinutes: 240,
    isActive: true,
    isSeed: true,
  },
];

interface CustomerBlueprint {
  name: string;
  district: string;
  street: string;
}

const customerBlueprints: CustomerBlueprint[] = [
  { name: "Ольга Коваленко", district: "Оболонский район", street: "проспект Героев Днепра, 12, кв. 47" },
  { name: "Андрей Мельник", district: "Печерский район", street: "улица Институтская, 18, кв. 9" },
  { name: "Ирина Шевченко", district: "Шевченковский район", street: "улица Гоголевская, 32, кв. 15" },
  { name: "Сергей Бондаренко", district: "Подольский район", street: "улица Хорива, 44, кв. 3" },
  { name: "Наталья Ткаченко", district: "Голосеевский район", street: "проспект Науки, 60, кв. 112" },
  { name: "Дмитрий Кравченко", district: "Дарницкий район", street: "улица Ревуцкого, 9, кв. 208" },
  { name: "Елена Полищук", district: "Соломенский район", street: "улица Гарматная, 26, кв. 71" },
  { name: "Виктор Савченко", district: "Святошинский район", street: "проспект Победы, 134, кв. 55" },
  { name: "Марина Гриценко", district: "Деснянский район", street: "улица Милославская, 4, кв. 88" },
  { name: "Павел Романюк", district: "Днепровский район", street: "улица Челябинская, 17, кв. 22" },
  { name: "Анна Литвиненко", district: "Оболонский район", street: "улица Маршала Тимошенко, 21, кв. 64" },
  { name: "Роман Гончаренко", district: "Печерский район", street: "улица Мечникова, 8, кв. 31" },
];

interface LeadBlueprint {
  customer: number;
  service: number;
  problem: string;
  status: "new" | "booked" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  /** Set on completed work: the invoiced amount replaces the estimate range. */
  finalPrice?: number;
  needsOperator?: boolean;
}

const leadBlueprints: LeadBlueprint[] = [
  {
    customer: 0,
    service: 0,
    problem:
      "Стиральная машина Bosch останавливается на отжиме, вода остаётся в барабане.",
    status: "new",
    priority: "normal",
  },
  {
    customer: 1,
    service: 4,
    problem:
      "Течь под кухонной мойкой, вода капает из места соединения сифона.",
    status: "new",
    priority: "high",
  },
  {
    customer: 2,
    service: 8,
    problem:
      "Кондиционер Samsung выдаёт ошибку E1 и отключается через пять минут работы.",
    status: "new",
    priority: "normal",
  },
  {
    customer: 3,
    service: 2,
    problem:
      "Холодильник не держит температуру в морозильной камере, продукты подтаивают.",
    status: "booked",
    priority: "high",
  },
  {
    customer: 4,
    service: 5,
    problem: "Не уходит вода в ванной, стоит запах из слива.",
    status: "booked",
    priority: "normal",
  },
  {
    customer: 5,
    service: 9,
    problem:
      "Кондиционер дует слабо и с неприятным запахом, чистку не делали два года.",
    status: "completed",
    priority: "low",
    finalPrice: 180_000,
  },
  {
    customer: 6,
    service: 1,
    problem:
      "Посудомоечная машина не сливает воду до конца, на дне остаётся лужа.",
    status: "cancelled",
    priority: "normal",
  },
  {
    customer: 7,
    service: 6,
    problem:
      "Нужно заменить смеситель в ванной, старый подтекает у основания.",
    status: "new",
    priority: "high",
    needsOperator: true,
  },
  {
    customer: 8,
    service: 10,
    problem: "Кондиционер холодит слабо, похоже нужна дозаправка фреоном.",
    status: "booked",
    priority: "normal",
  },
  {
    customer: 9,
    service: 3,
    problem: "Духовой шкаф не нагревается, индикация горит, вентилятор работает.",
    status: "in_progress",
    priority: "normal",
  },
  {
    customer: 10,
    service: 7,
    problem: "Требуется установка нового унитаза взамен старого.",
    status: "booked",
    priority: "low",
  },
  {
    customer: 11,
    service: 11,
    problem:
      "Нужен монтаж сплит-системы в двухкомнатной квартире, техника уже куплена.",
    status: "in_progress",
    priority: "high",
  },
  {
    customer: 0,
    service: 8,
    problem: "Кондиционер шумит при запуске внешнего блока.",
    status: "completed",
    priority: "normal",
    finalPrice: 95_000,
  },
  {
    customer: 4,
    service: 6,
    problem: "Капает смеситель на кухне, требуется замена картриджа.",
    status: "completed",
    priority: "low",
    finalPrice: 120_000,
  },
  {
    customer: 2,
    service: 0,
    problem:
      "Стиральная машина сильно вибрирует и смещается при отжиме на высоких оборотах.",
    status: "booked",
    priority: "normal",
  },
  {
    customer: 6,
    service: 5,
    problem: "Забился слив в раковине, вода уходит очень медленно.",
    status: "completed",
    priority: "normal",
    finalPrice: 110_000,
  },
  {
    customer: 8,
    service: 9,
    problem:
      "После зимы кондиционер не включается, нужна диагностика и чистка.",
    status: "cancelled",
    priority: "low",
  },
  {
    customer: 10,
    service: 2,
    problem:
      "Холодильник Liebherr намораживает лёд на задней стенке холодильной камеры.",
    status: "in_progress",
    priority: "normal",
  },
];

function estimateFor(serviceIndex: number, finalPrice?: number) {
  if (finalPrice !== undefined) {
    return { from: finalPrice, to: finalPrice };
  }

  const service = serviceRecords[serviceIndex]!;
  return { from: service.priceFrom, to: service.priceTo };
}

export function createDemoSeedData(now = new Date()): DemoSeedData {
  const seedCreatedAt = new Date(now);
  const expiresAt = addUtcDays(now, 60);
  const firstSlotDay = startOfNextUtcDay(now);

  const customerRecords: DemoCustomerSeed[] = customerBlueprints.map(
    (customer, index) => ({
      id: demoId(2, index + 1),
      displayName: customer.name,
      // The +380 00 prefix is not an assignable Ukrainian operator code, so
      // these numbers can never reach a real person. They are masked before
      // they ever reach the browser.
      phone: `+380 00 000 ${String(index + 1).padStart(4, "0")}`,
      email:
        index % 4 === 3
          ? null
          : `customer${String(index + 1).padStart(2, "0")}@example.com`,
      address: `${customer.district}, ${customer.street}`,
      isDemo: true,
      isSeed: true,
      expiresAt,
      createdAt: seedCreatedAt,
      updatedAt: seedCreatedAt,
    }),
  );

  const leadRecords: DemoLeadSeed[] = leadBlueprints.map((lead, index) => {
    const service = serviceRecords[lead.service]!;
    const estimate = estimateFor(lead.service, lead.finalPrice);

    return {
      id: demoId(3, index + 1),
      publicNumber: `FF-${String(1001 + index).padStart(4, "0")}`,
      customerId: customerRecords[lead.customer]!.id!,
      category: service.category,
      serviceType: service.name,
      problemDescription: lead.problem,
      status: lead.status,
      priority: lead.priority,
      needsOperator: lead.needsOperator ?? false,
      source: "seed",
      preferredDate: toDateOnly(addUtcDays(firstSlotDay, (index % 10) + 1)),
      preferredTime: index % 2 === 0 ? "09:00:00" : "14:00:00",
      estimatedPriceFrom: estimate.from,
      estimatedPriceTo: estimate.to,
      isSeed: true,
      expiresAt,
      createdAt: seedCreatedAt,
      updatedAt: seedCreatedAt,
    };
  });

  const slotRecords: DemoAvailabilitySlotSeed[] = Array.from(
    { length: 20 },
    (_, index) => {
      const startsAt = addUtcDays(firstSlotDay, Math.floor(index / 2));
      startsAt.setUTCHours(index % 2 === 0 ? 9 : 14);
      const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);
      const categories = [
        "appliance_repair",
        "plumbing",
        "air_conditioning",
      ] as const;

      return {
        id: demoId(4, index + 1),
        category: categories[index % categories.length],
        startsAt,
        endsAt,
        status: "available",
        isSeed: true,
        createdAt: seedCreatedAt,
      };
    },
  );

  const taskRecords: DemoTaskSeed[] = [
    {
      id: demoId(5, 1),
      leadId: leadRecords[1]!.id,
      title: "Уточнить место протечки",
      description: "Запросить фото узла под мойкой перед выездом.",
      status: "pending",
      source: "system",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 2),
      leadId: leadRecords[2]!.id,
      title: "Предложить свободное время",
      description: "Подобрать ближайшие слоты по кондиционерам.",
      status: "in_progress",
      source: "automation",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 3),
      leadId: leadRecords[7]!.id,
      title: "Передать оператору",
      description: "Клиент просит подобрать модель смесителя — нужен человек.",
      status: "pending",
      source: "system",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 4),
      leadId: leadRecords[5]!.id,
      title: "Закрыть выполненную заявку",
      description: "Работы приняты клиентом, акт подписан.",
      status: "completed",
      source: "automation",
      isSeed: true,
      createdAt: seedCreatedAt,
      completedAt: new Date(seedCreatedAt.getTime() + 15 * 60 * 1000),
    },
    {
      id: demoId(5, 5),
      leadId: leadRecords[11]!.id,
      title: "Проверить готовность к монтажу",
      description: "Согласовать место установки внешнего блока с клиентом.",
      status: "in_progress",
      source: "system",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 6),
      leadId: leadRecords[13]!.id,
      title: "Follow-up после выполнения",
      description: "Уточнить, всё ли в порядке через неделю после ремонта.",
      status: "pending",
      source: "automation",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
  ];

  return {
    services: serviceRecords,
    customers: customerRecords,
    leads: leadRecords,
    availabilitySlots: slotRecords,
    tasks: taskRecords,
  };
}
