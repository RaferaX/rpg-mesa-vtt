"use client"

import { useEffect, useState } from "react"
import { Stage, Layer, Circle, Text } from "react-konva"
import { Socket } from "socket.io-client"

type Token = {
  id: string
  name: string
  color: string
  x: number
  y: number
}

export function Board({ campaignId, socket }: { campaignId: string; socket: Socket }) {
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
    function handleTokenMovido({ tokenId, x, y }: { tokenId: string; x: number; y: number }) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, x, y } : t))
      )
    }

    socket.on("tokenMovido", handleTokenMovido)

    return () => {
      socket.off("tokenMovido", handleTokenMovido)
    }
  }, [socket])

  function handleDragEnd(tokenId: string, x: number, y: number) {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, x, y } : t))
    )

    socket.emit("moverToken", { campaignId, tokenId, x, y })

    fetch(`/api/tokens/${tokenId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    })
  }

  async function handleAddToken() {
    const name = prompt("Nome do token:")
    if (!name) return

    const res = await fetch(`/api/campaigns/${campaignId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const newToken = await res.json()
    setTokens((prev) => [...prev, newToken])
  }

  return (
    <div>
      <button
        onClick={handleAddToken}
        className="mb-4 px-4 py-2 bg-moss text-parchment font-display text-sm tracking-wide hover:bg-moss/90 transition-colors"
      >
        + Adicionar token
      </button>

      <div className="border-2 border-leather bg-[#2a2119]">
        <Stage width={800} height={500}>
          <Layer>
            {tokens.map((token) => (
              <TokenShape
                key={token.id}
                token={token}
                onDragEnd={handleDragEnd}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

function TokenShape({
  token,
  onDragEnd,
}: {
  token: Token
  onDragEnd: (id: string, x: number, y: number) => void
}) {
  return (
    <>
      <Circle
        x={token.x}
        y={token.y}
        radius={25}
        fill={token.color}
        stroke="#1B1712"
        strokeWidth={2}
        draggable
        onDragEnd={(e) => {
          onDragEnd(token.id, e.target.x(), e.target.y())
        }}
      />
      <Text
        x={token.x - 25}
        y={token.y + 30}
        width={50}
        align="center"
        text={token.name}
        fontSize={12}
        fill="#E8DCC0"
        listening={false}
      />
    </>
  )
}