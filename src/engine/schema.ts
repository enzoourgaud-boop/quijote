/**
 * Schémas du contenu (zod). Le moteur ne suppose rien du thème de la séquence :
 * tout ce qui est propre à la séquence vit dans content/sequences/<id>/.
 */
import { z } from 'zod';

/* ---------- Questions ---------- */

/** Niveau : 1, 2, 3 ou "jefe" (niveau spécial des jefes finaux). En interne, "jefe" = 4. */
export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('jefe')]);

export const CheckSchema = z
  .object({
    /** Les articles (el, la, los, las, un, una…) sont facultatifs. */
    ignoreArticles: z.boolean().optional(),
    /** Le pronom sujet (yo, tú, nosotros…) est facultatif. */
    optionalSubject: z.boolean().optional(),
  })
  .strict();

const idSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "l'identifiant ne doit contenir que des minuscules, chiffres et tirets");

/** Champs communs à tous les types de questions. */
const commonFields = {
  id: idSchema,
  theme: z.string().min(1),
  notions: z.array(z.string().min(1)).min(1, 'au moins une notion'),
  level: LevelSchema,
  /** Consigne courte affichée au-dessus de l'énoncé (en français). */
  label: z.string().optional(),
  prompt: z.string().min(1, "l'énoncé est vide"),
  promptLang: z.enum(['es', 'fr']).default('es'),
  emoji: z.string().optional(),
  /** Langue des réponses (es par défaut). */
  answerLang: z.enum(['es', 'fr']).default('es'),
  translation: z.string().default(''),
  explanation: z.string().min(1, "l'explication est vide"),
  source: z.string().min(1),
  check: CheckSchema.optional(),
  /** Le professeur peut désactiver une question sans la supprimer. */
  disabled: z.boolean().optional(),
};

/** Champs des questions à choix (QCM, écrit, écoute). */
const choiceFields = {
  answer: z.string().min(1, 'la réponse est vide'),
  accept: z.array(z.string().min(1)).default([]),
  distractors: z.array(z.string().min(1)).min(3, 'il faut au moins 3 distracteurs'),
};

/** Placement d'un objet sur une scène. row / col absents = position libre sur cet axe. */
export const PlacementSchema = z
  .object({ object: z.string(), row: z.string().optional(), col: z.string().optional() })
  .strict();
export type Placement = z.infer<typeof PlacementSchema>;
export const SceneRefSchema = z.object({ decor: z.string(), items: z.array(PlacementSchema).min(1).max(5) }).strict();
export type SceneRef = z.infer<typeof SceneRefSchema>;

export const QcmQuestionSchema = z
  .object({
    ...commonFields,
    ...choiceFields,
    type: z.literal('qcm'),
    /** La question peut aussi être posée à l'écrit (champ de saisie). */
    writable: z.boolean().default(false),
    /** Image de scène affichée avec la question (décrire une image). */
    scene: SceneRefSchema.optional(),
  })
  .strict();

export const EcritQuestionSchema = z.object({ ...commonFields, ...choiceFields, type: z.literal('ecrit') }).strict();

/** Compréhension orale : la phrase est lue par la synthèse vocale. */
export const EcouteQuestionSchema = z
  .object({
    ...commonFields,
    ...choiceFields,
    type: z.literal('ecoute'),
    /** Texte lu à voix haute (par défaut : la réponse, pour une dictée ou une reconnaissance). */
    say: z.string().optional(),
    writable: z.boolean().default(false),
  })
  .strict();

/** Vrai / faux culturel ou grammatical. */
export const VraiFauxQuestionSchema = z
  .object({ ...commonFields, type: z.literal('vrai-faux'), answer: z.enum(['verdadero', 'falso']) })
  .strict();

/** Remettre une phrase dans l'ordre (glisser-déposer). */
export const OrdreQuestionSchema = z
  .object({
    ...commonFields,
    type: z.literal('ordre'),
    answer: z.string().min(1),
    accept: z.array(z.string().min(1)).default([]),
    /** Étiquettes dans le bon ordre (par défaut : les mots de la réponse). */
    tokens: z.array(z.string().min(1)).min(2).optional(),
    /** Étiquettes pièges à ne pas utiliser. */
    extra: z.array(z.string().min(1)).max(3).default([]),
  })
  .strict();

/** Associer chaque mot à son image. */
export const AssociationQuestionSchema = z
  .object({ ...commonFields, type: z.literal('association'), pairs: z.array(z.tuple([z.string().min(1), z.string().min(1)])).min(3).max(5) })
  .strict();

