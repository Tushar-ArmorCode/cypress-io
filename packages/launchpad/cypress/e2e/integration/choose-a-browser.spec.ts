import type { FoundBrowser } from '@packages/types/src'

describe('Choose a Browser config', () => {
  // Walks through setup pages to get to browser selection
  const stepThroughConfigPages = () => {
    cy.get('h1').should('contain', 'Configuration Files')
    cy.contains('Continue').click()
    cy.get('h1').should('contain', 'Initializing Config...')
    cy.contains('Next Step').click()
  }

  // Mocks server's browser detection with known list
  const setupMockBrowsers = function () {
    cy.withCtx(async (ctx, o) => {
      if (ctx._apis.appApi.getBrowsers.restore) {
        ctx._apis.appApi.getBrowsers.restore()
      }

      const mockBrowsers = [{
        'id': '1',
        'channel': 'stable',
        'disabled': false,
        'isSelected': true,
        'displayName': 'Chrome',
        'family': 'chromium',
        'majorVersion': '1',
        'name': 'chrome',
        'path': '/test/chrome/path',
        'version': '1.2.333.445',
      } as FoundBrowser, {
        'id': '2',
        'channel': 'stable',
        'disabled': false,
        'isSelected': false,
        'displayName': 'Firefox',
        'family': 'firefox',
        'majorVersion': '2',
        'name': 'firefox',
        'path': '/test/firefox/path',
        'version': '2.3.444',
      } as FoundBrowser, {
        'id': '3',
        'channel': 'stable',
        'disabled': false,
        'isSelected': false,
        'displayName': 'Electron',
        'family': 'chromium',
        'majorVersion': '3',
        'name': 'electron',
        'path': '/test/electron/path',
        'version': '3.4.555.66',
      } as FoundBrowser, {
        'id': '4',
        'channel': 'stable',
        'disabled': false,
        'isSelected': false,
        'displayName': 'Edge',
        'family': 'chromium',
        'majorVersion': '4',
        'name': 'edge',
        'path': '/test/edge/path',
        'version': '4.5.666.77',
      }]

      sinon.stub(ctx._apis.appApi, 'getBrowsers').resolves(mockBrowsers)
    })
  }

  // Creates and returns aliases for browsers found on the DOM
  const getBrowserAliases = function () {
    cy.get('[data-cy="open-browser-list"] [data-selected-browser]').eq(0).as('chromeRadioOption')
    cy.get('[data-cy="open-browser-list"] [data-selected-browser]').eq(1).as('firefoxRadioOption')
    cy.get('[data-cy="open-browser-list"] [data-selected-browser]').eq(2).as('electronRadioOption')
    cy.get('[data-cy="open-browser-list"] [data-selected-browser]').eq(3).as('edgeRadioOption')

    return {
      chrome: '@chromeRadioOption',
      firefox: '@firefoxRadioOption',
      electron: '@electronRadioOption',
      edge: '@edgeRadioOption',
    }
  }

  beforeEach(() => {
    cy.scaffoldProject('launchpad')

    setupMockBrowsers()
  })

  it('should preselect valid --browser option', () => {
    cy.openProject('launchpad', ['--e2e', '--browser', 'edge'])

    cy.visitLaunchpad()
    stepThroughConfigPages()

    cy.get('h1').should('contain', 'Choose a Browser')

    cy.get('[data-cy="open-browser-list"] [data-selected-browser="true"]')
    .should('contain', 'Edge')
  })

  it('shows alert when launched with --browser option that cannot be found', () => {
    cy.openProject('launchpad', ['--e2e', '--browser', 'doesNotExist'])
    cy.visitLaunchpad()

    stepThroughConfigPages()

    cy.get('h1').should('contain', 'Choose a Browser')
    cy.get('[data-cy="alert-header"]').should('contain', 'Warning: Browser Not Found')
    cy.get('[data-cy="alert-body"]')
    .should('contain', 'The specified browser was not found on your system or is not supported by Cypress: doesNotExist')

    cy.get('[data-cy="alert-body"] a').eq(1)
    .should('have.attr', 'href')
    .and('equal', 'https://on.cypress.io/troubleshooting-launching-browsers')

    cy.get('[data-cy="alert-suffix-icon"]').click()
    cy.get('[data-cy="alert-header"]').should('not.exist')
  })

  it('shows alert when launched with --browser path option that cannot be found', () => {
    cy.openProject('launchpad', ['--e2e', '--browser', '/path/does/not/exist'])

    cy.visitLaunchpad()

    stepThroughConfigPages()

    cy.get('h1').should('contain', 'Choose a Browser')
    cy.get('[data-cy="alert-header"]').should('contain', 'Warning: Browser Not Found')
    cy.get('[data-cy="alert-body"]')
    .should('contain', 'We could not identify a known browser at the path you specified: /path/does/not/exist')
    .should('contain', 'spawn /path/does/not/exist ENOENT')

    cy.get('[data-cy="alert-body"] a')
    .should('have.attr', 'href')
    .and('equal', 'https://on.cypress.io/troubleshooting-launching-browsers')

    cy.get('[data-cy="alert-suffix-icon"]').click()
    cy.get('[data-cy="alert-header"]').should('not.exist')
  })

  it('should show installed browsers with their relevant properties', () => {
    cy.openProject('launchpad', ['--e2e'])

    cy.visitLaunchpad()

    stepThroughConfigPages()

    cy.get('h1').should('contain', 'Choose a Browser')

    const { chrome, firefox, electron, edge } = getBrowserAliases()

    cy.get(chrome)
    .should('contain', 'Chrome')
    .and('contain', 'v1.x')
    .find('img')
    .should('have.attr', 'alt', 'Chrome')

    cy.get(firefox)
    .should('contain', 'Firefox')
    .and('contain', 'v2.x')
    .find('img')
    .should('have.attr', 'alt', 'Firefox')

    cy.get(electron)
    .should('contain', 'Electron')
    .and('contain', 'v3.x')
    .find('img')
    .should('have.attr', 'alt', 'Electron')

    cy.get(edge)
    .should('contain', 'Edge')
    .and('contain', 'v4.x')
    .find('img')
    .should('have.attr', 'alt', 'Edge')
  })

  it('should launch selected browser when launch button is clicked', () => {
    cy.openProject('launchpad', ['--e2e'])

    cy.visitLaunchpad()

    stepThroughConfigPages()

    cy.get('h1').should('contain', 'Choose a Browser')

    cy.contains('Launch Chrome').as('launchButton')

    // Stub out response to prevent browser launch but not break internals
    cy.intercept('mutation-OpenBrowser_LaunchProject', {
      body: {
        data: {
          launchOpenProject: true,
          setProjectPreferences: {
            currentProject: {
              id: 'test-id',
              title: 'launchpad',
              __typename: 'CurrentProject',
            },
            __typename: 'Query',
          },
        },
      },
    }).as('launchProject')

    cy.get('@launchButton').click()

    cy.wait('@launchProject').then(({ request }) => {
      expect(request?.body.variables.browserPath).to.contain('/test/chrome/path')
      expect(request?.body.variables.testingType).to.eq('e2e')
    })
  })

  it('should highlight browser radio item when clicked', () => {
    cy.openProject('launchpad', ['--e2e'])

    cy.visitLaunchpad()
    stepThroughConfigPages()

    cy.get('h1').should('contain', 'Choose a Browser')

    const { chrome, firefox } = getBrowserAliases()

    cy.get(chrome)
    .should('have.attr', 'data-selected-browser', 'true')

    cy.get(firefox)
    .should('have.attr', 'data-selected-browser', 'false')

    cy.contains('Launch Chrome').should('be.visible')

    cy.intercept('mutation-OpenBrowserList_SetBrowser').as('selectNewBrowserMutation')

    cy.get(firefox).click()

    cy.wait('@selectNewBrowserMutation')

    cy.get(chrome)
    .should('have.attr', 'data-selected-browser', 'false')

    cy.get(firefox)
    .should('have.attr', 'data-selected-browser', 'true')

    cy.contains('Launch Firefox').should('be.visible')
  })
})
