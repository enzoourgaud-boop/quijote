# Molinos y gigantes

Un jeu vidéo pour réviser l'espagnol en 5e (niveau A1) sur la séquence **« Presentarse con Don Quijote »**. C'est un « roguelike » : on avance sur une carte, on affronte des créatures en répondant en espagnol, on ramasse des objets, et chaque partie est différente.

**L'histoire.** Un mago a ensorcelé La Mancha : les livres volent, les fromages roulent, les moulins ressemblent à des géants. L'élève accompagne don Quijote du pueblo jusqu'au Toboso. Chaque ennemi vaincu redevient ce qu'il est *en realidad* : *¡No es un gigante, es un molino!*

- **Durée :** une partie dure 15 à 25 minutes ; une **partie courte** dure 8 à 10 minutes, pour une fin de séance.
- **Appareils :** le jeu fonctionne dans le navigateur, sur les PC du collège, les tablettes et les téléphones.
- **Vie privée :** il n'y a **ni serveur, ni compte élève, ni publicité**. Aucune donnée ne quitte l'appareil.
- **Hors ligne :** une fois chargé, le jeu fonctionne **sans connexion** et peut s'installer comme une application.

Le jeu reprend le moteur d'*El Camino de Cempasúchil* (même fonctionnement, mêmes règles de combat). Seuls changent le contenu, l'univers et les visuels.

> **Où en est le projet.** Étape 1 (le jeu complet) validée et sur `main`. Étape 2 (la partie courte) sur la branche `etape-2-partie-courte`, captures dans [`docs/etape-2/`](docs/etape-2/). Conception : [`docs/CONCEPTION.md`](docs/CONCEPTION.md). Points à valider : [`docs/A_VERIFIER.md`](docs/A_VERIFIER.md).

---

## Sommaire

