# WCS Tracker

Application web installable sur iPhone (PWA) pour suivre mes événements de West Coast Swing :
participation, statuts, actions à faire, dépenses, résultats de compétition, notes des juges
et points WSDC. Tout fonctionne hors ligne et les données restent sur le téléphone.

---

## 1. Mettre l'app en ligne (première fois)

1. Sur [github.com](https://github.com), clique sur **+ → New repository**.
   Nomme-le `wcs-tracker`, choisis **Public**, puis **Create repository**.
2. Sur la page du dépôt, clique sur **uploading an existing file** (ou **Add file → Upload files**).
3. Dans l'Explorateur Windows, ouvre le dossier `wcs-tracker`, sélectionne **tout son contenu**
   (Ctrl + A) et glisse-le dans la page. Il faut glisser le contenu, pas le dossier lui-même :
   `index.html` doit se retrouver à la racine du dépôt.
4. En bas de la page, clique sur **Commit changes**.
5. Va dans **Settings → Pages** :
   - **Source** : *Deploy from a branch*
   - **Branch** : `main`, dossier `/ (root)`, puis **Save**
6. Attends 1 à 2 minutes et recharge la page. L'adresse de l'app s'affiche :
   `https://TON-PSEUDO.github.io/wcs-tracker/`

> Si la liste **Branch** n'affiche que *None*, c'est que les fichiers n'ont pas été enregistrés.
> Recommence l'étape 2 et n'oublie pas **Commit changes**.

## 2. Installer l'app sur l'iPhone

1. Ouvre l'adresse de l'app dans **Safari** (pas Chrome).
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisis **Sur l'écran d'accueil**.
4. Vérifie que **Ouvrir en tant qu'app web** est activé, puis touche **Ajouter**.
5. Ouvre l'app depuis son icône **WCS**, ferme-la, puis rouvre-la : elle est maintenant
   utilisable hors ligne. Tu peux le vérifier dans **Réglages → À propos → Prête pour le hors ligne**.

⚠️ **Utilise toujours l'icône de l'écran d'accueil.** Sur iPhone, Safari et l'app installée ont des
données **séparées** : ce que tu saisis dans un onglet Safari n'apparaît pas dans l'app.

## 3. Premiers réglages

Dans l'onglet **Réglages** :

- **Données d'exemple** : désactive-les pour repartir d'une app vide (tes vraies données ne sont pas touchées).
- **Ma division** : ta division actuelle en Jack & Jill.
- **Points WSDC de départ** : les points déjà obtenus avant d'utiliser l'app (voir ton profil WSDC).
- **Seuils de passage** : à vérifier de temps en temps sur le site du WSDC. Advanced → All-Star :
  60 pts pour pouvoir monter, 90 pour devoir monter.
- **Listes modifiables** : types de pass, niveaux WSDC d'événement, divisions.

## 4. Sauvegarder ses données

Les données sont **uniquement sur l'iPhone**. Si tu supprimes l'app ou changes de téléphone, elles sont perdues
sans sauvegarde.

- **Exporter** : *Réglages → Exporter mes données → Enregistrer dans Fichiers* (de préférence dans iCloud Drive).
- **Importer** : *Réglages → Importer une sauvegarde…* puis choisis le fichier `.json`.
  L'import **remplace** toutes les données de l'app.
- Un bandeau rappelle de sauvegarder si la dernière sauvegarde date de plus de 30 jours.

## 5. Mettre à jour l'app

1. Modifie les fichiers sur ton PC.
2. Sur GitHub : **Add file → Upload files**, glisse à nouveau tout le contenu du dossier, puis **Commit changes**.
3. Attends 2 à 5 minutes, puis ferme complètement l'app sur l'iPhone et rouvre-la (avec du réseau).
   Le numéro de version est visible dans *Réglages → À propos* (constante `APP_VERSION` dans `js/store.js`).

Tes données ne sont pas touchées par une mise à jour.

## 6. Organisation des fichiers

```
index.html              la page unique de l'app
manifest.webmanifest    nom, icône, couleurs de l'app installée
sw.js                   service worker : copie des fichiers pour le hors ligne
icons/                  icônes de l'app
css/app.css             tout le style (mode clair et sombre)
js/app.js               démarrage et navigation entre les écrans
js/db.js                lecture/écriture dans la base de l'iPhone (IndexedDB)
js/store.js             données en mémoire, calculs, sauvegarde, version de l'app
js/format.js            dates, euros, nombres à la française
js/labels.js            textes affichés (statuts, catégories, critères…)
js/ui.js                outils partagés (fiches, sélecteur de saison…)
js/charts.js            graphiques (SVG, sans bibliothèque)
js/sample-data.js       données d'exemple
js/views/               un fichier par écran ou formulaire
```

**Si tu ajoutes un nouveau fichier JavaScript**, ajoute-le aussi à la liste `APP_FILES` dans `sw.js`,
sinon il ne sera pas disponible hors ligne.

## 7. Tester sur le PC (facultatif)

Les modules JavaScript ne fonctionnent pas en ouvrant `index.html` directement (double-clic).
Il faut un petit serveur local, par exemple l'extension **Live Server** de VS Code
(clic droit sur `index.html` → *Open with Live Server*). Le mode hors ligne ne se teste que sur
l'adresse GitHub Pages (HTTPS).
