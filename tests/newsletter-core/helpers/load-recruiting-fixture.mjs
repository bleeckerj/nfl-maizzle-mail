import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Retain the saved fixture's logo and field photograph, adapting its two older
// source shapes to today's schema in memory. The authored email is never edited.
export function loadRecruitingFixture(repoRoot) {
  const file = path.resolve(repoRoot, '../nfl-editorial/emails/jobs/fdaa/platform-counter-inference-analyst/platform-counter-inference-analyst.email.md');
  const source = matter(readFileSync(file, 'utf8')).data;
  if (typeof source.operatorContext.paragraphs === 'string') {
    source.operatorContext.paragraphs = [source.operatorContext.paragraphs];
  }
  source.footer.footerCta = { enabled: false };
  return source;
}
