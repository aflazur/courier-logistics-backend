import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@courier.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: process.env.ADMIN_NAME || 'Platform Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log(`✅ Admin seeded: ${admin.email}`);

  const hubs = [
    { name: 'Dhaka Central Hub', city: 'Dhaka', zone: 'Motijheel', address: 'Motijheel C/A, Dhaka' },
    { name: 'Chattogram Hub', city: 'Chattogram', zone: 'Agrabad', address: 'Agrabad C/A, Chattogram' },
    { name: 'Sylhet Hub', city: 'Sylhet', zone: 'Zindabazar', address: 'Zindabazar, Sylhet' },
  ];

  for (const hub of hubs) {
    const existing = await prisma.hub.findFirst({ where: { name: hub.name } });
    if (!existing) {
      await prisma.hub.create({ data: hub });
    }
  }
  console.log('✅ Sample hubs seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
