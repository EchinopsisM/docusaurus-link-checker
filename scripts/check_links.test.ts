import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripCodeBlocks, extractMdLinks, parseArgs } from './check_links.ts';

// ─────────────────────────────────────────────
// stripCodeBlocks
// ─────────────────────────────────────────────

describe('stripCodeBlocks', () => {
  it('removes fenced code blocks (backtick)', () => {
    const input = 'before\n```js\nconst x = 1;\n```\nafter';
    const result = stripCodeBlocks(input);
    assert.ok(!result.includes('const x'), 'fenced block contents should be removed');
    assert.ok(result.includes('before'), 'text before block should remain');
    assert.ok(result.includes('after'), 'text after block should remain');
  });

  it('removes fenced code blocks (tilde)', () => {
    const input = 'before\n~~~sh\necho hello\n~~~\nafter';
    const result = stripCodeBlocks(input);
    assert.ok(!result.includes('echo hello'));
    assert.ok(result.includes('before'));
    assert.ok(result.includes('after'));
  });

  it('removes inline code', () => {
    const result = stripCodeBlocks('check `inline code here` text');
    assert.ok(!result.includes('inline code here'));
    assert.ok(result.includes('check'));
    assert.ok(result.includes('text'));
  });

  it('removes HTML comments', () => {
    const result = stripCodeBlocks('before <!-- hidden stuff --> after');
    assert.ok(!result.includes('hidden stuff'));
    assert.ok(result.includes('before'));
    assert.ok(result.includes('after'));
  });

  it('removes multiline HTML comments', () => {
    const result = stripCodeBlocks('a\n<!--\nmultiline\ncomment\n-->\nb');
    assert.ok(!result.includes('multiline'));
    assert.ok(result.includes('a'));
    assert.ok(result.includes('b'));
  });

  it('preserves normal text untouched', () => {
    const input = 'Hello world. [link](https://example.com)';
    assert.equal(stripCodeBlocks(input), input);
  });

  it('removes a link inside a fenced block', () => {
    const input = '```\n[sneaky](https://inside-block.com)\n```';
    const result = stripCodeBlocks(input);
    assert.ok(!result.includes('inside-block.com'));
  });
});

// ─────────────────────────────────────────────
// extractMdLinks
// ─────────────────────────────────────────────

describe('extractMdLinks', () => {
  it('extracts a basic inline link', () => {
    const links = extractMdLinks('[click here](https://example.com)');
    assert.ok(links.some((l) => l.url === 'https://example.com' && l.text === 'click here'));
  });

  it('extracts an inline link with a title', () => {
    const links = extractMdLinks('[docs](https://example.com/docs "Documentation")');
    assert.ok(links.some((l) => l.url === 'https://example.com/docs'));
  });

  it('extracts reference-style links', () => {
    const md = '[link text][myref]\n\n[myref]: https://ref-target.com';
    const links = extractMdLinks(md);
    assert.ok(links.some((l) => l.url === 'https://ref-target.com' && l.text === 'link text'));
  });

  it('extracts a bare https URL', () => {
    const links = extractMdLinks('Visit https://bare-url.com for details.');
    assert.ok(links.some((l) => l.url === 'https://bare-url.com'));
  });

  it('strips trailing punctuation from bare URLs', () => {
    const links = extractMdLinks('See https://example.com/page.');
    const found = links.find((l) => l.url.startsWith('https://example.com'));
    assert.ok(found, 'should find the bare URL');
    assert.ok(!found!.url.endsWith('.'), 'trailing period should be stripped');
  });

  it('ignores links inside fenced code blocks', () => {
    const md = '```\n[hidden](https://inside-code.com)\n```';
    const links = extractMdLinks(md);
    assert.ok(!links.some((l) => l.url.includes('inside-code.com')));
  });

  it('ignores bare URLs inside inline code', () => {
    const md = 'Use `https://inline-code-url.com` to configure.';
    const links = extractMdLinks(md);
    assert.ok(!links.some((l) => l.url.includes('inline-code-url.com')));
  });

  it('extracts <a href> inline HTML', () => {
    const links = extractMdLinks('<a href="https://html-link.com">text</a>');
    assert.ok(links.some((l) => l.url === 'https://html-link.com'));
  });

  it('extracts <a href> with single quotes', () => {
    const links = extractMdLinks("<a href='https://single-quote.com'>x</a>");
    assert.ok(links.some((l) => l.url === 'https://single-quote.com'));
  });

  it('returns empty array for content with no links', () => {
    const links = extractMdLinks('Just plain text with no links whatsoever.');
    assert.equal(links.length, 0);
  });

  it('does not double-count a URL that appears in both inline link and bare form', () => {
    // The bare-URL pass skips positions already captured by the inline-link pass
    const md = '[example](https://example.com/page)';
    const links = extractMdLinks(md);
    const matches = links.filter((l) => l.url === 'https://example.com/page');
    assert.equal(matches.length, 1, 'URL should appear exactly once');
  });
});

// ─────────────────────────────────────────────
// parseArgs
// ─────────────────────────────────────────────

describe('parseArgs', () => {
  it('parses --mode live', () => {
    const args = parseArgs(['--mode', 'live']);
    assert.equal(args['mode'], 'live');
  });

  it('parses --site-domain foo.com', () => {
    const args = parseArgs(['--site-domain', 'foo.com']);
    assert.equal(args['site-domain'], 'foo.com');
  });

  it('parses boolean flag --no-external as "true"', () => {
    const args = parseArgs(['--no-external']);
    assert.equal(args['no-external'], 'true');
  });

  it('parses multiple flags together', () => {
    const args = parseArgs(['--mode', 'local', '--no-external', '--threads', '4']);
    assert.equal(args['mode'], 'local');
    assert.equal(args['no-external'], 'true');
    assert.equal(args['threads'], '4');
  });

  it('returns empty object for empty argv', () => {
    const args = parseArgs([]);
    assert.deepEqual(args, {});
  });

  it('treats a value starting with -- as a boolean flag (no value consumed)', () => {
    // --foo --bar: --foo gets 'true', --bar gets 'true'
    const args = parseArgs(['--foo', '--bar']);
    assert.equal(args['foo'], 'true');
    assert.equal(args['bar'], 'true');
  });
});
