/**
 * Adds a new user in Settings with 3 payment providers (banks), then verifies
 * on the home page that those providers are visible for the user.
 * Auth is bypassed via visitAsDevMode (run app in dev mode).
 */
describe('Settings: add user and payment providers', () => {
  const newUserName = 'Cypress Test User';
  // 3 banks we will assign: OP Bank, OP Credit Card, Nordea Finland
  const bankIds = ['op', 'op-credit-card', 'nordea-fi'] as const;
  const expectedBankNames = ['OP Bank', 'OP Credit Card', 'Nordea Finland'];

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visitAsDevMode('/');
  });

  it('adds a new user with 3 payment providers in Settings and shows them on home', () => {
    // Go to Settings
    cy.contains('button', 'Settings').click();
    cy.url().should('include', '/settings');

    // Open "Add New User" form
    cy.contains('button', 'Add New User').click();

    // Fill user name
    cy.get('#new-user-name').type(newUserName);

    // Select 3 banks (payment providers) by checking their checkboxes
    bankIds.forEach((id) => {
      cy.get(`#new-${id}`).click();
    });

    // Save user
    cy.contains('button', 'Save User').click();

    // Should see success and the new user in the list
    cy.contains('User Added');
    cy.contains(newUserName).should('be.visible');

    // Go to home page
    cy.contains('button', 'Home').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Select the new user (click the user button)
    cy.contains('button', newUserName).click();

    // All 3 payment providers should be visible in Bank Upload Areas
    expectedBankNames.forEach((name) => {
      cy.contains('h5', name).should('be.visible');
    });

    cy.contains('Bank Upload Areas').should('be.visible');
  });
});
