import { TestBed } from '@angular/core/testing';
import { App } from './app';

function ensureLocalStorage(): Storage {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage;
  }

  const storage = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });

  return localStorageMock;
}

describe('App', () => {
  beforeEach(async () => {
    ensureLocalStorage().clear();

    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Plex Request Hub');
  });

  it('should require login before showing the workspace', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Choose an account to log in');
    expect(compiled.textContent).toContain('Authentication required');
  });

  it('should show browse-only messaging for the view-only account', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance['selectLoginUser']('viewer-1');
    fixture.componentInstance['updateLoginPassword']('plex-demo');
    await fixture.componentInstance['login']();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('View-only accounts can search feeds');
  });

  it('should show the admin approvals panel for admin accounts', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance['selectLoginUser']('admin-1');
    fixture.componentInstance['updateLoginPassword']('plex-demo');
    await fixture.componentInstance['login']();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pending review queue');
  });
});
