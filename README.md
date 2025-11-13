# API REST Non Sécurisée (POC Pédagogique)1

⚠️ **ATTENTION** : Cette API est volontairement non sécurisée pour des fins pédagogiques. Ne pas utiliser en production.

## Installation

```bash
npm init -y
npm i express better-sqlite3
```

## Analyse avec SonarQube

Pour que l’application soit détectée et analysée par SonarQube, la configuration est déjà prête dans `sonar-project.properties`.

### Prérequis
- Un serveur SonarQube accessible, par exemple `http://localhost:9000` (Docker: `sonarqube:lts-community`).
- Un token utilisateur SonarQube avec droits d’analyse.
- Le binaire SonarScanner installé sur votre machine ou via Docker.

### Installer SonarScanner (macOS)
- `brew install sonar-scanner`

### Lancer l’analyse (CLI)
- `SONAR_HOST_URL=http://localhost:9000 SONAR_LOGIN=<VOTRE_TOKEN> npm run sonar`

### Lancer l’analyse (Docker)
- `docker run --rm -e SONAR_HOST_URL=http://localhost:9000 -e SONAR_LOGIN=<VOTRE_TOKEN> -v "$(pwd)":/usr/src sonarsource/sonar-scanner-cli`

### Configuration clés (déjà en place)
- `sonar.projectKey=api-devops-insecure`
- `sonar.sources=.`
- `sonar.inclusions=**/*.js`
- `sonar.exclusions=node_modules/**,data/**,duplicates/**,obsolete/**,**/*.md,**/*.sh`
- `sonar.host.url=http://localhost:9000`

Si vous utilisez SonarCloud, remplacez `sonar.host.url` par `https://sonarcloud.io` et ajoutez `sonar.organization=<votre_organisation>`. Le token reste requis.

Après l’exécution, le projet apparaîtra dans SonarQube avec les métriques et règles JavaScript appliquées.

### Détection des duplications (exemple fourni)
- Des fichiers de code volontairement identiques ont été ajoutés dans `duplicates/` (`util_duplicate_a.js` et `util_duplicate_b.js`).
- La configuration Sonar inclut désormais ce dossier pour que les duplications soient détectées.
- Après l’analyse, consultez dans SonarQube:
  - Projet → Code → Duplications
  - Projet → Issues → Filter `Type: Code Smell` et `Tags: duplication`

Si besoin d’augmenter la duplication, dupliquez des blocs de 10–20 lignes ou plus dans plusieurs fichiers `.js`. SonarQube identifie les blocs répétés sur la base de tokens, pas uniquement ligne-à-ligne.

## Lancement

### Option 1 : Lancement local

```bash
node server.js
# ou
npm start
```

Le serveur démarre sur `http://localhost:3001`

La base de données SQLite sera créée automatiquement dans le dossier `data/` au premier lancement avec des données de test.

### Option 2 : Lancement avec Docker

#### Prérequis
- Docker installé
- Docker Compose installé (optionnel)

#### Construction et lancement avec Docker

```bash
# Construire l'image Docker
docker build -t api-devsecops .

# Lancer le conteneur
docker run -d -p 3001:3001 -v $(pwd)/data:/app/data --name api-devsecops api-devsecops
```

#### Lancement avec Docker Compose (recommandé)

```bash
# Lancer l'application
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter l'application
docker-compose down
```

Le serveur démarre sur `http://localhost:3001`

La base de données SQLite sera persistée dans le dossier `data/` sur votre machine locale.

### Réinitialiser la base de données

**Lancement local :**
```bash
npm run reset-db
# puis redémarrer le serveur
npm start
```

**Avec Docker :**
```bash
# Arrêter le conteneur
docker-compose down

# Supprimer le dossier data
rm -rf data/

# Redémarrer
docker-compose up -d
```

## Données de test

### Utilisateurs pré-enregistrés

Les utilisateurs suivants sont créés automatiquement au premier lancement :

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| alice@example.com | password123 | user |
| bob@example.com | secret456 | user |
| admin@example.com | admin123 | admin |

### Ressources de test

Les ressources suivantes sont créées automatiquement :

- Documentation API
- Guide de sécurité
- Manuel utilisateur
- Rapport technique

## Rôles et contrôles d'accès

L'API utilise deux rôles (sans système de tokens) :
- **Public** : Accès sans authentification
- **Authentifié** : Nécessite email/password dans les headers (rôle `user` ou `admin`)
- **Admin** : Nécessite email/password avec le rôle `admin` dans les headers

| Route | Méthode | Rôle requis |
|-------|---------|-------------|
| `/register` | POST | Public |
| `/login` | POST | Public |
| `/profile` | GET | Authentifié |
| `/resources` | GET | Authentifié |
| `/resources` | POST | Admin |
| `/resources/:id` | DELETE | Admin |

