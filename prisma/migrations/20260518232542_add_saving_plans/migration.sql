-- CreateTable
CREATE TABLE "saving_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'PiggyBank',
    "color" TEXT NOT NULL DEFAULT '#52B788',
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "currentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "saving_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saving_plans_userId_idx" ON "saving_plans"("userId");

-- AddForeignKey
ALTER TABLE "saving_plans" ADD CONSTRAINT "saving_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
