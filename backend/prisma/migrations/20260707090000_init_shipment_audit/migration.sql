-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'APPROVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SHIPMENT_CREATED', 'DOCUMENT_INGESTED', 'FIELD_UPDATED', 'VALIDATION_RUN', 'REPORT_GENERATED', 'STATUS_CHANGED', 'SHIPMENT_APPROVED');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentReference" TEXT NOT NULL,
    "exporter" TEXT,
    "importer" TEXT,
    "importerId" TEXT,
    "invoiceNumber" TEXT,
    "invoiceValue" DECIMAL(18,2),
    "currency" TEXT,
    "goodsDescription" TEXT,
    "hsCode" TEXT,
    "countryOfOrigin" TEXT,
    "grossWeightKg" DECIMAL(12,3),
    "netWeightKg" DECIMAL(12,3),
    "numberOfPackages" INTEGER,
    "containerNumber" TEXT,
    "billOfLadingNumber" TEXT,
    "packagingType" TEXT,
    "ispm15Certified" BOOLEAN,
    "eformCertificate" TEXT,
    "freightMode" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "currentStatus" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "details" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shipment_shipmentReference_idx" ON "Shipment"("shipmentReference");

-- CreateIndex
CREATE INDEX "AuditLog_shipmentId_timestamp_idx" ON "AuditLog"("shipmentId", "timestamp");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
