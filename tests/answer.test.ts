import { describe, expect, it } from 'vitest';
import { autoHint, checkAnswer, fillBlanks, maskAnswer, normalize, stripAccents } from '../src/engine/answer';

describe('normalisation', () => {
  it('ignore majuscules, ponctuation et espaces', () => {
    expect(normalize('  ¡Estamos   Bailando! ')).toBe('estamos bailando');
    expect(normalize('«Todos los Santos»')).toBe('todos los santos');
    expect(normalize('es / está')).toBe('es está');
  });
  it('retire les accents et le tilde', () => {
    expect(stripAccents('está año pingüino')).toBe('esta ano pinguino');
  });
});

describe('correction tolérante', () => {
  it('accepte la réponse exacte, sans tenir compte des majuscules et de la ponctuation', () => {
    expect(checkAnswer('ESTOY COMIENDO PAN DE MUERTO.', ['Estoy comiendo pan de muerto'])).toBe('ok');
    expect(checkAnswer('¿yendo?', ['yendo'])).toBe('ok');
  });
  it('renvoie null pour une saisie vide', () => {
    expect(checkAnswer('   ', ['yendo'])).toBeNull();
  });
  it('un accent oublié donne « casi »', () => {
    expect(checkAnswer('esta leyendo', ['Está leyendo'])).toBe('casi');
    expect(checkAnswer('estais cantando', ['Estáis cantando'])).toBe('casi');
  });
  it('un tilde (ñ) oublié donne aussi « casi »', () => {
    expect(checkAnswer('acompanar', ['acompañar'])).toBe('casi');
  });
  it('la politique des accents est paramétrable', () => {
    expect(checkAnswer('esta', ['está'], { accents: 'accept' })).toBe('ok');
    expect(checkAnswer('esta', ['está'], { accents: 'strict' })).toBe('ko');
  });
  it('une vraie erreur reste une erreur', () => {
    expect(checkAnswer('leiendo', ['leyendo'])).toBe('ko');
    expect(checkAnswer('somos bailando', ['estamos bailando'])).toBe('ko');
  });
  it('articles facultatifs (vocabulaire)', () => {
    expect(checkAnswer('lanza', ['la lanza'], { ignoreArticles: true })).toBe('ok');
    expect(checkAnswer('las lanzas', ['la lanza'], { ignoreArticles: true })).toBe('ko');
    expect(checkAnswer('molino', ['el molino'], { ignoreArticles: true })).toBe('ok');
    expect(checkAnswer('lanza', ['la lanza'], { ignoreArticles: false })).toBe('ko');
  });
  it('pronom sujet facultatif', () => {
    expect(checkAnswer('nosotros estamos decorando el altar', ['Estamos decorando el altar'])).toBe('ok');
    expect(checkAnswer('Estoy comiendo', ['yo estoy comiendo'])).toBe('ok');
    expect(checkAnswer('tú estás durmiendo', ['Estás durmiendo'])).toBe('ok');
    expect(checkAnswer('nosotros estamos', ['estamos'], { optionalSubject: false })).toBe('ko');
  });
  it('pronom facultatif + accent oublié = casi', () => {
    expect(checkAnswer('el esta leyendo', ['Está leyendo'])).toBe('casi');
  });
  it('réponses à plusieurs trous : la barre est facultative', () => {
    expect(checkAnswer('es está', ['es / está'])).toBe('ok');
    expect(checkAnswer('es, esta', ['es / está'])).toBe('casi');
  });
  it('accepte les réponses alternatives', () => {
    expect(checkAnswer('ellas', ['ellos', 'ellas', 'ustedes'])).toBe('ok');
  });
});

describe('outils', () => {
  it('remplit les trous', () => {
    expect(fillBlanks('El pan ___ dulce y ___ en la mesa.', 'es / está')).toBe('El pan es dulce y está en la mesa.');
    expect(fillBlanks('El alebrije está ___. (volar)', 'volando')).toBe('El alebrije está volando.');
    expect(fillBlanks('Traduis : « Je… »', 'Estoy')).toBe('Estoy');
    expect(fillBlanks('___ estoy en la fiesta.', 'yo')).toBe('Yo estoy en la fiesta.');
    expect(fillBlanks('¿Qué estás ___? (decir)', 'diciendo')).toBe('¿Qué estás diciendo?');
  });
  it('indice automatique sans article', () => {
    expect(autoHint('la vela')).toBe('La réponse commence par « V » et compte 4 lettres.');
  });
  it('masque une lettre sur deux', () => {
    expect(maskAnswer('está bien')).toBe('e_t_ b_e_');
  });
});
