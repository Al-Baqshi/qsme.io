"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MODELS = [
  { value: "anthropic/claude-opus-4.5", label: "Opus 4.5", tier: "best" },
  { value: "anthropic/claude-sonnet-4", label: "Sonnet 4", tier: "mid" },
  { value: "anthropic/claude-haiku-3-5", label: "Haiku 3.5", tier: "cheap" },
] as const

export interface GeometryCallbacks {
  onSetCircle: (diameter: number) => void
  onSetLine: (length: number, angle: number | null) => void
  onRemoveCircle: () => void
  onRemoveLine: () => void
  geometryState: {
    diameter: number | null
    chordLength: number | null
    chordAngle: number
  }
}

export function ChatPanel({
  onSetCircle,
  onSetLine,
  onRemoveCircle,
  onRemoveLine,
  geometryState,
}: GeometryCallbacks) {
  const [input, setInput] = useState("")
  const [model, setModel] = useState<string>(MODELS[0].value)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Store callbacks in refs so the onToolCall closure always has the latest
  const callbacksRef = useRef({ onSetCircle, onSetLine, onRemoveCircle, onRemoveLine })
  useEffect(() => {
    callbacksRef.current = { onSetCircle, onSetLine, onRemoveCircle, onRemoveLine }
  }, [onSetCircle, onSetLine, onRemoveCircle, onRemoveLine])

  // Store geometryState in ref for the transport closure
  const geoRef = useRef(geometryState)
  useEffect(() => {
    geoRef.current = geometryState
  }, [geometryState])

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, messages, model, geometryState: geoRef.current },
      }),
    })
  )

  useEffect(() => {
    transport.current = new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: { id, messages, model, geometryState: geoRef.current },
      }),
    })
  }, [model])

  const { messages, sendMessage, addToolOutput, status } = useChat({
    get transport() {
      return transport.current
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return

      const cbs = callbacksRef.current
      const geo = geoRef.current

      if (toolCall.toolName === "setCircle") {
        const { diameter } = toolCall.input as { diameter: number }
        cbs.onSetCircle(diameter)
        addToolOutput({
          tool: "setCircle",
          toolCallId: toolCall.toolCallId,
          output: { ok: true, diameter },
        })
      }

      if (toolCall.toolName === "setLine") {
        const { length, angle } = toolCall.input as { length: number; angle: number | null }
        const resolvedAngle = angle ?? geo.chordAngle
        cbs.onSetLine(length, angle)
        addToolOutput({
          tool: "setLine",
          toolCallId: toolCall.toolCallId,
          output: { ok: true, length, angle: resolvedAngle },
        })
      }

      if (toolCall.toolName === "removeCircle") {
        cbs.onRemoveCircle()
        addToolOutput({
          tool: "removeCircle",
          toolCallId: toolCall.toolCallId,
          output: { ok: true },
        })
      }

      if (toolCall.toolName === "removeLine") {
        cbs.onRemoveLine()
        addToolOutput({
          tool: "removeLine",
          toolCallId: toolCall.toolCallId,
          output: { ok: true },
        })
      }
    },
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* model picker */}
      <div className="px-1 pb-3">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                <span>{m.label}</span>
                <span className="ml-2 text-muted-foreground">({m.tier})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-xs text-muted-foreground text-center">
              Try one of these, or ask your own question.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Draw a circle with diameter 250",
                "Add a chord of length 180 at 45 degrees",
                "What is the area of the circle?",
                "Make the circle twice as big",
                "Remove the line",
                "Set diameter to 400 and add a 300px chord",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    sendMessage({ text: prompt })
                  }}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`text-sm rounded-lg px-3 py-2 ${
              message.role === "user"
                ? "bg-primary text-primary-foreground ml-8"
                : "bg-muted text-foreground mr-8"
            }`}
          >
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <span key={i} className="whitespace-pre-wrap">
                    {part.text}
                  </span>
                )
              }
              // Show tool call confirmations inline
              if (
                part.type === "tool-setCircle" ||
                part.type === "tool-setLine" ||
                part.type === "tool-removeCircle" ||
                part.type === "tool-removeLine"
              ) {
                if (part.state === "output-available") {
                  return (
                    <span key={i} className="text-xs italic text-muted-foreground block mt-1">
                      Applied to canvas.
                    </span>
                  )
                }
                if (part.state === "input-available") {
                  return (
                    <span key={i} className="text-xs italic text-muted-foreground block mt-1">
                      Updating canvas...
                    </span>
                  )
                }
              }
              return null
            })}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="bg-muted text-foreground text-sm rounded-lg px-3 py-2 mr-8 animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input */}
      <form onSubmit={handleSubmit} className="pt-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Draw a circle with diameter 300..."
          className="min-h-[40px] max-h-32 resize-none text-sm"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 h-10 w-10"
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  )
}
