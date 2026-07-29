import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeOrderByDate } from "../src/lib/procurement";

const prisma = new PrismaClient();

function daysFromNow(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@trestle.dev" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@trestle.dev",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "pm@trestle.dev" },
    update: {},
    create: {
      name: "Priya Member",
      email: "pm@trestle.dev",
      passwordHash: adminPasswordHash,
      role: "MEMBER",
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@trestle.dev" },
    update: {},
    create: {
      name: "Val Viewer",
      email: "viewer@trestle.dev",
      passwordHash: adminPasswordHash,
      role: "VIEWER",
    },
  });

  const riverside = await prisma.project.upsert({
    where: { id: "seed-project-riverside" },
    update: {},
    create: {
      id: "seed-project-riverside",
      name: "Riverside Apartments",
      address: "1200 Riverside Dr, Austin, TX",
      status: "ACTIVE",
      startDate: daysFromNow(-60),
      endDate: daysFromNow(240),
    },
  });

  const oakview = await prisma.project.upsert({
    where: { id: "seed-project-oakview" },
    update: {},
    create: {
      id: "seed-project-oakview",
      name: "Oakview Retail Center",
      address: "450 Oak View Blvd, Round Rock, TX",
      status: "ACTIVE",
      startDate: daysFromNow(-20),
      endDate: daysFromNow(300),
    },
  });

  const steelworks = await prisma.vendor.upsert({
    where: { id: "seed-vendor-steelworks" },
    update: {},
    create: {
      id: "seed-vendor-steelworks",
      name: "Lonestar Steelworks",
      trade: "Structural Steel",
      contactName: "Marcus Lee",
      email: "marcus@lonestarsteel.example",
      phone: "512-555-0142",
    },
  });

  const glazing = await prisma.vendor.upsert({
    where: { id: "seed-vendor-glazing" },
    update: {},
    create: {
      id: "seed-vendor-glazing",
      name: "Hill Country Glazing",
      trade: "Windows & Glazing",
      contactName: "Dana Ruiz",
      email: "dana@hcglazing.example",
      phone: "512-555-0198",
    },
  });

  const electrical = await prisma.vendor.upsert({
    where: { id: "seed-vendor-electrical" },
    update: {},
    create: {
      id: "seed-vendor-electrical",
      name: "Capitol Electric",
      trade: "Electrical",
      contactName: "Sam Ortiz",
      email: "sam@capitolelectric.example",
      phone: "512-555-0110",
    },
  });

  const mechanical = await prisma.vendor.upsert({
    where: { id: "seed-vendor-mechanical" },
    update: {},
    create: {
      id: "seed-vendor-mechanical",
      name: "Central Texas HVAC",
      trade: "Mechanical",
      contactName: "Robin Chen",
      email: "robin@cthvac.example",
      phone: "512-555-0177",
    },
  });

  type SeedItem = {
    id: string;
    projectId: string;
    vendorId: string;
    material: string;
    leadTimeDays: number;
    requiredOnSiteDate: Date;
    status: "NOT_ORDERED" | "ORDERED" | "DELIVERED";
    notes?: string;
  };

  const items: SeedItem[] = [
    {
      id: "seed-item-1",
      projectId: riverside.id,
      vendorId: steelworks.id,
      material: "Structural steel beams — level 3-5",
      leadTimeDays: 45,
      requiredOnSiteDate: daysFromNow(10),
      status: "NOT_ORDERED",
      notes: "Confirm shop drawings approved before releasing order.",
    },
    {
      id: "seed-item-2",
      projectId: riverside.id,
      vendorId: glazing.id,
      material: "Curtain wall glazing units",
      leadTimeDays: 60,
      requiredOnSiteDate: daysFromNow(90),
      status: "NOT_ORDERED",
    },
    {
      id: "seed-item-3",
      projectId: riverside.id,
      vendorId: electrical.id,
      material: "Main switchgear",
      leadTimeDays: 30,
      requiredOnSiteDate: daysFromNow(20),
      status: "ORDERED",
    },
    {
      id: "seed-item-4",
      projectId: riverside.id,
      vendorId: mechanical.id,
      material: "Rooftop HVAC units (x4)",
      leadTimeDays: 21,
      requiredOnSiteDate: daysFromNow(5),
      status: "NOT_ORDERED",
      notes: "At risk — expedite or confirm with sub.",
    },
    {
      id: "seed-item-5",
      projectId: oakview.id,
      vendorId: steelworks.id,
      material: "Steel joists — retail wing",
      leadTimeDays: 35,
      requiredOnSiteDate: daysFromNow(50),
      status: "NOT_ORDERED",
    },
    {
      id: "seed-item-6",
      projectId: oakview.id,
      vendorId: electrical.id,
      material: "Parking lot light fixtures",
      leadTimeDays: 14,
      requiredOnSiteDate: daysFromNow(35),
      status: "DELIVERED",
    },
    {
      id: "seed-item-7",
      projectId: oakview.id,
      vendorId: glazing.id,
      material: "Storefront glass panels",
      leadTimeDays: 28,
      requiredOnSiteDate: daysFromNow(-3),
      status: "ORDERED",
      notes: "Delayed at manufacturer, follow up.",
    },
  ];

  for (const item of items) {
    const requiredOnSiteDate = item.requiredOnSiteDate;
    const orderByDate = computeOrderByDate(requiredOnSiteDate, item.leadTimeDays);

    await prisma.materialItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        projectId: item.projectId,
        vendorId: item.vendorId,
        material: item.material,
        leadTimeDays: item.leadTimeDays,
        requiredOnSiteDate,
        orderByDate,
        status: item.status,
        notes: item.notes,
        loggedById: admin.id,
        actualOrderDate: item.status !== "NOT_ORDERED" ? daysFromNow(-2) : null,
        actualDeliveryDate: item.status === "DELIVERED" ? daysFromNow(-1) : null,
      },
    });
  }

  console.log("Seed complete.");
  console.log("  Admin login:  admin@trestle.dev / password123");
  console.log("  Member login: pm@trestle.dev / password123");
  console.log("  Viewer login: viewer@trestle.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
