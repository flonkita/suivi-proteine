import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(String(process.env.GEMINI_API_KEY));

export const analyzeMealImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  mealType: string,
  isTrainingDay: boolean,
  userDescription: string,
  userGoal: string, // <-- NOUVEAU : On récupère l'objectif de l'utilisateur
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  // 1. DÉFINITION DYNAMIQUE DU COACH ET DES RÈGLES
  let coachPersona = "";
  let nutritionRules = "";

  if (userGoal === "ATHLETIC") {
    // TON MODE : La charte stricte pour l'explosivité
    coachPersona =
      "Tu es un préparateur physique intraitable. Ton athlète veut perdre du poids et s'entraîner intensément pour améliorer sa détente verticale.";
    nutritionRules = `
      DICTIONNAIRE OFFICIEL DES ALIMENTS AUTORISÉS (CHARTE PRÉDATEUR) :
      1. VIANDES & ABATS : Bœuf, poulet, dinde, porc, veau, agneau...
      2. POISSONS : Saumon, thon rouge, sardine, maquereau...
      3. GRAISSES : Beurre cru, ghee, suif.
      4. LAITAGES : Crus ou fermentés uniquement.
      5. FRUITS : Tous les fruits de saison, avocat, olive.
      6. LÉGUMES : Courges, concombre, légumes fermentés.
      
      LISTE NOIRE : Soja, huiles végétales, pomme de terre, céréales, légumineuses, maïs, chocolat, légumes non fermentés, produits allégés.
      
      RÈGLE D'ENTRAÎNEMENT : ${isTrainingDay ? "Aujourd'hui est un jour d'entraînement. Riz blanc et patate douce tolérés." : "Jour de repos. Déficit strict, collations riches interdites."}
    `;
  } else if (userGoal === "MUSCLE_GAIN") {
    // Mode Go-Muscu
    coachPersona = "Tu es un coach expert en hypertrophie musculaire.";
    nutritionRules =
      "L'objectif est un surplus calorique propre. Valorise les apports massifs en protéines et en glucides complexes autour des entraînements. Aucune interdiction stricte d'aliments sains.";
  } else {
    // Mode Santé (Grand Public)
    coachPersona =
      "Tu es un nutritionniste bienveillant axé sur le bien-être et la santé globale.";
    nutritionRules =
      "L'objectif est l'équilibre alimentaire. Valorise la diversité des macronutriments, les légumes et la modération. Ne sois pas punitif.";
  }

  // 2. ASSEMBLAGE DU PROMPT UNIQUE
  const promptComplet = `
    ${coachPersona}
    
    RÈGLES NUTRITIONNELLES À APPLIQUER :
    ${nutritionRules}

    Le repas soumis est : ${mealType}.
    ${userDescription ? `⚠️ Ingrédients détaillés par l'utilisateur : "${userDescription}".` : ""}
    
    Analyse ce repas et renvoie UNIQUEMENT un objet JSON valide avec les clés suivantes :
    - "name": le nom du plat.
    - "calories": estimation des calories (entier).
    - "proteins": protéines en grammes (entier).
    - "carbs": glucides en grammes (entier).
    - "fats": lipides en grammes (entier).
    - "isValid": true si conforme aux règles ci-dessus, false sinon.
    - "comment": courte critique d'une phrase avec le ton adapté à ton rôle.
  `;

  const imagePart = {
    inlineData: { data: imageBuffer.toString("base64"), mimeType: mimeType },
  };

  const result = await model.generateContent([promptComplet, imagePart]);
  const cleanJson = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(cleanJson);
};

export const analyzeWeightProgress = async (
  currentWeight: number,
  previousWeight: number | null,
  targetWeight: number,
  userGoal: string,
  targetMonths: number, // <-- On reçoit le délai
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  let goalContext = "améliorer sa santé générale";
  if (userGoal === "ATHLETIC")
    goalContext = "gagner en explosivité sur les parquets";
  if (userGoal === "MUSCLE_GAIN")
    goalContext = "bâtir de la masse musculaire propre";

  const prompt = `
    Tu es un coach motivant. Ton client se pèse pour ${goalContext}.
    Objectif cible : ${targetWeight} kg. Poids actuel : ${currentWeight} kg.
    Le temps imparti pour atteindre cet objectif est de ${targetMonths} mois. 
    
    Rédige un commentaire ultra-court (1 à 2 phrases) réagissant à ce poids.
    Prends en compte la pression du temps : si l'objectif est ambitieux sur peu de mois (ex: grosse perte en 3 mois), sois exigeant. Si c'est sur le long terme, prône la patience.
    Ne renvoie QUE le texte sans guillemets.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

