import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/boards/[id] → full board with characters
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const board = await db.board.findUnique({ where: { id } })
  if (!board) {
    return NextResponse.json({ error: 'Board non trovata' }, { status: 404 })
  }
  let characters = []
  try {
    characters = JSON.parse(board.characters)
  } catch {
    characters = []
  }
  // Cache-Control: a saved board is immutable (never modified after creation), so cache for 1 hour.
  return NextResponse.json(
    {
      id: board.id,
      name: board.name,
      characters,
      charCount: board.charCount,
      creatorName: board.creatorName,
      createdAt: board.createdAt,
    },
    { headers: { 'Cache-Control': 'private, max-age=3600, immutable' } },
  )
}

// DELETE /api/boards/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await db.board.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Board non trovata' }, { status: 404 })
  }
}
