import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./types";

const conceptAliases: Record<string, string> = {
  автомобил: "vehicle_unsupported",
  машин: "vehicle_unsupported",
  авто: "vehicle_unsupported",
  протеч: "leak",
  теч: "leak",
  капа: "leak",
  сантех: "plumbing",
  труб: "plumbing",
  засор: "clog",
  смесител: "faucet",
  унитаз: "toilet",
  стираль: "washer",
  посудомоеч: "dishwasher",
  холодиль: "fridge",
  духов: "oven",
  кондиционер: "air_conditioning",
  климат: "air_conditioning",
  чистк: "cleaning",
  заправк: "refill",
  установк: "installation",
  стоим: "price",
  цен: "price",
  скольк: "price",
  гаран: "warranty",
  пожизн: "lifetime",
  район: "service_area",
  зон: "service_area",
  адрес: "service_area",
  запис: "booking",
  бронир: "booking",
};

export function createEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    addFeature(vector, `word:${token}`, 1);

    const alias = resolveAlias(token);
    if (alias) {
      addFeature(vector, `concept:${alias}`, 2.4);
    }

    for (let index = 0; index <= token.length - 3; index += 1) {
      addFeature(vector, `tri:${token.slice(index, index + 3)}`, 0.16);
    }
  }

  normalize(vector);
  return vector;
}

export function getEmbeddingModel() {
  return EMBEDDING_MODEL;
}

function tokenize(text: string) {
  return text
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length > 1)
    .map(stemToken) ?? [];
}

function stemToken(token: string) {
  return token.replace(
    /(иями|ями|ами|ого|ему|ому|ыми|ими|ая|яя|ое|ее|ий|ый|ой|ам|ям|ах|ях|ов|ев|ом|ем|у|ю|а|я|ы|и|е|о)$/u,
    "",
  );
}

function resolveAlias(token: string) {
  return Object.entries(conceptAliases).find(([prefix]) =>
    token.startsWith(prefix)
  )?.[1];
}

function addFeature(vector: number[], feature: string, weight: number) {
  const hash = hashFeature(feature);
  const index = hash % EMBEDDING_DIMENSIONS;
  const sign = (hash & 1) === 0 ? 1 : -1;
  vector[index] = (vector[index] ?? 0) + sign * weight;
}

function hashFeature(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalize(vector: number[]) {
  const length = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  if (length === 0) {
    vector[0] = 1;
    return;
  }

  for (let index = 0; index < vector.length; index += 1) {
    vector[index] = (vector[index] ?? 0) / length;
  }
}
