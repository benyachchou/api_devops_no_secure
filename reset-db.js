const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'database.db');
const journalPath = path.join(dataDir, 'database.db-journal');

// Supprimer la base de données existante
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Base de données supprimée');
}

if (fs.existsSync(journalPath)) {
  fs.unlinkSync(journalPath);
  console.log('✅ Journal de la base de données supprimé');
}

console.log('✅ La base de données sera recréée au prochain démarrage du serveur avec les données de test');

