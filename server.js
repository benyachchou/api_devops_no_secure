/* ************************************************************ */
/*  APP À TITRE PÉDAGOGIQUE – NE JAMAIS DÉPLOYER EN PRODUCTION  */
/* ************************************************************ */

const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

/* ---------- helpers ---------- */
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'database.db'));

/* ---------- schéma ---------- */
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

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/* ---------- données de test ---------- */
function initTestData() {
  for (let r = 0; r < 3; r++) {
    if (db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0) {
      const ins = db.prepare('INSERT INTO users (nom,email,motDePasse,role) VALUES (?,?,?,?)');
      ins.run('Alice Dupont', 'alice@example.com', 'password123', 'user');
      ins.run('Bob Martin', 'bob@example.com', 'secret456', 'user');
      ins.run('Admin', 'admin@example.com', 'admin123', 'admin');
    }
    if (db.prepare('SELECT COUNT(*) as c FROM resources').get().c === 0) {
      const ins = db.prepare('INSERT INTO resources (name) VALUES (?)');
      ['Doc API', 'Guide sécu', 'Manuel', 'Rapport'].forEach(n => ins.run(n));
    }
  }
}
initTestData();

/* ---------- middlewares miniatures ---------- */
function requireAuth(req, res, next) {
  const email = req.headers['x-email'] || req.body.email;
  const pwd = req.headers['x-password'] || req.body.motDePasse;
  if (!email || !pwd) return res.status(401).json({ message: 'Email et mot de passe requis' });
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND motDePasse = ?').get(email, pwd);
  if (!user) return res.status(401).json({ message: 'Identifiants incorrects' });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Rôle admin requis' });
  next();
}

/* ============================================================
   DÉBUT – DUPLICATIONS & CODE SMELLS POUR SONARQUBE
   ============================================================ */

// 1) Codes morts
function dead001(){ return 0; }
function dead002(){ return 1; }
function dead003(){ return 2; }
let unused001 = 123;
let unused002 = "foo";
let unused003 = true;

// 2) Quatre copies strictement identiques
function formatUser001(u) { return { id: u.id, nom: u.nom, ok: u.email }; }
function formatUser002(u) { return { id: u.id, nom: u.nom, ok: u.email }; }
function formatUser003(u) { return { id: u.id, nom: u.nom, ok: u.email }; }
function formatUser004(u) { return { id: u.id, nom: u.nom, ok: u.email }; }

// 3) Complexité cyclomatique artificielle
function megaIf(flag) {
  if (flag === 1) return 'a';
  if (flag === 2) return 'b';
  if (flag === 3) return 'c';
  if (flag === 4) return 'd';
  if (flag === 5) return 'e';
  if (flag === 6) return 'f';
  if (flag === 7) return 'g';
  if (flag === 8) return 'h';
  if (flag === 9) return 'i';
  if (flag === 10) return 'j';
  return 'z';
}

// 4) Non-strict equality
function compare(a, b) {
  if (a == b) return true;   // SONAR : Use ===
  return false;
}

// 5) Promise non catchée
function noCatch() {
  Promise.resolve().then(() => { throw new Error('oups'); });
}

// 6) require dynamique (Security Hotspot)
function dynamicRequire(name) {
  return require(name); // ⚠️
}

/* ============================================================
   FIN – DUPLICATIONS & CODE SMELLS
   ============================================================ */

/* ---------- vulnérabilités pédagogiques ---------- */

// 1) SQL Injection classique
app.get('/bad-sql', (req, res) => {
  const email = req.query.email || '';
  const sql = `SELECT * FROM users WHERE email = '${email}';`; // ⚠️
  try {
    const rows = db.prepare(sql).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) XSS réfléchi
app.get('/xss', (req, res) => {
  const msg = req.query.msg || 'XSS';
  res.send(`<div>${msg}</div>`); // ⚠️
});

// 3) Eval (Remote Code Execution)
app.get('/eval', (req, res) => {
  const code = req.query.code || '1+1';
  try {
    res.send('Résultat : ' + eval(code)); // ⚠️
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// 4) Path traversal simple
app.get('/read', (req, res) => {
  const file = req.query.file || 'README.md';
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  res.type('text/plain').send(content);
});

// 5) Open redirect
app.get('/redirect', (req, res) => {
  const url = req.query.url || '/';
  res.redirect(url); // ⚠️
});

// 6) Authentification par « token » prévisible
app.post('/login', (req, res) => {
  const { email, motDePasse } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND motDePasse = ?').get(email, motDePasse);
  if (!user) return res.status(401).json({ message: 'KO' });
  const token = Buffer.from(user.id + '-' + user.email).toString('base64'); // ⚠️
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);
  res.json({ token });
});

// 7) IDOR
app.get('/users/:id/profile', (req, res) => {
  const user = db.prepare('SELECT id,nom,email,role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'Non trouvé' });
  res.json(user);
});

// 8) XSS stocké
app.post('/comments', requireAuth, (req, res) => {
  const { message } = req.body;
  db.prepare('INSERT INTO comments (user_id,message) VALUES (?,?)').run(req.user.id, message);
  res.json({ message: 'Commentaire ajouté' });
});
app.get('/comments', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, u.nom, c.message, c.created_at
    FROM comments c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
  `).all();
  let html = '<h3>Commentaires</h3><ul>';
  rows.forEach(r => { html += `<li><b>${r.nom}</b> : ${r.message} <i>(${r.created_at})</i></li>`; });
  html += '</ul>';
  res.send(html);
});

// 9) Command injection
app.get('/nslookup', (req, res) => {
  const domain = req.query.domain || 'example.com';
  const { exec } = require('child_process');
  exec(`nslookup ${domain}`, (err, stdout) => {
    if (err) return res.status(500).send(err.message);
    res.type('text/plain').send(stdout);
  });
});

/* ---------- routes normales ---------- */
app.post('/register', (req, res) => {
  const { nom, email, motDePasse } = req.body;
  const stmt = db.prepare('INSERT INTO users (nom,email,motDePasse,role) VALUES (?,?,?,?)');
  const info = stmt.run(nom, email, motDePasse, 'user');
  res.json({ message: 'Utilisateur créé', userId: info.lastInsertRowid });
});

app.get('/profile', requireAuth, (req, res) => res.json(req.user));

app.get('/resources', requireAuth, (req, res) => res.json(db.prepare('SELECT * FROM resources').all()));
app.post('/resources', requireAuth, requireAdmin, (req, res) => {
  const { name } = req.body;
  const info = db.prepare('INSERT INTO resources (name) VALUES (?)').run(name);
  res.json({ message: 'Ressource créée', resource: { id: info.lastInsertRowid, name } });
});
app.delete('/resources/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ message: 'Introuvable' });
  res.json({ message: 'Supprimé' });
});

/* ---------- lancement ---------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🎯 Vulnérabilités & smells dispos sur http://localhost:${PORT}`));
