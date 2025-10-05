describe('Stocks feature flow', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
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

    // Test time period selection
    cy.contains('1W').focus().type('{enter}');
    cy.contains('1M').focus();

    // Test that we can see the trade we just added
    cy.contains('SAP').should('exist');
    cy.contains('Testkauf').should('exist');
  });
});
