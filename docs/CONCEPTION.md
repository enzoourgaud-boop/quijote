# Molinos y gigantes : document de conception

*Étape 0, proposition du 19/11/2026. Rien n'est codé : j'attends ta validation (section 12).*

Nouveau jeu construit à partir du moteur d'« El Camino de Cempasúchil » (dépôt Ddm, branche `main`). Contenu : uniquement tes cinq documents, transcrits dans [`sources/contenu-sequence.md`](../sources/contenu-sequence.md). Ce qui n'en vient pas est listé dans [`A_VERIFIER.md`](A_VERIFIER.md).

## En une page

**L'idée.** Tes documents contiennent eux-mêmes le ressort du jeu : *Sancho « siempre explica a don Quijote cómo es el mundo en realidad »*, et don Quijote croit qu'*« un mago te hace parecer una simple aldeana »*. Dans le jeu, un **mago** a ensorcelé La Mancha : un livre vole, un fromage roule, un moulin *parece* un gigante. L'élève est l'**escudero** de don Quijote. Ses phrases en espagnol sont ses seules armes. Bien parler, c'est montrer le monde *en realidad*.

**La forme.** Un roguelike de cartes, sur le modèle de la version 2 que tu as validée pour Ddm. À chaque tour, l'ennemi annonce en espagnol ce qu'il va faire. L'élève a trois cartes en main et **en joue une**. Chaque carte est un geste de langue avec un effet propre.

- **Conjuguer, c'est viser.** *Yo tengo un escudo* me protège, *Tú tienes un escudo* protège don Quijote, *Él está cansado* affaiblit l'ennemi. Le sujet choisit la cible : c'est le tableau *yo / tú / él* de ta fiche, transformé en décision tactique.
- **Comprendre, c'est désenchanter.** Lire un indice et dire ce qu'est l'ennemi *en realidad* (*No es un gigante, es un molino*) lui ôte sa protection.
- **Se présenter, c'est s'affirmer.** Les phrases de présentation (*Soy Sancho Panza, el escudero*) donnent du courage à toute l'équipe. Contre le mago final, qui demande *¿Quién eres?*, savoir se présenter devient l'arme décisive.
- **Présenter quelqu'un, c'est recruter.** On rencontre le galgo, Antonia, Rucio… En remplissant correctement leur fiche d'identité d'après un court texte, on les fait entrer dans sa compagnie.
- **Décoder, c'est ouvrir.** Les coffres sont fermés par un mot codé avec l'alphabet espagnol (ton Enquête 1, avec le Ñ).

**Ce qui est gardé.** Toute la technique d'El Camino : hors ligne, aucune donnée personnelle, correction tolérante avec « ¡Casi! », sept types de questions, retour des erreurs, espace professeur, code de classe, QR code, codes de fin de partie, tests, mise en ligne automatique.

**Ce qui change.** Le contenu (tout), l'univers visuel et sonore (tout, avec une musique originale), le combat (cartes et cibles), les ennemis, les objets, les événements. S'y ajoutent une partie courte et un chrono désactivé par défaut.

---

## 1. Règles de conception

