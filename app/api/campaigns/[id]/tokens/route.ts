import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const tokens = await prisma.token.findMany({ where: { campaignId: id } })
  return NextResponse.json(tokens)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const userId = (session.user as { id: string }).id

  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId: id } },
  })

  if (membership?.role !== "MASTER") {
    return NextResponse.json({ error: "Só o mestre pode criar personagens" }, { status: 403 })
  }

  const { name, color, ownerId } = await req.json()

  const token = await prisma.token.create({
    data: {
      name: name || "Token",
      color: color || "#B08A3E",
      campaignId: id,
      ownerId: ownerId || null,
    },
  })

  return NextResponse.json(token, { status: 201 })
}