describe('BörsenCockpit Layout & A11y', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.visit('/');
  });

  it('shows the skip link and focuses main content', () => {
    cy.get('a.skip-link').focus().should('be.visible').click();
    cy.focused().should('have.attr', 'id', 'main');
  });

  it('navigates between sidenav links', () => {
    cy.get('nav[aria-label="Hauptnavigation"]').find('a').as('links');

    cy.get('@links').should('have.length.at.least', 3);

    cy.get('@links').eq(0).click();
    cy.location('pathname').should('eq', '/stocks');

    cy.get('@links').eq(1).click();
    cy.location('pathname').should('eq', '/stocks/add');
    cy.get('@links').eq(1).should('have.attr', 'aria-current', 'page');

    cy.get('@links').eq(2).click();
    cy.location('pathname').should('eq', '/portfolio');
    cy.get('nav[aria-label="Hauptnavigation"]').find('a[aria-current="page"]').should('contain.text', 'Gesamtübersicht');
  });

  it('persists dark-mode preference', () => {
    cy.get('html').should('not.have.class', 'dark');
    cy.get('button[aria-label="Dark-Mode umschalten"]').click();
    cy.get('html').should('have.class', 'dark');
    cy.reload();
    cy.get('html').should('have.class', 'dark');
  });

  it('moves focus to the page heading after navigation', () => {
    cy.contains('a', 'Überblick').focus().click();
    cy.focused().should('have.prop', 'tagName', 'H1').and('contain.text', 'Aktienüberblick');
  });
});

describe('Mobile sidenav behaviour', () => {
  beforeEach(() => {
    cy.viewport('iphone-6');
    cy.visit('/');
  });

  it('opens and closes via toggle and Escape with focus restoration', () => {
    cy.get('button[aria-label="Hauptmenü öffnen"]').as('toggle').click();
    cy.get('[role="dialog"][aria-modal="true"]').should('exist');
    cy.focused().type('{esc}');
    cy.get('[role="dialog"][aria-modal="true"]').should('not.exist');
    cy.focused().should('have.attr', 'aria-label', 'Hauptmenü öffnen');
  });
});
