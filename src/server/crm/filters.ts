import { z } from "zod";

import {
  crmCategories,
  crmLeadStatuses,
  crmPriorities,
  crmSources,
} from "../../lib/crm/constants";

export const publicCrmFiltersSchema = z.object({
  category: z.enum(crmCategories).optional(),
  status: z.enum(crmLeadStatuses).optional(),
  priority: z.enum(crmPriorities).optional(),
  source: z.enum(crmSources).optional(),
  search: z.string().trim().max(100).optional(),
});
