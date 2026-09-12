"use client"

import { useEffect, useState } from "react"
import { Socket } from "socket.io-client"
import { CharacterSheetModal } from "./CharacterSheetModal"

type Token = {
  id: string
  name: string
  color: string
  ownerId: string | null
  onBoard: boolean
}

export function CharacterPanel({
  campaignId,
  socket,
  myRole,
  myUserId,
}: {
  campaignId: string
  socket: Socket
  myRole: "MASTER" | "PLAYER"
  myUserId: string
}) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [openSheetId, setOpenSheetId] = useState<string | null>(null)

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

    function handleTokenMovido({ tokenId }: { tokenId: string }) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, onBoard: true } : t))
      )
    }

    function handleTokenSaiuDeCena({ tokenId }: { tokenId: string }) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, onBoard: false } : t))
      )
    }

    socket.on("novoToken", handleNovoToken)
    socket.on("tokenMovido", handleTokenMovido)
    socket.on("tokenSaiuDeCenaConfirmado", handleTokenSaiuDeCena)

    return () => {
      socket.off("novoToken", handleNovoToken)
      socket.off("tokenMovido", handleTokenMovido)
      socket.off("tokenSaiuDeCenaConfirmado", handleTokenSaiuDeCena)
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

        {tokens.map((token) => {
          const canDrag = myRole === "MASTER" || token.ownerId === myUserId
          return (
            <div
              key={token.id}
              draggable={canDrag}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", token.id)
              }}
              onClick={() => setOpenSheetId(token.id)}
              className={`flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer ${
                token.ownerId === myUserId ? "bg-brass/15" : ""
              } ${canDrag ? "cursor-grab active:cursor-grabbing hover:bg-leather/10" : "opacity-70 hover:bg-leather/5"}`}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-leather/60 shrink-0"
                style={{ backgroundColor: token.color, opacity: token.onBoard ? 1 : 0.4 }}
              />
              <span className="font-display text-sm truncate">{token.name}</span>
              {!token.onBoard && (
                <span className="text-xs text-leather/40 italic">fora de cena</span>
              )}
              {token.ownerId === myUserId && (
                <span className="text-xs text-leather/50 ml-auto shrink-0">(seu)</span>
              )}
            </div>
          )
        })}
      </div>

      <p className="px-4 py-2 text-xs text-leather/40 italic border-t border-leather/20">
        Arraste seu personagem para o tabuleiro para posicioná-lo. Clique para ver a ficha.
      </p>

      {openSheetId && (
        <CharacterSheetModal tokenId={openSheetId} onClose={() => setOpenSheetId(null)} />
      )}
    </div>
  )
}