
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

describe("Edvexa Support API", () => {
  describe("GET /api/health", () => {
    it("returns a successful health response", async () => {
      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        service: "edvexa-support-api",
      });
    });
  });

  describe("Unknown routes", () => {
    it("returns 404 for an unknown endpoint", async () => {
      const response = await request(app).get(
        "/api/this-route-does-not-exist",
      );

      expect(response.status).toBe(404);
    });
  });

  describe("Authentication validation", () => {
    it("rejects registration with an empty request body", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it("rejects login with an empty request body", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });
});