1. [Mettre le jeu en ligne](#1-mettre-le-jeu-en-ligne)
2. [Jouer](#2-jouer)
3. [Utiliser le jeu en classe](#3-utiliser-le-jeu-en-classe)
4. [L'espace professeur](#4-lespace-professeur)
5. [Modifier ou ajouter des questions](#5-modifier-ou-ajouter-des-questions)
6. [D'où vient le contenu](#6-doù-vient-le-contenu)
7. [Confidentialité et RGPD](#7-confidentialité-et-rgpd)
8. [Accessibilité](#8-accessibilité)
9. [Pour aller plus loin (lancer le jeu sur ton ordinateur, tests)](#9-pour-aller-plus-loin)
10. [Licences](#10-licences)

---

## 1. Mettre le jeu en ligne

Le jeu est hébergé gratuitement par **GitHub Pages**, à l'adresse :

**`https://enzoourgaud-boop.github.io/quijote/`**

Tu n'as à le faire **qu'une seule fois** :

1. Sur la page du dépôt (github.com/enzoourgaud-boop/quijote), ouvre l'onglet **Settings** (Paramètres).
2. Dans le menu de gauche, choisis **Pages**.
3. Dans **Build and deployment → Source**, choisis **GitHub Actions**.

Ensuite, chaque modification envoyée sur la branche `main` met le site à jour toute seule, en 2 à 3 minutes. L'onglet **Actions** montre l'avancement :

- **pastille verte ✓** : le site est à jour ;
- **pastille rouge ✗** : clique dessus pour lire l'erreur. Le plus souvent, c'est une faute dans un fichier de questions (une virgule ou un guillemet). **Le site en ligne ne change pas tant qu'il y a une erreur** : les élèves gardent la version précédente, qui fonctionne.

Tu peux donner l'adresse aux élèves, ou en faire un QR code. Le plus simple : l'espace professeur fabrique un code de classe avec son QR code (partie 4).

> **Note.** El Camino de Cempasúchil est à la même adresse de base (`enzoourgaud-boop.github.io`). Les deux jeux rangent leurs données séparément : jouer à l'un n'efface rien dans l'autre.

---

## 2. Jouer

1. **Profil :** chaque élève crée un profil, avec un pseudo et un avatar. Le jeu conseille un surnom plutôt que le vrai nom.
2. **Personnage :** l'élève choisit son personnage. Au début, seul Sancho Panza est disponible ; Antonia Quijana et Aldonza Lorenzo se débloquent en jouant.
3. **La carte :** trois actes, *El pueblo*, *Los molinos* et *El Toboso*. Dans chacun, l'élève choisit son chemin entre des combats, des rencontres, une boutique, un repos *En casa* et des coffres. Chaque acte se termine par un jefe : *El Gran Libro*, *El Gigante*, puis *El Mago*.
4. **Les combats :**
   - une bonne réponse blesse l'ennemi ;
   - une erreur le laisse agir (attaque, vol, bouclier…), et son intention est annoncée à l'avance ;
   - une réponse écrite, ou une phrase remise dans l'ordre, frappe plus fort ;
   - un accent oublié donne « ¡Casi! » : ni dégât, ni point.
5. **Les questions :** sept formes différentes : QCM, réponse écrite, vrai/faux, phrase à remettre en ordre, association mot / image, placement des personnages sur la carte de La Mancha (« qui vit où ? »), écoute.
6. **Partie courte :** sur l'accueil, « Durée de la partie » → **Partie courte**. Les trois actes sont raccourcis (un combat, un repos, le jefe) et les jefes sont moins résistants : la partie dure 8 à 10 minutes, et l'élève rencontre quand même les trois jefes.
7. **Les objets** viennent de la séquence. Les aides *Léxico* et *Ayuda* rappellent les encadrés du manuel ; *¡Fíjate!*, *Queso*, *Escudo*… Parmi les reliques : Rocinante, Rucio, *la lanza*, *la ficha de identidad*…

---

## 3. Utiliser le jeu en classe

- **Code de classe :** donne aux élèves le code de 6 caractères de l'espace professeur, ou fais-leur scanner le QR code projeté. Ils le tapent dans « Code de classe » sur l'écran d'accueil, et tes réglages s'appliquent : thèmes, types de questions, chrono, part d'écrit, accents.
- **Défi de classe :** avec une **graine** (ex. `MOLINO-42`), toute la classe joue la même carte. C'est pratique pour comparer ou corriger ensemble.
- **Fin de partie :** l'élève obtient un **code** (ex. `HC8BA-351GA-HMQ00-W9S0`) et un QR code, qui résument son résultat et les notions à revoir. Il te le montre ou le recopie, et tu le décodes dans l'espace professeur.
- **Les erreurs reviennent : les « páginas perdidas ».**
  - Une question ratée arrache une page du livre de don Quijote.
  - Elle revient plus tard dans la même partie, puis **au début de la partie suivante**, dans un court échauffement sans chrono (4 questions au plus).
  - Elle revient tant qu'elle n'est pas réussie. Chaque page retrouvée rend 1 PV.
  - Le compteur 📄 en haut de l'écran indique combien de pages attendent.
  - L'écran **« Mon carnet »** montre à chaque élève ses notions fragiles.
- **Chrono : désactivé par défaut.** Tu peux l'activer pour la classe dans l'espace professeur. L'élève peut le couper à tout moment dans les Options ⚙️, même au milieu d'un combat ; il se met en pause quand le panneau d'Options est ouvert.
- **Progression :**
  - 3 personnages à débloquer ;
  - 42 cartes à collectionner dans l'album (chaque ennemi avec ce qu'il *parece* et ce qu'il est *en realidad*) ;
  - 19 succès ;
  - des *Niveles de caballero* qui rendent le jeu plus difficile après chaque victoire.
- **Sans connexion :** une fois le jeu ouvert avec Internet, il fonctionne hors ligne.
  - Sur ordinateur (Chrome ou Edge), il peut s'**installer** : icône ⊕ dans la barre d'adresse.
  - Sur iPad ou iPhone : bouton **Partager → Sur l'écran d'accueil**.
  - Sur Android : menu **⋮ → Installer l'application**.
- **Au vidéoprojecteur :** bouton ⚙️ en haut à droite → **Taille du texte → Vidéoprojecteur**.

---

## 4. L'espace professeur

Pour y accéder : en bas de l'écran d'accueil, clique sur **« Espace professeur »**, ou ajoute `#prof` à la fin de l'adresse du jeu.

**Code d'accès par défaut : `profe2026`.** Change-le dès la première fois (onglet « Réglages de classe »). Ce n'est pas une vraie protection : il évite seulement qu'un élève modifie la banque par erreur.

| Onglet | Ce qu'on y fait |
|---|---|
| **Réglages de classe** | Choisir les thèmes et les types de questions. Activer ou couper le chrono, régler sa durée. Régler la part de réponses écrites. Décider de l'accent oublié : « ¡Casi! », juste ou faux. Fixer une graine. Le jeu donne un **code de classe**, un lien et un QR code. |
| **Questions** | Rechercher, filtrer, **activer ou désactiver** une question d'un clic, la **modifier** ou en **créer** une. L'éditeur vérifie tout pendant la saisie. |
| **Import / export** | Exporter la banque en **CSV** (pour Excel ou LibreOffice) ou en JSON. Réimporter après modification : le jeu dit ce qui est nouveau, modifié ou invalide, avec le numéro de ligne. Un bouton permet de revenir à la banque d'origine. |
| **Codes élèves** | Coller les codes de fin de partie (un par ligne, avec un prénom devant si tu veux). Le jeu affiche le résultat de chacun et les **notions les plus ratées de la classe**. |
| **Séquence** | Exporter ou importer une séquence complète. |

Les quatre thèmes de la banque sont :

- **Vocabulario** : objets, animaux, lieux, personnes, adjectifs, lexique de la vidéo, alphabet et Ñ ;
- **Conjugación** : ser, estar, tener, verbes réguliers, *me gusta / me gustan* ;
- **Presentarse** : se présenter, présenter quelqu'un, mots interrogatifs, fiche d'identité, nombres ;
- **Personajes y textos** : compréhension de tes textes, La Mancha, Cervantes, la scène de théâtre.

⚠️ Les modifications faites dans l'espace professeur restent **sur l'appareil où tu les fais**. Pour que **tous les élèves** en profitent, envoie-les sur GitHub (partie suivante).

---

## 5. Modifier ou ajouter des questions

Les questions sont dans le dossier `content/sequences/quijote/questions/`, un fichier par thème ou par type :

| Fichier | Contenu |
|---|---|
| `vocabulario.json` | vocabulaire (QCM et mots codés) |
| `conjugacion.json` | conjugaison (dont tes exercices 1 et 2) |
| `presentarse.json` | se présenter, présenter quelqu'un, fiche d'identité, nombres |
| `personajes.json` | compréhension des textes |
| `vrai-faux.json`, `ordre.json`, `association.json`, `escenas.json`, `ecoute.json` | les autres types |

### Méthode 1 : avec l'espace professeur (conseillée)

1. Dans l'espace professeur, onglet **Questions**, crée ou modifie tes questions. L'éditeur t'empêche de faire une erreur.
2. Onglet **Import / export** → **« Mes ajouts et modifications »** : tu obtiens le fichier `professeur.json`.
3. Sur github.com, ouvre ton dépôt, puis le dossier `content/sequences/quijote/questions/`.
4. **Add file → Upload files**, glisse `professeur.json`, puis clique sur **Commit changes**.
5. Deux minutes plus tard, le jeu en ligne est à jour pour tout le monde. L'onglet **Actions** indique ✓ ou ✗.

> Les questions de `professeur.json` **remplacent** les questions d'origine qui ont le même identifiant (`id`). Tu peux donc modifier une question existante sans toucher à son fichier d'origine.

### Méthode 2 : dans un tableur

1. Exporte la banque en **CSV**.
2. Modifie-la dans Excel ou LibreOffice : une ligne = une question.
3. **Réimporte le CSV dans l'espace professeur**. Le jeu vérifie chaque ligne.
4. Termine par la méthode 1, étapes 2 à 5.

Deux règles pour le tableur :

- dans les cellules, les listes (distracteurs, réponses acceptées) sont séparées par `|` ;
- la colonne `avance` sert aux types particuliers (phrase à ordonner, association, scène) : laisse-la telle quelle.

### Méthode 3 : directement sur GitHub

Ouvre un fichier `.json` sur github.com, clique sur le crayon ✏️, modifie, puis **Commit changes**. Attention aux virgules et aux guillemets : en cas d'erreur, la pastille d'Actions devient rouge et le site garde l'ancienne version.

### Activer une question « à vérifier »

Quatre questions s'appuient sur des informations absentes de tes documents. Elles sont créées **désactivées** :

- le nom civil de don Quijote ;
- sa nationalité ;
- le mot *justicia* ;
- « Rocinante es el caballo de don Quijote ».

Pour en activer une, il y a deux moyens :

- dans l'espace professeur, onglet **Questions** : filtre sur « désactivées », puis active-la d'un clic ;
- dans le fichier JSON : supprime la ligne `"disabled": true`.

La liste complète est dans [`docs/A_VERIFIER.md`](docs/A_VERIFIER.md).

### Les champs d'une question

| Champ | Rôle | Exemple |
|---|---|---|
| `id` | identifiant unique (minuscules, chiffres, tirets) | `pers-burro-nombre` |
| `type` | `qcm`, `ecrit`, `ecoute`, `vrai-faux`, `ordre`, `association`, `scene` | `qcm` |
| `theme` | `vocabulario`, `conjugacion`, `identidad` (Presentarse), `personajes` | `personajes` |
| `level` | `1`, `2`, `3` ou `"jefe"` (questions du jefe final) | `1` |
| `notions` | notions travaillées (liste dans `sequence.json`) | `["personajes"]` |
| `prompt` | énoncé ; `___` pour un trou | `¿Cómo se llama el burro de Sancho?` |
| `answer` | bonne réponse (plusieurs trous : `es / está`) | `Rucio` |
| `accept` | autres réponses acceptées | `["50 años", "cincuenta"]` |
| `distractors` | mauvaises réponses du QCM (au moins 3) | `["Rocinante", "Toboso", "Quijano"]` |
| `writable` | peut aussi être posée à l'écrit | `true` |
| `translation` | traduction (aide Léxico) | `Comment s’appelle l’âne de Sancho ?` |
| `explanation` | correction expliquée en français | `Es un burro: se llama Rucio.` |
| `source` | document de la séquence : `intro`, `dq1`, `dq2`, `conjugacion`, `dulcinea` | `dq2` |
| `disabled` | `true` pour retirer la question sans l'effacer | `true` |

**Correction tolérante :**

- les majuscules, la ponctuation et les espaces ne comptent pas ;
- le pronom sujet est facultatif (*Tienes un burro* = *Tú tienes un burro*) ;
- les articles sont facultatifs en vocabulaire ;
- un accent ou un tilde oublié donne « ¡Casi! ».

**Vérifier la banque :** la commande `npm run valider` (partie 9) contrôle tout : champs manquants, doublons, réponse présente parmi les distracteurs, références inconnues. GitHub la lance automatiquement à chaque envoi.

---

## 6. D'où vient le contenu

- Toutes les questions viennent de tes cinq documents :
  - les enquêtes (mots codés, phrases en désordre) ;
  - « Don Quijote de la Mancha » (Ayuda, fiche d'identité, Observa) ;
  - « ¿Quién es él?, ¿y ella? » ;
  - l'exercice ser / estar / tener ;
  - « ¡Hermosa Dulcinea! ».
- Leur texte est transcrit dans [`sources/contenu-sequence.md`](sources/contenu-sequence.md). **Les PDF ne sont jamais publiés** : le fichier `.gitignore` les exclut du dépôt.
- Chaque question indique sa source (champ `source`) et a une correction expliquée.
- Tout ce qui ne vient pas de tes documents est listé dans [`docs/A_VERIFIER.md`](docs/A_VERIFIER.md) : corrigés établis, règles formulées, noms inventés, traductions.

---

## 7. Confidentialité et RGPD

- **Aucune donnée personnelle n'est collectée.** Il n'y a ni compte, ni serveur, ni statistiques, ni cookies publicitaires.
- **Aucun appel réseau vers un service tiers.** Les polices, les sons (générés par le navigateur) et les QR codes sont produits sur l'appareil.
- La progression (profil, album, carnet) est enregistrée **uniquement dans le navigateur** de l'appareil (« stockage local »). Un bouton permet de supprimer un profil.
- Si le navigateur bloque le stockage (navigation privée…), le jeu fonctionne quand même et prévient que la progression ne sera pas gardée.
- Le **code de fin de partie** ne contient que le résultat, la date et les notions ratées : ni pseudo, ni identifiant.
- La voix des questions d'écoute est celle installée sur l'appareil, sans envoi de données. Sans voix espagnole, la phrase s'affiche quelques secondes à la place.

---

## 8. Accessibilité

Le bouton ⚙️ en haut à droite propose :

- **Taille du texte** : normal, grand, vidéoprojecteur ;
- **Police adaptée à la dyslexie** (OpenDyslexic) ;
- **Réduire les animations**, appliqué automatiquement si l'appareil le demande (réglage « réduire les animations » du système) ;
- **Pages qui volent** sur l'accueil : les afficher ou non ;
- **Effets sonores** (générés par le navigateur) avec réglage du volume. Il n'y a pas de musique ;
- **Chrono** : désactivé par défaut, activable.

On joue entièrement **au clavier** :

- **Tab** pour passer d'un élément à l'autre, **Entrée** pour valider ;
- touches **1 à 4** pour les QCM, **V / F** pour le vrai/faux ;
- **flèches** pour déplacer une étiquette dans les phrases à remettre dans l'ordre.

L'information n'est jamais donnée par la seule couleur : chaque thème a son nom écrit, chaque intention d'ennemi son icône et son texte. Les textes de l'interface sont en français ; le contenu à apprendre est en espagnol, et marqué comme tel pour les lecteurs d'écran.

---

## 9. Pour aller plus loin

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
| `npm test` | tests automatiques (correction des réponses, accents, réponses acceptées, équilibrage, codes…) |
| `npm run test:e2e` | un robot joue une partie entière dans un vrai navigateur (ordinateur et téléphone), teste l'espace professeur, le code de classe, le hors-ligne et le clavier |
| `npm run equilibrage` | simule des centaines de parties : taux de victoire et durée selon le niveau des élèves |
| `npm run build` | construit le site dans le dossier `dist/` (à déposer chez n'importe quel hébergeur) |

Les captures d'écran d'une étape se refont avec :

```bash
CAPTURES=docs/etape-1 npx playwright test captures --trace off
```

---

## 10. Licences

- **Polices** : Atkinson Hyperlegible, Pixelify Sans, Press Start 2P et OpenDyslexic, toutes sous licence libre SIL OFL, intégrées au jeu.
- **Bibliothèques** : Preact (MIT), zod (MIT), qrcode-generator (MIT), Workbox (MIT).
- **Visuels** : ils sont originaux (pixel art, CSS, dessins SVG faits pour le jeu) ou proviennent des emoji du système. Aucune illustration du manuel ni aucune œuvre existante n'est reprise : don Quijote, Sancho et les autres personnages de Cervantes (1605, domaine public) sont dessinés pour le jeu.
- **Sons** : ils sont générés par le navigateur (Web Audio). Il n'y a aucun fichier audio et aucune musique.
