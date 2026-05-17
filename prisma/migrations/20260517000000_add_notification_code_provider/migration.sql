-- AlterTable
ALTER TABLE "notification_logs" ADD COLUMN "code" TEXT NOT NULL DEFAULT '',
                                ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'none';
