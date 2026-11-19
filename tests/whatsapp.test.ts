import { describe, expect, it, vi } from "vitest";
import { buildWhatsAppMessage, readUtm, routeAdvisor, submitLead, toE164, validateLead, whatsAppUrl } from "../src/lib/whatsapp";
import { venmoPayLink } from "../src/lib/payments";

describe("routing", () => {
  it("routes by region", () => {
    expect(routeAdvisor("BR")).toBe("julia");
    expect(routeAdvisor("US")).toBe("monica");
    expect(routeAdvisor("INTL")).toBe("monica");
  });
  it("splits no-preference leads", () => {
    expect(routeAdvisor(null, () => 0.1)).toBe("julia");
    expect(routeAdvisor(null, () => 0.9)).toBe("monica");
  });
});

describe("wa.me links", () => {
  it("uses digits-only E.164 and encodes text", () => {
    expect(whatsAppUrl("julia", "Olá & tudo?")).toBe("https://wa.me/5547991795200?text=Ol%C3%A1%20%26%20tudo%3F");
    expect(whatsAppUrl("monica", "hi")).toBe("https://wa.me/19195937405?text=hi");
  });
  it("builds a localized message with only user-provided content", () => {
    expect(buildWhatsAppMessage({ fullName: "Ana", programInterest: "SAT", message: "Quero saber mais", locale: "pt" }))
      .toBe("Olá! Sou Ana.\nTenho interesse em: SAT.\nQuero saber mais");
    expect(buildWhatsAppMessage({ fullName: "Ana", locale: "en" })).toBe("Hi! I'm Ana.");
  });
});

describe("E.164", () => {
  it.each([
    ["+55 47 99179-5200", null, "+5547991795200"],
    ["(47) 99179-5200", "BR", "+5547991795200"],
    ["919-593-7405", "US", "+19195937405"],
    ["0044 20 7946 0958", "INTL", "+442079460958"],
    ["12345", "BR", null],
    ["", "BR", null],
  ] as const)("%s (%s) → %s", (raw, region, out) => {
    expect(toE164(raw, region)).toBe(out);
  });
});

describe("validation + utm", () => {
  it("rejects bad input", () => {
    expect(validateLead({ fullName: "A", region: "BR", locale: "pt", submitterRole: "student", consent: true })).toBeTruthy();
    expect(validateLead({ fullName: "Ana", email: "nope", region: "BR", locale: "en", submitterRole: "student", consent: true })).toBe("Invalid email.");
    expect(validateLead({ fullName: "Ana", region: null, locale: "pt", submitterRole: "guardian", consent: true })).toBeNull();
    expect(validateLead({ fullName: "Ana", region: null, locale: "en", submitterRole: "student", consent: false })).toMatch(/privacy/);
  });
  it("keeps only utm params", () => {
    expect(readUtm("?utm_source=ig&x=1&utm_campaign=fall")).toEqual({ utm_source: "ig", utm_campaign: "fall" });
  });
});

describe("submitLead", () => {
  it("still returns the WhatsApp link when the insert fails", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "500" } });
    const sb = { from: () => ({ insert }) } as never;
    const r = await submitLead(sb, { fullName: "Ana", region: "US", phone: "9195937405", locale: "en", submitterRole: "student", consent: true });
    expect(r).toMatchObject({ advisor: "monica", logged: false });
    expect(r.url.startsWith("https://wa.me/19195937405?text=")).toBe(true);
    expect(insert.mock.calls[0][0]).toMatchObject({ routed_to: "monica", phone_e164: "+19195937405", region: "US" });
  });
});

describe("venmo fallback link", () => {
  it("builds app and web links", () => {
    expect(venmoPayLink({ handle: "@viamundi", amountUsd: 150, note: "VM-123" }))
      .toBe("venmo://paycharge?txn=pay&recipients=viamundi&amount=150.00&note=VM-123");
    expect(venmoPayLink({ handle: "viamundi", amountUsd: 1.5, note: "x", web: true }).startsWith("https://venmo.com/?")).toBe(true);
  });
});
