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

const DEMO_PREFIX = "[ДЕМО]";

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

const serviceRecords: DemoServiceSeed[] = [
  {
    id: demoId(1, 1),
    category: "appliance_repair",
    name: "Ремонт стиральной машины",
    description: `${DEMO_PREFIX} Диагностика и ремонт вымышленной стиральной машины.`,
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
    description: `${DEMO_PREFIX} Диагностика и ремонт вымышленной посудомоечной машины.`,
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
    description: `${DEMO_PREFIX} Диагностика и ремонт вымышленного холодильника.`,
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
    description: `${DEMO_PREFIX} Диагностика и ремонт вымышленного духового шкафа.`,
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
    description: `${DEMO_PREFIX} Поиск и устранение учебной протечки.`,
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
    description: `${DEMO_PREFIX} Прочистка вымышленного бытового засора.`,
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
    description: `${DEMO_PREFIX} Демонтаж и установка демонстрационного смесителя.`,
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
    description: `${DEMO_PREFIX} Установка сантехники в учебном сценарии.`,
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
    description: `${DEMO_PREFIX} Проверка вымышленной климатической системы.`,
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
    description: `${DEMO_PREFIX} Учебная чистка внутреннего и внешнего блоков.`,
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
    description: `${DEMO_PREFIX} Демонстрационная проверка и заправка системы.`,
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
    description: `${DEMO_PREFIX} Монтаж вымышленного комплекта кондиционирования.`,
    priceFrom: 450_000,
    priceTo: 1_200_000,
    durationMinutes: 240,
    isActive: true,
    isSeed: true,
  },
];

const customerNames = [
  "Алиса Макетова",
  "Борис Тестовский",
  "Вера Примерова",
  "Глеб Демонстрационный",
  "Дана Сценариева",
  "Елисей Макетов",
  "Жанна Вымыслова",
  "Захар Пробный",
  "Ирина Учебная",
  "Кирилл Стендов",
  "Лада Симулярова",
  "Мирон Портфолиев",
] as const;

const leadBlueprints = [
  {
    customer: 0,
    category: "appliance_repair",
    serviceType: "Ремонт стиральной машины",
    problem: "Учебная стиральная машина не завершает цикл.",
    status: "new",
    priority: "normal",
    estimate: [120_000, 350_000],
  },
  {
    customer: 1,
    category: "plumbing",
    serviceType: "Устранение протечки",
    problem: "В демонстрационной зоне замечена условная протечка.",
    status: "qualifying",
    priority: "high",
    estimate: [80_000, 200_000],
  },
  {
    customer: 2,
    category: "air_conditioning",
    serviceType: "Диагностика кондиционера",
    problem: "Учебный кондиционер показывает тестовый код ошибки.",
    status: "waiting_booking",
    priority: "normal",
    estimate: [70_000, 150_000],
  },
  {
    customer: 3,
    category: "appliance_repair",
    serviceType: "Ремонт холодильника",
    problem: "Макет холодильника недостаточно охлаждает.",
    status: "booked",
    priority: "high",
    estimate: [180_000, 500_000],
  },
  {
    customer: 4,
    category: "plumbing",
    serviceType: "Прочистка засора",
    problem: "Нужна учебная прочистка условного засора.",
    status: "in_progress",
    priority: "urgent",
    estimate: [100_000, 280_000],
  },
  {
    customer: 5,
    category: "air_conditioning",
    serviceType: "Чистка кондиционера",
    problem: "Плановая демонстрационная чистка оборудования.",
    status: "completed",
    priority: "low",
    estimate: [120_000, 260_000],
  },
  {
    customer: 6,
    category: "appliance_repair",
    serviceType: "Ремонт посудомоечной машины",
    problem: "Учебная машина оставляет воду после цикла.",
    status: "cancelled",
    priority: "normal",
    estimate: [130_000, 360_000],
  },
  {
    customer: 7,
    category: "plumbing",
    serviceType: "Замена смесителя",
    problem: "Требуется заменить демонстрационный смеситель.",
    status: "human_required",
    priority: "high",
    estimate: [100_000, 250_000],
  },
  {
    customer: 8,
    category: "air_conditioning",
    serviceType: "Заправка кондиционера",
    problem: "Учебная система работает с пониженной эффективностью.",
    status: "new",
    priority: "normal",
    estimate: [180_000, 400_000],
  },
  {
    customer: 9,
    category: "appliance_repair",
    serviceType: "Ремонт духового шкафа",
    problem: "Демонстрационный духовой шкаф не нагревается.",
    status: "qualifying",
    priority: "normal",
    estimate: [110_000, 380_000],
  },
  {
    customer: 10,
    category: "plumbing",
    serviceType: "Установка унитаза",
    problem: "Нужна установка учебного сантехнического макета.",
    status: "waiting_booking",
    priority: "low",
    estimate: [220_000, 520_000],
  },
  {
    customer: 11,
    category: "air_conditioning",
    serviceType: "Установка кондиционера",
    problem: "Запрошен демонстрационный расчёт монтажа.",
    status: "booked",
    priority: "normal",
    estimate: [500_000, 1_100_000],
  },
  {
    customer: 0,
    category: "plumbing",
    serviceType: "Устранение протечки",
    problem: "Повторный учебный сценарий проверки соединения.",
    status: "in_progress",
    priority: "high",
    estimate: [80_000, 180_000],
  },
  {
    customer: 2,
    category: "air_conditioning",
    serviceType: "Чистка кондиционера",
    problem: "Демонстрационное сезонное обслуживание.",
    status: "completed",
    priority: "low",
    estimate: [120_000, 280_000],
  },
  {
    customer: 4,
    category: "appliance_repair",
    serviceType: "Ремонт холодильника",
    problem: "Учебная диагностика повышенного шума.",
    status: "new",
    priority: "normal",
    estimate: [150_000, 420_000],
  },
  {
    customer: 6,
    category: "plumbing",
    serviceType: "Прочистка засора",
    problem: "Тестовая заявка на профилактическую прочистку.",
    status: "qualifying",
    priority: "normal",
    estimate: [90_000, 220_000],
  },
  {
    customer: 8,
    category: "air_conditioning",
    serviceType: "Диагностика кондиционера",
    problem: "Проверка условного постороннего шума.",
    status: "waiting_booking",
    priority: "high",
    estimate: [70_000, 150_000],
  },
  {
    customer: 10,
    category: "appliance_repair",
    serviceType: "Ремонт стиральной машины",
    problem: "Учебная заявка на проверку слива.",
    status: "booked",
    priority: "normal",
    estimate: [120_000, 330_000],
  },
] as const;

