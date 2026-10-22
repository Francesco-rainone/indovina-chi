import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const useTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)

const prisma = useTurso
  ? new PrismaClient({
      adapter: new PrismaLibSQL({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }),
      log: ['error'],
    })
  : new PrismaClient({ log: ['query'] })

export const db = globalForPrisma.prisma ?? prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db