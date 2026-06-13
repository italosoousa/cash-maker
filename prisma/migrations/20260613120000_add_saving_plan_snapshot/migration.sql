-- CreateTable
CREATE TABLE "saving_plan_snapshots" (
    "id" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "savingPlanId" TEXT NOT NULL,

    CONSTRAINT "saving_plan_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saving_plan_snapshots_savingPlanId_idx" ON "saving_plan_snapshots"("savingPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "saving_plan_snapshots_savingPlanId_month_year_key" ON "saving_plan_snapshots"("savingPlanId", "month", "year");

-- AddForeignKey
ALTER TABLE "saving_plan_snapshots" ADD CONSTRAINT "saving_plan_snapshots_savingPlanId_fkey" FOREIGN KEY ("savingPlanId") REFERENCES "saving_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
