import { describe, expect, it, vi } from "vitest";
import { checkForUpdates, compareVersions, parseReleaseVersion } from "@/lib/updateCheck";

function mockResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function mockFetch(...responses: Response[]): typeof fetch {
  return vi.fn(() => {
    const response = responses.shift() ?? mockResponse({}, false, 404);
    return Promise.resolve(response);
  }) as unknown as typeof fetch;
}

describe("updateCheck", () => {
  it("parses release versions with or without a v prefix", () => {
    expect(parseReleaseVersion("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseReleaseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseReleaseVersion("v1.2")).toBeNull();
    expect(parseReleaseVersion("v1.2.3-beta.1")).toBeNull();
  });

  it("compares equal, older, newer, and malformed versions", () => {
    expect(compareVersions("1.2.3", "v1.2.3")).toBe(0);
    expect(compareVersions("1.2.3", "v1.2.4")).toBe(1);
    expect(compareVersions("1.2.3", "v1.2.2")).toBe(-1);
    expect(compareVersions("bad", "v1.2.3")).toBeNull();
    expect(compareVersions("1.2.3", "latest")).toBeNull();
  });

  it("returns available when the latest release is newer", async () => {
    const fetcher = mockFetch(
      mockResponse({
        version: "1.2.4",
      }),
    );

    await expect(checkForUpdates("1.2.3", fetcher)).resolves.toEqual({
      status: "available",
      latestVersion: "1.2.4",
      releaseUrl: "https://github.com/hhhyyyy99/prot-skills/releases/tag/v1.2.4",
    });
  });

  it("returns current when the latest release is not newer", async () => {
    const fetcher = mockFetch(
      mockResponse({
        version: "1.2.3",
      }),
    );

    await expect(checkForUpdates("1.2.3", fetcher)).resolves.toEqual({
      status: "current",
      latestVersion: "1.2.3",
    });
  });

  it("returns failed when release metadata is unusable", async () => {
    const fetcher = mockFetch(mockResponse({ version: "latest" }));

    await expect(checkForUpdates("1.2.3", fetcher)).resolves.toMatchObject({
      status: "failed",
    });
  });

  it("falls back to a second static metadata source when the first one fails", async () => {
    const fetcher = mockFetch(
      mockResponse({}, false, 503),
      mockResponse({
        version: "1.2.4",
      }),
    );

    await expect(checkForUpdates("1.2.3", fetcher)).resolves.toEqual({
      status: "available",
      latestVersion: "1.2.4",
      releaseUrl: "https://github.com/hhhyyyy99/prot-skills/releases/tag/v1.2.4",
    });
  });
});
