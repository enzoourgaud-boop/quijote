# Molinos y gigantes : document de conception

*Étape 0, version 2 du 19/11/2026. Après ton retour, le jeu de cartes est abandonné : **le combat d'El Camino est gardé exactement**. Rien n'est codé : j'attends ta validation (section 10).*

Nouveau jeu construit à partir d'« El Camino de Cempasúchil » (dépôt Ddm, branche `main`). Contenu : uniquement tes cinq documents, transcrits dans [`sources/contenu-sequence.md`](../sources/contenu-sequence.md). Ce qui n'en vient pas est listé dans [`A_VERIFIER.md`](A_VERIFIER.md).

## En une page

**Le principe.** C'est El Camino, avec les mêmes règles, transposé dans l'univers de don Quijote et nourri par ta séquence. On avance sur une carte à embranchements. On affronte des ennemis en répondant en espagnol : une bonne réponse les blesse, une erreur les laisse agir. On ramasse des aides et des reliques. Une question ratée revient plus tard, puis au début de la partie suivante.

**L'histoire.** Elle prolonge deux phrases de tes documents : Sancho *« siempre explica a don Quijote cómo es el mundo en realidad »*, et don Quijote croit qu'*« un mago te hace parecer una simple aldeana »*. Un mago a ensorcelé La Mancha : un livre vole, un fromage roule, un moulin *parece* un gigante. L'élève accompagne don Quijote du pueblo jusqu'au Toboso. Chaque ennemi vaincu redevient ce qu'il est *en realidad*.

**Ce qui est gardé tel quel.** Le combat et ses règles, avec les mêmes valeurs (PV, attaques, comportements, objets) : l'équilibrage déjà réglé d'El Camino est conservé. Restent aussi la carte, les salles, le retour des erreurs, les sept types de questions et la correction tolérante. Côté professeur : l'espace professeur, le code de classe et son QR, les codes de fin de partie. Côté technique : le hors-ligne, l'absence de données personnelles, les tests, la mise en ligne.

**Ce qui change.**

- Le **contenu** : environ 240 questions tirées de tes documents.
- L'**habillage** : univers, ennemis, objets, rencontres, personnages, visuels.
- Une **partie courte** de 8 à 10 minutes.
- Le **chrono désactivé par défaut** (il est activé dans El Camino).

**Où l'espagnol décide du jeu.** Les mécanismes sont ceux d'El Camino, rattachés à ta séquence :

- les ennemis qui exigent de l'écrit ;
- celui dont le point faible est un thème qui change à chaque tour ;
- celui qui impose une question sur tes textes ;
- celui qui fait passer à l'oral ;
- les questions à manipuler (remettre en ordre, associer, placer) ;
- les rencontres où comprendre l'espagnol décide de ce qu'on obtient.

---

## 1. Univers

### 1.1 Trois actes, trois lieux de tes documents

| Acte | Remplace | Lieu | Niveau des questions |
|---|---|---|---|
| I | El Mercado | **El pueblo** : le village de don Quijote, sa casa | 1 |
| II | El Panteón | **Los molinos** : les plaines de La Mancha | 2 |
| III | El Mictlán | **El Toboso** : le village de Dulcinea, où le mago fait apparaître des « adaptations » (peinture, théâtre, télévision), comme dans ton encadré *Existen muchas adaptaciones…* | 3 |

Fin : le mago vaincu, tout redevient réel. *¡No es un gigante, es un molino!*

### 1.2 Personnages jouables

Ils remplacent les trois personnages d'El Camino, avec **les mêmes bonus et les mêmes conditions de déblocage**. L'écran de choix montre leur fiche d'identité en espagnol, d'après tes documents.

