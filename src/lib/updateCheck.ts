const RELEASE_PAGE_BASE_URL = "https://github.com/hhhyyyy99/prot-skills/releases/tag";
const REMOTE_PACKAGE_URLS = [
  "https://cdn.jsdelivr.net/gh/hhhyyyy99/prot-skills@main/package.json",
  "https://raw.githubusercontent.com/hhhyyyy99/prot-skills/main/package.json",
];

type RemotePackageResponse = {
  version?: unknown;
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

async function fetchPackageVersion(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Update metadata request failed with ${response.status}`);
  }

  const remotePackage = (await response.json()) as RemotePackageResponse;
  if (typeof remotePackage.version !== "string") {
    throw new Error("Remote package metadata is incomplete");
  }

  return remotePackage.version;
}

async function fetchRemotePackageVersion(
  fetcher: typeof fetch,
  sourceIndex = 0,
  firstError?: unknown,
): Promise<string> {
  const url = REMOTE_PACKAGE_URLS[sourceIndex];
  if (!url) throw firstError ?? new Error("Update metadata request failed");

  try {
    return await fetchPackageVersion(url, fetcher);
  } catch (error) {
    return fetchRemotePackageVersion(fetcher, sourceIndex + 1, firstError ?? error);
  }
}

export async function checkForUpdates(
  currentVersion: string,
  fetcher: typeof fetch = fetch,
): Promise<UpdateCheckResult> {
  try {
    const remoteVersion = await fetchRemotePackageVersion(fetcher);
    const comparison = compareVersions(currentVersion, remoteVersion);
    const latestVersion = remoteVersion.replace(/^v/, "");
    if (comparison === null || !parseReleaseVersion(latestVersion)) {
      throw new Error("Remote package version is invalid");
    }

    if (comparison > 0) {
      return {
        status: "available",
        latestVersion,
        releaseUrl: `${RELEASE_PAGE_BASE_URL}/v${latestVersion}`,
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
