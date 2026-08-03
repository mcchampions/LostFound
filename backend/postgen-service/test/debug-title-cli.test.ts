import { describe, expect, it } from 'vitest';
import { inspectTitleLayoutByTitle } from '../src/debug.js';

describe('debug title helpers', () => {
  it('supports inline title input with escaped newlines', () => {
    const inspected = inspectTitleLayoutByTitle('xhs-note', '第一行\\n第二行', 3);

    expect(inspected.profile.title).toBe('第一行\n第二行');
    expect(inspected.result.lines).toEqual(['第一行', '第二行']);
  });

  it('returns summary and debug candidates together', () => {
    const inspected = inspectTitleLayoutByTitle('xhs-quote-blue', '当我给openclaw 🦞接入了特斯拉数据后', 3);

    expect(inspected.summary.lineCount).toBeGreaterThan(0);
    expect(inspected.summary.lastLineRatio).toBeGreaterThan(0);
    expect(inspected.result.debug?.topCandidates.length).toBeLessThanOrEqual(3);
  });
});