## Routes disponibles

### POST /register - Public
Crée un nouvel utilisateur (rôle par défaut: `user`).

**Requête :**
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"nom":"John Doe","email":"john@example.com","motDePasse":"password123"}'
```

### POST /login - Public
Vérifie les identifiants de l'utilisateur (pas de token généré).

**Requête :**
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","motDePasse":"password123"}'
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "nom": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### GET /profile - Authentifié
Retourne les informations de l'utilisateur (email/password dans les headers).

**Requête :**
```bash
curl -X GET http://localhost:3001/profile \
  -H "x-email: alice@example.com" \
  -H "x-password: password123"
```

### GET /resources - Authentifié
Liste toutes les ressources disponibles (email/password dans les headers).

**Requête :**
```bash
curl -X GET http://localhost:3001/resources \
  -H "x-email: alice@example.com" \
  -H "x-password: password123"
```

### POST /resources - Admin
Ajoute une nouvelle ressource (rôle admin requis, email/password dans headers ou body).

**Requête :**
```bash
curl -X POST http://localhost:3001/resources \
  -H "Content-Type: application/json" \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123" \
  -d '{"name":"Ma ressource"}'
```

### DELETE /resources/:id - Admin
Supprime une ressource par son ID (rôle admin requis, email/password dans headers).

**Requête :**
```bash
curl -X DELETE http://localhost:3001/resources/1 \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123"
```

## Exemple complet d'utilisation

### Test avec un utilisateur standard (user)

```bash
# 1. Se connecter avec Alice (user)
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","motDePasse":"password123"}'

# 2. Voir le profil (email/password dans headers)
curl -X GET http://localhost:3001/profile \
  -H "x-email: alice@example.com" \
  -H "x-password: password123"

# 3. Lister les ressources (authentifié)
curl -X GET http://localhost:3001/resources \
  -H "x-email: alice@example.com" \
  -H "x-password: password123"

# 4. Essayer de créer une ressource (échouera - admin requis)
curl -X POST http://localhost:3001/resources \
  -H "Content-Type: application/json" \
  -H "x-email: alice@example.com" \
  -H "x-password: password123" \
  -d '{"name":"Ressource 1"}'
# Réponse: {"message":"Accès refusé. Rôle admin requis."}
```

### Test avec un administrateur (admin)

```bash
# 1. Se connecter avec Admin
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","motDePasse":"admin123"}'

# 2. Créer une ressource (admin)
curl -X POST http://localhost:3001/resources \
  -H "Content-Type: application/json" \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123" \
  -d '{"name":"Nouvelle ressource"}'

# 3. Lister les ressources
curl -X GET http://localhost:3001/resources \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123"

# 4. Supprimer une ressource (admin)
curl -X DELETE http://localhost:3001/resources/1 \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123"
```

### Script de test rapide

Un script de test est disponible pour tester rapidement l'API :

```bash
chmod +x test-api.sh
./test-api.sh
```

Ou exécutez directement :

```bash
bash test-api.sh
```

## Tests avec Postman

### Import de la collection

Une collection Postman complète est disponible dans le fichier `API_DEVSECOPS.postman_collection.json`.

**Pour l'importer :**
1. Ouvrez Postman
2. Cliquez sur **Import** (en haut à gauche)
3. Sélectionnez le fichier `API_DEVSECOPS.postman_collection.json`
4. La collection sera importée avec toutes les requêtes pré-configurées

La collection inclut des variables d'environnement que vous pouvez modifier selon vos besoins.

### Configuration de base

**URL de base :** `http://localhost:3001`

### 1. POST /register - Créer un utilisateur

**Méthode :** `POST`  
**URL :** `http://localhost:3001/register`  
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "nom": "John Doe",
  "email": "john@example.com",
  "motDePasse": "password123"
}
```

**Réponse attendue (200) :**
```json
{
  "message": "Utilisateur créé",
  "userId": 4
}
```

---

### 2. POST /login - Vérifier les identifiants

**Méthode :** `POST`  
**URL :** `http://localhost:3001/login`  
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "email": "alice@example.com",
  "motDePasse": "password123"
}
```

**Réponse attendue (200) :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "nom": "Alice Dupont",
    "email": "alice@example.com",
    "role": "user"
  }
}
```

**Test avec admin :**
```json
{
  "email": "admin@example.com",
  "motDePasse": "admin123"
}
```

---

### 3. GET /profile - Obtenir le profil utilisateur

**Méthode :** `GET`  
**URL :** `http://localhost:3001/profile`  
**Headers :**
```
x-email: alice@example.com
x-password: password123
```

