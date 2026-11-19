# El Camino de Cempasúchil

> **Nouveau jeu en préparation : « Molinos y gigantes »** (séquence *Presentarse con Don Quijote*, 5e, A1). Ce dépôt part d'El Camino de Cempasúchil, dont il garde le moteur. Étape 0 : la proposition est dans [`docs/CONCEPTION.md`](docs/CONCEPTION.md), la transcription des documents dans [`sources/contenu-sequence.md`](sources/contenu-sequence.md), les points à valider dans [`docs/A_VERIFIER.md`](docs/A_VERIFIER.md). Jusqu'à l'étape 1, la suite de ce README décrit encore El Camino.

Un jeu vidéo pour réviser l'espagnol en 5e (niveau A1-A2) sur la séquence **Día de Muertos**. C'est un « roguelike » : on avance sur une carte, on affronte des créatures en répondant en espagnol, on ramasse des pouvoirs, et chaque partie est différente. Une partie dure 15 à 20 minutes, la durée d'une fin de cours.

- Il fonctionne dans le navigateur, sur les PC du collège, les tablettes et les téléphones.
- Il n'y a **ni serveur, ni compte élève, ni publicité**. Aucune donnée ne quitte l'appareil.
- Une fois chargé, il fonctionne **sans connexion** et peut s'installer comme une application.

---

## Sommaire

