/**
 * Seerr API Client
 *
 * Seerr uses X-Api-Key header auth with RESTful JSON endpoints.
 * Base URL: https://host/api/v1
 */

export interface SeerrConfig {
  url: string;
  apiKey: string;
}

export interface SeerrStatus {
  version: string;
  commitTag: string;
  updateAvailable: boolean;
  commitsBehind: number;
  restartRequired: boolean;
}

export interface SeerrRequest {
  id: number;
  status: number;
  media: {
    id: number;
    tmdbId: number;
    tvdbId?: number;
    status: number;
    mediaType: string;
    title?: string;
    seasons?: { seasonNumber: number }[];
  };
  type: string;
  requestedBy: {
    id: number;
    displayName: string;
    email: string;
  };
  modifiedBy?: {
    id: number;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
  is4k: boolean;
  serverId: number;
  profileId: number;
  profileName?: string;
}

export interface SeerrRequestCounts {
  total: number;
  movie: number;
  tv: number;
  pending: number;
  approved: number;
  declined: number;
  processing: number;
  available: number;
  completed: number;
}

export interface SeerrMedia {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  status: number;
  status4k: number;
  mediaType: string;
  title?: string;
  seasons?: { seasonNumber: number; status: number }[];
  serviceId?: number;
  serviceId4k?: number;
}

export interface SeerrSearchResult {
  tmdbId: number;
  mediaType: string;
  title: string;
  releaseDate: string;
  posterPath?: string;
  mediaInfo?: {
    status: number;
  };
}

export interface SeerrPageInfo {
  pages: number;
  pageSize: number;
  results: number;
  page: number;
}

export class SeerrClient {
  private config: SeerrConfig;

  constructor(config: SeerrConfig) {
    this.config = config;
  }

  private async call<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.config.url}/api/v1${path}`);
    const headers: Record<string, string> = {
      'X-Api-Key': this.config.apiKey,
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Seerr API error ${res.status}: ${errBody}`);
    }
    return res.json() as Promise<T>;
  }

  /** Get server status / health check */
  async getStatus(): Promise<SeerrStatus> {
    return this.call<SeerrStatus>('GET', '/status');
  }

  /** List requests with optional filters */
  async getRequests(params?: {
    take?: number;
    skip?: number;
    filter?: string;
    sort?: string;
    mediaType?: string;
    requestedBy?: number;
  }): Promise<{ pageInfo: SeerrPageInfo; results: SeerrRequest[] }> {
    const qs = new URLSearchParams();
    if (params?.take) qs.set('take', String(params.take));
    if (params?.skip) qs.set('skip', String(params.skip));
    if (params?.filter) qs.set('filter', params.filter);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.mediaType) qs.set('mediaType', params.mediaType);
    if (params?.requestedBy) qs.set('requestedBy', String(params.requestedBy));
    const q = qs.toString();
    return this.call('GET', `/request${q ? '?' + q : ''}`);
  }

  /** Approve or decline a request */
  async updateRequestStatus(requestId: number, status: 'approve' | 'decline' | 'pending'): Promise<SeerrRequest> {
    return this.call<SeerrRequest>('POST', `/request/${requestId}/${status}`);
  }

  /** Get request counts by status */
  async getRequestCounts(): Promise<SeerrRequestCounts> {
    return this.call<SeerrRequestCounts>('GET', '/request/count');
  }

  /** List media with optional filters */
  async getMedia(params?: {
    take?: number;
    skip?: number;
    filter?: string;
    sort?: string;
  }): Promise<{ pageInfo: SeerrPageInfo; results: SeerrMedia[] }> {
    const qs = new URLSearchParams();
    if (params?.take) qs.set('take', String(params.take));
    if (params?.skip) qs.set('skip', String(params.skip));
    if (params?.filter) qs.set('filter', params.filter);
    if (params?.sort) qs.set('sort', params.sort);
    const q = qs.toString();
    return this.call('GET', `/media${q ? '?' + q : ''}`);
  }

  /** Search for movies, TV shows, and people */
  async search(query: string): Promise<{ results: SeerrSearchResult[] }> {
    return this.call('GET', `/search?query=${encodeURIComponent(query)}`);
  }

  /** Retry a failed request */
  async retryRequest(requestId: number): Promise<SeerrRequest> {
    return this.call<SeerrRequest>('POST', `/request/${requestId}/retry`);
  }

  /** Health check ping */
  async ping(): Promise<boolean> {
    try {
      await this.getStatus();
      return true;
    } catch {
      return false;
    }
  }
}
