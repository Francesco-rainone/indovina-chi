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
  // Names can be changed from the saved-boards list, so this response must not be immutable.
  return NextResponse.json(
    {
      id: board.id,
      name: board.name,
      characters,
      charCount: board.charCount,
      creatorName: board.creatorName,
      createdAt: board.createdAt,
    },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  )
}

// PATCH /api/boards/[id] → rename a saved board
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const name = String(body?.name ?? '').trim().slice(0, 80)
    if (!name) {
      return NextResponse.json({ error: 'Il nome della board non può essere vuoto' }, { status: 400 })
    }

    const board = await db.board.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, charCount: true, creatorName: true, createdAt: true },
    })
    return NextResponse.json({ board })
  } catch (err) {
    console.error('[api/boards] PATCH error', err)
    return NextResponse.json({ error: 'Board non trovata o nome non aggiornato' }, { status: 404 })
  }
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
