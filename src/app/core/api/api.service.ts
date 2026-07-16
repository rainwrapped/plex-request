import { Injectable, signal } from '@angular/core';

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

/**
 * Thin HTTP boundary for the API. Owns the app-wide "offline / demo mode" flag
 * so any store can signal that it fell back to seeded data.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly offline = signal(false);

  /** True when the client is serving seeded demo data instead of live API data. */
  readonly usingFallbackData = this.offline.asReadonly();

  markOffline(): void {
    this.offline.set(true);
  }

  markOnline(): void {
    this.offline.set(false);
  }

  async requestJson<T>(pathname: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const headers = {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    };

    const response = await fetch(new URL(pathname, origin), {
      ...init,
      headers,
      credentials: 'include',
    });
    const hasJsonBody = response.headers.get('content-type')?.includes('application/json');
    const data = hasJsonBody ? ((await response.json()) as T) : null;

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }
}
