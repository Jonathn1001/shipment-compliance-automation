// Seed a handful of varied shipments (plus a document) so the list screen has
// data to render. Shipments are inserted in their raw state — run validation via
// the API or the frontend's "Run validation" button to generate issues, statuses
// and readiness reports. Safe to re-run: it clears the tables first.
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Order matters: children first (FKs cascade, but be explicit for clarity).
  await prisma.auditLog.deleteMany();
  await prisma.readinessReport.deleteMany();
  await prisma.validationIssue.deleteMany();
  await prisma.documentIngestion.deleteMany();
  await prisma.shipment.deleteMany();

  // 1) The sample from the brief — clean, ready to validate to READY.
  await prisma.shipment.create({
    data: {
      shipmentReference: 'SAF-IMP-2026-0007',
      exporter: 'Shenzhen Widgets Co',
      importer: 'Acme Importers Ltd',
      hsCode: '8471.30',
      goodsDescription: 'Laptop computers',
      countryOfOrigin: 'DE',
      billOfLadingNumber: 'BL-88231',
      invoiceValue: '12500.50',
      currency: 'USD',
      containerNumber: 'CSQU3054383',
      grossWeightKg: '1040.000',
      netWeightKg: '1000.000',
      packagingType: 'Plastic',
    },
  });

  // 2) Wood packaging, no ISPM15 -> will validate to BLOCKED.
  await prisma.shipment.create({
    data: {
      shipmentReference: 'SAF-IMP-2026-0012',
      exporter: 'Guangzhou Timber Ltd',
      importer: 'Nordic Retail AB',
      hsCode: '9403.60',
      goodsDescription: 'Wooden furniture',
      countryOfOrigin: 'CN',
      billOfLadingNumber: 'BL-90011',
      invoiceValue: '8200.00',
      currency: 'USD',
      grossWeightKg: '900.000',
      netWeightKg: '1000.000',
      packagingType: 'Wooden crate',
      ispm15Certified: false,
    },
  });

  // 3) A shipment with a conflicting document -> will validate to NEEDS_REVIEW.
  const withDoc = await prisma.shipment.create({
    data: {
      shipmentReference: 'SAF-IMP-2026-0021',
      exporter: 'Osaka Components KK',
      importer: 'Acme Importers Ltd',
      hsCode: '8542.31',
      goodsDescription: 'Integrated circuits',
      countryOfOrigin: 'JP',
      billOfLadingNumber: 'BL-77320',
      invoiceValue: '45000.00',
      currency: 'USD',
      containerNumber: 'MSKU1234565',
      grossWeightKg: '520.000',
      netWeightKg: '500.000',
      packagingType: 'Carton',
    },
  });
  await prisma.documentIngestion.create({
    data: {
      shipmentId: withDoc.id,
      documentType: 'COMMERCIAL_INVOICE',
      sourceType: 'JSON',
      rawInput: { buyer: 'Globex Trading', total_value: 45000 },
      mappedFields: { importer: 'Globex Trading', invoiceValue: '45000' },
    },
  });

  // 4) A brand-new partial shipment, still CREATED.
  await prisma.shipment.create({
    data: {
      shipmentReference: 'SAF-IMP-2026-0033',
      importer: 'Meridian Freight Co',
      goodsDescription: 'Assorted apparel',
    },
  });

  const count = await prisma.shipment.count();
  console.log(`Seeded ${count} shipments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
