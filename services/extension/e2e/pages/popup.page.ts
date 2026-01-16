/**
 * Page Object Model for the Extension Popup
 * Encapsulates popup interactions for cleaner tests
 */
import { Page, Locator } from '@playwright/test';

export class PopupPage {
  readonly page: Page;

  // Login form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly anonymousButton: Locator;
  readonly createAccountLink: Locator;
  readonly errorMessage: Locator;

  // 2FA form elements
  readonly twoFactorInput: Locator;
  readonly verifyButton: Locator;
  readonly backToLoginButton: Locator;

  // Inbox list elements
  readonly activeInboxesHeader: Locator;
  readonly createInboxButton: Locator;
  readonly refreshButton: Locator;
  readonly inboxItems: Locator;
  readonly noInboxesMessage: Locator;

  // Settings elements
  readonly settingsButton: Locator;
  readonly sidePanelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login form
    this.emailInput = page.getByPlaceholder('name@domain.com');
    this.passwordInput = page.getByPlaceholder('••••••••');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.anonymousButton = page.getByRole('button', { name: /go anonymous/i });
    this.createAccountLink = page.getByRole('link', { name: /create account/i });
    this.errorMessage = page.locator('.text-red-600, .text-red-400');

    // 2FA form
    this.twoFactorInput = page.getByPlaceholder('000000');
    this.verifyButton = page.getByRole('button', { name: /verify/i });
    this.backToLoginButton = page.getByRole('button', { name: /back to login/i });

    // Inbox list
    this.activeInboxesHeader = page.getByText('Active Inboxes');
    this.createInboxButton = page.getByRole('button', { name: /create new inbox/i });
    this.refreshButton = page.getByTitle('Refresh');
    this.inboxItems = page.locator('.card-material');
    this.noInboxesMessage = page.getByText('No inboxes yet');

    // Header buttons
    this.settingsButton = page.getByTitle('Settings');
    this.sidePanelButton = page.getByTitle('Open in Side Panel');
  }

  /**
   * Navigate to the popup page
   */
  async goto(extensionId: string) {
    await this.page.goto(`chrome-extension://${extensionId}/popup.html`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /**
   * Wait for the inbox list to be visible
   */
  async waitForInboxList() {
    await this.activeInboxesHeader.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Wait for login form to be visible
   */
  async waitForLoginForm() {
    await this.emailInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Click anonymous login button
   */
  async loginAnonymous() {
    await this.anonymousButton.click();
  }

  /**
   * Enter 2FA code
   */
  async enter2FACode(code: string) {
    await this.twoFactorInput.fill(code);
    await this.verifyButton.click();
  }

  /**
   * Get the count of inbox items
   */
  async getInboxCount(): Promise<number> {
    return await this.inboxItems.count();
  }

  /**
   * Click view messages for first inbox
   */
  async viewFirstInboxMessages() {
    const viewButtons = this.page.getByRole('button', { name: /view messages/i });
    await viewButtons.first().click();
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if currently on login screen
   */
  async isOnLoginScreen(): Promise<boolean> {
    return await this.emailInput.isVisible();
  }

  /**
   * Check if currently on inbox list screen
   */
  async isOnInboxList(): Promise<boolean> {
    return await this.activeInboxesHeader.isVisible();
  }
}
