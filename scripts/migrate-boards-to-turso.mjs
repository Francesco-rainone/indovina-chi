import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN
if (!tursoUrl || !tursoToken) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required')
}

const localUrl = process.env.LOCAL_DATABASE_URL ?? 'file:./db/custom.db'
const localDb = new PrismaClient({
  datasources: { db: { url: localUrl } },
})
const remoteDb = new PrismaClient({
  adapter: new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken }),
})

try {
  const boards = await localDb.board.findMany()
  for (const board of boards) {
    await remoteDb.board.upsert({
      where: { id: board.id },
      create: board,
      update: {
        name: board.name,
        characters: board.characters,
        charCount: board.charCount,
        creatorName: board.creatorName,
        createdAt: board.createdAt,
      },
    })
  }
  console.log(`Migrated ${boards.length} board(s) to Turso`)
} finally {
  await localDb.$disconnect()
  await remoteDb.$disconnect()
}
