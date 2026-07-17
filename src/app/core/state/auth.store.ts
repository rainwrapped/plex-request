import { computed, inject, Injectable, signal } from '@angular/core';

import type { UserAccount } from '../../../../shared/models';

import { ApiService } from '../api/api.service';
import { DEMO_USERS } from '../data/seed';

function sanitizeUsers(users: UserAccount[]): UserAccount[] {
  return users.map(({ id, username, name, role }) => ({ id, username, name, role }));
}

/** Owns authentication state: the known accounts and the current session user. */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(ApiService);

  readonly users = signal<UserAccount[]>(sanitizeUsers(DEMO_USERS));
  readonly currentUser = signal<UserAccount | null>(null);

  readonly canRequest = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'requestor' || role === 'admin';
  });

  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  async loadUsers(): Promise<void> {
    try {
      const result = await this.api.requestJson<UserAccount[]>('/api/users');
      if (!result.ok || !result.data) {
        this.activateFallback();
        return;
      }

      this.api.markOnline();
      this.users.set(result.data);
    } catch {
      this.activateFallback();
    }
  }

  async loadAdminUsers(): Promise<boolean> {
    if (this.currentUser()?.role !== 'admin') {
      return false;
    }

    try {
      const result = await this.api.requestJson<{ users: UserAccount[] }>('/api/admin/users');
      if (!result.ok || !result.data) {
        return false;
      }

      this.api.markOnline();
      this.users.set(result.data.users);
      return true;
    } catch {
      this.api.markOffline();
      return false;
    }
  }

  async createUser(user: UserAccount): Promise<boolean> {
    if (this.currentUser()?.role !== 'admin') {
      return false;
    }

    try {
      const result = await this.api.requestJson<{ user: UserAccount }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ user }),
      });

      if (!result.ok || !result.data) {
        return false;
      }

      await this.loadAdminUsers();
      return true;
    } catch {
      this.api.markOffline();
      return false;
    }
  }

  async updateUser(user: UserAccount): Promise<boolean> {
    if (this.currentUser()?.role !== 'admin') {
      return false;
    }

    try {
      const result = await this.api.requestJson<{ user: UserAccount }>(
        `/api/admin/users/${user.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ user }),
        },
      );

      if (!result.ok || !result.data) {
        return false;
      }

      await this.loadAdminUsers();
      return true;
    } catch {
      this.api.markOffline();
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (this.currentUser()?.role !== 'admin') {
      return false;
    }

    try {
      const result = await this.api.requestJson<{ ok: boolean }>(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!result.ok) {
        return false;
      }

      await this.loadAdminUsers();
      return true;
    } catch {
      this.api.markOffline();
      return false;
    }
  }

  async restoreSession(): Promise<void> {
    try {
      const result = await this.api.requestJson<{ user: UserAccount | null }>('/api/session');
      this.currentUser.set(result.data?.user ?? null);
    } catch {
      this.activateFallback();
      this.currentUser.set(null);
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const result = await this.api.requestJson<{ user: UserAccount }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!result.ok || !result.data) {
        return false;
      }

      this.api.markOnline();
      this.currentUser.set(result.data.user);
      return true;
    } catch {
      const normalizedUsername = username.trim().toLowerCase();
      const user = DEMO_USERS.find(
        (candidate) =>
          (candidate.username === normalizedUsername || candidate.id === normalizedUsername) &&
          !candidate.disabled,
      );
      if (!user || user.password !== password.trim()) {
        return false;
      }

      this.activateFallback();
      this.currentUser.set(sanitizeUsers([user])[0]);
      return true;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.requestJson<{ ok: boolean }>('/api/logout', { method: 'POST' });
    } catch {
      // Ignore logout network errors and clear client state anyway.
    }

    this.currentUser.set(null);
  }

  private activateFallback(): void {
    this.api.markOffline();
    this.users.set(sanitizeUsers(DEMO_USERS));
  }
}
