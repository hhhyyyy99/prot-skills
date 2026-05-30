const LATEST_RELEASE_URL = "https://api.github.com/repos/hhhyyyy99/prot-skills/releases/latest";

type ReleaseResponse = {
  tag_name?: unknown;
  html_url?: unknown;
};

export type VersionParts = {
  major: number;
  minor: number;
  patch: number;
};

export type UpdateCheckResult =
  | {
      status: "current";
      latestVersion: string;
    }
  | {
      status: "available";
      latestVersion: string;
      releaseUrl: string;
    }
  | {
      status: "failed";
      error: string;
    };

export function parseReleaseVersion(value: string): VersionParts | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareVersions(current: string, latest: string): number | null {
  const currentParts = parseReleaseVersion(current);
  const latestParts = parseReleaseVersion(latest);

  if (!currentParts || !latestParts) return null;

  for (const key of ["major", "minor", "patch"] as const) {
    if (latestParts[key] > currentParts[key]) return 1;
    if (latestParts[key] < currentParts[key]) return -1;
  }

  return 0;
}

export async function checkForUpdates(
  currentVersion: string,
  fetcher: typeof fetch = fetch,
): Promise<UpdateCheckResult> {
  try {
    const response = await fetcher(LATEST_RELEASE_URL, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Release request failed with ${response.status}`);
    }

    const release = (await response.json()) as ReleaseResponse;
    if (typeof release.tag_name !== "string" || typeof release.html_url !== "string") {
      throw new Error("Latest release metadata is incomplete");
    }

    const comparison = compareVersions(currentVersion, release.tag_name);
    const latestVersion = release.tag_name.replace(/^v/, "");
    if (comparison === null || !parseReleaseVersion(latestVersion)) {
      throw new Error("Latest release version is invalid");
    }

    if (comparison > 0) {
      return {
        status: "available",
        latestVersion,
        releaseUrl: release.html_url,
      };
    }

    return {
      status: "current",
      latestVersion,
    };
  } catch (error) {
    return {
      status: "failed",
      error: String((error as { message?: string })?.message ?? error),
    };
  }
}
