import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type { UserAccount } from '../../../../shared/models';

import { AuthStore } from '../../core/state/auth.store';
import { SessionFacade } from '../../core/state/session.facade';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly session = inject(SessionFacade);
  private readonly router = inject(Router);

  protected readonly users = this.auth.users;
  protected readonly loginUsername = signal('requestor');
  protected readonly loginPassword = signal('');
  protected readonly showLoginPassword = signal(false);
  protected readonly loginError = signal('');

  protected selectLoginUser(username: string): void {
    this.loginUsername.set(username);
    this.loginError.set('');
  }

  protected updateLoginPassword(value: string): void {
    this.loginPassword.set(value);
    this.loginError.set('');
  }

  protected toggleLoginPasswordVisibility(): void {
    this.showLoginPassword.update((visible) => !visible);
  }

  protected async login(): Promise<void> {
    const loggedIn = await this.session.login(this.loginUsername(), this.loginPassword());
    if (!loggedIn) {
      this.loginError.set('Incorrect username or password.');
      return;
    }

    this.loginPassword.set('');
    this.showLoginPassword.set(false);
    this.loginError.set('');
    await this.router.navigate(['/']);
  }

  protected trackUserById(_: number, user: UserAccount): string {
    return user.id;
  }
}
