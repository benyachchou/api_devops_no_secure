#!/bin/bash

echo "=== Test de l'API REST Non Sécurisée (sans tokens) ==="
echo ""

echo "1. Test avec un utilisateur standard (Alice - user) :"
echo "   Se connecter avec Alice..."
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","motDePasse":"password123"}'
echo -e "\n"

echo "2. Voir le profil d'Alice (authentifié avec email/password dans headers) :"
curl -X GET http://localhost:3001/profile \
  -H "x-email: alice@example.com" \
  -H "x-password: password123"
echo -e "\n"

echo "3. Lister les ressources avec Alice (authentifié) :"
curl -X GET http://localhost:3001/resources \
  -H "x-email: alice@example.com" \
  -H "x-password: password123"
echo -e "\n"

echo "4. Essayer de créer une ressource avec Alice (doit échouer - admin requis) :"
curl -X POST http://localhost:3001/resources \
  -H "Content-Type: application/json" \
  -H "x-email: alice@example.com" \
  -H "x-password: password123" \
  -d '{"name":"Ressource créée par user"}'
echo -e "\n"

echo "5. Test avec un administrateur (admin) :"
echo "   Se connecter avec Admin..."
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","motDePasse":"admin123"}'
echo -e "\n"

echo "6. Créer une ressource avec Admin (admin) :"
curl -X POST http://localhost:3001/resources \
  -H "Content-Type: application/json" \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123" \
  -d '{"name":"Ressource créée par admin"}'
echo -e "\n"

echo "7. Lister toutes les ressources avec Admin :"
curl -X GET http://localhost:3001/resources \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123"
echo -e "\n"

echo "8. Supprimer une ressource avec Admin (admin) :"
curl -X DELETE http://localhost:3001/resources/1 \
  -H "x-email: admin@example.com" \
  -H "x-password: admin123"
echo -e "\n"

echo "=== Tests terminés ==="

