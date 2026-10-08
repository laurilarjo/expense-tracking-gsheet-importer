import { describe, it, expect } from 'vitest';
import { MLCategorizationService } from '../ml-categorization-service';

describe('MLCategorizationService member namespacing', () => {
  it('constructs independent services per memberId', () => {
    const a = new MLCategorizationService('member-a');
    const b = new MLCategorizationService('member-b');
    expect(a).not.toBe(b);
    expect(a.isModelAvailable()).toBe(false);
    expect(b.isModelAvailable()).toBe(false);
  });

  it('export without a model throws', async () => {
    const a = new MLCategorizationService('member-a');
    await expect(a.exportModelArtifacts()).rejects.toThrow(/No model/);
  });
});
