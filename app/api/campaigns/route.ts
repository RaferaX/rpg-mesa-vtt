import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name) {
    return NextResponse.json({ error: "Nome da mesa é obrigatório" }, { status: 400 })
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      inviteCode: generateInviteCode(),
      members: {
        create: {
          userId: (session.user as { id: string }).id,
          role: "MASTER",
        },
      },
    },
  })

  return NextResponse.json(campaign, { status: 201 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      members: {
        some: { userId: (session.user as { id: string }).id },
      },
    },
    include: {
      members: { include: { user: true } },
    },
  })

  return NextResponse.json(campaigns)
}