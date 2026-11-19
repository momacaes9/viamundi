// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readingMinutes, renderMarkdown, slugify } from "../src/lib/content";

describe("renderMarkdown blocks stored XSS", () => {
  const attacks = [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    "[click](javascript:alert(1))",
    '<a href="javascript:alert(1)">x</a>',
    '<iframe src="https://evil.example"></iframe>',
    '<svg><script>alert(1)</script></svg>',
    '<div style="background:url(javascript:alert(1))">x</div>',
    '<form action="https://evil.example"><input name=p></form>',
  ];
  it.each(attacks)("neutralizes %s", (md) => {
    const html = renderMarkdown(md);
    expect(html).not.toMatch(/<script|onerror|javascript:|<iframe|<form|<input|style=/i);
  });

  it("keeps normal formatting and hardens external links", () => {
    const html = renderMarkdown("## Bolsas\n\n**Importante:** veja [o guia](https://example.com).");
    expect(html).toContain("<h2>Bolsas</h2>");
    expect(html).toContain("<strong>Importante:</strong>");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe("slugify", () => {
  it.each([
    ["Como escolher Universidades nos EUA!", "como-escolher-universidades-nos-eua"],
    ["  Bolsas de Estudo: Guia 2026 ", "bolsas-de-estudo-guia-2026"],
    ["Ação & Reação", "acao-reacao"],
    ["../../etc/passwd", "etc-passwd"],
    ["", ""],
  ])("%s → %s", (input, out) => expect(slugify(input)).toBe(out));
});

it("estimates reading time", () => {
  expect(readingMinutes("")).toBe(1);
  expect(readingMinutes("word ".repeat(660))).toBe(3);
});