1. **L'espagnol produit l'effet.** Si on peut remplacer l'espagnol par du calcul mental sans rien changer au jeu, la mécanique est à refaire.
2. **Un choix à chaque tour**, avec une information pour décider : l'intention de l'ennemi, écrite en espagnol.
3. **Rien que la séquence.** Questions, cartes et corrections n'utilisent que la langue de tes documents (inventaire en section 6 de la transcription). Seul l'habillage (noms d'ennemis, histoire) peut en sortir, et il est alors listé dans `A_VERIFIER.md`.
4. **L'erreur coûte un tour, pas la partie.** Une carte ratée ne fait rien. La correction s'affiche, et la question revient plus tard.
5. **Tout tient à l'écran**, sans défiler, sur un PC de collège (1366 × 768), une tablette et un téléphone (360 × 640).
6. **Une nouveauté à la fois.** Les premiers combats présentent les familles de cartes une par une.

---

## 2. Univers

### 2.1 Histoire (affichée en français, répliques en espagnol)

> Dans un pueblo de la Mancha vit don Quijote. Il aime les livres (*Me gustan los libros*) et il n'aime pas les géants (*No me gustan los gigantes*). Un matin, tout est ensorcelé : un mago fait passer les choses pour des monstres. Les moulins *parecen* des gigantes, les livres s'envolent, les fromages roulent. Don Quijote saisit sa lance. Toi, tu es son escudero : tu sais voir le monde *en realidad*. Accompagne-le du pueblo jusqu'au Toboso, où se cache le mago.

Trois actes, trois lieux de tes documents :

| Acte | Lieu | Ambiance | Niveau des questions |
|---|---|---|---|
| I | **El pueblo** (le village de don Quijote) | maisons blanches, la casa de don Quijote | 1 |
| II | **Los molinos** (les plaines de La Mancha) | champs dorés, moulins, grand ciel | 2 |
| III | **El Toboso** (le village de Dulcinea) | soir orangé, petit théâtre ambulant | 3 |

**Fin** : le mago vaincu, la région redevient « réelle ». Phrase de victoire : *¡No es un gigante, es un molino!*

### 2.2 Personnages jouables

Tous viennent de tes documents. L'écran de choix est une **fiche d'identité** en espagnol, que l'élève lit (premier geste de la séquence).

| Personnage | Fiche (d'après les documents) | Style de jeu | Débloqué |
|---|---|---|---|
| **Sancho Panza**, el escudero | Vive en un pueblo de la Mancha. Es realista y sencillo. Tiene un burro: Rucio. | « Verdad » : désenchanter, voir les intentions | dès le départ |
| **Antonia Quijana**, la sobrina | Tiene veinte años. Vive con don Quijote. | « Palabra » : soigner, protéger, conjuguer | après avoir battu le jefe de l'acte I |
| **Aldonza Lorenzo** (Dulcinea) | Vive en el Toboso. Es joven. *¡No soy princesa!* | « Presentación » : rythme (*¡Tenemos prisa!* : jouer deux cartes) | après une première victoire |

**Don Quijote** (sur Rocinante) accompagne toujours l'élève. Il a ses propres PV et il annonce lui aussi son geste en espagnol (*¡Tengo mi lanza!* ⚔ 2). C'est à lui que l'élève parle quand il dit **tú**.

### 2.3 Visuels

- **Pixel art original**, dans la continuité de la scène « console portable » d'El Camino, qui plaît. Personnages, ennemis, décors et icônes sont dessinés pour le jeu.
- **Aucun emprunt** : ni l'affiche de Néstor Alonso, ni les cartes illustrées du manuel, ni la photo de théâtre, ni les don Quichotte célèbres (Doré, Daumier, Picasso). Don Quijote, Sancho, Dulcinea, Rocinante et Rucio sont des personnages de 1605, du domaine public et sujets mêmes de ta séquence : je les dessine moi-même. *Décision 2.*
- **Palette** : ocre et jaune paille des plaines, blanc des moulins et des maisons, bleu de ciel, terre brune ; violet nuit pour le mago. Les contrastes du texte seront contrôlés (norme d'accessibilité WCAG AA).
- **Icônes dessinées** pour l'âne, le moulin, la lance, etc. Les emoji récents (comme 🫏) n'existent pas sur les vieux PC.
- Sur l'accueil, des **pages de livre** volent au vent (le canvas des pétales d'El Camino, redessiné). Elles s'arrêtent avec « réduire les animations ».
- Police de titre : une police libre (licence OFL) au style ancien, intégrée au jeu. Les textes gardent Atkinson Hyperlegible, et OpenDyslexic en option.

### 2.4 Musique et sons

- **Musique originale composée pour le jeu**, jouée par le navigateur (Web Audio), sans aucun fichier ni emprunt : quatre courtes boucles (accueil, carte, combat, mago), dans une couleur « guitare et castagnettes ».
- **Coupée par défaut**, activable en un clic. Vingt-cinq tablettes qui jouent en même temps dans une salle, c'est trop. *Décision 6.*
- Effets sonores d'El Camino gardés et retouchés : bonne réponse, coup, bouclier, page retrouvée, désenchantement.

---

## 3. Le combat : l'espagnol comme mécanique

### 3.1 Le tour (15 à 20 secondes)

```
1. L'ennemi annonce       « El Libro Volador lee un libro. »  📖 → ⚔ 6 au prochain tour
   Don Quijote annonce    « ¡Tengo mi lanza! »  ⚔ 2
2. Tu as 3 cartes         🗡 La lanza    💬 ESTAR · cansado    👁 ¡En realidad!
3. Tu en joues UNE        (touche 1, 2 ou 3)
4. Tu fais le geste       la carte s'ouvre : c'est le défi en espagnol
5. L'effet se joue        sur la scène, sous tes yeux
6. Don Quijote, puis l'ennemi, agissent
```

- **L'ennemi agit à chaque tour**, que l'élève réponde juste ou non. Un très bon élève doit donc aussi se défendre et choisir.
- **Une carte ratée ne fait rien.** La correction reste affichée jusqu'à « Compris ». Une bonne réponse n'appelle aucun clic « Continuer » : l'effet se joue et la main suivante arrive.
- À la fin du tour, on repioche jusqu'à 3 cartes. Une carte gardée en main peut servir plus tard.
- **Deux équipiers** : l'élève (≈ 20 PV) et don Quijote (≈ 12 PV). L'ennemi annonce qui il vise. Si don Quijote tombe à 0, *está cansado* : il ne joue plus jusqu'à la fin du combat et repart au combat suivant avec la moitié de ses PV. La partie s'arrête seulement si l'élève tombe à 0. *Valeurs réglées par simulation.*

### 3.2 Quatre familles de cartes, une par thème de la banque

Chaque famille se reconnaît à son **icône, son nom et sa couleur**, jamais à la couleur seule.

| Famille | Thème de la banque | Rôle | Geste de langue |
|---|---|---|---|
| 🗡 **Lanza** | Vocabulario | attaquer, bloquer | nommer, reconnaître un mot (image, oral, écrit) |
| 💬 **Palabra** | Conjugación | soigner, protéger, affaiblir, viser | conjuguer ser / estar / tener et les verbes réguliers, au singulier |
| 👁 **Verdad** | Personajes y textos | désenchanter, révéler | comprendre tes textes, distinguer *parecer* et *en realidad* |
| 🎭 **Presentación** | Identidad | donner du courage, renforcer don Quijote | se présenter, présenter quelqu'un, mots interrogatifs |

Le défi d'une carte est tiré dans la banque de son thème, avec tous les types de questions possibles. L'effet, lui, dépend de la carte.

### 3.3 Palabra : le sujet choisit la cible

Tes documents n'enseignent que le singulier : il y a donc exactement **trois cibles**.

| Sujet | Cible | Pourquoi |
|---|---|---|
| **yo** | moi (l'escudero) | |
| **tú** | don Quijote (je lui parle) | comme dans ta fiche : *Don Quijote, tú eres un caballero* ; *Sancho, ¿tú tienes un burro?* |
| **él / ella** | l'ennemi | *él* pour el Gigante, *ella* pour la Lanza : le pronom suit le nom |

Jouer une carte Palabra se fait en deux gestes :

1. **Choisir le sujet** (touche 1, 2 ou 3). La cible correspondante s'entoure d'un cadre et d'une flèche, avec son nom écrit.
2. **Conjuguer** : *Tú ____ un escudo.* → *tengo / tienes / tiene*. C'est exactement ton exercice 2 (« entoure la bonne forme »). En réponse écrite, c'est ton exercice 1.

Les effets suivent le sens de la phrase. **Se tromper de sujet a des conséquences** : *Él come queso* soigne l'ennemi. Le jeu le montre et explique pourquoi (« *él* = l'ennemi »). C'est la meilleure leçon possible sur le sens des pronoms.

| Carte | Phrase (exemple avec *tú*) | Effet sur la cible | Source |
|---|---|---|---|
| TENER · un escudo | Tú tienes un escudo. | bouclier de 4 | Ayuda, exercice 1 |
| COMER · queso | Tú comes queso. | rend 4 PV | exercice 2 |
| ESTAR · cansado | Él está cansado. | la cible frappe 3 de moins ce tour-ci | exercice 1 |
| SER · simpático | Él es simpático. | la cible renonce à sa prochaine action méchante (une fois par combat) | exercice 1 |
| SER · un caballero | Tú eres un caballero. | +2 aux attaques de la cible pour le combat | exercice 1 |
| LEER · un libro | Tú lees un libro. | *yo* : je pioche 2 cartes ; *tú* : la prochaine attaque de don Quijote est doublée ; *él* : l'ennemi prépare une grosse attaque (à éviter) | exercice 2, intro |
| TENER · prisa | Yo tengo prisa. | *yo* : je joue une deuxième carte ; *tú* : don Quijote frappe deux fois ; *él* : l'ennemi agit deux fois (à éviter) | dialogue de Dulcinea |

Chaque combinaison carte × sujet est une **vraie question de la banque**. Le professeur peut donc la voir, la modifier et la désactiver comme les autres, et une erreur revient comme les autres.

### 3.4 Verdad : *parecer* et *en realidad*

Chaque ennemi est un objet ensorcelé. Sa barre de vie est son **encantamiento**. Quand elle tombe à 0, l'ennemi redevient ce qu'il est vraiment, avec une phrase : *¡No es un libro volador, es un libro!*

Les ennemis forts portent une **máscara** ✨ : tant qu'elle tient, les cartes Lanza ne font que demi-dégâts. Pour la briser, il faut une carte Verdad réussie. Le défi est alors propre à l'ennemi : un indice en espagnol tiré de tes textes, et il faut dire ce qu'il est *en realidad*.

> *Parece un caballo. Es la montura modesta de Sancho Panza. Se llama Rucio.* → **Es un burro.**

Les autres cartes Verdad révèlent les trois prochaines intentions (*¿Quién es?*) ou rendent la prochaine attaque de don Quijote critique (*El mundo en realidad* : Sancho lui explique ce qu'il a devant lui).

### 3.5 Presentación : se présenter pour s'affirmer

- *¡Me presento!* : remettre en ordre ou écrire *Soy Sancho Panza, el escudero* (dialogue de Dulcinea). Bouclier de 2, et +1 à l'effet de toutes tes cartes jusqu'à la fin du combat.
- *Os presento a don Quijote* : présenter quelqu'un (*Este es el caballero don Quijote de la Mancha*). Don Quijote +2 pour le combat.
- *¿Cómo te llamas?* : trouver le bon mot interrogatif (*¿Quién / Cómo / Dónde / Cuántos…?*). L'ennemi « doit répondre » et perd son tour.

### 3.6 Les intentions ennemies, en espagnol

Toujours une **phrase courte et une icône**, avec la cible écrite. Aux niveaux de difficulté élevés, l'icône disparaît : il faut lire.

| Intention | Phrase (exemple) | Bonnes réponses possibles |
|---|---|---|
| Attaque | *Ataca a don Quijote.* ⚔ 3 | *Tú tienes un escudo*, *Él está cansado*, ou l'achever |
| Grosse attaque préparée | *Lee un libro.* 📖 | *Él es simpático*, le fatiguer, ou frapper fort tout de suite |
| Bouclier | *Tiene un escudo.* 🛡 | une carte Verdad, ou attendre |
| Soin | *Come queso.* 🧀 | l'achever avant |
| Double action | *Tiene prisa.* ⏩ | *Él está cansado*, se protéger |
| Moquerie (effet de la prochaine carte divisé par 2, sauf si elle est écrite) | *Se burla de ti.* | répondre à l'écrit, ou une carte sans dégâts |
| Mystère (intention cachée) | *¡Es un misterio!* ❓ | *¿Quién es?* |

Chaque intention a au moins deux réponses raisonnables. C'est ce qui manquait à la version 1 d'El Camino.

---

## 4. Ennemis

Ce que l'ennemi *parece* est un nom inventé (listé dans `A_VERIFIER.md`) ; ce qu'il est *en realidad* est toujours un mot de tes documents.

| Acte | Ennemi (*parece*) | *En realidad* | Comportement |
|---|---|---|---|
| I · El pueblo | El Libro Volador | un libro | *Lee un libro* : prépare une grosse attaque |
| | El Queso Gigante | un queso | *Come queso* : se soigne ; laisse parfois un Queso |
| | El Escudo Saltarín | un escudo | *Tiene un escudo* : bouclier |
| | La Lanza Loca | una lanza | *Tiene prisa* : frappe deux fois |
| | **Élite** El Caballero Enmascarado | el vecino | máscara ; *SER simpático* le fait renoncer pour de bon |
| | **Jefe** El Gran Libro | el libro de don Quijote | phase 1 *Lee* (charge) ; phase 2 *¡Es un misterio!* (intentions cachées) |
| II · Los molinos | El Caballo Salvaje | un burro | *Tiene prisa* ; Verdad : *No es un caballo, es un burro* |
| | El Molinito | un molino pequeño | ses ailes tournent : la famille de cartes qui le blesse change à chaque tour (icône et nom affichés) |
| | La Casa Andante | una casa | gros bouclier, attaque lente |
| | El Perro Gigante | un perro | *Es rápido* : te vole une carte de la main |
| | **Élite** El Señor de la Ciudad | un señor del pueblo | máscara ; *No es una ciudad, es un pueblo* |
| | **Jefe** El Gigante | un molino | phase 1 les ailes (famille vulnérable qui tourne) ; phase 2 la máscara ; phase 3 *¡Es un molino!* : chaque carte Verdad réussie fait très mal |
| III · El Toboso | La Pintura Viva | una pintura | masque le nom d'une de tes cartes : il faut le lire |
| | La Música Encantada | la música | le défi suivant est une écoute |
| | El Burlón | un señor | *Se burla de ti* |
| | **Élite** El Teatro Ambulante | un teatro | à mi-vie, *¡Elige un papel!* : tu choisis un rôle de la scène (Sancho, Aldonza ou don Quijote), qui renforce une famille de cartes jusqu'à la fin du combat |
| | **Jefe final** El Mago | un mago… de teatro | trois phases, ci-dessous |

**El Mago, en trois phases**

1. ***Las apariencias*** : il retourne une de tes cartes face cachée à chaque tour. On ne voit plus que son nom espagnol, et il faut le lire pour savoir ce qu'elle fait.
2. ***¿Quién eres?*** : il pose les questions de ta page Observa (*¿Quién eres? ¿Cómo te llamas? ¿Dónde vives? ¿Cuántos años tienes?*). L'élève répond **en se présentant dans la peau de son personnage**. Chaque bonne réponse brise un sceau ; les cartes Presentación sont doublées.
3. ***La realidad*** : il ne reste que l'homme. Les cartes Verdad font des dégâts triples. Le coup final est une phrase à écrire ou à remettre en ordre : *¡No eres un mago!*

Objectif : au moins dix tours contre le Mago (le boss final d'El Camino tombait en 4 à 7 questions).

---

## 5. Objets, compagnons, synergies

### 5.1 Aides (usage unique)

Leurs noms viennent des encadrés de ton manuel et du lexique de la vidéo.

| Aide | Effet | Origine du nom |
|---|---|---|
| 📒 **Ayuda** | affiche la règle utile (sans donner la réponse) | encadré « Ayuda » |
| 📖 **Léxico** | affiche la traduction | « Léxico del vídeo » |
| 👀 **¡Fíjate!** | retire deux mauvaises réponses | encadré « ¡Fíjate! » |
| 🧀 **Queso** | rend 5 PV (à moi ou à don Quijote) | exercice 2 |
| 🛡 **Escudo** | bloque la prochaine attaque | Ayuda |
| 🔁 **Hay que…** | change toute ta main | lexique : *hay que* (il faut) |
| ⭐ **Siempre listo** | une seconde chance sur une erreur, avec deux choix | lexique : *siempre listo* |
| 🤝 **Fiel** | annule la prochaine intention de l'ennemi | lexique : *fiel* |

Correction d'un défaut de la version 1 (audit) : l'aide « Ayuda » ne révèle jamais la réponse d'un vrai/faux, et « Léxico » n'est proposée que si la question a une traduction.

### 5.2 Compagnons (permanents)

On les recrute dans les rencontres **en remplissant leur fiche d'identité** (section 7). C'est l'objectif « présenter quelqu'un » de ton Paso 3. Un compagnon qui est aussi ton personnage (Antonia) n'apparaît pas dans la partie.

| Compagnon | Ce que disent tes documents | Effet |
|---|---|---|
| 🐕 **El galgo** | *un galgo rápido, ¡su fiel perro!* | il agit en premier : +1 carte au premier tour de chaque combat |
| 🫏 **Rucio** (déjà avec Sancho) | *la modesta montura de Sancho Panza es un burro* | porte une aide de plus de chaque sorte ; +3 PV max |
| 🐎 **Rocinante** (avec don Quijote) | *¡Es muy amigo de Rocinante!* | don Quijote frappe +1 |
| 👧 **Antonia** | *su sobrina de veinte años* | le repos « En casa » soigne davantage |
| 👩 **La sirvienta** | *una sirvienta de unos cuarenta años* | +2 PV après chaque combat |
| 🧑 **El vecino** | *El vecino es muy simpático* | tout est moins cher à la tienda |

### 5.3 Objets de caballero (reliques permanentes)

Une dizaine, avec les raretés d'El Camino (común, rara, legendaria). Exemples : *la lanza de don Quijote* (cartes Lanza +1), *el escudo de Sancho* (boucliers +1), *la panza de Sancho* (+5 PV max), *el honor* (la première erreur de chaque combat ne laisse pas l'ennemi agir), *mi único amor* (à 0 PV, on se relève une fois), *la ficha de identidad* (cartes Presentación +1). Liste complète à l'étape 3.

### 5.4 Synergies, tirées de tes textes

| Ensemble | Condition | Effet | Phrase source |
|---|---|---|---|
| **¡Muy amigos!** | Rucio + Rocinante | l'élève et don Quijote frappent +1 | *¡Es muy amigo de Rocinante!* |
| **La casa de don Quijote** | Antonia (recrutée ou jouée) + la sirvienta + el galgo | « En casa » soigne entièrement et rend une page perdue | *vive con su sobrina…, con una sirvienta… y con un galgo* |
| **Caballero y escudero** | la lanza de don Quijote + el escudo de Sancho | chaque carte Lanza donne aussi 1 de bouclier | *el escudero / el escudo* (même famille de mots) |

---

## 6. Les erreurs reviennent : *las páginas perdidas*

C'est le système « almas pendientes » de la version 1.1 d'El Camino, rhabillé pour don Quijote.

- Chaque question ratée **arrache une page du livre de don Quijote**. Un compteur 📄 indique les pages perdues.
- **Dans la même partie**, la question revient au moins six tours plus tard. Elle est posée sur une carte de la bonne famille, marquée 📄 « Recupera la página : +2 ».
- **Au début de la partie suivante**, un court échauffement sans chrono (4 questions au plus) commence par les pages perdues. Chaque page retrouvée rend 1 PV pour la partie.
- **Une question reste perdue tant qu'elle n'est pas réussie.** Ensuite, elle revient à intervalles croissants (boîtes de Leitner, comme dans El Camino).
- L'écran **« Mi libro »** montre à l'élève ses notions solides et fragiles, et son carnet d'erreurs avec la règle en français.

---

## 7. Salles, rencontres et événements

### 7.1 Les salles de la carte

| Salle | Ce qui s'y passe |
|---|---|
| ⚔ **Encantamiento** | combat, puis une carte à choisir parmi trois (ou aucune) et des monedas |
| 💀 **Gran encantamiento** | élite : ennemi masqué ; un objet de caballero garanti |
| ❓ **Encuentro** | rencontre en espagnol (ci-dessous) |
| 🛒 **Tienda** | aides, objets, retirer une carte de son paquet |
| 🏠 **En casa** | repos : se soigner **ou** améliorer une carte « a la pluma » (le défi devient écrit, l'effet double) |
| 🔒 **Candado** | coffre fermé par un **mot codé** : on décode avec le tableau de l'alphabet espagnol (avec le Ñ), comme ton Enquête 1 ; le coffre s'ouvre si le mot est juste |
| 👑 **Jefe** | fin d'acte |

### 7.2 Rencontres

Les textes sont en espagnol, avec des mots de tes documents. Un mot touché affiche sa traduction (glossaire), comme dans El Camino. **Dans les choix de dialogue, il n'y a pas de bonne réponse imposée : l'élève obtient ce qu'il a dit.** Celui qui comprend obtient ce qu'il veut. Les fiches à remplir pour recruter, elles, se corrigent comme une question, et une erreur revient comme les autres.

| Rencontre | Inspirée de | Ce qu'on y fait |
|---|---|---|
| **El galgo rápido** | DQ_2 | remplir sa fiche (*¿Cómo es? Es rápido.*) pour le recruter |
| **La sobrina** | DQ_2 | présenter Antonia (*Se llama… Tiene… años. Vive con…*) pour la recruter |
| **La sirvienta** | DQ_2 | même principe |
| **Rocinante está cansado** | DQ_2, exercice 1 | lui donner du queso (soigner don Quijote) ou appeler Rucio (*muy amigos*) |
| **Las aldeanas del Toboso** | Dulcinea | *¡Dejadnos pasar! ¡Tenemos prisa!* : les laisser passer poliment (*por favor, gracias*), présenter don Quijote, ou leur dire qu'elles sont princesses (et se faire moquer) |
| **¿Princesa o aldeana?** | Dulcinea, DQ_2 | don Quijote voit une princesse ; l'élève explique qui elle est *en realidad* |
| **¿Gigante o molino?** | intro, ¡Fíjate! | laisser don Quijote charger (gros risque, grosse récompense) ou lui expliquer la réalité |
| **La carta en desorden** | Enquête 2 | remettre en ordre une lettre de don Quijote |
| **La ficha perdida** | DQ1 | compléter la fiche de don Quijote (Edad, Lugar de residencia…) |
| **El teatro ambulante** | Dulcinea | *¿A qué tipo de arte corresponde?* puis *¡Elige un papel!* : le rôle choisi donne un bonus au combat suivant |
| **Un señor con un libro** | encadré « adaptations » | vrai ou faux sur Cervantes, 1605 et les adaptations ; une bonne réponse rapporte un objet |
| **El vecino simpático** | exercice 1 | échange de monedas contre une aide |

### 7.3 La fiche d'identité, geste central

C'est le document central de ta séquence. Il revient sous trois formes : l'écran de choix du personnage (lire une fiche), le recrutement (remplir la fiche de quelqu'un d'après un texte), le mago final (répondre aux questions de la fiche en se présentant soi-même).

---

## 8. Structure d'une partie

| | Partie normale | Partie courte |
|---|---|---|
| Durée visée | **15 à 25 min** | **8 à 10 min** |
| Parcours | 3 actes de 5 étages : 1 combat, 2 étages variés, En casa, jefe | 1 acte de 5 étages, ennemis des trois lieux, jefe : El Gigante |
| Combats | 9 ou 10 (dont 3 jefes) | 4 (dont 1 jefe) |
| Autres salles | 4 à 6 | 2 |
| Tours de combat | ≈ 45 | ≈ 20 |

- Les durées sont **estimées par simulation** avec les temps mesurés lors de l'audit d'El Camino (QCM ≈ 9 s, réponse écrite ≈ 16 s, scène ≈ 20 s, lecture du retour ≈ 4 s). Elles seront vérifiées avec une vraie classe.
- La partie courte se choisit sur l'accueil. Le professeur peut l'imposer par le code de classe.
- **Entre les parties** : un album de La Mancha (ennemis vus avec leur *parece / en realidad*, compagnons, objets, chacun avec une phrase de tes documents), des logros, trois personnages à débloquer, et dix *Niveles de caballero* pour augmenter la difficulté après une victoire.

### Ce que voit l'élève (combat sur PC, 1366 × 768)

```
BANDEAU   PV 18/20 · 2 pages perdues · 12 monedas · Acto I, El pueblo · Options

SCÈNE     Sancho (yo)          Don Quijote (tú)           El Libro Volador (él)
          PV 18/20             PV 9/12                    encantamiento 10/10
                               « ¡Tengo mi lanza! » : 2   « Lee un libro. » : 6 au prochain tour

MAIN      [1] LANZA            [2] PALABRA                [3] VERDAD
              La lanza             ESTAR · cansado            ¡En realidad!
              3 dégâts             la cible frappe 3 de moins brise la máscara

après [2] ¿Quién está cansado?    [1] Yo   [2] Tú   [3] Él   (la cible choisie s'encadre)
puis      Él ____ cansado.        [1] está   [2] estoy   [3] estás
```

Sur téléphone (360 × 640), la scène se réduit à une bande, et les cartes ou le défi prennent les deux tiers bas. Un test automatique vérifie à chaque étape que tout tient sans défiler aux trois tailles.

---

## 9. La banque de questions

Environ **240 questions** à l'étape 1, toutes tirées de tes documents, chacune avec : une correction expliquée en français, sa **source** (document et partie), sa ou ses notions, un niveau (1, 2, 3 ou jefe), les réponses acceptées.

| Thème | Notions | Exemples |
|---|---|---|
| **Identidad** (≈ 55) | se présenter (me llamo, soy, tengo… años, vivo en) ; présenter quelqu'un (se llama, es, tiene, vive) ; mots interrogatifs ; la fiche d'identité ; les nombres (tres, veinte, cuarenta, cincuenta) | *¿____ te llamas? — Me llamo Sancho.* → Cómo |
| **Vocabulario** (≈ 60) | objets et animaux (caballo, burro, galgo, molino, gigante, lanza, libro, escudo, queso…) ; personnes (caballero, escudero, vecino, sobrina…) ; adjectifs (fiel, realista, sencillo, joven, rápido…) ; lexique de la vidéo ; l'alphabet et le Ñ | association mot / image ; *13-16-12-9-14-16* → molino |
| **Conjugación** (≈ 70) | ser, estar, tener au singulier ; verbes réguliers -AR / -ER / -IR au singulier ; me gusta / me gustan | *Don Quijote, tú ____ un caballero.* → eres |
| **Personajes y textos** (≈ 55) | qui est qui ; les relations ; La Mancha ; Cervantes et 1605 ; les adaptations ; la scène de théâtre | *Antonia Quijana tiene cuarenta años.* → falso |

**Les sept types demandés** : QCM, réponse écrite, vrai/faux, phrase à remettre en ordre, association mot / image, placement sur une scène, écoute.

- **Placement sur une scène** : tes documents n'enseignent pas les prépositions de lieu, mais ils disent **qui vit où**. La scène est une carte de La Mancha avec *el pueblo de don Quijote*, *el Toboso* et *la casa de don Quijote*. L'élève y place les personnages d'après une consigne en espagnol (*Dulcinea vive en el Toboso. Antonia vive con don Quijote.*).
- **Écoute** : la voix de l'appareil, uniquement si elle est installée localement (rien n'est envoyé). Sans voix, la phrase s'affiche brièvement (« lecture éclair »), comme dans El Camino.
- **Correction tolérante** : majuscules, ponctuation et espaces ignorés ; « ¡Casi! » pour un accent ou un tilde oublié ; pronom sujet facultatif ; variantes acceptées (*50* ou *cincuenta*, *don Quijote* ou *Don Quijote*…). Tests unitaires dédiés.
- **Niveau 5e, A1** : phrases courtes, présent, singulier, vocabulaire des documents uniquement.

Les questions dont la réponse n'est pas dans tes documents (le nom civil de don Quijote, sa nationalité, *justicia*…) sont créées **désactivées** et listées dans `A_VERIFIER.md`. Tu les actives d'un clic si tu les valides.

---

## 10. Ce que je reprends d'El Camino et ce que je change

| Partie | Reprise telle quelle | Adaptée | Nouvelle |
|---|---|---|---|
| Technique (Vite, TypeScript, Preact, zod), PWA hors ligne, stockage local, profils (pseudo + avatar, sur l'appareil) | ✔ | | |
| Correction tolérante, « ¡Casi! », 7 types de questions et leur interface | ✔ | | |
| Tirage des questions (Leitner, pas deux questions voisines d'affilée) | ✔ | | |
| Retour des erreurs (almas pendientes) | | ✔ devient *páginas perdidas* | |
| Carte à embranchements, salles, boutique, repos, coffres | | ✔ 5 étages par acte, coffres à mot codé | |
| Événements | | ✔ moteur gardé, choix enrichis (recrutement par fiche) | |
| Combat | | | ✔ cartes, deux équipiers, cibles *yo / tú / él*, intentions en espagnol, máscara |
| Ennemis, objets, synergies, personnages | | | ✔ tout le contenu |
| Partie courte | | | ✔ |
| Espace professeur (thèmes, types, chrono, part d'écrit, code de classe, QR, banque, CSV, décodage des codes élèves) | ✔ | ✔ + partie courte imposable par le code de classe | |
| Code et QR de fin de partie | ✔ | ✔ réussite par notion | |
| Accessibilité (police dyslexie, tailles, clavier, animations réduites) | ✔ | ✔ **chrono désactivé par défaut** (il est activé dans El Camino) | |
| Sons | | ✔ retouchés | ✔ musique originale |
| Visuels | | | ✔ tout |
| Tests unitaires, simulation d'équilibrage, Playwright, mise en ligne automatique | ✔ | ✔ adaptés au nouveau contenu | |
| Documents d'El Camino (audit, V2, captures, prototype) | | | supprimés du nouveau dépôt (ils restent dans Ddm) |

**Le dépôt Ddm n'est pas modifié.** Le nouveau dépôt part de l'historique complet de sa branche `main`.

---

## 11. Étapes de réalisation

Une branche par étape. Chacune se termine par une version jouable, avec tests unitaires (dont correction, accents et réponses acceptées), tests d'équilibrage par simulation, un test Playwright qui joue une partie entière, des captures d'écran et un court résumé de ce que tu dois tester. **Rien n'arrive sur `main` sans tests au vert et sans ta validation.** La mise en ligne ne se fait que depuis `main`.

| Étape | Branche | Contenu | Ce que tu pourras tester |
|---|---|---|---|
| 0 | `etape-0-conception` | ce document, la transcription, `A_VERIFIER.md` | la lecture |
| 1 | `etape-1-contenu` | nouvelle séquence : banque d'environ 240 questions, ennemis, objets, événements, personnages, visuels, partie courte, chrono coupé par défaut ; **combat d'El Camino conservé pour l'instant** ; README | toutes les questions, en jeu et dans l'espace professeur |
| 2 | `etape-2-cartas` | le nouveau combat : familles de cartes, main de 3, don Quijote, cibles *yo / tú / él*, intentions à chaque tour, pages perdues sur les cartes, récompenses de cartes, « a la pluma » | le cœur du jeu |
| 3 | `etape-3-encantamientos` | máscaras, cartes Verdad, ennemis et jefes à phases (Gran Libro, Gigante, Mago), objets de caballero | une partie complète, jusqu'au Mago |
| 4 | `etape-4-compania` | rencontres, recrutement par la fiche, mots codés, lettre en désordre, théâtre, synergies | les rencontres et la compagnie |
| 5 | `etape-5-musica` | musique originale, effets, finitions d'accessibilité, réglages d'équilibrage, partie courte dans le code de classe, README final | le jeu fini, en classe |

**Cibles vérifiées par simulation** (élèves virtuels qui répondent juste à 60, 75, 90 ou 97 %) :

| Mesure | Cible |
|---|---|
| Durée d'une partie gagnée / courte | 15 à 25 min / 8 à 10 min |
| Élève à 60 % : atteint l'acte II / gagne | ≥ 80 % / ≥ 35 % |
| Élève à 97 % : gagne au niveau 0 | ≤ 85 % (il doit aussi bien jouer) |
| Tours contre le Mago | ≥ 10 |
| Question ratée reposée à la partie suivante | ≥ 80 % |
| Réponse visible sans défiler (3 tailles d'écran) | 100 % |

---

## 12. Décisions à valider

Pour chacune, ma recommandation. Un « oui à tout » suffit.

1. **Titre** : *Molinos y gigantes*. Autres possibilités : *¡En realidad!*, *La Mancha encantada*. Nom du dépôt : `quijote` (adresse : `https://enzoourgaud-boop.github.io/quijote/`).
2. **L'univers** : le mago qui ensorcelle La Mancha, *parecer / en realidad*, Sancho jouable avec Antonia et Aldonza à débloquer, don Quijote toujours à tes côtés. Les personnages de Cervantes sont dessinés par moi, sans reprendre aucune illustration existante. *Recommandé.*
3. **Le cœur** : un combat de cartes en quatre familles, où l'on vise avec *yo / tú / él*, et où l'ennemi agit à chaque tour. *Recommandé.*
4. **L'étape 1 en ligne avant le nouveau combat ?** *Recommandé : oui.* Tes élèves peuvent réviser avec la nouvelle banque dès la fin de l'étape 1, avec le combat question par question d'El Camino. Si tu préfères attendre un vrai jeu, `main` ne reçoit rien avant la fin de l'étape 2.
5. **Se tromper de sujet a des conséquences** (*Él come queso* soigne l'ennemi). *Recommandé*, avec la cible montrée avant de valider.
6. **Musique coupée par défaut.** *Recommandé.* Effets sonores actifs à volume modéré.
7. **Nom des erreurs à rattraper** : *páginas perdidas* (le livre de don Quijote). *Recommandé.*
8. **La transcription est publique.** Le dépôt doit être public pour que GitHub Pages soit gratuit. La transcription contient donc les textes de ton manuel (Hachette), visibles par tous. El Camino fait déjà de même. Si tu préfères, je ne garde dans le dépôt que les extraits utilisés par le jeu.
9. **Les points de [`A_VERIFIER.md`](A_VERIFIER.md)** : corrigés que j'ai établis, mots et faits hors documents, noms inventés.
