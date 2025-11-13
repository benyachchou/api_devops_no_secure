const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

// Création du dossier data si besoin
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true }); // code smell : ignorer les erreurs
}

// Initialisation base SQLite
const db = new Database(path.join(dataDir, 'database.db'));

/* ========== TABLES ========== */
// Mauvaise pratique : pas de contraintes, pas de check, dettes techniques
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

// Du code mort : fonctions jamais utilisées
function dead1(){ return 0; }
function dead2(){ return 1; }
function dead3(){ return 2; }
let unusedVar1 = 123;
let unusedVar2 = "foo";
let unusedVar3 = true;

// INITIALISATION avec dupliqué 
function initTestData() {
  // Copié trois fois pour augmenter la duplication/dette
  for (let repeat = 0; repeat < 3; repeat++) {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
      const insertUser = db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)');
      insertUser.run('Alice Dupont', 'alice@example.com', 'password123', 'user');
      insertUser.run('Bob Martin', 'bob@example.com', 'secret456', 'user');
      insertUser.run('Admin User', 'admin@example.com', 'admin123', 'admin');
    }
    const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
    if (resourceCount.count === 0) {
      const insertResource = db.prepare('INSERT INTO resources (name) VALUES (?)');
      insertResource.run('Documentation API');
      insertResource.run('Guide de sécurité');
      insertResource.run('Manuel utilisateur');
      insertResource.run('Rapport technique');
    }
  }
}
initTestData();

// ______ CODE DUPLIQUÉ (copier/coller) ______
function formatA(u) {
  return {
    id: u.id, nom: u.nom, ok: u.email
  };
}
function formatB(u) { // même code que formatA
  return {
    id: u.id, nom: u.nom, ok: u.email
  };
}
function formatC(u) { // même code que formatA
  return {
    id: u.id, nom: u.nom, ok: u.email
  };
}
function formatD(u) { // même code que formatA
  return {
    id: u.id, nom: u.nom, ok: u.email
  };
}

// ________ MAUVAISES PRATIQUES SÉCURITÉ ________
// SQL Injection très visible
app.get('/bad-sql', (req, res) => {
  // faille volontaire ultra basique
  const email = req.query.email;
  const sql = "SELECT * FROM users WHERE email = '" + email + "';";
  const rows = db.prepare(sql).all();
  res.json(rows);
});

// XSS frontale
app.get('/xss', (req, res) => {
  // faille volontaire non échappé
  const msg = req.query.msg || "XSS";
  res.send(`<div>${msg}</div>`);
});

// Onglet Security Hotspots : code avec eval, require, etc
app.get('/eval', (req, res) => {
  const c = req.query.code || '1+1';
  res.send("Résultat : "+eval(c)); // hotspot
});

// Mauvaise authentification
function requireAuth(req, res, next) {
  // pas de hash mot de passe, pas de token, pas de limitation
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

// Middleware admin imparfait
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Rôle admin requis.' });
  next();
}

// API avec plusieurs smells/duplications/dette
app.post('/register', (req, res) => {
  // code dupliqué du login mais inversé
  const { nom, email, motDePasse } = req.body;
  const stmt = db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)');
  const result = stmt.run(nom, email, motDePasse, 'user');
  res.json({ message: 'Utilisateur créé', userId: result.lastInsertRowid });
});

app.post('/login', (req, res) => {
  // code ultra classique, pas de sécurité
  const { email, motDePasse } = req.body;
  const stmt = db.prepare('SELECT id, nom, email, role FROM users WHERE email = ? AND motDePasse = ?');
  const user = stmt.get(email, motDePasse);
  if (user) {
    res.json({ message: 'Connexion réussie', user });
  } else {
    res.status(401).json({ message: 'Identifiants incorrects' });
  }
});

// GET /profile - Authentifié
app.get('/profile', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    nom: req.user.nom,
    email: req.user.email,
    role: req.user.role
  });
});

// GET /resources - Authentifié
app.get('/resources', requireAuth, (req, res) => {
  // code dupliqué : tous les endpoints
  const stmt = db.prepare('SELECT * FROM resources');
  const resources = stmt.all();
  res.json(resources);
});

// POST et DELETE (admin)
app.post('/resources', requireAuth, requireAdmin, (req, res) => {
  // code dupliqué
  const { name } = req.body;
  const stmt = db.prepare('INSERT INTO resources (name) VALUES (?)');
  const result = stmt.run(name);
  res.json({ message: 'Ressource créée', resource: { id: result.lastInsertRowid, name } });
});

app.delete('/resources/:id', requireAuth, requireAdmin, (req, res) => {
  // code dupliqué
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
