import { TestBed } from '@angular/core/testing';
import { HelpResolverService } from './help-resolver.service';

describe('HelpResolverService', () => {
  let resolver: HelpResolverService;

  beforeEach(() => {
    resolver = TestBed.inject(HelpResolverService);
  });

  it('resolves registered help topics by key', () => {
    const topic = resolver.resolve('admin.forms.visibility');

    expect(topic.key).toBe('admin.forms.visibility');
    expect(topic.title).toBe('Form visibility');
  });

  it('returns a fallback topic for an unknown key', () => {
    const topic = resolver.resolve('missing.topic');

    expect(topic.key).toBe('missing.topic');
    expect(topic.title).toBe('Help unavailable');
    expect(topic.sections[0].paragraphs?.[0]).toContain('missing.topic');
  });
});
