import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// NOUVEAU : On utilise directement la DATABASE_URL configurée sur Render !
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// NOUVEAU : On peut aussi utiliser les variables d'environnement locales pour configurer la connexion à la base de données, mais ce n'est pas nécessaire si DATABASE_URL est déjà configurée.
// const pool = new Pool({
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   host: process.env.DB_HOST,
//   port: Number(process.env.DB_PORT),
//   database: process.env.DB_NAME,
// });

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
