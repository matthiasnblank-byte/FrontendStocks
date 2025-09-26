describe('Stocks feature flow', () => {
  beforeEach(() => {
    cy.visit('/stocks');
  });

  it('allows adding a trade and viewing details', () => {
    cy.get('[data-testid="quote"]').should('exist');

    cy.contains('Aktie hinzufügen').click();
    cy.url().should('include', '/stocks/add');

    cy.get('#trade-symbol').clear().type('SAP');
    cy.get('#trade-side').select('Kauf');
    cy.get('#trade-quantity').clear().type('5');
    cy.get('#trade-price').clear().type('120');
    cy.get('#trade-timestamp').clear().type('2024-01-01T10:00');
    cy.get('#trade-note').type('Testkauf');
    cy.contains('Speichern').click();

    cy.url().should('include', '/stocks/SAP');

    cy.contains('Trade hinzufügen');
    cy.get('app-timeseries-chart').should('exist');
    cy.contains('Trades');

    cy.contains('1W').focus().type('{enter}');
    cy.contains('1M').focus();

    cy.contains('Löschen').first().click({ force: true });
    cy.contains('Trade löschen?');
    cy.contains('Löschen').last().click();
  });
});
