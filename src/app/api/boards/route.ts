import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Character } from '@/lib/guess-who-types'

// GET /api/boards  → list all saved boards (lightweight, no characters payload)
export async function GET() {
  const boards = await db.board.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, charCount: true, creatorName: true, createdAt: true },
  })
  // Cache-Control: allow the browser + Caddy gateway to cache for 30s (boards list changes rarely per user session).
  // The list is invalidated when a new board is saved (POST) or deleted (DELETE) — those actions refetch on the client anyway.
  return NextResponse.json(
    { boards },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
  )
}

// POST /api/boards  → save a new board
// body: { name: string, characters: Character[], creatorName?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = (body?.name ?? '').toString().trim().slice(0, 80)
    const characters: Character[] = Array.isArray(body?.characters) ? body.characters : []
    const creatorName = body?.creatorName ? String(body.creatorName).slice(0, 40) : null

    if (!name) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })
    }
    if (characters.length < 1) {
      return NextResponse.json({ error: 'Aggiungi almeno un personaggio' }, { status: 400 })
    }

    // Validate each character shape (best-effort)
    const clean = characters.map((c, i) => ({
      id: typeof c.id === 'string' ? c.id : `char-${i}`,
      name: String(c.name ?? '').slice(0, 40),
      image: typeof c.image === 'string' ? c.image : '',
    })).filter((c) => c.name && c.image)

    if (clean.length < 1) {
      return NextResponse.json({ error: 'Personaggi non validi' }, { status: 400 })
    }

    const board = await db.board.create({
      data: {
        name,
        characters: JSON.stringify(clean),
        charCount: clean.length,
        creatorName,
      },
    })

    return NextResponse.json({ id: board.id, name: board.name, charCount: board.charCount }, { status: 201 })
  } catch (err) {
    console.error('[api/boards] POST error', err)
    return NextResponse.json({ error: 'Errore salvataggio board' }, { status: 500 })
  }
}
