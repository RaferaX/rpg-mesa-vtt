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

export function Board({ campaignId, socket, userName }: { campaignId: string; socket: Socket; userName: string }) {
  const [tokens, setTokens] = useState<Token[]>([])
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

  const BOARD_WIDTH = 1000
  const BOARD_HEIGHT = 700

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
    }
    loadData()
  }, [campaignId])

  useEffect(() => {
    function handleTokenMovido({ tokenId, x, y }: { tokenId: string; x: number; y: number }) {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, x, y } : t))
      )
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

    socket.on("tokenMovido", handleTokenMovido)
    socket.on("mapaAtualizado", handleMapaAtualizado)
    socket.on("setaDesenhada", handleSetaDesenhada)
    socket.on("setaRemovida", handleSetaRemovida)

    return () => {
      socket.off("tokenMovido", handleTokenMovido)
      socket.off("mapaAtualizado", handleMapaAtualizado)
      socket.off("setaDesenhada", handleSetaDesenhada)
      socket.off("setaRemovida", handleSetaRemovida)
    }
  }, [socket])

  function snapValue(value: number) {
    return Math.floor(value / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2
  }

  function handleDragEnd(tokenId: string, rawX: number, rawY: number) {
    const x = snapToGrid ? snapValue(rawX) : rawX
    const y = snapToGrid ? snapValue(rawY) : rawY

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

  async function handleUploadBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`/api/campaigns/${campaignId}/background`, {
      method: "POST",
      body: formData,
    })
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
    for (let x = 0; x <= BOARD_WIDTH; x += GRID_SIZE) {
      lines.push(
        <Line key={`v-${x}`} points={[x, 0, x, BOARD_HEIGHT]} stroke="#B08A3E" strokeWidth={1} opacity={0.25} listening={false} />
      )
    }
    for (let y = 0; y <= BOARD_HEIGHT; y += GRID_SIZE) {
      lines.push(
        <Line key={`h-${y}`} points={[0, y, BOARD_WIDTH, y]} stroke="#B08A3E" strokeWidth={1} opacity={0.25} listening={false} />
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

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <button
          onClick={handleAddToken}
          className="px-4 py-2 bg-moss text-parchment font-display text-sm tracking-wide hover:bg-moss/90 transition-colors"
        >
          + Adicionar token
        </button>

        <label className="px-4 py-2 bg-leather/60 text-parchment font-display text-sm tracking-wide hover:bg-leather/80 transition-colors cursor-pointer">
          Trocar mapa
          <input type="file" accept="image/*" onChange={handleUploadBackground} className="hidden" />
        </label>

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

      <div className="border-2 border-leather bg-[#2a2119] overflow-hidden" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}>
        <Stage
          ref={stageRef}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
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
            {bgImage && <KonvaImage image={bgImage} width={BOARD_WIDTH} height={BOARD_HEIGHT} />}
          </Layer>
          {showGrid && <Layer>{renderGridLines()}</Layer>}
          <Layer>
            {tokens.map((token) => (
              <TokenShape
                key={token.id}
                token={token}
                draggable={rulerMode === "off"}
                onDragEnd={handleDragEnd}
              />
            ))}
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
  )
}

function TokenShape({
  token,
  draggable,
  onDragEnd,
}: {
  token: Token
  draggable: boolean
  onDragEnd: (id: string, x: number, y: number) => void
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
        onDragStart={(e) => {
          e.cancelBubble = true
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true
          onDragEnd(token.id, e.target.x(), e.target.y())
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