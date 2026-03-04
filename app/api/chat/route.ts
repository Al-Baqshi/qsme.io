import {
  consumeStream,
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai"
import { geometryTools } from "@/lib/chat-tools"

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    messages,
    model = "anthropic/claude-opus-4.5",
    geometryState,
  }: {
    messages: UIMessage[]
    model?: string
    geometryState?: {
      diameter: number | null
      chordLength: number | null
      chordAngle: number
    }
  } = await req.json()

  const stateDescription = geometryState?.diameter
    ? `Current state: circle with diameter=${geometryState.diameter}${
        geometryState.chordLength
          ? `, chord length=${geometryState.chordLength}, chord angle=${geometryState.chordAngle}deg`
          : ", no chord/line yet"
      }.`
    : "Current state: blank canvas, no circle or line yet."

  const result = streamText({
    model,
    system: `You are a helpful geometry assistant embedded in a circle-and-chord analysis tool. You can add, update, and remove circles and lines on the canvas using your tools. Keep answers concise and practical.

${stateDescription}

When the user asks you to change, add, or remove geometry, use the appropriate tool. When they ask questions about geometry, answer directly. If they say something like "make the circle bigger" or "double the diameter", calculate the new value and call setCircle. If they ask for a line or chord, call setLine.`,
    messages: await convertToModelMessages(messages),
    tools: geometryTools,
    stopWhen: stepCountIs(5),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
