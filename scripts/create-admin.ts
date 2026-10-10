import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [emailArg, password] = process.argv.slice(2);
  const email = (emailArg ?? "").trim().toLowerCase();

  if (!email || !password) {
    console.error("Pakai: create-admin.ts <email> <password>");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password minimal 6 karakter.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // upsert: kalau email sudah ada, passwordnya diganti
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log("Admin siap:", admin.email);
}

main().finally(() => prisma.$disconnect());