/** Placer des objets sur une scène d'après une consigne en espagnol. */
export const SceneQuestionSchema = z.object({ ...commonFields, type: z.literal('scene'), scene: SceneRefSchema }).strict();

export const QuestionSchema = z.discriminatedUnion('type', [
  QcmQuestionSchema, EcritQuestionSchema, EcouteQuestionSchema, VraiFauxQuestionSchema,
  OrdreQuestionSchema, AssociationQuestionSchema, SceneQuestionSchema,
]);
export const QuestionListSchema = z.array(QuestionSchema);

export type QuestionInput = z.input<typeof QuestionSchema>;
export type Question = z.output<typeof QuestionSchema>;
export type QuestionType = Question['type'];
export type ChoiceQuestion = Extract<Question, { type: 'qcm' | 'ecrit' | 'ecoute' }>;
export const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: 'qcm', label: 'QCM' },
  { id: 'ecrit', label: 'Réponse écrite' },
  { id: 'ecoute', label: 'Compréhension orale' },
  { id: 'vrai-faux', label: 'Vrai / faux' },
  { id: 'ordre', label: 'Phrase à remettre dans l’ordre' },
  { id: 'association', label: 'Associer mot et image' },
  { id: 'scene', label: 'Placer sur une scène' },
];

/* ---------- Scènes (décors et objets à placer) ---------- */

export const ScenesSchema = z
  .object({
    decors: z.array(
      z
        .object({
          id: idSchema,
          name: z.string(),
          /** Rangées de haut en bas : [identifiant, expression espagnole]. */
          rows: z.array(z.tuple([z.string(), z.string()])).min(1),
          /** Colonnes de gauche à droite : [identifiant, expression espagnole]. */
          cols: z.array(z.tuple([z.string(), z.string()])).min(1),
          /** Taille relative des objets par rangée (perspective). */
          scale: z.array(z.number()).optional(),
        })
        .strict(),
    ),
    objects: z.array(
      z.object({ id: idSchema, es: z.string(), un: z.string(), fr: z.string(), emoji: z.string() }).strict(),
    ),
  })
  .strict();
export type Scenes = z.infer<typeof ScenesSchema>;

/* ---------- Ennemis ---------- */

export const IntentSchema = z
  .object({
    kind: z.enum(['attack', 'shield', 'heal', 'steal', 'rush', 'poison', 'fog', 'stealItem', 'listen']),
    value: z.number().int().positive().optional(),
  })
  .strict();
export type Intent = z.infer<typeof IntentSchema>;

export const TraitSchema = z.enum(['vanish', 'colorShift', 'juicio', 'crescendo', 'abanico', 'vanidad', 'ultimoBaile']);
export type Trait = z.infer<typeof TraitSchema>;

export const ModifierSchema = z.enum(['soloEscrito', 'prisa', 'niebla']);
export type Modifier = z.infer<typeof ModifierSchema>;

export const PhaseSchema = z
  .object({
    name: z.string(),
    /** La phase commence quand les PV de l'ennemi passent sous cette fraction (1 = dès le début). */
    from: z.number().min(0).max(1),
    traits: z.array(TraitSchema).default([]),
    intents: z.array(IntentSchema).min(1),
    themes: z.array(z.string()).optional(),
    levels: z.array(LevelSchema).optional(),
    attackBonus: z.number().int().default(0),
    abanico: z.number().int().optional(),
    message: z.string(),
  })
  .strict();
export type Phase = z.infer<typeof PhaseSchema>;

export const EnemySchema = z
  .object({
    id: idSchema,
    name: z.string(),
    emoji: z.string(),
    top: z.string().optional(),
    card: z.number().int().min(1).max(99),
    kind: z.enum(['normal', 'elite', 'jefe', 'final']),
    hp: z.number().int().positive(),
    attack: z.number().int().positive(),
    pattern: z.enum(['cycle', 'random']),
    intents: z.array(IntentSchema).min(1),
    traits: z.array(TraitSchema).default([]),
    modifier: ModifierSchema.optional(),
    phases: z.array(PhaseSchema).optional(),
    /** Thème imposé par le trait « juicio » (une question sur trois). */
    focusTheme: z.string().optional(),
    /** Phrase d'exemple en espagnol, au dos de la carte de lotería. */
    phrase: z.string().optional(),
    taunt: z.string().optional(),
  })
  .strict();