| El Camino | Molinos y gigantes | Fiche | Bonus (inchangé) | Débloqué |
|---|---|---|---|---|
| Valentina | **Sancho Panza**, el escudero | Vive en un pueblo de la Mancha. Es realista y sencillo. | un Queso en plus ; le repos soigne davantage | dès le départ |
| Mateo | **Antonia Quijana**, la sobrina | Tiene veinte años. Vive con don Quijote. | commence avec Rocinante ; +3 PV | en battant le jefe de l'acte I |
| Luz | **Aldonza Lorenzo** | Vive en el Toboso. Es joven. *¡No soy princesa!* | commence avec la Ficha de identidad ; plus de questions écrites | en gagnant une partie |

Don Quijote apparaît dans l'histoire et sur l'accueil. Le combat ne change pas : l'élève y affronte seul l'ennemi, comme dans El Camino.

### 1.3 Visuels et sons

- **Tout est dessiné pour le jeu**, dans le style pixel d'El Camino :
  - les personnages vus de dos (Sancho et son chapeau…) ;
  - les ennemis (dessins SVG pixelisés par le moteur, comme le Papel Picado d'El Camino) ;
  - un décor par acte et les icônes.
  Les emoji récents comme 🫏, absents des vieux PC, sont remplacés par des dessins.
- **Aucun emprunt** : ni l'affiche de Néstor Alonso, ni les cartes illustrées du manuel, ni la photo de théâtre, ni les don Quichotte célèbres (Doré, Daumier, Picasso). Les personnages de Cervantes (1605) sont du domaine public et sont le sujet même de ta séquence : je les dessine moi-même.
- **Palette** : ocre et jaune paille des plaines, blanc des moulins, bleu de ciel, terre brune ; violet nuit pour le mago. Les contrastes du texte seront contrôlés (norme d'accessibilité WCAG AA).
- **Accueil** : des pages de livre volent au vent (le canvas des pétales d'El Camino, redessiné). Elles s'arrêtent avec « réduire les animations ».
- **Sons** : ceux d'El Camino, générés par le navigateur, sans fichier : 100 % originaux. **Pas de musique**, comme dans El Camino (décision 6).

---

## 2. Le combat (inchangé)

Bonne réponse = dégâts à l'ennemi ; erreur ou temps écoulé = l'ennemi exécute son intention (attaque, vol, bouclier…). Une réponse écrite ou manipulée (ordre, association, scène) frappe plus fort. Les séries donnent un bonus. Un accent oublié donne « ¡Casi! » : ni dégât, ni point. L'intention de l'ennemi est annoncée par une icône, et les aides sont utilisables à chaque question.

Ces mécanismes d'El Camino font de l'espagnol une partie du jeu. Ils sont gardés et rattachés à ta séquence :

| Mécanisme d'El Camino | Chez don Quijote | Ce que l'élève fait en espagnol |
|---|---|---|
| Règle « Solo escrito » | El Caballero Enmascarado | il n'accepte que des réponses écrites |
| Thème vulnérable qui change à chaque tour | El Gran Libro change de chapitre | choisir de miser sur le thème affiché |
| « Juicio » : une question sur trois imposée | El Gigante pose une question sur les personnages et les textes ; ratée, elle double son attaque | comprendre tes textes |
| Intention « à l'oral » | El Caballo Salvaje : *¿Me oyes?* | la question suivante est une écoute |
| Protection qui ne cède qu'à l'écrit | la capa d'El Mago | écrire pour la déchirer |
| Phase de boss à thème imposé | El Mago demande *¿Quién eres?* | se présenter, mots interrogatifs |

---

## 3. Ennemis

Chaque ennemi garde **les valeurs et le comportement** de celui qu'il remplace. Ce qu'il *parece* est un nom inventé (listé dans `A_VERIFIER.md`). Ce qu'il est *en realidad* est un mot de tes documents : il s'affiche quand on le bat et figure au dos de sa carte de collection.

| Acte | El Camino | Molinos y gigantes | *En realidad* | Comportement (inchangé) |
|---|---|---|---|---|
| I | La Vela Traviesa | **La Lanza Loca** | una lanza | attaque ; *¡Tengo prisa!* : chrono −8 s (si le chrono est activé) |
| | La Calaverita | **El Escudo Saltarín** | un escudo | bouclier, puis attaques |
| | El Pan de Muerto | **El Queso Gigante** | un queso | attaques ; se soigne |
| | El Papel Picado | **El Libro Volador** | un libro | vole des monedas |
| | Élite : La Piñata Furiosa | **El Caballero Enmascarado** | el vecino | « Solo escrito » |
| | Jefe : El Alebrije | **El Gran Libro** | el libro de don Quijote | change de chapitre : un thème lui fait plus mal à chaque tour (nom du thème affiché) |
| II | El Xoloitzcuintle | **El Perro Gigante** | un perro | vole une aide |
| | La Lechuza | **El Caballo Salvaje** | un burro | chrono −8 s ; *¿Me oyes?* : question suivante à l'oral |
| | El Esqueleto Músico | **El Molinito** | un molino pequeño | ses ailes accélèrent : attaque +1 à chaque tour, tant que tu n'as pas deux bonnes réponses d'affilée |
| | La Cruz Florida | **La Casa Andante** | una casa | bouclier, attaque, soin |
| | Élite : El Mariachi de Huesos | **El Caballero Rápido** | un señor del pueblo | vole des monedas ; « Prisa » : chrono divisé par 2 (s'il est activé) |
| | Jefe : Mictlantecuhtli | **El Gigante** | un molino | une question sur trois porte sur les personnages et les textes ; ratée, attaque doublée |
| III | El Alma Errante | **La Pintura Viva** | una pintura | ta première bonne réponse passe à travers (ce n'est qu'une peinture) |
| | La Mariposa Negra | **El Burlón** | un señor | vole des monedas ; *Se burla de ti* : aides bloquées une question |
| | La Serpiente | **La Televisión Encantada** | una televisión | *¡Mírame!* : fatigue, −1 PV par question pendant 3 questions |
| | Élite : El Jaguar de Obsidiana | **El Teatro Ambulante** | un teatro | « Niebla » : ni Léxico ni Ayuda (au théâtre, pas de souffleur) |
| | Jefa finale : La Catrina | **El Mago** | un mago… de teatro | 3 phases, ci-dessous |

**El Mago** (les trois phases de la Catrina, mêmes règles) :

1. ***Las apariencias*** : questions de vocabulaire et sur les personnages. Sa capa ne se déchire qu'avec des réponses écrites.
2. ***¿Quién eres?*** : questions de présentation (*¿Quién eres? ¿Cómo te llamas? ¿Dónde vives? ¿Cuántos años tienes?*). Chaque erreur lui rend 1 PV.
3. ***La realidad*** : le rythme s'accélère ; une série de 3 bonnes réponses double les dégâts.

---

## 4. Objets et synergies

Même principe : chaque objet garde l'effet de celui qu'il remplace. Les noms viennent de tes documents chaque fois que c'est possible.

**Aides (usage unique)**

| El Camino | Molinos y gigantes | Effet (inchangé) | Origine du nom |
|---|---|---|---|
| Traductor | **Léxico** | traduit la question | « Léxico del vídeo » |
| Chuleta | **Ayuda** | montre la règle | encadré « Ayuda » |
| Tijeras | **¡Fíjate!** | retire deux mauvaises réponses | encadré « ¡Fíjate! » |
| Oráculo | **En realidad…** | donne la bonne réponse | *cómo es el mundo en realidad* |
| Cambio | **¡Dejadnos pasar!** | change de question | dialogue de Dulcinea |
| Reloj de arena | **Por favor** | +15 s au chrono | dialogue de Dulcinea |
| Chocolate | **Queso** | +5 PV | exercice 2 |
| Escudo | **Escudo** | bloque la prochaine attaque | Ayuda |
| Incienso | **Fiel compañero** | annule l'intention de l'ennemi | *fiel compañero* (DQ_2) |

**Reliques (permanentes)**

| El Camino | Molinos y gigantes | Effet (inchangé) |
|---|---|---|
| Vela | **La lanza** | +1 dégât par bonne réponse |
| Pluma | **La ficha de identidad** | réponses écrites +1 |
| Maracas | **Rocinante** | séries dès 2 bonnes réponses, +2 |
| Corazón | **Mi único amor** | +4 PV max |
| Piñata | **El vecino simpático** | +1 moneda par bonne réponse |
| Cempasúchil | **La sirvienta** | +2 PV après chaque combat |
| Tilde amable | **La Ñ amable** | un accent oublié est pardonné |
| Pan de muerto | **El galgo** | +3 PV max |
| Trompeta | **Rucio** | bonus de série +1 |
| Diccionario de bolsillo | **El libro de don Quijote** | un Léxico gratuit par combat |
| Mapa de pétalos | **El mapa de España** | un choix de plus dans les récompenses |
| Pluma de colibrí | **El autor** | tout à l'écrit, réponses écrites très renforcées |
| Reloj de sol | **¡Qué importa!** | +10 s au chrono, mais les ennemis frappent +1 |
| Máscara | **El escudo del escudero** | la 1re erreur de chaque combat ne fait pas de dégâts |
| Calavera de la suerte | **El honor** | une fois par partie, à 0 PV, on revient avec la moitié de sa vie |
| Lotería | **Siempre listo** | toutes les 4 bonnes réponses, une aide gratuite |

**Synergies**

| El Camino | Molinos y gigantes | Composition | Effet (inchangé) | Phrase source |
|---|---|---|---|---|
| Ofrenda completa | **La casa de don Quijote** | la lanza + la sirvienta + el galgo | +1 PV par bonne réponse | *vive con… una sirvienta… y con un galgo* |
| Mariachi | **¡Muy amigos!** | Rocinante + Rucio | bonus de série doublé | *¡Es muy amigo de Rocinante!* |
| Papel y tinta | **Me gustan los libros** | la ficha de identidad + el libro de don Quijote | +1 moneda par réponse écrite | *Me gustan los libros* (intro) |

---

## 5. Rencontres

Treize rencontres, comme dans El Camino, avec les mêmes effets possibles (soin, objet, monedas, combat, question). Les textes sont en espagnol, avec les mots de tes documents. Un mot touché affiche sa traduction. Les textes exacts te seront soumis à l'étape 1.

| El Camino | Molinos y gigantes | Inspirée de | Choix |
|---|---|---|---|
| La abuela y los tamales | **La sirvienta y el queso** | DQ_2, exercice 2 | l'aider (question) ou non |
| La música de la calle | **El teatro ambulante** | Dulcinea (« ¿A qué tipo de arte corresponde? ») | jouer un rôle (question) ou regarder (soin) |
| Un altar sin velas | **El vecino simpático** | exercice 1 | échanger un objet ou partir (soin) |
| El trato del alebrije | **El trato del mago** | Dulcinea | des PV contre un objet, ou refuser |
| La lotería de la plaza | **¡Es un misterio!** | DQ_2 | tenter sa chance ou regarder |
| Flores para la tumba | **Rocinante está cansado** | DQ_2, exercice 1 | l'aider (question) ou continuer |
| Los niños disfrazados | **Las aldeanas del Toboso** | Dulcinea | présenter don Quijote (question) ou les laisser passer |
| La panadería | **El queso de La Mancha** | exercice 2 | en acheter ou passer (soin) |
| La calavera que habla | **¿Gigante o molino?** | intro | répondre au géant (question) ou fuir |
| Las mariposas | **El libro de don Quijote** | intro (*Me gustan los libros*) | lire (améliorer une aide) ou continuer |
| La foto de la ofrenda | **La ficha perdida** | DQ1 | compléter la fiche de don Quijote (question) ou non |
| El vendedor esqueleto | **El burlón del camino** | Dulcinea (*se burla*) | acheter, se battre ou partir |
| La banda de esqueletos | **El caballero que pregunta** | DQ1 (*¿Quién eres?*) | se présenter (question) ou se battre |

---

## 6. Les erreurs reviennent

C'est le système « almas pendientes » d'El Camino, **inchangé**. Seuls les mots changent : pour don Quijote, une question ratée devient une **página perdida** du livre de don Quijote (décision 5).

- Une question ratée revient plus tard dans la même partie, jusqu'à ce qu'elle soit réussie.
- La partie suivante commence par un court échauffement sans chrono (4 questions au plus) avec ces questions. Chaque page retrouvée rend 1 PV.
- L'écran « Mon carnet » montre les notions fragiles et les erreurs, avec la règle en français.

---

## 7. Structure d'une partie

| | Partie normale (inchangée) | Partie courte (nouvelle) |
|---|---|---|
| Durée visée | 15 à 25 min | 8 à 10 min |
| Parcours | 3 actes de 6 étages | les mêmes 3 actes, raccourcis à 3 ou 4 étages chacun (un combat, une salle au choix, le jefe) |
| Jefes | El Gran Libro, El Gigante, El Mago | les mêmes |

- La partie courte se choisit sur l'accueil. L'élève y rencontre quand même les trois jefes.
- Le nombre d'étages et les PV de départ de la partie courte seront réglés **par simulation** (élèves virtuels à 60, 75, 90 et 97 % de bonnes réponses), pour tenir en 8 à 10 minutes. Les durées de la partie normale sont vérifiées de la même façon.
- **Entre les parties** (inchangé, rhabillé) : l'album (anciennement la collection de lotería), les logros, les trois personnages, et les *Niveles de caballero* (anciennement les Niveles de Calavera).

---

## 8. La banque de questions

Environ **240 questions**, toutes tirées de tes documents. Chacune a : une correction expliquée en français, sa **source** (document et partie), ses notions, un niveau (1, 2, 3 ou jefe) et ses réponses acceptées.

Les quatre thèmes remplacent ceux d'El Camino :

| Thème | Remplace | Contenu | Exemple |
|---|---|---|---|
| **Vocabulario** (≈ 60) | Vocabulario | objets et animaux (caballo, burro, galgo, molino, gigante, lanza, libro, escudo, queso…) ; personnes (caballero, escudero, vecino, sobrina…) ; adjectifs (fiel, realista, sencillo, joven, rápido…) ; lexique de la vidéo ; l'alphabet et le Ñ | *13 – 16 – 12 – 9 – 14 – 16* → molino |
| **Conjugación** (≈ 70) | Conjugación | ser, estar, tener au singulier ; verbes réguliers -AR / -ER / -IR au singulier ; me gusta / me gustan | *Don Quijote, tú ____ un caballero.* → eres |
| **Presentarse** (≈ 55) | Gramática | se présenter (me llamo, soy, tengo… años, vivo en) ; présenter quelqu'un (se llama, es, tiene, vive) ; mots interrogatifs ; la fiche d'identité ; les nombres (tres, veinte, cuarenta, cincuenta) | *¿____ te llamas? — Me llamo Sancho.* → Cómo |
| **Personajes y textos** (≈ 55) | Cultura | qui est qui, les relations, La Mancha, Cervantes et 1605, les adaptations, la scène de théâtre | *Antonia Quijana tiene cuarenta años.* → falso |

- **Les sept types demandés** : QCM, réponse écrite, vrai/faux, phrase à remettre en ordre, association mot / image, placement sur une scène, écoute.
- **Placement sur une scène** : tes documents n'enseignent pas les prépositions de lieu, mais ils disent **qui vit où**. La scène est une carte de La Mancha (*el pueblo de don Quijote*, *el Toboso*). L'élève y place les personnages d'après une consigne en espagnol (*Dulcinea vive en el Toboso. Antonia vive con don Quijote.*).
- **Écoute** : uniquement la voix installée sur l'appareil, sans envoi de données. Sans voix, la phrase s'affiche brièvement, comme dans El Camino.
- **Correction tolérante** (inchangée) :
  - majuscules, ponctuation et espaces ignorés ;
  - « ¡Casi! » pour un accent ou un tilde oublié ;
  - pronom sujet facultatif ;
  - variantes acceptées (*50* ou *cincuenta*…).
  Des tests unitaires s'ajoutent pour les réponses propres à la séquence.
- **Niveau 5e, A1** : phrases courtes, présent, singulier, vocabulaire des documents uniquement.
- Les questions dont la réponse n'est pas dans tes documents (le nom civil de don Quijote, sa nationalité, *justicia*) sont créées **désactivées**. Elles sont listées dans `A_VERIFIER.md`, et tu les actives d'un clic si tu les valides.

---

## 9. Étapes

Une branche par étape. Chaque étape se termine par :

- des tests unitaires (correction des réponses, accents, réponses acceptées) ;
- des tests d'équilibrage par simulation ;
- un test Playwright qui joue une partie entière (ordinateur et téléphone) et vérifie que la réponse se voit sans défiler ;
- des captures d'écran et un court résumé de ce que tu dois tester.

**Rien n'arrive sur `main` sans tests au vert et sans ta validation.** La mise en ligne ne se fait que depuis `main`.

| Étape | Branche | Contenu | Ce que tu pourras tester |
|---|---|---|---|
| 0 | `etape-0-conception` | ce document, la transcription, `A_VERIFIER.md` | la lecture |
| 1 | `etape-1-quijote` | le jeu complet sur ta séquence : banque, ennemis, objets, rencontres, personnages, textes, visuels ; mots du Día de Muertos retirés du code ; chrono coupé par défaut ; documents d'El Camino retirés ; README réécrit pour un professeur | une partie entière, toutes les questions, l'espace professeur |
| 2 | `etape-2-partie-courte` | la partie courte, réglée par simulation ; README complété | une partie de 8 à 10 minutes |

**Le dépôt Ddm n'est pas modifié.** Le nouveau dépôt part de l'historique complet de sa branche `main`.

---

## 10. Décisions à valider

Pour chacune, ma recommandation. Un « oui à tout » suffit.

1. **Titre** : *Molinos y gigantes*. Autres possibilités : *¡En realidad!*, *La Mancha encantada*. Nom du dépôt : `quijote` (adresse `https://enzoourgaud-boop.github.io/quijote/`).
2. **L'univers** : le mago qui ensorcelle La Mancha ; Sancho jouable, Antonia et Aldonza à débloquer ; des personnages de Cervantes dessinés par moi, sans reprendre aucune illustration existante. *Recommandé.*
3. **Transposition un pour un** des ennemis, objets, synergies et rencontres, avec les valeurs d'El Camino (sections 3 à 5). Ce choix garde l'équilibrage tel quel. *Recommandé.*
4. **Partie courte** : les trois actes raccourcis plutôt qu'un seul acte. *Recommandé* : l'élève voit toute l'histoire en 8 à 10 minutes.
5. **Les erreurs à rattraper** s'appellent *páginas perdidas*. *Recommandé.*
6. **Pas de musique**, comme dans El Camino ; effets sonores gardés. *Recommandé* pour la classe. Si tu en veux une, je l'ajoute à l'étape 2 (originale, coupée par défaut).
7. **La transcription est publique.** Le dépôt doit être public pour que GitHub Pages soit gratuit, donc les textes de ton manuel (Hachette) y sont visibles. El Camino fait déjà de même. Sinon, je ne garde dans le dépôt que les extraits utilisés par le jeu.
8. **Les points de [`A_VERIFIER.md`](A_VERIFIER.md)** : corrigés que j'ai établis, faits et mots hors documents, noms inventés.

> **Validé le 19/11/2026 : « oui à tout ».** Les huit décisions sont prises selon les recommandations ci-dessus : titre *Molinos y gigantes* et dépôt `quijote`, univers du mago, transposition un pour un, partie courte sur les trois actes raccourcis, *páginas perdidas*, pas de musique, transcription complète publique, points de `A_VERIFIER.md` à relire au fil des étapes.
