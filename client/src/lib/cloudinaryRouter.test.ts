import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import cloudinaryRouter from "../../../api/cloudinary-router";

type ResponseMock = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (code: number) => ResponseMock;
  json: (body: unknown) => ResponseMock;
  setHeader: (name: string, value: string) => void;
};

function createResponse(): ResponseMock {
  const response: ResponseMock = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  };
  return response;
}

async function invoke(action: string, method = "POST", body: unknown = {}) {
  const response = createResponse();
  await cloudinaryRouter(
    { method, body, query: { action }, headers: {} },
    response
  );
  return response;
}

describe("Cloudinary Vercel API router", () => {
  it("rejects actions that are not explicitly allowlisted", async () => {
    const response = await invoke("unknown");
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Cloudinary action not found." });
  });

  it("preserves the session endpoint's POST-only contract", async () => {
    const response = await invoke("session", "GET");
    expect(response.statusCode).toBe(405);
    expect(response.body).toEqual({ error: "Method not allowed" });
  });

  it("requires a Cari capability for both signature paths", async () => {
    const signature = await invoke("cari-signature");
    expect(signature.statusCode).toBe(400);
    expect(signature.body).toEqual({
      error: "A valid Cari session capability is required.",
    });

    const adminSignature = await invoke("signature", "POST", {
      sessionId: "session-id",
    });
    expect(adminSignature.statusCode).toBe(400);
    expect(adminSignature.body).toEqual({
      error: "A valid Cari session capability is required.",
    });
  });

  it("keeps administrator signature requests behind bearer authentication", async () => {
    const response = await invoke("signature", "POST", {
      folder: "nexus/media",
    });
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      error: "A Firebase sign-in token is required.",
    });
  });

  it("requires both session cleanup capability fields", async () => {
    const response = await invoke("session-cleanup", "POST", {
      sessionId: "session-id",
    });
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "sessionId and cleanupToken are required",
    });
  });
});

describe("Vercel Cloudinary route configuration", () => {
  it("rewrites each existing Cloudinary URL to the shared handler", () => {
    const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
    const config = JSON.parse(
      readFileSync(resolve(root, "vercel.json"), "utf8")
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };
    const routes = [
      "signature",
      "cari-signature",
      "session",
      "session-cleanup",
    ];

    for (const route of routes) {
      expect(config.rewrites).toContainEqual({
        source: `/api/cloudinary/${route}`,
        destination: `/api/cloudinary-router?action=${route}`,
      });
    }
    expect(
      config.rewrites.findIndex(rewrite => rewrite.source === "/(.*)")
    ).toBe(config.rewrites.length - 1);
  });

  it("keeps the deployed API entrypoint count at ten or fewer", () => {
    const apiDirectory = resolve(
      fileURLToPath(new URL("../../../api", import.meta.url))
    );
    const countFunctions = (directory: string): number =>
      readdirSync(directory).reduce((count, entry) => {
        const path = resolve(directory, entry);
        const stats = statSync(path);
        if (stats.isDirectory()) return count + countFunctions(path);
        return count + (path.endsWith(".ts") ? 1 : 0);
      }, 0);

    expect(countFunctions(apiDirectory)).toBeLessThanOrEqual(10);
  });
});
