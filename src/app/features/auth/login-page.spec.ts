import loginPageTemplate from './login-page.html?raw';

describe('LoginPage', () => {
  it('includes the account chooser copy', () => {
    expect(loginPageTemplate).toContain('Choose an account to log in');
  });
});
