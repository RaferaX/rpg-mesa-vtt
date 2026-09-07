"use client"

import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"

type Token = {
  id: string
  name: string
  color: string
}

export function CharacterPanel({ campaignId, socket }: { campaignId: string; socket: Socket }) {
  const [tokens, setTokens] = useState<Token[]>([])

  useEffect(() => {
    async function loadTokens() {
      const res = await fetch(`/api/campaigns/${campaignId}/tokens`)
      const data = await res.json()
      setTokens(data)
    }
    loadTokens()
  }, [campaignId])

  useEffect(() => {
    function handleNovoToken(token: Token) {
      setTokens((prev) => [...prev, token])
    }

    socket.on("novoToken", handleNovoToken)

    return () => {
      socket.off("novoToken", handleNovoToken)
    }
  }, [socket])

  return (
    <div className="bg-parchment text-ink border-2 border-leather">
      <div className="px-4 py-3 border-b-2 border-leather/60 bg-leather/5">
        <h2 className="font-display text-lg text-leather tracking-wide">Personagens</h2>
      </div>

      <div className="p-3 space-y-2 max-h-[28rem] overflow-y-auto">
        {tokens.length === 0 && (
          <p className="text-leather/50 text-sm italic px-1">Nenhum personagem na mesa ainda.</p>
        )}

        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-leather/10 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-leather/60 shrink-0"
              style={{ backgroundColor: token.color }}
            />
            <span className="font-display text-sm truncate">{token.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}