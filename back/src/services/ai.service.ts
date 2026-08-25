import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(String(process.env.GEMINI_API_KEY));

export const analyzeMealImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  mealType: string,
  isTrainingDay: boolean,
  userDescription: string,
  userGoal: string,
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

  let coachPersona = "";
  let nutritionRules = "";

  if (userGoal === "ATHLETIC") {
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
    coachPersona = "Tu es un coach expert en hypertrophie musculaire.";
    nutritionRules =
      "L'objectif est un surplus calorique propre. Valorise les apports massifs en protéines et en glucides complexes autour des entraînements. Aucune interdiction stricte d'aliments sains.";
  } else {
    coachPersona =
      "Tu es un nutritionniste bienveillant axé sur le bien-être et la santé globale.";
    nutritionRules =
      "L'objectif est l'équilibre alimentaire. Valorise la diversité des macronutriments, les légumes et la modération. Ne sois pas punitif.";
  }

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
  targetMonths: number,
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
      - INTERDICTIONS ABSOLUES : Sucre ajouté, huiles végétales, aliments ultra-transformés, légumes non fermentés.
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
    - "explanation": 2 phrases maximum, percutantes et directes, pour justify le verdict selon les règles du profil. Si tu vois une liste d'ingrédients avec des éléments interdits, cite-les.
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
  isTrainingDay: boolean,
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: { temperature: 0.9 },
  });

  let nutritionRules = "";
  if (userGoal === "ATHLETIC") {
    // Le chef sait que "légume non fermenté" inclut l'oignon de base, on garde ça concis.
    nutritionRules = `Diète PRÉDATEUR stricte. Zéro sucre, zéro huile végétale. Aucun légume non fermenté. Protéines pures.`;
  } else if (userGoal === "MUSCLE_GAIN") {
    nutritionRules = `Prise de masse propre avec léger surplus calorique.`;
  } else {
    nutritionRules = `Santé et équilibre.`;
  }

  const isBreakfast = mealType.toLowerCase().includes("petit");
  const breakfastOverride = isBreakfast
    ? "⚠️ INTERDICTION FORMELLE d'utiliser de la viande (bœuf, poulet, dinde, etc.) pour ce repas. Utilise UNIQUEMENT des œufs, du fromage blanc, du skyr ou de la whey pour les protéines."
    : "";

  const trainingContext = isTrainingDay
    ? "Aujourd'hui est un JOUR D'ENTRAÎNEMENT 🏀. Le repas doit fournir de l'énergie, être massif et hyper-protéiné pour la récupération (type 'Athlete's Dinner')."
    : "Aujourd'hui est un JOUR DE REPOS 🛋️. Le repas doit être plus léger en calories mais très rassasiant.";

  const prompt = `
    Tu es un chef fitness expert en "Macro-Friendly Comfort Food". Tu t'inspires des meilleurs créateurs Instagram ("Aussiefitness", "Jalalsamfit", "Panaceapalm", "itzpmartin", "kais_texier", "healthleads").
    Ton client est un étudiant au budget serré qui optimise ses courses (Lidl, Aldi, Leclerc, Intermarché, épiceries de quartier et marchés locaux). 
    
    Repas demandé : "${mealType}".
    Profil : ${nutritionRules}.
    Contexte physique : ${trainingContext}
    ${breakfastOverride}
    
    RÈGLES ABSOLUES POUR FORCER LA DIVERSITÉ ET LE STYLE :
    1. CONCEPTS & SAUCES : Alterne entre "Fakeaways" (Nuggets croustillants au Air Fryer, Wraps, Tacos Bowls), plats de "Flemme étudiante" (Thon/Fromage blanc, Haricots verts/Pilons), et des repas de récupération massifs.
    2. RÈGLE STRICTE DIÈTE SCORPS : INTERDICTION ABSOLUE D'UTILISER DES OIGNONS SOUS TOUTES LEURS FORMES. ZÉRO OIGNON.
    3. LES ŒUFS (RÈGLE D'OR) : Le client mange TOUJOURS ses œufs ENTIERS. Ne propose JAMAIS de jeter les jaunes !
    4. VARIE LES PROTÉINES : Poulet, Dinde, Thon, Œufs, Bœuf haché. 
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

export const analyzeFridgeAndGenerateRecipe = async (
  imageBuffer: Buffer,
  mimeType: string,
  userGoal: string,
  mealType: string,
  isTrainingDay: boolean,
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  let nutritionRules = "";
  if (userGoal === "ATHLETIC") {
    nutritionRules = `Diète PRÉDATEUR stricte. Zéro sucre raffiné, zéro huile végétale. Priorité aux protéines brutes et légumes volumineux.`;
  } else if (userGoal === "MUSCLE_GAIN") {
    nutritionRules = `Prise de masse propre. Surplus contrôlé, glucides complexes denses autour de l'effort.`;
  } else {
    nutritionRules = `Équilibre global, satiété et contrôle calorique.`;
  }

  const prompt = `
    Tu es un chef cuisinier et vulgarisateur scientifique expert en "Macro-Friendly Comfort Food" (dans la lignée d'Ethan Chlebowski, Panaceapalm, itzpmartin, kais_texier, healthleads et pleins d'autres).
    L'utilisateur t'envoie une photo de l'intérieur de son réfrigérateur, de son placard ou de son plan de travail.

    Contexte :
    - Repas : "${mealType}"
    - Profil : ${nutritionRules}
    - Contexte : ${isTrainingDay ? "JOUR D'ENTRAÎNEMENT 🏀 (besoin d'énergie et de protéines massives)" : "JOUR DE REPOS 🛋️ (focus volume maximal et déficit)"}

    ### MISSION CULINAIRE & SCIENTIFIQUE :
    1. **Détection :** Identifie tous les ingrédients exploitables visibles sur la photo.
    2. **Recette Zéro Gaspi :** Conçois UNE recette réalisable avec ces ingrédients (en supposant que l'eau, le sel, le poivre et les épices de base sont disponibles).
    3. **Techniques de cuisson obligatoires :**
       - **RÈGLE DIÈTE SCORPS :** Exclure totalement et absolument les oignons de la recette, même s'ils sont visibles sur la photo.
       - **Viandes maigres :** Saisie vive pour la réaction de Maillard, puis déglaçage (eau, sauce soja, vinaigre) pour récupérer les sucs caramélisés sans gras.
       - **Sauces légères :** Lier avec du fromage blanc 0 %, du skyr ou un déglaçage hors du feu.
    4. **Règles d'or :**
       - Les œufs sont TOUJOURS consommés entiers.
       - Maximise le volume (fibres, eau) pour saturer la faim.
       - Budget maîtrisé (Lidl/Aldi/Leclerc) sous 3,50 € la portion.

    Renvoie UNIQUEMENT un objet JSON strictement conforme à cette structure :
    {
      "detectedIngredients": ["Poulet", "Courgette", "Oignon", "Moutarde"],
      "recipe": {
        "title": "Nom accrocheur avec émoji (ex: 🔥 Poulet Poêlé aux Oignons Fondus & Courgettes)",
        "estimatedPrice": "💶 Environ X.XX€ la portion",
        "prepTime": "Temps total (ex: 20 min)",
        "volumeScore": "Élevé | Très élevé",
        "calories": 490,
        "protein": 50,
        "carbs": 35,
        "fats": 10,
        "ingredients": [
          "200g Blanc de poulet cru émincé",
          "1 Oignon émincé",
          "1 Courgette en rondelles",
          "1 c.à.s de Moutarde de Dijon"
        ],
        "instructions": [
          "1. Faire suer l'oignon émincé à feu moyen avec 2 c.à.s d'eau jusqu'à obtenir des oignons fondus sans huile.",
          "2. Ajouter le poulet émincé à feu vif pour créer une réaction de Maillard, puis déglacer avec un fond d'eau.",
          "3. Ajouter la courgette, couvrir 5 minutes à feu doux, puis lier avec la moutarde hors du feu."
        ],
        "cookingTechniqueTip": "Astuce technique (ex: Le déglaçage à l'eau décolle les sucs de cuisson concentrés sans ajouter d'huile)."
      }
    }
  `;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const cleanJson = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();

  return JSON.parse(cleanJson);
};
