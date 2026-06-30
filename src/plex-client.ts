/**
 * Plex API Client
 *
 * Plex uses X-Plex-Token header auth with RESTful XML/JSON endpoints.
 * Base URL: http://host:32400
 */

export interface PlexConfig {
  url: string;
  token: string;
}

export interface PlexServerIdentity {
  machineIdentifier: string;
  version: string;
  friendlyName: string;
}

export interface PlexLibrarySection {
  key: string;
  type: string;
  title: string;
  count: number;
  agent: string;
  refreshing: boolean;
}

export interface PlexLibraryDetails {
  key: string;
  title: string;
  type: string;
  count: number;
  contentCount: number;
  location: { path: string }[];
}

export class PlexClient {
  private config: PlexConfig;

  constructor(config: PlexConfig) {
    this.config = config;
  }

  private async call<T>(path: string): Promise<T> {
    const url = new URL(`${this.config.url}${path}`);
    url.searchParams.set('X-Plex-Token', this.config.token);
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Plex API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  /** Get server identity / health check */
  async getIdentity(): Promise<PlexServerIdentity> {
    const data: any = await this.call('/identity');
    return {
      machineIdentifier: data.MediaContainer?.machineIdentifier || '',
      version: data.MediaContainer?.version || '',
      friendlyName: data.MediaContainer?.friendlyName || '',
    };
  }

  /** Get all library sections */
  async getLibraries(): Promise<PlexLibrarySection[]> {
    const data: any = await this.call('/library/sections');
    const dirs = data.MediaContainer?.Directory || [];
    return dirs.map((d: any) => ({
      key: d.key,
      type: d.type,
      title: d.title,
      agent: d.agent,
      count: Number(d.size || 0),
      refreshing: d.refreshing || false,
    }));
  }

  /** Get library details including mount paths */
  async getLibraryDetails(sectionKey: string): Promise<PlexLibraryDetails | null> {
    const libraries = await this.getLibraries();
    return libraries.find((l) => l.key === sectionKey)?.key
      ? {
          key: sectionKey,
          title: libraries.find((l) => l.key === sectionKey)?.title || '',
          type: libraries.find((l) => l.key === sectionKey)?.type || '',
          count: libraries.find((l) => l.key === sectionKey)?.count || 0,
          contentCount: 0,
          location: [],
        }
      : null;
  }

  /** Health check ping */
  async ping(): Promise<boolean> {
    try {
      await this.getIdentity();
      return true;
    } catch {
      return false;
    }
  }
}
