import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { AccountRole, UserAccount } from '../../../../shared/models';

import { AuthStore } from '../../core/state/auth.store';

interface UserForm {
  id: string;
  username: string;
  name: string;
  role: AccountRole;
  disabled: boolean;
  password: string;
}

const EMPTY_FORM: UserForm = {
  id: '',
  username: '',
  name: '',
  role: 'viewer',
  disabled: false,
  password: '',
};

@Component({
  selector: 'app-user-management',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './user-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagement implements OnInit {
  private readonly auth = inject(AuthStore);

  protected readonly users = this.auth.users;
  protected readonly currentUser = this.auth.currentUser;
  protected readonly form = signal<UserForm>({ ...EMPTY_FORM });
  protected readonly adminMessage = signal('');

  async ngOnInit(): Promise<void> {
    await this.auth.loadAdminUsers();
  }

  protected edit(user: UserAccount): void {
    this.form.set({
      id: user.id,
      username: user.username ?? user.id,
      name: user.name,
      role: user.role,
      disabled: Boolean(user.disabled),
      password: '',
    });
    this.adminMessage.set('');
  }

  protected clearForm(): void {
    this.form.set({ ...EMPTY_FORM });
    this.adminMessage.set('');
  }

  protected updateField(key: keyof UserForm, value: string | boolean): void {
    this.form.update((form) => ({
      ...form,
      [key]: key === 'role' ? this.normalizeRole(String(value)) : value,
    }));
  }

  protected async save(): Promise<void> {
    const form = this.form();
    const user: UserAccount = {
      id: form.id,
      username: form.username,
      name: form.name,
      role: form.role,
      disabled: form.disabled,
      password: form.password,
    };

    const saved = form.id ? await this.auth.updateUser(user) : await this.auth.createUser(user);
    this.adminMessage.set(saved ? 'User account saved.' : 'Unable to save user account.');
    if (saved) {
      this.clearForm();
    }
  }

  protected async deleteUser(user: UserAccount): Promise<void> {
    const deleted = await this.auth.deleteUser(user.id);
    this.adminMessage.set(deleted ? 'User account deleted.' : 'Unable to delete user account.');
    if (deleted && this.form().id === user.id) {
      this.clearForm();
    }
  }

  private normalizeRole(value: string): AccountRole {
    return value === 'admin' || value === 'requestor' ? value : 'viewer';
  }
}
