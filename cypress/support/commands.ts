
/// <reference types="cypress" />

/**
 * Bypass the app auth gate by setting a dev-mode user in localStorage.
 * Only works when the app is run in development (NODE_ENV !== 'production').
 * Use this in beforeEach so tests hit the app without the login page.
 */
Cypress.Commands.add('loginByDevMode', (email = 'cypress@example.com') => {
  const devModeUser = {
    email,
    displayName: `Cypress User (${email})`,
    isDevMode: true,
  };
  cy.window().then((win) => {
    win.localStorage.setItem('dev_mode_user', JSON.stringify(devModeUser));
  });
});

/**
 * Visit the app as an authenticated dev-mode user (bypasses Google Sheets login gate).
 * Run the app in dev mode (e.g. `npm run dev`) so NODE_ENV is development.
 */
Cypress.Commands.add('visitAsDevMode', (path = '/', email = 'cypress@example.com') => {
  const devModeUser = {
    email,
    displayName: `Cypress User (${email})`,
    isDevMode: true,
  };
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('dev_mode_user', JSON.stringify(devModeUser));
    },
  });
});

Cypress.Commands.add('loginByGoogleApi', () => {
  cy.log('Logging in to Google')
  cy.request({
    method: 'POST',
    url: 'https://www.googleapis.com/oauth2/v4/token',
    body: {
      grant_type: 'refresh_token',
      client_id: Cypress.env('GOOGLE_CLIENT_ID'),
      client_secret: Cypress.env('GOOGLE_CLIENT_SECRET'),
      refresh_token: Cypress.env('GOOGLE_REFRESH_TOKEN'),
    },
  }).then(({ body }) => {
    const { access_token, id_token } = body

    cy.request({
      method: 'GET',
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      headers: { Authorization: `Bearer ${access_token}` },
    }).then(({ body }) => {
      cy.log(body)
      const userItem = {
        token: id_token,
        user: {
          googleId: body.sub,
          email: body.email,
          givenName: body.given_name,
          familyName: body.family_name,
          imageUrl: body.picture,
        },
      }

      window.localStorage.setItem('googleCypress', JSON.stringify(userItem))
      cy.visit('/')
    })
  })
})

// Google Sheets OAuth mocking
Cypress.Commands.add('mockGoogleAuth', () => {
  // Get tokens from Cypress environment variables
  const googleRefreshToken = Cypress.env('GOOGLE_REFRESH_TOKEN') || 'test-refresh-token';
  const googleAccessToken = Cypress.env('GOOGLE_ACCESS_TOKEN') || 'ya29.test-access-token';
  const expiresAt = Date.now() + 3600000; // Token valid for 1 hour
  
  // Set the token in localStorage as expected by the app
  localStorage.setItem('google_sheets_token', JSON.stringify({
    token: googleAccessToken,
    expiresAt: expiresAt
  }));
  
  // Mock GAPI to prevent actual API calls
  cy.window().then((win) => {
    // Mock gapi
    win.gapi = {
      load: (api, callback) => {
        if (callback) callback();
      },
      client: {
        init: cy.stub().resolves({}),
        sheets: {
          spreadsheets: {
            values: {
              get: cy.stub().resolves({
                result: {
                  values: [["mocked", "data"], ["from", "cypress"]]
                }
              })
            }
          }
        }
      }
    };
    
    // More complete mock of Google Identity Services
    win.google = {
      accounts: {
        id: {
          initialize: cy.stub(),
          renderButton: cy.stub(),
          prompt: cy.stub()
        },
        oauth2: {
          initTokenClient: cy.stub().returns({
            requestAccessToken: cy.stub().callsFake(({ callback }) => {
              if (callback) {
                callback({
                  access_token: googleAccessToken,
                  expires_in: 3600
                });
              }
            })
          })
        }
      }
    };
  });
});

// For verifying Google Sheets auth state
Cypress.Commands.add('verifyGoogleSheetsAuth', () => {
  cy.get('[data-cy="google-sheets-auth-success"]', { timeout: 10000 }).should('be.visible');
});

// Add type definitions for custom commands
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginByDevMode(email?: string): Chainable<void>
      visitAsDevMode(path?: string, email?: string): Chainable<void>
      loginByGoogleApi(): Chainable<void>
      mockGoogleAuth(): Chainable<void>
      verifyGoogleSheetsAuth(): Chainable<void>
    }
  }
}

export {};