export type Enemy = z.infer<typeof EnemySchema>;

/* ---------- Objets ---------- */

export const EffectSchema = z.enum([
  // aides
  'translate', 'hint', 'scissors', 'oracle', 'swap', 'time', 'heal', 'autoShield', 'cancelIntent',
  // reliques
  'damageBonus', 'writeBonus', 'streakMaster', 'maxHp', 'goldPerCorrect', 'healAfterFight', 'accentForgive',
  'streakBonus', 'freeTranslate', 'extraChoice', 'allWrite', 'slowTime', 'firstErrorShield', 'revive', 'luckyCards',
]);
export type Effect = z.infer<typeof EffectSchema>;

export const ItemSchema = z
  .object({
    id: idSchema,
    kind: z.enum(['aide', 'reliquia']),
    rarity: z.enum(['comun', 'rara', 'legendaria']),
    name: z.string(),
    emoji: z.string(),
    price: z.number().int().nonnegative(),
    max: z.number().int().positive().optional(),
    auto: z.boolean().optional(),
    effect: EffectSchema,
    value: z.number().optional(),
    description: z.string(),
    /** Texte de la version améliorée (aides seulement, via l'Ofrenda). */
    upgrade: z.string().optional(),
    /** Numéro de carte de lotería et phrase d'exemple. */
    card: z.number().int().min(1).max(99).optional(),
    phrase: z.string().optional(),
  })
  .strict();
export type Item = z.infer<typeof ItemSchema>;

/* ---------- Synergies ---------- */

export const SynergySchema = z
  .object({
    id: idSchema,
    name: z.string(),
    emoji: z.string(),
    items: z.array(z.string()).min(2),
    effect: z.enum(['healOnCorrect', 'streakDouble', 'goldOnWrite']),
    value: z.number().optional(),
    description: z.string(),
  })
  .strict();
export type Synergy = z.infer<typeof SynergySchema>;

/* ---------- Événements ---------- */

const OutcomeBase = {
  text: z.string().min(1),
  textFr: z.string().optional(),
};
const SimpleEffect = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hp'), value: z.number().int() }).strict(),
  z.object({ type: z.literal('maxHp'), value: z.number().int() }).strict(),
  z.object({ type: z.literal('gold'), value: z.number().int() }).strict(),
  z.object({ type: z.literal('item'), id: z.string().optional(), kind: z.enum(['aide', 'reliquia']).optional(), rarity: z.enum(['comun', 'rara', 'legendaria']).optional() }).strict(),
  z.object({ type: z.literal('loseItem') }).strict(),
  z.object({ type: z.literal('upgrade') }).strict(),
  z.object({ type: z.literal('fight'), kind: z.enum(['normal', 'elite']) }).strict(),
]);
const SimpleOutcome = z.object({ ...OutcomeBase, effects: z.array(SimpleEffect) }).strict();
export const EventEffectSchema = z.union([
  SimpleEffect,
  z.object({ type: z.literal('random'), outcomes: z.array(SimpleOutcome).min(2) }).strict(),
]);
export type EventEffect = z.infer<typeof EventEffectSchema>;
export const EventOutcomeSchema = z.object({ ...OutcomeBase, effects: z.array(EventEffectSchema) }).strict();
export type EventOutcome = z.infer<typeof EventOutcomeSchema>;

export const EventChoiceSchema = z
  .object({
    label: z.string().min(1),
    labelFr: z.string().optional(),
    require: z.object({ gold: z.number().int().positive().optional(), aide: z.number().int().positive().optional() }).strict().optional(),
    /** Choix direct… */
    outcome: EventOutcomeSchema.optional(),
    /** …ou choix avec une question : success / failure selon la réponse. */
    quiz: z.object({ themes: z.array(z.string()).optional(), write: z.boolean().optional() }).strict().optional(),
    success: EventOutcomeSchema.optional(),
    failure: EventOutcomeSchema.optional(),
  })
  .strict()
  .refine(c => (c.quiz ? !!c.success && !!c.failure : !!c.outcome), {
    message: 'un choix doit avoir soit « outcome », soit « quiz » + « success » + « failure »',
  });
export type EventChoice = z.infer<typeof EventChoiceSchema>;

export const EventSchema = z
  .object({
    id: idSchema,
    emoji: z.string(),
    title: z.string(),
    text: z.string().min(1),
    textFr: z.string().min(1),
    gloss: z.array(z.tuple([z.string(), z.string()])).default([]),
    /** Actes où l'événement peut apparaître (tous par défaut). */
    acts: z.array(z.number().int().positive()).optional(),
    choices: z.array(EventChoiceSchema).min(1).max(4),
  })
  .strict();