1. [Mettre le jeu en ligne (gratuit, pas à pas)](#1-mettre-le-jeu-en-ligne-gratuit-pas-à-pas)
2. [Utiliser le jeu en classe](#2-utiliser-le-jeu-en-classe)
3. [L'espace professeur](#3-lespace-professeur)
4. [Modifier ou ajouter des questions](#4-modifier-ou-ajouter-des-questions)
5. [Préparer une autre séquence](#5-préparer-une-autre-séquence)
6. [Confidentialité et RGPD](#6-confidentialité-et-rgpd)
7. [Accessibilité](#7-accessibilité)
8. [Pour aller plus loin (lancer le jeu sur ton ordinateur, tests)](#8-pour-aller-plus-loin)
9. [Licences](#9-licences)

---

## 1. Mettre le jeu en ligne (gratuit, pas à pas)

On utilise **GitHub Pages** : un hébergement gratuit pour les sites comme celui-ci. Compte 20 minutes la première fois. Ensuite, chaque modification se met en ligne toute seule.

### Étape A : créer un compte GitHub

1. Va sur <https://github.com/signup> et crée un compte (adresse e-mail et mot de passe).
2. Choisis bien ton **pseudo** : il apparaîtra dans l'adresse du jeu (`https://ton-pseudo.github.io/…`).

### Étape B : installer GitHub Desktop

GitHub Desktop est une application avec des boutons : pas besoin de taper des commandes.

1. Télécharge-la sur <https://desktop.github.com> et installe-la.
2. Ouvre-la et connecte-toi avec ton compte GitHub (*Sign in to GitHub.com*).

### Étape C : envoyer le jeu sur GitHub

1. Dans GitHub Desktop : menu **File → Add local repository…**, puis choisis le dossier `camino-cempasuchil`.
   - Si l'application propose *create a repository*, accepte.
2. Clique sur **Publish repository** (en haut).
   - **Nom** : par exemple `camino-cempasuchil`.
   - **Décoche** « Keep this code private ». GitHub Pages gratuit demande un dépôt public. Tes PDF de cours ne sont **pas** envoyés : ils sont exclus exprès par le fichier `.gitignore`.
3. Clique sur **Publish repository**. C'est envoyé.

> **Solution de secours sans GitHub Desktop :** sur <https://github.com/new>, crée un dépôt public vide. Ensuite, sur la page du dépôt : **Add file → Upload files**, et glisse le **contenu** du dossier (pas le dossier lui-même). ⚠️ Vérifie qu'il y a bien le dossier `.github` : certains navigateurs ignorent les dossiers dont le nom commence par un point. S'il manque, recrée le fichier à la main : **Add file → Create new file**, nom `.github/workflows/deploy.yml`, et colle le contenu du même fichier de ton dossier.

### Étape D : activer la mise en ligne

1. Sur la page de ton dépôt sur github.com, ouvre l'onglet **Settings** (Paramètres).
2. Dans le menu de gauche, choisis **Pages**.
3. Dans **Build and deployment → Source**, choisis **GitHub Actions**.
4. Ouvre l'onglet **Actions** du dépôt. Une tâche « Mettre le jeu en ligne » tourne pendant 2 ou 3 minutes.
   - Si elle ne démarre pas toute seule, clique dessus puis sur **Run workflow**.
5. Quand la pastille devient **verte ✓**, le jeu est en ligne à l'adresse `https://ton-pseudo.github.io/camino-cempasuchil/`.

Tu peux donner cette adresse aux élèves, ou en faire un QR code. Le plus simple : l'espace professeur fabrique un lien de classe avec son QR code (voir plus bas).

> Si la pastille est **rouge ✗** : clique dessus pour lire l'erreur. Le plus souvent, c'est une faute dans un fichier de questions (une virgule ou un guillemet). **Le site en ligne n'est pas modifié tant qu'il y a une erreur** : les élèves gardent la version précédente, qui fonctionne.

**Autre hébergeur.** Le jeu marche aussi sur Netlify ou sur n'importe quel hébergement de fichiers : il suffit d'y déposer le contenu du dossier `dist` produit par `npm run build` (voir la partie 8).

---

## 2. Utiliser le jeu en classe

- **Premier lancement** : chaque élève crée un **profil** (un pseudo et un avatar). Le jeu conseille un surnom plutôt que le vrai nom. Sur un PC partagé, chaque élève choisit son profil : la progression de chacun est séparée.
- **Code de classe** : donne aux élèves le code de 6 caractères de l'espace professeur (ou fais-leur scanner le QR code projeté). Ils le tapent dans « Code de classe » sur l'écran d'accueil. Tes réglages s'appliquent : thèmes, types de questions, chrono, etc.
- **Défi de classe** : avec une **graine** (ex. `VELA-12`), toute la classe joue la même carte. C'est pratique pour comparer ou corriger ensemble.
- **Fin de partie** : l'élève obtient un **code** (ex. `HC8BA-351GA-HMQ00-W9S0`) et un QR code qui résument son résultat et les notions à revoir. Il te le montre ou le recopie, et tu le décodes dans l'espace professeur.
- **Les erreurs reviennent (« almas pendientes »)** : une question ratée devient une petite âme qui suit l'élève. Elle revient plus tard dans la même partie, puis **au début de la partie suivante** dans un court échauffement (4 questions au plus, sans chrono). Chaque âme libérée (question réussie) donne +1 PV. Le compteur 👻 en haut de l'écran indique combien attendent. L'écran **« Mon carnet »** montre à chaque élève ses notions fragiles.
- **Chrono** : il peut être coupé à tout moment depuis les Options ⚙️, même au milieu d'un combat, et il se met en pause quand le panneau d'Options est ouvert.
- **Progression** : il y a 3 personnages à débloquer, 42 cartes de lotería à collectionner, 19 succès, et un « Nivel de Calavera » qui rend le jeu plus difficile après chaque victoire.
- **Sans connexion** : une fois le jeu ouvert avec Internet, il fonctionne hors ligne.
  - Sur ordinateur (Chrome ou Edge), il peut s'**installer** : icône ⊕ dans la barre d'adresse.
  - Sur iPad ou iPhone : bouton **Partager → Sur l'écran d'accueil**.
  - Sur Android : menu **⋮ → Installer l'application**.
- **Au vidéoprojecteur** : bouton ⚙️ en haut à droite → **Taille du texte → Vidéoprojecteur**.

---

## 3. L'espace professeur

Pour y accéder : en bas de l'écran d'accueil, clique sur **« Espace professeur »**, ou ajoute `#prof` à la fin de l'adresse du jeu.

**Code d'accès par défaut : `profe2026`.** Change-le dès la première fois (onglet « Réglages de classe »). Ce n'est pas une vraie protection : il évite seulement qu'un élève modifie la banque par erreur.

| Onglet | Ce qu'on y fait |
|---|---|
| **Réglages de classe** | Thèmes, types de questions, chrono (activé ou non, durée), part de réponses écrites, accent oublié (« ¡Casi! », juste ou faux), graine. Le jeu donne un **code de classe**, un lien et un QR code. |
| **Questions** | Rechercher, filtrer, **activer ou désactiver** une question d'un clic, la **modifier** ou en **créer** une. L'éditeur vérifie tout pendant la saisie. |
| **Import / export** | Exporter la banque en **CSV** (pour Excel ou LibreOffice) ou en JSON. Réimporter après modification : le jeu dit ce qui est nouveau, modifié ou invalide (avec le numéro de ligne). Un bouton permet de revenir à la banque d'origine. |
| **Codes élèves** | Coller les codes de fin de partie (un par ligne, avec un prénom devant si tu veux). Le jeu affiche le résultat de chacun et les **notions les plus ratées de la classe**. |
| **Séquence** | Exporter ou importer une séquence complète (voir la partie 5). |

⚠️ Les modifications faites dans l'espace professeur restent **sur l'appareil où tu les fais**. Pour que **tous les élèves** en profitent, envoie-les sur GitHub (partie suivante).

---

## 4. Modifier ou ajouter des questions

Les questions sont dans le dossier `content/sequences/dia-de-muertos/questions/`, un fichier par type ou par thème : `vocabulario.json`, `cultura.json`, `vrai-faux.json`, etc.

### Méthode 1 : avec l'espace professeur (conseillée)

1. Dans l'espace professeur, onglet **Questions**, crée ou modifie tes questions. L'éditeur t'empêche de faire une erreur.
2. Onglet **Import / export** → **« Mes ajouts et modifications »** : tu obtiens le fichier `professeur.json`.
3. Sur github.com, ouvre ton dépôt, puis le dossier `content/sequences/dia-de-muertos/questions/`.
4. **Add file → Upload files**, glisse `professeur.json`, puis clique sur **Commit changes**.
5. Deux minutes plus tard, le jeu en ligne est à jour pour tout le monde. L'onglet **Actions** indique ✓ ou ✗.

> Les questions de `professeur.json` **remplacent** les questions d'origine qui ont le même identifiant (`id`) : tu peux donc modifier une question existante sans toucher à son fichier d'origine. Pour mettre à jour tes modifications plus tard, exporte à nouveau et remplace le fichier.

### Méthode 2 : dans un tableur

Exporte la banque en **CSV**, modifie-la dans Excel ou LibreOffice (une ligne = une question), puis **réimporte le CSV dans l'espace professeur**. Le jeu vérifie chaque ligne. Termine par la méthode 1, étapes 2 à 5.

- Dans les cellules, les listes (distracteurs, réponses acceptées) sont séparées par `|`.
- La colonne `avance` sert aux types particuliers (phrase à ordonner, association, scène) : laisse-la telle quelle.

### Méthode 3 : directement sur GitHub

Ouvre un fichier `.json` sur github.com, clique sur le crayon ✏️, modifie, puis **Commit changes**. Attention aux virgules et aux guillemets : en cas d'erreur, la pastille d'Actions devient rouge et le site garde l'ancienne version.

### Les champs d'une question

| Champ | Rôle | Exemple |
|---|---|---|
| `id` | identifiant unique (minuscules, chiffres, tirets) | `cult-posada` |
| `type` | `qcm`, `ecrit`, `ecoute`, `vrai-faux`, `ordre`, `association`, `scene` | `qcm` |
| `theme` | `vocabulario`, `conjugacion`, `gramatica`, `cultura` | `cultura` |
| `level` | `1`, `2`, `3` ou `"jefe"` (questions du jefe final) | `3` |
| `notions` | notions travaillées (liste dans `sequence.json`) | `["cultura-catrina"]` |
| `prompt` | énoncé ; `___` pour un trou | `¿Quién creó la Catrina?` |
| `answer` | bonne réponse (plusieurs trous : `es / está`) | `José Guadalupe Posada` |
| `accept` | autres réponses acceptées | `["Posada"]` |
| `distractors` | mauvaises réponses du QCM (au moins 3) | `["Frida Kahlo", …]` |
| `writable` | peut aussi être posée à l'écrit | `true` |
| `translation` | traduction (pouvoir Traductor) | `Qui a créé la Catrina ?` |
| `explanation` | règle ou explication en français | `Fue creada por…` |
| `source` | document de la séquence (liste dans `sequence.json`) | `p3-catrina` |
| `disabled` | `true` pour retirer la question sans l'effacer | `true` |

**Correction tolérante** : les majuscules, la ponctuation et les espaces ne comptent pas. Le pronom sujet est facultatif. Les articles sont facultatifs en vocabulaire. Un accent oublié donne « ¡Casi! ». Tout cela se règle par thème dans `sequence.json`, ou dans l'espace professeur.

**Vérifier la banque** : la commande `npm run valider` (partie 8) contrôle tout : champs manquants, doublons, réponse présente parmi les distracteurs, références inconnues. GitHub la lance automatiquement à chaque envoi.

Les informations culturelles qui ne venaient pas des documents de cours sont listées dans [`docs/A_VERIFIER.md`](docs/A_VERIFIER.md).

---

## 5. Préparer une autre séquence

Le moteur du jeu ne connaît rien du Día de Muertos. Tout ce qui est propre à la séquence est rangé dans `content/sequences/dia-de-muertos/` :

| Fichier | Contenu |
|---|---|
| `sequence.json` | titre, textes, thèmes, notions, sources, actes, carte, personnages, noms des salles |
| `questions/*.json` | les questions |
| `enemies.json` | ennemis, comportements, phrases des cartes de lotería |
| `items.json`, `synergies.json` | pouvoirs et ensembles de reliques |
| `events.json` | événements en espagnol |
| `scenes.json` | décors et objets des questions « scène » |

Pour une nouvelle séquence (la Navidad, la Semana Santa…), copie ce dossier sous un autre nom, change les textes et les questions, puis indique le nouveau dossier dans `src/content/load.ts` (ligne `SEQUENCE_ID`). L'onglet **Séquence** de l'espace professeur permet aussi d'exporter et d'importer une séquence complète pour la tester sur un appareil.

---

## 6. Confidentialité et RGPD

- **Aucune donnée personnelle n'est collectée.** Il n'y a ni compte, ni serveur, ni statistiques, ni cookies publicitaires.
- **Aucun appel réseau vers un service tiers.** Les polices, les sons (générés par le navigateur) et les QR codes sont produits sur l'appareil.
- La progression (profil, cartes, carnet) est enregistrée **uniquement dans le navigateur** de l'appareil (« stockage local »). Un bouton permet de supprimer un profil.
- Si le navigateur bloque le stockage (navigation privée…), le jeu fonctionne quand même et prévient que la progression ne sera pas gardée.
- Le **code de fin de partie** ne contient que le résultat, la date et les notions ratées : ni pseudo, ni identifiant.
- La voix de la compréhension orale est celle du navigateur (`speechSynthesis`), sans envoi de données.

---

## 7. Accessibilité

Le bouton ⚙️ en haut à droite propose :

- **Taille du texte** : normal, grand, vidéoprojecteur ;
- **Police adaptée à la dyslexie** (OpenDyslexic) ;
- **Réduire les animations**, appliqué automatiquement si l'appareil le demande (réglage « réduire les animations » du système) ;
- **Pétales qui tombent** : les afficher ou non ;
- **Effets sonores** (générés par le navigateur) avec réglage du volume ;
- **Chrono** : on peut le désactiver.

On joue entièrement **au clavier** :

- **Tab** pour passer d'un élément à l'autre, **Entrée** pour valider ;
- touches **1 à 4** pour les QCM, **V / F** pour le vrai/faux ;
- **flèches** pour déplacer une étiquette dans les phrases à remettre dans l'ordre.

Les textes de l'interface sont en français ; le contenu à apprendre est en espagnol, et marqué comme tel pour les lecteurs d'écran.

---

## 8. Pour aller plus loin

Il faut [Node.js](https://nodejs.org) (version 20 ou plus). Dans un terminal, depuis le dossier du jeu :

```bash
npm install
```

```bash
npm run dev
```

Puis ouvre l'adresse affichée (en général <http://localhost:5173>).

| Commande | Rôle |
|---|---|
| `npm run dev` | lance le jeu en local (mode développement) |
| `npm run valider` | vérifie toute la banque de questions |
| `npm test` | tests automatiques (correction des réponses, générateur aléatoire, équilibrage, codes…) |
| `npm run test:e2e` | un robot joue une partie entière dans un vrai navigateur, teste l'espace professeur, le lien de classe et le hors-ligne |
| `npm run equilibrage` | simule des centaines de parties : taux de victoire et durée selon le niveau des élèves |
| `npm run build` | construit le site dans le dossier `dist/` (à déposer chez n'importe quel hébergeur) |

Documents techniques : [`docs/CONCEPTION.md`](docs/CONCEPTION.md) (conception et décisions) et `docs/reference/` (prototype d'origine).

---

## 9. Licences

- **Polices** : Sancreek, Atkinson Hyperlegible, Pixelify Sans, Press Start 2P et OpenDyslexic, toutes sous licence libre SIL OFL, intégrées au jeu.
- **Bibliothèques** : Preact (MIT), zod (MIT), qrcode-generator (MIT), Workbox (MIT).
- **Visuels** : ils sont originaux (pixel art, CSS, SVG) ou proviennent des emoji du système. Aucune image de *Coco* ni de Pixar n'est utilisée.
- **Sons** : ils sont générés par le navigateur (Web Audio). Aucun fichier audio.
