import "dotenv/config"; // Chargement des variables d'environnement depuis le fichier .env

import express from "express";
import type { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

// 2. Maintenant on peut importer nos routes sereinement, l'URL de la base est connue
import trackingRoutes from "./routes/dailyTracking.routes.js";
import mealRoutes from "./routes/meal.routes.js";
import dailyRoutes from "./routes/daily.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import groceryRoutes from "./routes/grocery.routes.js";
import recipeRoutes from "./routes/recipe.routes.js";
import fridgeRoutes from "./routes/fridge.routes.js";

const app: Express = express();
const port = process.env.PORT || 3000;

// Middlewares (Tes défenseurs)
app.use(helmet()); // Sécurité des headers
app.use(cors()); // Autorise les requêtes externes
app.use(express.json()); // Permet de lire le format JSON dans le body des requêtes

// Route de test de santé de l'API
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Le moteur du Build FloAllen est en ligne et prêt à tracker.",
  });
});

// Câblage de ta nouvelle route
app.use("/api/tracking", trackingRoutes);
app.use("/api/meals", mealRoutes); // Ajout de la route pour les repas
app.use("/api/daily", dailyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/grocery", groceryRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/fridge", fridgeRoutes);
// Lancement du serveur
app.listen(port, () => {
  console.log(
    `⚡️ [Serveur]: L'API Suivi Protéiné tourne sur http://localhost:${port}`,
  );
});
