import { describe, expect, it } from "vitest";
import {
  checkReadiness,
  confirmPendingRegistration,
  discoverEvents,
  getRules,
  readRegistrations,
  safeReturnOptions,
  stageRegistration,
  validateRegistration,
} from "../src/domain";
import type { RegistrationInput } from "../src/types";
import { MemoryStorage } from "./helpers";

const validRegistration: RegistrationInput = {
  eventId: "bkk-riverside-5",
  runnerName: "Nok Runner",
  email: "nok@example.com",
  emergencyContact: "0812345678",
  pace: "social",
  socialPreference: "alcohol_free",
  age20Plus: false,
  transportMode: "transit",
  rulesAccepted: true,
  privacyAccepted: true,
};

describe("event discovery", () => {
  it("returns structured matches for Bangkok 5K with alcohol-free support", () => {
    const results = discoverEvents({
      city: "Bangkok",
      distanceKm: 5,
      alcoholFreeRequired: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.event.id).toBe("bkk-riverside-5");
    expect(results[0]?.matchReasons).toContain("มีตัวเลือก alcohol-free");
  });
});

describe("safety and readiness", () => {
  it("blocks an under-20 alcohol selection", () => {
    const result = checkReadiness({
      eventId: "bkk-riverside-5",
      age20Plus: false,
      hasConcerningSymptoms: false,
      hasHydrationPlan: true,
      transportMode: "transit",
      socialPreference: "beer_optional",
    });

    expect(result.status).toBe("blocked");
    expect(result.requiredActions.join(" ")).toContain("alcohol-free");
  });

  it("blocks participation when concerning symptoms are declared", () => {
    const result = checkReadiness({
      eventId: "cnx-moat-5",
      age20Plus: true,
      hasConcerningSymptoms: true,
      hasHydrationPlan: true,
      transportMode: "taxi",
      socialPreference: "alcohol_free",
    });

    expect(result.status).toBe("blocked");
    expect(result.disclaimer).toContain("ไม่ใช่การประเมินหรือวินิจฉัย");
  });

  it("never recommends driving after optional beer", () => {
    const result = safeReturnOptions("bkk-riverside-5", "beer_optional");
    expect(result.warning).toContain("ห้ามขับรถหลังดื่ม");
    expect(result.options.map((option) => option.mode)).not.toContain("drive");
  });

  it("states that the platform does not sell or give away alcohol", () => {
    const result = getRules();
    expect(result.alcoholPolicy).toContain("ไม่ขาย");
    expect(result.alcoholPolicy).toContain("ไม่แจก");
  });
});

describe("human-confirmed registration", () => {
  it("rejects optional beer without a 20+ declaration", () => {
    const result = validateRegistration({
      ...validRegistration,
      socialPreference: "beer_optional",
      age20Plus: false,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("20 ปีขึ้นไป");
  });

  it("stages first and creates a pass only after confirmation", () => {
    const storage = new MemoryStorage();
    const staged = stageRegistration(storage, validRegistration);
    expect(staged.status).toBe("pending_human_confirmation");
    expect(readRegistrations(storage)).toHaveLength(0);

    const pass = confirmPendingRegistration(storage);
    expect(pass.status).toBe("confirmed");
    expect(pass.id).toMatch(/^PASS-/);
    expect(readRegistrations(storage)).toHaveLength(1);
  });
});
