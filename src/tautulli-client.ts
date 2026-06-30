/**
 * Tautulli API Client
 *
 * Tautulli uses query-parameter auth: ?apikey=KEY&cmd=COMMAND
 * Base URL: http://host:port/tautulli/api/v2
 */

export interface TautulliConfig {
  url: string;
  apiKey: string;
}

export interface TautulliServerInfo {
  pms_name: string;
  pms_version: string;
  pms_platform: string;
  pms_ip: string;
  pms_port: number;
}

export interface TautulliUser {
  user_id: number;
  username: string;
  friendly_name: string;
  last_seen: string;
  total_plays: number;
}

export interface TautulliActivitySession {
  id: string;
  title: string;
  user: string;
  progress: number;
  state: string;
}

export class TautulliClient {
  private config: TautulliConfig;

  constructor(config: TautulliConfig) {
    this.config = config;
  }

  private async call<T>(cmd: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.config.url}/api/v2`);
    url.searchParams.set('apikey', this.config.apiKey);
    url.searchParams.set('cmd', cmd);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Tautulli API error: ${res.status}`);
    const data: any = await res.json();
    if (data.response?.result === 'error') {
      throw new Error(`Tautulli error: ${data.response.message || 'Unknown error'}`);
    }
    return data.response?.data as T;
  }

  /** Get server info */
  async getServerInfo(): Promise<TautulliServerInfo> {
    return this.call<TautulliServerInfo>('get_server_info');
  }

  /** Get all Plex users */
  async getUsers(): Promise<TautulliUser[]> {
    return this.call<TautulliUser[]>('get_users');
  }

  /** Get currently active streams */
  async getActivity(): Promise<{ session_count: number; sessions: TautulliActivitySession[] }> {
    return this.call('get_activity');
  }

  /** Get recently added media */
  async getRecentlyAdded(count: number = 10): Promise<any[]> {
    return this.call<any[]>('get_recently_added', { count: String(count) });
  }

  /** Get all libraries */
  async getLibraries(): Promise<any[]> {
    return this.call<any[]>('get_libraries');
  }

  /** Get user watch stats */
  async getUserWatchStats(userId: string): Promise<any> {
    return this.call<any>('get_user_watch_stats', { user_id: userId });
  }

  /** Get history with pagination */
  async getHistory(limit: number = 50): Promise<any> {
    return this.call<any>('get_history', { length: String(limit) });
  }

  /** Health check */
  async ping(): Promise<boolean> {
    try {
      await this.getServerInfo();
      return true;
    } catch {
      return false;
    }
  }
}
