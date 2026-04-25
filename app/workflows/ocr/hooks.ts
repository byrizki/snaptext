import { defineHook } from "workflow";
import { z } from "zod";

export const stopHook = defineHook({
  schema: z.object({ reason: z.string().optional() }),
});
