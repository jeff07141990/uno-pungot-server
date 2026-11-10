export const CURRENT_APP_VERSION = '1.0.13';
export const CURRENT_VERSION_CODE = 14;

export interface AppVersionInfo {
  latestVersion: string;
  latestVersionCode: number;
  minSupportedVersion?: string;
  title: string;
  releaseNotes: string[];
  downloadUrl: string;
}

export const checkAppUpdate = async (candidateHosts: string[]): Promise<AppVersionInfo | null> => {
  for (const host of candidateHosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${host}/api/app-version`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data: AppVersionInfo = await res.json();
        if (data.latestVersionCode > CURRENT_VERSION_CODE) {
          return data;
        }
        return null;
      }
    } catch {
      // Continue to next host candidate
    }
  }
  return null;
};
