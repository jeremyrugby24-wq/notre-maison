# Activer « Sonner à la maison »

GitHub Pages sert le tableau de bord. La sonnette utilise un relais Node.js accessible en HTTPS pour transmettre les notifications Web Push. Déployer relay.cjs et package.json sur un hébergeur Node avec stockage persistant. Installer les dépendances avec npm install et démarrer avec npm start.

- Générer une paire VAPID avec npx web-push generate-vapid-keys.
- Définir VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_CONTACT (mailto:votre-adresse).
- Définir BELL_KEY avec un secret aléatoire d’au moins 24 caractères, par exemple avec openssl rand -hex 24.
- Définir DATA_DIR sur le chemin du stockage persistant. Définir DASHBOARD_ORIGIN si le site change de domaine.
- Dans « Configurer la sonnette », saisir l’adresse HTTPS du relais et le code privé sur chacun des appareils. Garder le code et la clé privée hors du dépôt GitHub.
- Sur la tablette Android, ouvrir le tableau de bord avec Chrome, puis choisir « Activer sur cette tablette ». Accepter les notifications et vérifier qu’elles ont un son.
- Verrouiller la tablette. Depuis chacun des deux téléphones, envoyer un message et vérifier que le texte et le son arrivent. Une tablette peut être enregistrée à la fois.

L’arrosage est enregistré sur chaque navigateur et les échéances sont visibles sur l’accueil.