export const analyzeGroceryImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  userGoal: string,
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  let rules = "";
  if (userGoal === "ATHLETIC") {
    rules = `
      L'utilisateur suit une Diète PRÉDATEUR stricte pour des performances athlétiques et une perte de poids massive.
      - ALIMENTS BRUTS AUTORISÉS : Viandes (poulet, bœuf 5%), poissons, œufs, légumes verts, fruits.
      - TOLÉRANCES : Zéro-sucre (type cola), épices sèches.
      - INTERDICTIONS ABSOLUES : Sucre ajouté, huiles végétales, aliments ultra-transformés. (Rappel : les oignons sont bannis de cette charte spécifique !).
    `;
  } else if (userGoal === "MUSCLE_GAIN") {
    rules =
      "L'utilisateur cherche l'hypertrophie. Tolérance plus haute sur les glucides complexes, mais rejet des produits ultra-transformés pauvres en protéines.";
  } else {
    rules =
      "L'utilisateur cherche l'équilibre santé. L'analyse doit encourager les produits bruts (Nutri-Score A/B) et alerter sur les additifs, le sel ou les sucres cachés.";
  }

  const prompt = `
    Tu es un expert en nutrition. L'utilisateur t'envoie une photo prise au supermarché (un aliment brut ou le dos d'un emballage avec les ingrédients).
    
    RÈGLES DU PROFIL :
    ${rules}

    Analyse l'image et renvoie UNIQUEMENT un objet JSON valide avec les clés suivantes :
    - "productName": Le nom de l'aliment repéré.
    - "isProcessed": true si c'est un produit transformé, false si c'est un produit brut (fruit, légume, viande crue).
    - "verdict": "VALIDE", "MODERATION", ou "INTERDIT".
    - "explanation": 2 phrases maximum, percutantes et directes, pour justifier le verdict selon les règles du profil. Si tu vois une liste d'ingrédients avec des éléments interdits, cite-les.
  `;

  const imagePart = {
    inlineData: { data: imageBuffer.toString("base64"), mimeType: mimeType },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const cleanJson = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(cleanJson);
};

export const generateBudgetRecipe = async (
  userGoal: string,
  mealType: string,
  isTrainingDay: boolean, // NOUVEAU PARAMÈTRE
) => {
  // NOUVEAU : On monte la température à 0.9 pour forcer la diversité et la créativité !
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: { temperature: 0.9 },
  });

  let nutritionRules = "";
  if (userGoal === "ATHLETIC") {
    nutritionRules = `Diète PRÉDATEUR stricte. Zéro oignon (bannis-les absolument), zéro sucre, zéro huile végétale. Protéines pures.`;
  } else if (userGoal === "MUSCLE_GAIN") {
    nutritionRules = `Prise de masse propre avec léger surplus calorique.`;
  } else {
    nutritionRules = `Santé et équilibre.`;
  }

  const trainingContext = isTrainingDay
    ? "Aujourd'hui est un JOUR D'ENTRAÎNEMENT 🏀. Le repas doit fournir de l'énergie, être massif et hyper-protéiné pour la récupération (type 'Athlete's Dinner')."
    : "Aujourd'hui est un JOUR DE REPOS 🛋️. Le repas doit être plus léger en calories mais très rassasiant.";

  const prompt = `
    Tu es un chef fitness expert en "Macro-Friendly Comfort Food". Tu t'inspires des meilleurs créateurs Instagram ("Aussiefitness", "Jalalsamfit", "Panaceapalm", "itzpmartin", "kais_texier", "healthleads").
    Ton client est un étudiant au budget serré qui optimise ses courses (Lidl, Aldi, Leclerc, Intermarché, épiceries de quartier et marchés locaux). 
    
    Repas demandé : "${mealType}".
    Profil : ${nutritionRules}.
    Contexte physique : ${trainingContext}
    
    RÈGLES ABSOLUES POUR FORCER LA DIVERSITÉ ET LE STYLE :
    1. CONCEPTS & SAUCES : Alterne entre "Fakeaways" (Nuggets croustillants au Air Fryer, Wraps, Tacos Bowls), plats de "Flemme étudiante" (Thon/Fromage blanc, Haricots verts/Pilons), et des repas de récupération massifs (ex: Pommes de terre sautées + Viande hachée + Œufs). N'hésite pas à proposer des sauces maison (fromage blanc/moutarde/sriracha).
    2. LES ŒUFS (RÈGLE D'OR) : Le client mange TOUJOURS ses œufs ENTIERS. Ne propose JAMAIS de jeter les jaunes ou d'utiliser des blancs d'œufs en bouteille ! Tout est bon dans l'œuf.
    3. VARIE LES PROTÉINES : Utilise du Poulet, de la Dinde, du Thon, des Œufs, du Bœuf haché. (Ne fais pas toujours des "Smash Burgers" !).
    4. PETIT-DÉJEUNER : Reste sur du classique matinal (œufs entiers, avoine, fromage blanc), pas de plats lourds type burger ou viande rouge.
    5. BUDGET : Calcule un prix réaliste PAR PORTION (entre 1.50€ et 4.00€ maximum).
    
    Renvoie UNIQUEMENT un JSON avec :
    - "title": Nom stylé avec émoji (ex: "🔥 Athlete's Dinner Bowl").
    - "estimatedPrice": "💶 Environ X.XX€ la portion".
    - "prepTime": Temps estimé.
    - "calories": entier, "protein": entier, "carbs": entier, "fats": entier.
    - "ingredients": tableau de strings (quantités réalistes).
    - "instructions": tableau de strings (étapes simples et dynamiques).
  `;

  const result = await model.generateContent(prompt);
  const cleanJson = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(cleanJson);
};