export type GameEvent = z.infer<typeof EventSchema>;
export type Rarity = Item['rarity'];

/* ---------- Séquence ---------- */

export const SequenceSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    tagline: z.string(),
    intro: z.string(),
    victory: z.string(),
    victoryTitle: z.string(),
    defeatTitle: z.string(),
    voices: z.array(z.string()).default(['es-ES', 'es']),
    themes: z
      .array(
        z
          .object({
            id: idSchema,
            label: z.string(),
            color: z.string(),
            translationOptional: z.boolean().default(false),
            check: CheckSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    notions: z.array(z.object({ id: idSchema, label: z.string() }).strict()),
    sources: z.array(z.object({ id: idSchema, title: z.string(), file: z.string() }).strict()),
    player: z
      .object({ hp: z.number().int().positive(), startItems: z.record(z.string(), z.number().int().nonnegative()) })
      .strict(),
    acts: z
      .array(
        z
          .object({
            id: idSchema,
            name: z.string(),
            color: z.string(),
            level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            chrono: z.number().positive(),
            writeShare: z.number().min(0).max(1),
            enemies: z.array(z.string()).min(1),
            elites: z.array(z.string()).min(1),
            boss: z.string(),
          })
          .strict(),
      )
      .min(1),
    map: z
      .object({
        floors: z.number().int().min(3).max(12),
        width: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
        restFloor: z.number().int().min(1),
        weights: z.object({ combat: z.number(), event: z.number(), elite: z.number(), shop: z.number(), chest: z.number(), rest: z.number() }).strict(),
        /** Partie courte : les mêmes actes avec moins d'étages (8 à 10 minutes). */
        short: z
          .object({
            floors: z.number().int().min(3).max(12),
            restFloor: z.number().int().min(1),
            /** Part des PV gardée par les jefes en partie courte (1 = tous). */
            bossHp: z.number().min(0.2).max(1).default(1),
          })
          .strict()
          .optional(),
      })
      .strict(),
    rooms: z.record(
      z.enum(['combat', 'elite', 'shop', 'rest', 'event', 'chest', 'boss']),
      z.object({ name: z.string(), emoji: z.string(), help: z.string(), text: z.string().optional() }).strict(),
    ),
    characters: z
      .array(
        z
          .object({
            id: idSchema,
            name: z.string(),
            title: z.string(),
            emoji: z.string(),
            description: z.string(),
            bonus: z
              .object({
                hp: z.number().int().optional(),
                items: z.record(z.string(), z.number().int()).optional(),
                relics: z.record(z.string(), z.number().int()).optional(),
                writeShare: z.number().optional(),
                restHeal: z.number().min(0).max(1).optional(),
              })
              .strict(),
            /** Couleurs du sprite (lettres du dessin pixel → couleur). */
            palette: z.record(z.string(), z.string()).default({}),
            unlock: z.discriminatedUnion('type', [
              z.object({ type: z.literal('default') }).strict(),
              z.object({ type: z.literal('boss'), value: z.string(), label: z.string() }).strict(),
              z.object({ type: z.literal('wins'), value: z.number().int().positive(), label: z.string() }).strict(),
            ]),
          })
          .strict(),
      )
      .min(1),
    meal: z.object({ name: z.string(), emoji: z.string(), price: z.number().int(), heal: z.number().int(), description: z.string() }).strict(),
    feedback: z
      .object({
        ok: z.array(z.string()).min(1),
        ko: z.array(z.string()).min(1),
        casi: z.string(),
        timeout: z.string(),
        oracle: z.string(),
      })
      .strict(),
  })
  .strict();
export type Sequence = z.infer<typeof SequenceSchema>;
export type Act = Sequence['acts'][number];
export type Theme = Sequence['themes'][number];
export type Character = Sequence['characters'][number];

/** Contenu complet, validé, prêt pour le moteur. */
export interface Content {
  sequence: Sequence;
  questions: Question[];
  enemies: Enemy[];
  items: Item[];
  events: GameEvent[];
  synergies: Synergy[];
  scenes: Scenes;
}

export type RoomType = 'combat' | 'elite' | 'shop' | 'rest' | 'event' | 'chest' | 'boss';

export const levelNum = (l: Question['level']): 1 | 2 | 3 | 4 => (l === 'jefe' ? 4 : l);
