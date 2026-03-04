import { tool } from "ai"
import { z } from "zod"

/**
 * Tools the LLM can call to manipulate the circle/line on the canvas.
 * None of these have an `execute` — they're handled client-side via onToolCall.
 */
export const geometryTools = {
  setCircle: tool({
    description:
      "Add or update the circle on the canvas. Sets the diameter. If a chord exists and is longer than the new diameter, the chord will be removed automatically.",
    inputSchema: z.object({
      diameter: z
        .number()
        .positive()
        .describe("The diameter of the circle in pixels"),
    }),
    outputSchema: z.object({ ok: z.boolean(), diameter: z.number() }),
  }),

  setLine: tool({
    description:
      "Add or update the chord (line) on the canvas. A circle must exist first. The length must be less than or equal to the current diameter. Angle is the rotation in degrees (0-360).",
    inputSchema: z.object({
      length: z
        .number()
        .positive()
        .describe("Length of the chord in pixels"),
      angle: z
        .number()
        .min(0)
        .max(360)
        .nullable()
        .describe("Rotation angle in degrees. Pass null to keep the current angle."),
    }),
    outputSchema: z.object({
      ok: z.boolean(),
      length: z.number(),
      angle: z.number(),
    }),
  }),

  removeCircle: tool({
    description:
      "Remove the circle (and any chord) from the canvas, resetting to a blank state.",
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
  }),

  removeLine: tool({
    description: "Remove just the chord/line from the canvas, keeping the circle.",
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
  }),
} as const
