import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "../src/lib/seed-data";

const prisma = new PrismaClient();

seedDemoData(prisma)
  .then((result) => {
    console.log("Seed complete.");
    console.log(`  Users: ${result.users.join(", ")}`);
    console.log(`  Projects: ${result.projects.join(", ")}`);
    console.log(`  Material items: ${result.materialItemCount}`);
    console.log("  Password for all demo users: password123");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
