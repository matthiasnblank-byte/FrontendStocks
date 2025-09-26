describe('BörsenCockpit smoke test', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('displays the header title and navigates between pages', () => {
    cy.contains('h1', 'BörsenCockpit').should('be.visible');

    cy.contains('a', 'Portfolio').click();
    cy.get('main').contains('Portfolio (WIP)').should('be.visible');

    cy.contains('a', 'Stocks').click();
    cy.get('main').contains('Stocks (WIP)').should('be.visible');
  });
});
