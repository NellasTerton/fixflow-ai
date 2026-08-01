const PHONE_PATTERN =
  /(?:\+?7|8)[\s()-]*(?:\d[\s()-]*){8,10}\d/g;
const ADDRESS_PATTERN =
  /(?:улица|ул\.?|вулиця|вул\.?|проспект|просп\.?|переулок|пер\.?|провулок|дом|д\.|будинок|квартира|кв\.?)\s+[^,.;\n]{1,80}/giu;

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 4) {
    return "••••";
  }

  const country = digits.startsWith("7") ? "+7" : "+";
  return `${country} •• ••• ${digits.slice(-4)}`;
}

/**
 * Legacy cleanup: an earlier revision prefixed every stored name, address
 * and description with "[ДЕМО]". Writes no longer do that, but rows created
 * before the change can still be inside their 48h retention window, so
 * public display keeps stripping the tag until they age out.
 */
export function stripDemoTag(value: string) {
  return value.replace(/^\[ДЕМО\]\s*/u, "");
}

export function createAddressSummary(address: string) {
  const city = stripDemoTag(address)
    .split(",")[0]
    ?.trim();

  return `${city || "Локация"} · точный адрес скрыт`;
}

export function redactPublicText(
  value: string,
  exactPhone?: string,
  exactAddress?: string,
) {
  let result = value;

  if (exactPhone) {
    result = result.replaceAll(exactPhone, maskPhone(exactPhone));
  }

  if (exactAddress) {
    result = result.replaceAll(exactAddress, "[точный адрес скрыт]");
  }

  return result
    .replace(PHONE_PATTERN, "[телефон скрыт]")
    .replace(ADDRESS_PATTERN, "[точный адрес скрыт]");
}

export function formatPriceRange(
  priceFrom: number | null,
  priceTo: number | null,
) {
  if (priceFrom === null && priceTo === null) {
    return "Оценка не готова";
  }

  const formatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  });
  const from = priceFrom === null ? null : formatter.format(priceFrom / 100);
  const to = priceTo === null ? null : formatter.format(priceTo / 100);

  // Equal bounds mean the work is done and this is the invoiced amount, not
  // an estimate — rendering "1 800–1 800 ₽" would read like a broken range.
  if (from && to) {
    return from === to ? `${from} ₽` : `${from}–${to} ₽`;
  }

  return from ? `от ${from} ₽` : `до ${to} ₽`;
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Не назначено";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatPreferredTime(
  date: string | null,
  time: string | null,
) {
  if (!date && !time) {
    return "Не указано";
  }

  return [date, time?.slice(0, 5)].filter(Boolean).join(" · ");
}
