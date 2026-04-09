/**
 * NLP-based actor-action-target triple extraction from news headlines and summaries.
 * Uses compromise for lightweight POS tagging and pattern matching.
 *
 * @module nlpExtractor
 */
import nlp from 'compromise';

export interface ArticleTriple {
  actor: string | null;
  action: string | null;
  target: string | null;
}

/** Normalize extracted text: trim, collapse whitespace, null for empty */
function normalize(text: string | undefined | null): string | null {
  if (!text) return null;
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extract an actor-action-target triple from a news headline and optional summary.
 *
 * Strategy: Try multiple compromise match patterns on combined text in priority order,
 * returning the first match with at least 2 non-null fields. Falls back to entity
 * extraction (.people(), .places(), .verbs()) for partial triples.
 */
export function extractTriple(title: string, summary?: string): ArticleTriple {
  const text = summary ? `${title}. ${summary}` : title;
  const doc = nlp(text);

  // Named capture group patterns, ordered from most specific to least
  const patterns: string[] = [
    // Pattern A: "Iran launches missile strike on Israel"
    '[<actor>#ProperNoun+] [<action>#Verb+ #Noun*] (on|at|in|against|into) [<target>#ProperNoun+]',
    // Pattern B: "Iran strikes Israel"
    '[<actor>#ProperNoun+] [<action>#Verb+] [<target>#ProperNoun+]',
    // Pattern C: "Airstrike in Damascus" (no actor)
    '[<action>#Noun+] (in|at|near|on) [<target>#ProperNoun+]',
  ];

  for (const pattern of patterns) {
    const match = doc.match(pattern);
    if (match.found) {
      const groups = match.groups() as Record<string, { text(): string } | undefined>;
      const actor = normalize(groups['actor']?.text());
      const action = normalize(groups['action']?.text());
      const target = normalize(groups['target']?.text());

      // Return only if we got at least 2 non-null fields
      const fieldCount = [actor, action, target].filter(Boolean).length;
      if (fieldCount >= 2) {
        return { actor, action, target };
      }
    }
  }

  // Fallback: extract any available components from the full text
  const people = doc.people().out('array') as string[];
  const places = doc.places().out('array') as string[];
  const verbs = doc.verbs().out('array') as string[];

  // Prefer people for actor, places for target
  const actor = normalize(people[0]) ?? normalize(places[0]) ?? null;
  const action = normalize(verbs[0]) ?? null;
  // Target: prefer a place/person different from the actor
  const targetCandidates = [
    ...places.filter((p) => normalize(p) !== actor),
    ...people.filter((p) => normalize(p) !== actor),
  ];
  const target = normalize(targetCandidates[0]) ?? null;

  return { actor, action, target };
}
