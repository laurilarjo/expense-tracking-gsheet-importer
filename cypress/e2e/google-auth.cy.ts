/**
 * Google auth is bypassed in two ways:
 * 1. App gate (Firebase): use visitAsDevMode() so the app sees a dev user (requires running app in dev mode: npm run dev).
 * 2. Google Sheets token: use mockGoogleAuth() to set google_sheets_token and mock gapi/google (no real OAuth).
 */
describe('Google Sheets Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    // Bypass Firebase: visit with dev-mode user so we're not redirected to /login (app must be run in dev mode)
    cy.visitAsDevMode('/');
  });

  it('should allow users to authenticate with Google Sheets', () => {
    // We're already on the app (via visitAsDevMode). We should see the Sheets auth button until we mock auth.
    cy.contains('Authorize Google Sheets Access').should('be.visible');
    
    // Set up Google API mocks before clicking
    cy.mockGoogleAuth();
    
    // Click the authorize button
    cy.contains('Authorize Google Sheets Access').click();
    
    // Verify we see success message after authentication
    cy.contains('Successfully connected to Google Sheets!').should('be.visible');
    
    // Verify token is stored in localStorage
    cy.window().then((win) => {
      const tokenData = JSON.parse(win.localStorage.getItem('google_sheets_token') || '{}');
      expect(tokenData).to.have.property('token');
      expect(tokenData).to.have.property('expiresAt');
    });
  });

  it('should detect previously authenticated sessions', () => {
    // Mock Google auth first which sets the token in localStorage
    cy.mockGoogleAuth();
    
    // Reload page to test detection of existing token
    cy.reload();
    
    // We should already see success message without clicking anything
    cy.contains('Successfully connected to Google Sheets!').should('be.visible');
  });

  it('should handle expired tokens', () => {
    // Set expired token in localStorage
    cy.window().then((win) => {
      const expiredToken = {
        token: 'expired-google-auth-token',
        expiresAt: Date.now() - 1000 // Token expired 1 second ago
      };
      win.localStorage.setItem('google_sheets_token', JSON.stringify(expiredToken));
    });
    
    // Reload page to test handling of expired token
    cy.reload();
    
    // Should show authorization button because token is expired
    cy.contains('Authorize Google Sheets Access').should('be.visible');
    
    // Set up Google API mocks before clicking
    cy.mockGoogleAuth();
    
    // Click the authorize button to re-authenticate
    cy.contains('Authorize Google Sheets Access').click();
    
    // Verify re-authentication worked
    cy.contains('Successfully connected to Google Sheets!').should('be.visible');
  });
});
