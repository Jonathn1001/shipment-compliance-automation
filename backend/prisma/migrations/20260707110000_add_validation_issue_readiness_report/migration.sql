-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'WAIVED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReadinessAssessment" AS ENUM ('READY_TO_PROCEED', 'NEEDS_HUMAN_REVIEW', 'BLOCKED');

-- CreateTable
CREATE TABLE "ValidationIssue" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "field" TEXT,
    "explanation" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessReport" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "statusSnapshot" "ShipmentStatus" NOT NULL,
    "overallAssessment" "ReadinessAssessment" NOT NULL,
    "humanReviewRequired" BOOLEAN NOT NULL,
    "totalIssues" INTEGER NOT NULL,
    "criticalCount" INTEGER NOT NULL,
    "warningCount" INTEGER NOT NULL,
    "nextActions" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValidationIssue_shipmentId_status_idx" ON "ValidationIssue"("shipmentId", "status");

-- CreateIndex
CREATE INDEX "ValidationIssue_shipmentId_issueType_field_idx" ON "ValidationIssue"("shipmentId", "issueType", "field");

-- CreateIndex
CREATE INDEX "ReadinessReport_shipmentId_generatedAt_idx" ON "ReadinessReport"("shipmentId", "generatedAt");

-- AddForeignKey
ALTER TABLE "ValidationIssue" ADD CONSTRAINT "ValidationIssue_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessReport" ADD CONSTRAINT "ReadinessReport_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
