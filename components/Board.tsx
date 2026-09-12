"use client"

import { useEffect, useState, useRef } from "react"
import { Stage, Layer, Circle, Text, Image as KonvaImage, Line, Arrow } from "react-konva"
import { Socket } from "socket.io-client"
import useImage from "use-image"
import Konva from "konva"

type Token = {
  id: string
  name: string
  color: string
  x: number
  y: number
  ownerId: string | null
  onBoard: boolean
}

type Member = {
  id: string
  role: "MASTER" | "PLAYER"
  user: { id: string; name: string }
}

type MeasureArrow = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  ownerName: string
}

const MIN_SCALE = 0.3
const MAX_SCALE = 3
const GRID_SIZE = 50

type RulerMode = "off" | "livre" | "permanente"

export function Board({
  campaignId,
  socket,
  userName,
  myUserId,
  myRole,
}: {
  campaignId: string
  socket: Socket
  userName: string
  myUserId: string
  myRole: "MASTER" | "PLAYER"
}) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [bgImage] = useImage(backgroundUrl || "")

  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const stageRef = useRef<Konva.Stage>(null)

  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)

  const [rulerMode, setRulerMode] = useState<RulerMode>("off")
  const [drawingArrow, setDrawingArrow] = useState<MeasureArrow | null>(null)
  const [arrows, setArrows] = useState<MeasureArrow[]>([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newTokenName, setNewTokenName] = useState("")
  const [newTokenOwner, setNewTokenOwner] = useState("")

  const containerRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState({ width: 1000, height: 700 })

  useEffect(() => {
    function updateSize() {
      if (!containerRef.current) return
      const width = containerRef.current.offsetWidth
      const height = Math.max(500, window.innerHeight - 320)
      setBoardSize({ width, height })
    }

    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  useEffect(() => {
    async function loadData() {
      const [tokensRes, campaignRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}/tokens`),
        fetch(`/api/campaigns/${campaignId}`),
      ])
      const tokensData = await tokensRes.json()
      const campaignData = await campaignRes.json()
      setTokens(tokensData)
      setBackgroundUrl(campaignData.backgroundUrl)
      setMembers(campaignData.members || [])
    }
    loadData()
  }, [campaignId])

  useEffect(() => {
    function handleTokenMovido({ tokenId, x, y }: { tokenId: string; x: number; y: number }) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, x, y, onBoard: true } : t))
      )
    }

    function handleNovoToken(token: Token) {
      setTokens((prev) => [...prev, token])
    }

    function handleMapaAtualizado({ url }: { url: string }) {
      setBackgroundUrl(url)
    }

    function handleSetaDesenhada(arrow: MeasureArrow) {
      setArrows((prev) => [...prev, arrow])
    }

    function handleSetaRemovida({ arrowId }: { arrowId: string }) {
      setArrows((prev) => prev.filter((a) => a.id !== arrowId))
    }

    function handleTokenSaiuDeCena({ tokenId }: { tokenId: string }) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, onBoard: false } : t))
      )
    }

    socket.on("tokenMovido", handleTokenMovido)
    socket.on("novoToken", handleNovoToken)
    socket.on("mapaAtualizado", handleMapaAtualizado)
    socket.on("setaDesenhada", handleSetaDesenhada)
    socket.on("setaRemovida", handleSetaRemovida)
    socket.on("tokenSaiuDeCenaConfirmado", handleTokenSaiuDeCena)

    return () => {
      socket.off("tokenMovido", handleTokenMovido)
      socket.off("novoToken", handleNovoToken)
      socket.off("mapaAtualizado", handleMapaAtualizado)
      socket.off("setaDesenhada", handleSetaDesenhada)
      socket.off("setaRemovida", handleSetaRemovida)
      socket.off("tokenSaiuDeCenaConfirmado", handleTokenSaiuDeCena)
    }
  }, [socket])

  function snapValue(value: number) {
    return Math.floor(value / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2
  }

  async function loadTokensAgain() {
    const res = await fetch(`/api/campaigns/${campaignId}/tokens`)
    const data = await res.json()
    setTokens(data)
  }

  function moveTokenTo(tokenId: string, rawX: number, rawY: number) {
    const x = snapToGrid ? snapValue(rawX) : rawX
    const y = snapToGrid ? snapValue(rawY) : rawY

    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, x, y, onBoard: true } : t))
    )

    socket.emit("moverToken", { campaignId, tokenId, x, y })

    fetch(`/api/tokens/${tokenId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    }).then((res) => {
      if (!res.ok) {
        loadTokensAgain()
      }
    })
  }

  function handleDragEnd(tokenId: string, rawX: number, rawY: number) {
    moveTokenTo(tokenId, rawX, rawY)
  }

  // --- Soltar personagem vindo do painel lateral ---

  function handleBoardDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleBoardDrop(e: React.DragEvent) {
    e.preventDefault()
    const tokenId = e.dataTransfer.getData("text/plain")
    if (!tokenId) return

    const token = tokens.find((t) => t.id === tokenId)
    if (!token) return

    const canDrag = myRole === "MASTER" || token.ownerId === myUserId
    if (!canDrag) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const pointerX = e.clientX - rect.left
    const pointerY = e.clientY - rect.top

    const x = (pointerX - stagePos.x) / scale
    const y = (pointerY - stagePos.y) / scale

    moveTokenTo(tokenId, x, y)
  }

  async function handleRemoveFromBoard(tokenId: string) {
    const res = await fetch(`/api/tokens/${tokenId}/remove-from-board`, { method: "PUT" })

    if (!res.ok) {
      alert("Você não tem permissão para remover este personagem da cena.")
      return
    }

    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, onBoard: false } : t))
    )
    socket.emit("tokenSaiuDeCena", { campaignId, tokenId })
  }

  function openAddModal() {
    setNewTokenName("")
    setNewTokenOwner("")
    setShowAddModal(true)
  }

  async function confirmAddToken() {
    if (!newTokenName.trim()) return

    const res = await fetch(`/api/campaigns/${campaignId}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTokenName.trim(), ownerId: newTokenOwner || null }),
    })

    if (!res.ok) return

    const newToken = await res.json()
    setTokens((prev) => [...prev, newToken])
    socket.emit("tokenCriado", { campaignId, token: newToken })
    setShowAddModal(false)
  }

  async function handleUploadBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`/api/campaigns/${campaignId}/background`, {
      method: "POST",
      body: formData,
    })
    if (!res.ok) return
    const updated = await res.json()
    setBackgroundUrl(updated.backgroundUrl)

    socket.emit("atualizarMapa", { campaignId, url: updated.backgroundUrl })
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    let newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

    setScale(newScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }

  function zoomBy(factor: number) {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor))
    setScale(newScale)
  }

  function resetView() {
    setScale(1)
    setStagePos({ x: 0, y: 0 })
  }

  function renderGridLines() {
    const lines = []
    for (let x = 0; x <= boardSize.width; x += GRID_SIZE) {
      lines.push(
        <Line key={`v-${x}`} points={[x, 0, x, boardSize.height]} stroke="#B08A3E" strokeWidth={1} opacity={0.25} listening={false} />
      )
    }
    for (let y = 0; y <= boardSize.height; y += GRID_SIZE) {
      lines.push(
        <Line key={`h-${y}`} points={[0, y, boardSize.width, y]} stroke="#B08A3E" strokeWidth={1} opacity={0.25} listening={false} />
      )
    }
    return lines
  }

  // --- Régua de movimento ---

  function handleStageMouseDown() {
    if (rulerMode === "off") return
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getRelativePointerPosition()
    if (!pos) return

    setDrawingArrow({ id: "temp", x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, ownerName: userName })
  }

  function handleStageMouseMove() {
    if (!drawingArrow) return
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getRelativePointerPosition()
    if (!pos) return

    setDrawingArrow((prev) => (prev ? { ...prev, x2: pos.x, y2: pos.y } : null))
  }

  function handleStageMouseUp() {
    if (!drawingArrow) return

    if (rulerMode === "permanente") {
      const finalArrow = { ...drawingArrow, id: crypto.randomUUID(), ownerName: userName }
      setArrows((prev) => [...prev, finalArrow])
      socket.emit("desenharSeta", { campaignId, arrow: finalArrow })
    }

    setDrawingArrow(null)
  }

  function handleRemoveArrow(arrowId: string) {
    setArrows((prev) => prev.filter((a) => a.id !== arrowId))
    socket.emit("removerSeta", { campaignId, arrowId })
  }

  function handleRemoveMyLastArrow() {
    const myArrows = arrows.filter((a) => a.ownerName === userName)
    if (myArrows.length === 0) return

    const lastArrow = myArrows[myArrows.length - 1]
    handleRemoveArrow(lastArrow.id)
  }

  function distanceLabel(a: MeasureArrow) {
    const dist = Math.sqrt((a.x2 - a.x1) ** 2 + (a.y2 - a.y1) ** 2)
    const squares = (dist / GRID_SIZE).toFixed(1)
    return `${Math.round(dist)}px · ${squares} quadrados`
  }

  function cycleRulerMode() {
    setRulerMode((prev) => (prev === "off" ? "livre" : prev === "livre" ? "permanente" : "off"))
    setDrawingArrow(null)
  }

  const visibleTokens = tokens.filter((t) => t.onBoard)

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {myRole === "MASTER" && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-moss text-parchment font-display text-sm tracking-wide hover:bg-moss/90 transition-colors"
          >
            + Adicionar token
          </button>
        )}

        {myRole === "MASTER" && (
          <label className="px-4 py-2 bg-leather/60 text-parchment font-display text-sm tracking-wide hover:bg-leather/80 transition-colors cursor-pointer">
            Trocar mapa
            <input type="file" accept="image/*" onChange={handleUploadBackground} className="hidden" />
          </label>
        )}

        <button
          onClick={() => setShowGrid((v) => !v)}
          className={`px-4 py-2 font-display text-sm tracking-wide transition-colors ${
            showGrid ? "bg-brass/70 text-ink" : "bg-leather/40 text-parchment hover:bg-leather/60"
          }`}
        >
          Grid {showGrid ? "ligado" : "desligado"}
        </button>

        <button
          onClick={() => setSnapToGrid((v) => !v)}
          className={`px-4 py-2 font-display text-sm tracking-wide transition-colors ${
            snapToGrid ? "bg-brass/70 text-ink" : "bg-leather/40 text-parchment hover:bg-leather/60"
          }`}
        >
          Encaixe {snapToGrid ? "ligado" : "desligado"}
        </button>

        <button
          onClick={cycleRulerMode}
          className={`px-4 py-2 font-display text-sm tracking-wide transition-colors ${
            rulerMode === "off"
              ? "bg-leather/40 text-parchment hover:bg-leather/60"
              : rulerMode === "livre"
              ? "bg-moss/80 text-parchment"
              : "bg-seal/80 text-parchment"
          }`}
        >
          Régua: {rulerMode === "off" ? "desligada" : rulerMode === "livre" ? "livre" : "permanente"}
        </button>

        {rulerMode !== "off" && (
          <button
            onClick={handleRemoveMyLastArrow}
            className="px-4 py-2 bg-leather/40 text-parchment font-display text-sm tracking-wide hover:bg-leather/60 transition-colors"
          >
            Remover minha seta
          </button>
        )}

        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => zoomBy(0.85)} className="w-9 h-9 flex items-center justify-center bg-leather/40 text-parchment font-display text-lg hover:bg-leather/60 transition-colors">−</button>
          <span className="px-2 text-parchment/70 font-display text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoomBy(1.15)} className="w-9 h-9 flex items-center justify-center bg-leather/40 text-parchment font-display text-lg hover:bg-leather/60 transition-colors">+</button>
          <button onClick={resetView} className="px-3 h-9 ml-1 bg-leather/40 text-parchment font-display text-xs tracking-wide hover:bg-leather/60 transition-colors">Resetar visão</button>
        </div>
      </div>

      {rulerMode !== "off" && (
        <p className="text-parchment/50 text-xs mb-2 italic">
          {rulerMode === "livre"
            ? "Arraste para medir — some ao soltar."
            : "Arraste para marcar um caminho — clique numa seta ou use \"Remover minha seta\" pra apagar."}
        </p>
      )}

      {rulerMode === "off" && (
        <p className="text-parchment/40 text-xs mb-2 italic">
          Clique com o botão direito num personagem para tirá-lo de cena. Arraste um personagem da lista ao lado para posicioná-lo no tabuleiro.
        </p>
      )}

      <div
        ref={containerRef}
        className="w-full"
        onDragOver={handleBoardDragOver}
        onDrop={handleBoardDrop}
      >
        <div className="border-2 border-leather bg-[#2a2119] overflow-hidden" style={{ width: boardSize.width, height: boardSize.height }}>
          <Stage
            ref={stageRef}
            width={boardSize.width}
            height={boardSize.height}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={rulerMode === "off"}
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) {
                setStagePos({ x: e.target.x(), y: e.target.y() })
              }
            }}
          >
            <Layer>
              {bgImage && <KonvaImage image={bgImage} width={boardSize.width} height={boardSize.height} />}
            </Layer>
            {showGrid && <Layer>{renderGridLines()}</Layer>}
            <Layer>
              {visibleTokens.map((token) => {
                const canDrag = rulerMode === "off" && (myRole === "MASTER" || token.ownerId === myUserId)
                const canRemove = myRole === "MASTER" || token.ownerId === myUserId
                return (
                  <TokenShape
                    key={token.id}
                    token={token}
                    draggable={canDrag}
                    canRemove={canRemove}
                    onDragEnd={handleDragEnd}
                    onRemove={handleRemoveFromBoard}
                  />
                )
              })}
            </Layer>
            <Layer listening={rulerMode !== "off"}>
              {arrows.map((a) => (
                <MeasureArrowShape key={a.id} arrow={a} onRemove={() => handleRemoveArrow(a.id)} label={distanceLabel(a)} />
              ))}
              {drawingArrow && (
                <MeasureArrowShape arrow={drawingArrow} label={distanceLabel(drawingArrow)} />
              )}
            </Layer>
          </Stage>
        </div>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-parchment text-ink p-6 border-2 border-leather w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-leather mb-4">Novo personagem</h3>

            <label className="block font-display text-sm text-leather mb-1">Nome</label>
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              className="w-full bg-transparent border-b border-leather/40 py-2 outline-none focus:border-seal mb-4"
              autoFocus
            />

            <label className="block font-display text-sm text-leather mb-1">Pertence a</label>
            <select
              value={newTokenOwner}
              onChange={(e) => setNewTokenOwner(e.target.value)}
              className="w-full bg-white border border-leather/40 py-2 px-2 outline-none focus:border-seal mb-5"
            >
              <option value="">NPC / Mestre (sem dono)</option>
              {members
                .filter((m) => m.role === "PLAYER")
                .map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={confirmAddToken}
                className="flex-1 py-2 bg-seal text-parchment font-display text-sm hover:bg-seal/90 transition-colors"
              >
                Criar
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-leather/40 text-ink font-display text-sm hover:bg-leather/60 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TokenShape({
  token,
  draggable,
  canRemove,
  onDragEnd,
  onRemove,
}: {
  token: Token
  draggable: boolean
  canRemove: boolean
  onDragEnd: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
}) {
  return (
    <>
      <Circle
        x={token.x}
        y={token.y}
        radius={22}
        fill={token.color}
        stroke="#1B1712"
        strokeWidth={2}
        draggable={draggable}
        opacity={draggable ? 1 : 0.85}
        onDragStart={(e) => {
          e.cancelBubble = true
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true
          onDragEnd(token.id, e.target.x(), e.target.y())
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          if (canRemove) onRemove(token.id)
        }}
      />
      <Text
        x={token.x - 25}
        y={token.y + 27}
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

function MeasureArrowShape({
  arrow,
  label,
  onRemove,
}: {
  arrow: MeasureArrow
  label: string
  onRemove?: () => void
}) {
  const midX = (arrow.x1 + arrow.x2) / 2
  const midY = (arrow.y1 + arrow.y2) / 2

  return (
    <>
      <Arrow
        points={[arrow.x1, arrow.y1, arrow.x2, arrow.y2]}
        stroke="#7A2E2E"
        fill="#7A2E2E"
        strokeWidth={3}
        pointerLength={12}
        pointerWidth={12}
        onClick={onRemove}
        hitStrokeWidth={20}
      />
      <Text
        x={midX - 60}
        y={midY - 18}
        width={120}
        align="center"
        text={label}
        fontSize={13}
        fontStyle="bold"
        fill="#E8DCC0"
        listening={false}
      />
    </>
  )
}