import { describe, expect, it } from "vitest";
import { interpretRunnerRequest } from "../src/intent";

describe("natural runner requests", () => {
  it("understands a Thai schedule request without exact command syntax", () => {
    expect(interpretRunnerRequest("อยากวิ่ง 5 กม. ในกรุงเทพแบบชิล ๆ และไม่ดื่ม")).toEqual({
      action: "plan",
      filters: {
        city: "Bangkok",
        distanceKm: 5,
        pace: "social",
        socialPreference: "alcohol_free",
        alcoholFreeRequired: true,
      },
    });
  });

  it("recognizes comparison and safe-return jobs from conversational phrasing", () => {
    expect(interpretRunnerRequest("ช่วยเทียบงานสาย social ในเชียงใหม่ให้หน่อย")).toMatchObject({
      action: "compare",
      filters: { city: "Chiang Mai", pace: "social" },
    });
    expect(interpretRunnerRequest("มี 7 km ที่ภูเก็ตไหม แล้วกลับบ้านยังไง")).toMatchObject({
      action: "safe_return",
      filters: { city: "Phuket", distanceKm: 7 },
    });
  });

  it("keeps optional form choices as fallbacks and lets the sentence override them", () => {
    const result = interpretRunnerRequest("ขอขอนแก่นแบบเร็วหน่อย", { city: "Bangkok", distanceKm: 10 });
    expect(result.filters).toEqual({ city: "Khon Kaen", distanceKm: 10, pace: "tempo" });
  });

  it("routes memory requests without exposing tool names", () => {
    expect(interpretRunnerRequest("ช่วยจำตารางนี้ไว้ให้หน่อย").action).toBe("save_plan");
    expect(interpretRunnerRequest("เปิดแผนที่บันทึกไว้ใน Passport").action).toBe("show_passport");
  });

  it("recognizes a circular preparation request", () => {
    expect(interpretRunnerRequest("งานนี้ต้องเตรียมอะไร ยืมหรือเติมก่อนซื้อได้ไหม").action).toBe("support_loop");
  });
});
