"use client"

import { useEffect, useRef, useState } from "react"
import { Socket } from "socket.io-client"
import { parseDiceRoll } from "@/lib/dice"

type Message = {
  id: string
  content: string
  authorName: string
  type: "TEXT" | "ROLL"
  createdAt: string
}

export function Chat({
  campaignId,
  socket,
  userName,
}: {
  campaignId: string
  socket: Socket
  userName: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMessages() {
      const res = await fetch(`/api/campaigns/${campaignId}/messages`)
      const data = await res.json()
      setMessages(data)
    }
    loadMessages()
  }, [campaignId])

  useEffect(() => {
    function handleNovaMensagem(message: Message) {
      setMessages((prev) => [...prev, message])
    }

    socket.on("novaMensagem", handleNovaMensagem)

    return () => {
      socket.off("novaMensagem", handleNovaMensagem)
    }
  }, [socket])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    let content = input.trim()
    let type: "TEXT" | "ROLL" = "TEXT"

    if (content.startsWith("/roll ") || content.startsWith("/r ")) {
      const expression = content.split(" ").slice(1).join(" ")
      const result = parseDiceRoll(expression)

      if (result) {
        type = "ROLL"
        content = JSON.stringify(result)
      } else {
        content = `Formato inválido. Use algo como /roll 1d20+3`
      }
    }

    const res = await fetch(`/api/campaigns/${campaignId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, authorName: userName, type }),
    })
    const savedMessage = await res.json()

    socket.emit("mensagemChat", { campaignId, message: savedMessage })
    setInput("")
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="bg-parchment text-ink border-2 border-leather flex flex-col h-[28rem]">
      <div className="px-5 py-3 border-b-2 border-leather/60 bg-leather/5">
        <h2 className="font-display text-lg text-leather tracking-wide">Mesa de conversa</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-leather/50 text-base italic">
            O silêncio reina... seja o primeiro a falar.
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} formatTime={formatTime} />
        ))}
      </div>

      <form onSubmit={handleSend} className="border-t-2 border-leather/60 p-3 flex gap-2 bg-leather/5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mensagem ou /roll 1d20+5"
          className="flex-1 bg-transparent border-b-2 border-leather/30 outline-none focus:border-seal py-2 text-base placeholder:text-leather/40"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-seal text-parchment font-display text-sm tracking-wide hover:bg-seal/90 transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}

function MessageBubble({
  msg,
  formatTime,
}: {
  msg: Message
  formatTime: (d: string) => string
}) {
  if (msg.type === "ROLL") {
    let result: { expression: string; rolls: number[]; modifier: number; total: number } | null = null
    try {
      result = JSON.parse(msg.content)
    } catch {
      // fallback pra mensagens antigas salvas como texto puro
    }

    return (
      <div className="bg-seal/10 border-l-4 border-seal px-4 py-2.5 rounded-r">
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-display text-seal text-sm tracking-wide">
            {msg.authorName}
          </span>
          <span className="text-xs text-leather/40">{formatTime(msg.createdAt)}</span>
        </div>
        {result ? (
          <p className="text-base">
            rolou <span className="font-display">{result.expression}</span>:{" "}
            <span className="text-leather/70">
              [{result.rolls.join(", ")}]
              {result.modifier !== 0 &&
                ` ${result.modifier > 0 ? "+" : ""}${result.modifier}`}
            </span>{" "}
            = <span className="font-display text-lg text-seal">{result.total}</span>
          </p>
        ) : (
          <p className="text-base text-seal">{msg.content}</p>
        )}
      </div>
    )
  }

  return (
    <div className="px-1">
      <div className="flex items-baseline gap-2 mb-0.5">
        <span className="font-display text-leather text-sm tracking-wide">
          {msg.authorName}
        </span>
        <span className="text-xs text-leather/40">{formatTime(msg.createdAt)}</span>
      </div>
      <p className="text-base leading-snug">{msg.content}</p>
    </div>
  )
}