export function createDemoSeedData(now = new Date()): DemoSeedData {
  const seedCreatedAt = new Date(now);
  const expiresAt = addUtcDays(now, 60);
  const firstSlotDay = startOfNextUtcDay(now);

  const customerRecords: DemoCustomerSeed[] = customerNames.map(
    (name, index) => ({
      id: demoId(2, index + 1),
      displayName: `${DEMO_PREFIX} ${name}`,
      phone: `+380 00 000 ${String(index + 1).padStart(4, "0")}`,
      email:
        index % 4 === 3
          ? null
          : `demo.customer${String(index + 1).padStart(2, "0")}@example.com`,
      address: `${DEMO_PREFIX} Демо-город, улица Вымышленная, дом DEMO-${String(
        index + 1,
      ).padStart(2, "0")}`,
      isDemo: true,
      isSeed: true,
      expiresAt,
      createdAt: seedCreatedAt,
      updatedAt: seedCreatedAt,
    }),
  );

  const leadRecords: DemoLeadSeed[] = leadBlueprints.map((lead, index) => ({
    id: demoId(3, index + 1),
    publicNumber: `DEMO-FF-${String(index + 1).padStart(4, "0")}`,
    customerId: customerRecords[lead.customer].id!,
    category: lead.category,
    serviceType: lead.serviceType,
    problemDescription: `${DEMO_PREFIX} ${lead.problem}`,
    status: lead.status,
    priority: lead.priority,
    source: "seed",
    preferredDate: toDateOnly(addUtcDays(firstSlotDay, (index % 10) + 1)),
    preferredTime: index % 2 === 0 ? "09:00:00" : "14:00:00",
    estimatedPriceFrom: lead.estimate[0],
    estimatedPriceTo: lead.estimate[1],
    isSeed: true,
    expiresAt,
    createdAt: seedCreatedAt,
    updatedAt: seedCreatedAt,
  }));

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
      leadId: leadRecords[1].id,
      title: `${DEMO_PREFIX} Уточнить место условной протечки`,
      description: `${DEMO_PREFIX} Запросить дополнительное описание для учебной заявки.`,
      status: "pending",
      source: "system",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 2),
      leadId: leadRecords[2].id,
      title: `${DEMO_PREFIX} Предложить свободные слоты`,
      description: `${DEMO_PREFIX} Подготовить варианты времени для демонстрации.`,
      status: "in_progress",
      source: "automation",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 3),
      leadId: leadRecords[7].id,
      title: `${DEMO_PREFIX} Передать оператору`,
      description: `${DEMO_PREFIX} Учебная ручная проверка нестандартного запроса.`,
      status: "pending",
      source: "system",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 4),
      leadId: leadRecords[5].id,
      title: `${DEMO_PREFIX} Закрыть выполненную заявку`,
      description: `${DEMO_PREFIX} Демонстрационная задача завершена.`,
      status: "completed",
      source: "automation",
      isSeed: true,
      createdAt: seedCreatedAt,
      completedAt: new Date(seedCreatedAt.getTime() + 15 * 60 * 1000),
    },
    {
      id: demoId(5, 5),
      leadId: leadRecords[11].id,
      title: `${DEMO_PREFIX} Проверить готовность к монтажу`,
      description: `${DEMO_PREFIX} Проверка условий в вымышленной локации.`,
      status: "in_progress",
      source: "system",
      isSeed: true,
      createdAt: seedCreatedAt,
    },
    {
      id: demoId(5, 6),
      leadId: leadRecords[13].id,
      title: `${DEMO_PREFIX} Подготовить учебный follow-up`,
      description: `${DEMO_PREFIX} Только запись задачи; задержку выполнит Make или n8n.`,
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
