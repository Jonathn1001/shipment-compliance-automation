-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'CERTIFICATE_FORM_E', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('JSON', 'OCR', 'API', 'CSV');

-- CreateTable
CREATE TABLE "DocumentIngestion" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "rawInput" JSONB NOT NULL,
    "mappedFields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentIngestion_shipmentId_idx" ON "DocumentIngestion"("shipmentId");

-- AddForeignKey
ALTER TABLE "DocumentIngestion" ADD CONSTRAINT "DocumentIngestion_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
