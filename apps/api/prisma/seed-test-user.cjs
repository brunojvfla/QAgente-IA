const argon2 = require("argon2");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedTestUser() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("A conta de teste só pode ser criada fora de produção.");
  }

  const email = process.env.QAGENT_TEST_EMAIL?.trim().toLowerCase();
  const password = process.env.QAGENT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("Defina QAGENT_TEST_EMAIL e QAGENT_TEST_PASSWORD.");
  }
  if (password.length < 12) {
    console.warn("Aviso: senha curta; utilize esta conta somente em desenvolvimento local.");
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name: "Usuário de Teste",
      email,
      passwordHash,
      status: "ACTIVE",
      profile: { create: { type: "WORK" } },
    },
    update: {
      name: "Usuário de Teste",
      passwordHash,
      status: "ACTIVE",
      profile: {
        upsert: {
          create: { type: "WORK" },
          update: { type: "WORK" },
        },
      },
    },
    select: {
      id: true,
      email: true,
      status: true,
      profile: { select: { type: true } },
    },
  });

  console.log(`Conta de teste pronta: ${user.email} (${user.profile.type}).`);
}

seedTestUser()
  .catch((error) => {
    console.error("Não foi possível criar a conta de teste:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
