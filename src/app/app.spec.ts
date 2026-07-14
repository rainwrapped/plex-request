import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();

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

  it('should show browse-only messaging for the view-only account', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance['onUserChange']('viewer-1');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('View-only accounts can search feeds');
  });

  it('should show the admin approvals panel for admin accounts', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance['onUserChange']('admin-1');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pending review queue');
  });
});
