import { parseContent } from '../src/engine/content';
import type { Content } from '../src/engine/schema';
import { readSequence } from '../scripts/read-content';

let cached: Content | null = null;
export function content(): Content {
  if (cached) return cached;
  const { content, issues } = parseContent(readSequence('quijote'));
  if (!content) throw new Error(issues.map(i => `${i.where}: ${i.message}`).join('\n'));
  cached = content;
  return content;
}
