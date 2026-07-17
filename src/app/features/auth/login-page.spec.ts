import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginPage } from './login-page';
import loginPageTemplate from './login-page.html?raw';

describe('LoginPage', () => {
  beforeEach(async () => {
    await resolveComponentResources((url) => {
      if (url === './login-page.html') {
        return Promise.resolve(loginPageTemplate);
      }

      return Promise.reject(new Error(`Unknown component resource: ${url}`));
    });

    TestBed.overrideComponent(LoginPage, {
      set: {
        template: loginPageTemplate,
      },
    });

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the account chooser', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Choose an account to log in');
  });
});
