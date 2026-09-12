"use client"

import { useEffect, useState } from "react"

type Field = {
  id: string
  label: string
  value: string
  order: number
}

type SheetData = {
  token: { id: string; name: string; color: string }
  sheet: { id: string; fields: Field[] } | null
  canEditStructure: boolean
}

export function CharacterSheetModal({
  tokenId,
  onClose,
}: {
  tokenId: string
  onClose: () => void
}) {
  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // modo de edição de estrutura (mestre)
  const [editingStructure, setEditingStructure] = useState(false)
  const [structureFields, setStructureFields] = useState<{ label: string; value: string }[]>([])

  // valores sendo editados (jogador ou mestre, fora do modo de estrutura)
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError("")
      const res = await fetch(`/api/tokens/${tokenId}/sheet`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Não foi possível carregar a ficha.")
        setLoading(false)
        return
      }
      const json: SheetData = await res.json()
      setData(json)

      const initialValues: Record<string, string> = {}
      json.sheet?.fields.forEach((f) => {
        initialValues[f.id] = f.value
      })
      setValues(initialValues)
      setLoading(false)
    }
    load()
  }, [tokenId])

  function startEditStructure() {
    setStructureFields(
      data?.sheet?.fields.map((f) => ({ label: f.label, value: f.value })) || []
    )
    setEditingStructure(true)
  }

  function addStructureField() {
    setStructureFields((prev) => [...prev, { label: "", value: "" }])
  }

  function updateStructureField(index: number, key: "label" | "value", val: string) {
    setStructureFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: val } : f))
    )
  }

  function removeStructureField(index: number) {
    setStructureFields((prev) => prev.filter((_, i) => i !== index))
  }

  async function saveStructure() {
    const cleanFields = structureFields.filter((f) => f.label.trim())

    const res = await fetch(`/api/tokens/${tokenId}/sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: cleanFields }),
    })

    if (!res.ok) {
      alert("Não foi possível salvar a estrutura da ficha.")
      return
    }

    const sheet = await res.json()
    setData((prev) => (prev ? { ...prev, sheet } : prev))

    const newValues: Record<string, string> = {}
    sheet.fields.forEach((f: Field) => {
      newValues[f.id] = f.value
    })
    setValues(newValues)
    setEditingStructure(false)
  }

  async function saveValues() {
    if (!data?.sheet) return

    const payload = {
      values: data.sheet.fields.map((f) => ({
        fieldId: f.id,
        value: values[f.id] ?? f.value,
      })),
    }

    const res = await fetch(`/api/tokens/${tokenId}/sheet/values`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      alert("Não foi possível salvar.")
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-parchment text-ink p-6 border-2 border-leather w-96 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && <p className="text-leather/60">Carregando ficha...</p>}

        {error && (
          <div>
            <p className="text-seal mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-leather/40 text-ink font-display text-sm hover:bg-leather/60 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}

        {data && !error && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-full border-2 border-leather/60 shrink-0"
                style={{ backgroundColor: data.token.color }}
              />
              <h3 className="font-display text-xl text-leather">{data.token.name}</h3>
            </div>

            {!editingStructure && (
              <>
                {(!data.sheet || data.sheet.fields.length === 0) && (
                  <p className="text-leather/50 text-sm italic mb-4">
                    Nenhuma ficha criada ainda.
                  </p>
                )}

                {data.sheet && data.sheet.fields.length > 0 && (
                  <div className="space-y-3 mb-5">
                    {data.sheet.fields.map((field) => (
                      <div key={field.id}>
                        <label className="block font-display text-sm text-leather mb-1">
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          disabled={!data.canEditStructure && false /* dono sempre pode editar valor */}
                          className="w-full bg-transparent border-b border-leather/40 py-1.5 outline-none focus:border-seal"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {data.sheet && data.sheet.fields.length > 0 && (
                    <button
                      onClick={saveValues}
                      className="flex-1 py-2 bg-seal text-parchment font-display text-sm hover:bg-seal/90 transition-colors"
                    >
                      Salvar
                    </button>
                  )}
                  {data.canEditStructure && (
                    <button
                      onClick={startEditStructure}
                      className="flex-1 py-2 bg-moss text-parchment font-display text-sm hover:bg-moss/90 transition-colors"
                    >
                      {data.sheet && data.sheet.fields.length > 0 ? "Editar campos" : "Criar ficha"}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-leather/40 text-ink font-display text-sm hover:bg-leather/60 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}

            {editingStructure && (
              <>
                <p className="text-xs text-leather/50 italic mb-3">
                  Defina os campos da ficha (ex: Força, HP, Itens...)
                </p>

                <div className="space-y-2 mb-4">
                  {structureFields.map((field, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nome do campo"
                        value={field.label}
                        onChange={(e) => updateStructureField(i, "label", e.target.value)}
                        className="flex-1 bg-white border border-leather/40 px-2 py-1.5 text-sm outline-none focus:border-seal"
                      />
                      <input
                        type="text"
                        placeholder="Valor inicial"
                        value={field.value}
                        onChange={(e) => updateStructureField(i, "value", e.target.value)}
                        className="flex-1 bg-white border border-leather/40 px-2 py-1.5 text-sm outline-none focus:border-seal"
                      />
                      <button
                        onClick={() => removeStructureField(i)}
                        className="text-seal text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addStructureField}
                  className="w-full py-1.5 mb-4 border border-dashed border-leather/40 text-leather/60 text-sm hover:border-leather/60 transition-colors"
                >
                  + Adicionar campo
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={saveStructure}
                    className="flex-1 py-2 bg-seal text-parchment font-display text-sm hover:bg-seal/90 transition-colors"
                  >
                    Salvar ficha
                  </button>
                  <button
                    onClick={() => setEditingStructure(false)}
                    className="flex-1 py-2 bg-leather/40 text-ink font-display text-sm hover:bg-leather/60 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}