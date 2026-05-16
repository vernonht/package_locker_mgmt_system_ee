// Route handlers import from here — swap the export to switch persistence layers.
// DATABASE_URL set → uncomment prisma-store; unset → uncomment store.

export * from '@/lib/db/prisma-store'
// export * from '@/lib/db/store'
