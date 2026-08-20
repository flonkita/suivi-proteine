import multer from "multer";

// Utilisation de la mémoire pour stocker temporairement le fichier avant de l'envoyer à l'IA
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite à 5 Mo pour la photo de l'assiette
  },
  fileFilter: (req, file, cb) => {
    // On n'accepte que les images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        new Error("Seules les images sont autorisées pour analyser le repas !"),
      );
    }
  },
});
