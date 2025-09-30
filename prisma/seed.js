const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  // Clear old data
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPassword,
      role: "ADMIN",
      name: "Super Admin",
    },
  });

  // Create Employers
  const employerPassword = await bcrypt.hash("employer123", 10);
  const employer1 = await prisma.user.create({
    data: {
      email: "employer1@example.com",
      password: employerPassword,
      role: "EMPLOYER",
      name: "Tech Corp",
    },
  });

  const employer2 = await prisma.user.create({
    data: {
      email: "employer2@example.com",
      password: employerPassword,
      role: "EMPLOYER",
      name: "Finance Inc",
    },
  });

  // Create Jobs
  await prisma.job.create({
    data: {
      title: "Frontend Developer",
      description: "Work with React, Next.js and Tailwind.",
      city: "Lagos",
      country: "Nigeria",
      applyLink: "https://apply.example.com/frontend",
      employmentType: "Full-time",
      salaryRange: "$1000 - $1500",
      companyName: "Tech Corp",
      status: "PENDING",
      employerId: employer1.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  await prisma.job.create({
    data: {
      title: "Backend Engineer",
      description: "Node.js, Prisma, and GraphQL required.",
      city: "Abuja",
      country: "Nigeria",
      applyLink: "https://apply.example.com/backend",
      employmentType: "Contract",
      salaryRange: "$1200 - $2000",
      companyName: "Tech Corp",
      status: "APPROVED",
      employerId: employer1.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.job.create({
    data: {
      title: "Accountant",
      description: "Handle finance and reporting.",
      city: "Nairobi",
      country: "Kenya",
      applyLink: "https://apply.example.com/accountant",
      employmentType: "Part-time",
      salaryRange: "$800 - $1200",
      companyName: "Finance Inc",
      status: "EXPIRED",
      employerId: employer2.id,
      expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // expired 5 days ago
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("Admin login: admin@example.com / admin123");
  console.log("Employer login: employer1@example.com / employer123");
  console.log("Employer login: employer2@example.com / employer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
