import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("responde ok sin depender de la base de datos", () => {
    expect(new HealthController().comprobar()).toEqual({ status: "ok" });
  });
});