**Réponse attendue (200) :**
```json
{
  "id": 1,
  "nom": "Alice Dupont",
  "email": "alice@example.com",
  "role": "user"
}
```

**Test avec admin :**
```
x-email: admin@example.com
x-password: admin123
```

**Erreur si identifiants manquants (401) :**
```json
{
  "message": "Email et mot de passe requis"
}
```

---

### 4. GET /resources - Lister toutes les ressources

**Méthode :** `GET`  
**URL :** `http://localhost:3001/resources`  
**Headers :**
```
x-email: alice@example.com
x-password: password123
```

**Réponse attendue (200) :**
```json
[
  {
    "id": 1,
    "name": "Documentation API"
  },
  {
    "id": 2,
    "name": "Guide de sécurité"
  },
  {
    "id": 3,
    "name": "Manuel utilisateur"
  },
  {
    "id": 4,
    "name": "Rapport technique"
  }
]
```

**Erreur si non authentifié (401) :**
```json
{
  "message": "Email et mot de passe requis"
}
```

---

### 5. POST /resources - Créer une ressource (Admin uniquement)

**Méthode :** `POST`  
**URL :** `http://localhost:3001/resources`  
**Headers :**
```
Content-Type: application/json
x-email: admin@example.com
x-password: admin123
```

**Body (raw JSON) :**
```json
{
  "name": "Nouvelle ressource"
}
```

**Réponse attendue (200) :**
```json
{
  "message": "Ressource créée",
  "resource": {
    "id": 5,
    "name": "Nouvelle ressource"
  }
}
```

**Test avec utilisateur standard (doit échouer) :**
```
x-email: alice@example.com
x-password: password123
```

**Erreur si rôle insuffisant (403) :**
```json
{
  "message": "Accès refusé. Rôle admin requis."
}
```

---

### 6. DELETE /resources/:id - Supprimer une ressource (Admin uniquement)

**Méthode :** `DELETE`  
**URL :** `http://localhost:3001/resources/1`  
**Headers :**
```
x-email: admin@example.com
x-password: admin123
```

**Réponse attendue (200) :**
```json
{
  "message": "Ressource supprimée"
}
```

**Erreur si ressource non trouvée (404) :**
```json
{
  "message": "Ressource non trouvée"
}
```

**Erreur si rôle insuffisant (403) :**
```json
{
  "message": "Accès refusé. Rôle admin requis."
}
```

---

## Collection Postman

### Scénario de test complet

1. **Créer un utilisateur**
   - POST `/register` avec un nouvel utilisateur

2. **Se connecter avec un utilisateur standard**
   - POST `/login` avec `alice@example.com` / `password123`
   - Vérifier la réponse

3. **Obtenir le profil**
   - GET `/profile` avec headers `x-email` et `x-password`

4. **Lister les ressources (user)**
   - GET `/resources` avec headers d'authentification
   - Doit réussir

5. **Tenter de créer une ressource (user)**
   - POST `/resources` avec headers d'utilisateur standard
   - Doit échouer avec 403

6. **Se connecter en tant qu'admin**
   - POST `/login` avec `admin@example.com` / `admin123`

7. **Créer une ressource (admin)**
   - POST `/resources` avec headers d'admin
   - Doit réussir

8. **Lister les ressources (admin)**
   - GET `/resources` avec headers d'admin
   - Vérifier que la nouvelle ressource apparaît

9. **Supprimer une ressource (admin)**
   - DELETE `/resources/:id` avec headers d'admin
   - Doit réussir

### Variables d'environnement Postman (optionnel)

Créez un environnement Postman avec ces variables :

```
base_url: http://localhost:3001
user_email: alice@example.com
user_password: password123
admin_email: admin@example.com
admin_password: admin123
```

Puis utilisez-les dans vos requêtes :
- URL : `{{base_url}}/resources`
- Headers : `x-email: {{user_email}}`

## Vulnérabilités intentionnelles

- ❌ Mots de passe stockés en clair dans SQLite
- ❌ Aucune validation des entrées
- ❌ Pas de contraintes de base de données (UNIQUE, NOT NULL, etc.)
- ❌ Pas de protection CORS/Helmet/rate-limit
- ❌ Pas de système de tokens (email/password envoyés à chaque requête)
- ❌ Authentification basique sans chiffrement (email/password en clair dans les headers)
- ❌ Contrôle d'accès basé sur les rôles minimal (pas de gestion fine des permissions)
- ❌ Pas de logs de sécurité
- ❌ Gestion d'erreurs minimale
- ❌ Base de données SQLite sans schéma de sécurité
- ❌ Vérification de rôles basique (pas de protection contre la manipulation)

