const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialisation de la base de données SQLite
const db = new Database(path.join(dataDir, 'database.db'));

// Création des tables (sans contraintes de sécurité)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    email TEXT,
    motDePasse TEXT,
    role TEXT DEFAULT 'user',
    token TEXT
  );
  
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  );
`);

// Initialisation des données de test
function initTestData() {
  // Vérifier si des utilisateurs existent déjà
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const insertUser = db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)');
    insertUser.run('Alice Dupont', 'alice@example.com', 'password123', 'user');
    insertUser.run('Bob Martin', 'bob@example.com', 'secret456', 'user');
    insertUser.run('Admin User', 'admin@example.com', 'admin123', 'admin');
    console.log('✅ Utilisateurs de test créés');
  }
  
  // Vérifier si des ressources existent déjà
  const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
  if (resourceCount.count === 0) {
    const insertResource = db.prepare('INSERT INTO resources (name) VALUES (?)');
    insertResource.run('Documentation API');
    insertResource.run('Guide de sécurité');
    insertResource.run('Manuel utilisateur');
    insertResource.run('Rapport technique');
    console.log('✅ Ressources de test créées');
  }
}

// Initialiser les données de test
initTestData();

// ====== Blocs dupliqués (exemple pour détection SonarQube) ======
function formatUserDuplicateA(user) {
  const safeNom = String(user.nom || '').trim().toLowerCase();
  const safeEmail = String(user.email || '').trim().toLowerCase();
  const role = user.role || 'user';
  const metadata = {
    lengthNom: safeNom.length,
    hasAt: safeEmail.includes('@'),
    flags: [role, 'active', 'verified'].filter(Boolean),
  };
  const score = (metadata.lengthNom > 5 ? 2 : 1) + (metadata.hasAt ? 3 : 0);
  return {
    id: user.id || 0,
    nom: safeNom,
    email: safeEmail,
    role,
    score,
    meta: metadata,
  };
}

function formatUserDuplicateB(user) {
  const safeNom = String(user.nom || '').trim().toLowerCase();
  const safeEmail = String(user.email || '').trim().toLowerCase();
  const role = user.role || 'user';
  const metadata = {
    lengthNom: safeNom.length,
    hasAt: safeEmail.includes('@'),
    flags: [role, 'active', 'verified'].filter(Boolean),
  };
  const score = (metadata.lengthNom > 5 ? 2 : 1) + (metadata.hasAt ? 3 : 0);
  return {
    id: user.id || 0,
    nom: safeNom,
    email: safeEmail,
    role,
    score,
    meta: metadata,
  };
}

// ====== Endpoints volontairement vulnérables pour Hotspots Sécurité ======
// 1) Évaluation dynamique (eval)
app.get('/insecure-eval', (req, res) => {
  const code = req.query.code || '2+2';
  try {
    const result = eval(code); // vulnérable
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// 2) Commande système (injection de commande)
app.get('/insecure-cmd', (req, res) => {
  const arg = req.query.path || '.';
  exec('ls ' + String(arg), (err, stdout) => {
    if (err) return res.status(500).send(String(err));
    res.type('text/plain').send(stdout);
  });
});

// 3) Requête SQL concaténée (Injection SQL)
app.get('/insecure-query', (req, res) => {
  const email = req.query.email || '';
  const sql = "SELECT id, nom, email, role FROM users WHERE email = '" + email + "'"; // vulnérable
  try {
    const rows = db.prepare(sql).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 4) Hash faible MD5
app.post('/weak-hash', (req, res) => {
  const password = req.body.password || '';
  const md5 = crypto.createHash('md5').update(String(password)).digest('hex'); // vulnérable
  res.json({ md5 });
});

// 5) Rendu HTML non échappé (XSS potentiel)
app.get('/insecure-html', (req, res) => {
  const input = req.query.q || 'Hello';
  const html = '<div>Résultat: ' + String(input) + '</div>'; // vulnérable
  res.type('text/html').send(html);
});

// Middleware pour vérifier l'authentification (sans contrôle - vérification basique)
function requireAuth(req, res, next) {
  const email = req.headers['x-email'] || req.body.email;
  const motDePasse = req.headers['x-password'] || req.body.motDePasse;
  
  if (!email || !motDePasse) {
    return res.status(401).json({ message: 'Email et mot de passe requis' });
  }
  
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND motDePasse = ?');
  const user = stmt.get(email, motDePasse);
  
  if (!user) {
    return res.status(401).json({ message: 'Identifiants incorrects' });
  }
  
  req.user = user;
  next();
}

// Middleware pour vérifier le rôle admin (sans contrôle)
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Rôle admin requis.' });
  }
  
  next();
}

// POST /register - Public
app.post('/register', (req, res) => {
  const { nom, email, motDePasse } = req.body;
  
  const stmt = db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)');
  const result = stmt.run(nom, email, motDePasse, 'user');
  
  res.json({ message: 'Utilisateur créé', userId: result.lastInsertRowid });
});

// POST /login - Public (vérifie juste les identifiants)
app.post('/login', (req, res) => {
  const { email, motDePasse } = req.body;
  
  const stmt = db.prepare('SELECT id, nom, email, role FROM users WHERE email = ? AND motDePasse = ?');
  const user = stmt.get(email, motDePasse);
  
  if (user) {
    res.json({ message: 'Connexion réussie', user });
  } else {
    res.status(401).json({ message: 'Identifiants incorrects' });
  }
});

// GET /profile - Authentifié (email/password dans headers ou body)
app.get('/profile', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    nom: req.user.nom,
    email: req.user.email,
    role: req.user.role
  });
});

// GET /resources - Authentifié (email/password dans headers)
app.get('/resources', requireAuth, (req, res) => {
  const stmt = db.prepare('SELECT * FROM resources');
  const resources = stmt.all();
  res.json(resources);
});

// POST /resources - Admin (email/password dans headers ou body)
app.post('/resources', requireAuth, requireAdmin, (req, res) => {
  const { name } = req.body;
  
  const stmt = db.prepare('INSERT INTO resources (name) VALUES (?)');
  const result = stmt.run(name);
  
  res.json({ message: 'Ressource créée', resource: { id: result.lastInsertRowid, name } });
});

// DELETE /resources/:id - Admin (email/password dans headers)
app.delete('/resources/:id', requireAuth, requireAdmin, (req, res) => {
  const id = req.params.id;
  
  const stmt = db.prepare('DELETE FROM resources WHERE id = ?');
  const result = stmt.run(id);
  
  if (result.changes > 0) {
    res.json({ message: 'Ressource supprimée' });
  } else {
    res.status(404).json({ message: 'Ressource non trouvée' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

