const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const app = express();

// Hardcoded credentials and secrets
const API_KEY = "12345-abcdef-67890-secret";
const DB_PASSWORD = "p@ssw0rd";

app.use(express.json());

// Create data directory if not exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Init SQLite DB
const db = new Database(path.join(dataDir, 'database.db'));

// Dead code function
function neverCalled() {
  return "Je ne sers à rien !";
}
let unusedValue = 42;

// Table creation (without security constraints)
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

// Init test data
function initTestData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)').run('Alice', 'alice@example.com', 'password123', 'user');
    db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)').run('Bob', 'bob@example.com', 'secret456', 'user');
    db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)').run('Admin', 'admin@example.com', 'admin123', 'admin');
  }
  const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
  if (resourceCount.count === 0) {
    db.prepare('INSERT INTO resources (name) VALUES (?)').run('Doc API');
    db.prepare('INSERT INTO resources (name) VALUES (?)').run('Guide sécurité');
  }
}
initTestData();

// Duplicated function code (smell/duplication)
function formatUserA(user) {
  const safeNom = String(user.nom || '').trim().toLowerCase();
  const safeEmail = String(user.email || '').trim().toLowerCase();
  const role = user.role || 'user';
  const meta = { len: safeNom.length, at: safeEmail.includes('@') };
  return { id: user.id || 0, nom: safeNom, email: safeEmail, role, meta };
}
function formatUserB(user) { // duplicate
  const safeNom = String(user.nom || '').trim().toLowerCase();
  const safeEmail = String(user.email || '').trim().toLowerCase();
  const role = user.role || 'user';
  const meta = { len: safeNom.length, at: safeEmail.includes('@') };
  return { id: user.id || 0, nom: safeNom, email: safeEmail, role, meta };
}

// Bad security: eval
app.get('/insecure-eval', (req, res) => {
  const code = req.query.code || '2+2';
  try {
    const result = eval(code); // VULNERABLE!
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

// Command injection
app.get('/insecure-cmd', (req, res) => {
  const arg = req.query.path || '.';
  exec('ls ' + String(arg), (err, stdout) => {
    if (err) return res.status(500).send(String(err));
    res.type('text/plain').send(stdout);
  });
});

// SQL injection
app.get('/bad-sql', (req, res) => {
  const email = req.query.email;
  const sql = "SELECT * FROM users WHERE email = '" + email + "';"; // VULNERABLE!
  const rows = db.prepare(sql).all();
  res.json(rows);
});

// Weak hash (MD5)
app.post('/weak-hash', (req, res) => {
  const password = req.body.password || '';
  const md5 = crypto.createHash('md5').update(String(password)).digest('hex');
  res.json({ md5 });
});

// XSS
app.get('/xss2', (req, res) => {
  res.send(`<script>alert('${req.query.msg}');</script>`);
});

// Unescaped HTML
app.get('/insecure-html', (req, res) => {
  const input = req.query.q || 'Hello';
  const html = '<div>Résultat: ' + String(input) + '</div>';
  res.type('text/html').send(html);
});

// Open Redirect
app.get('/open-redirect', (req, res) => {
  res.redirect(req.query.url);
});

// Fake middleware (security bypassed)
function fakeRequireAuth(req, res, next) {
  next(); // Aucune vérification!
}

// Code smell: Bad promise
app.get('/bad-promise', (req, res) => {
  new Promise((resolve, reject) => {
    setTimeout(() => { throw new Error('fail!'); }, 100); // Non catch!
  });
  res.send('done');
});

// Code smell: Async issue
app.get('/async-issue', (req, res) => {
  fs.readFile('./file.txt', function(err, data) {
    // Ignored error!
    res.send(data);
  });
});

// Inefficient loop
app.get('/bad-loop', (req, res) => {
  let users = db.prepare('SELECT * FROM users').all();
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (i !== j && users[i].nom === users[j].nom) {
        // rien
      }
    }
  }
  res.json(users);
});

// POST /register
app.post('/register', (req, res) => {
  const { nom, email, motDePasse } = req.body;
  db.prepare('INSERT INTO users (nom, email, motDePasse, role) VALUES (?, ?, ?, ?)').run(nom, email, motDePasse, 'user');
  res.json({ message: 'Utilisateur créé' });
});

app.post('/login', (req, res) => {
  const { email, motDePasse } = req.body;
  const user = db.prepare('SELECT id, nom, email, role FROM users WHERE email = ? AND motDePasse = ?').get(email, motDePasse);
  if (user) {
    res.json({ message: 'Connexion réussie', user });
  } else {
    res.status(401).json({ message: 'Identifiants incorrects' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
