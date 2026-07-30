import type { CrmCategory } from "../../lib/crm/constants";

const rules: Array<[CrmCategory, RegExp]> = [
  [
    "plumbing",
    /протеч|теч[её]т|труб|засор|смесител|унитаз|сантех|водопровод/iu,
  ],
  [
    "appliance_repair",
    /стираль|посудомоеч|холодиль|духов|бытов.{0,10}техник/iu,
  ],
  [
    "air_conditioning",
    /кондиционер|сплит|фреон|климат|заправк/iu,
  ],
];

export function determineKnowledgeCategory(
  question: string,
  modelCategory?: CrmCategory | null,
): CrmCategory {
  if (modelCategory && modelCategory !== "common") {
    return modelCategory;
  }

  return rules.find(([, pattern]) => pattern.test(question))?.[0] ?? "common";
}
