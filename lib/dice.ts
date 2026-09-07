export type RollResult = {
  valid: boolean
  expression: string
  rolls: number[]
  modifier: number
  total: number
}

export function parseDiceRoll(input: string): RollResult | null {
  // Aceita formatos tipo: 1d20, 2d6+3, d20-1
  const match = input.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) return null

  const count = match[1] ? parseInt(match[1]) : 1
  const sides = parseInt(match[2])
  const modifier = match[3] ? parseInt(match[3]) : 0

  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null

  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1)
  }

  const total = rolls.reduce((a, b) => a + b, 0) + modifier

  return {
    valid: true,
    expression: input.trim(),
    rolls,
    modifier,
    total,
  }
}