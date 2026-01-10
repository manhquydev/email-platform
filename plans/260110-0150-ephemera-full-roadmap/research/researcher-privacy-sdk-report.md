# Research Report: Privacy Policy & Developer SDK Best Practices (2025)

## 1. Privacy Policy Best Practices (Temp Mail)
### Zero-Log Strategy
- **Explicit Statements:** Policy must state that IP addresses, access times, and email contents are NOT logged.
- **Technical Impossibility:** Aim for architecture where logging is technically impossible beyond the active session.
- **Data Minimization:** Collect zero PII. If premium features require data, use explicit consent and encryption (AES-256).

### GDPR & Trust Signals
- **User Rights:** Provide "Delete All" functionality. Ensure auto-deletion after expiration.
- **Transparency:** Clear retention periods (e.g., "Emails deleted after 1 hour").
- **Security:** Use SSL/TLS for all traffic. Mention use of temporary storage (RAM disks) if applicable.
- **Anonymity:** No-registration models are the gold standard for trust in the temp-mail space.

## 2. Developer SDK Best Practices
### General Principles
- **Idiomatic Design:** SDK must feel native to the language (e.g., Promises/Async in JS, Context Managers/Decorators in Python).
- **Setup Simplicity:** Single command install (`npm install` / `pip install`) and minimal config.
- **Error Handling:** Avoid vague errors. Provide actionable messages and error codes.

### JavaScript (Commander.js)
- **Structure:** Use `commander` for sub-commands.
- **UX:** Use `chalk` for colors, `ora` for spinners, and `inquirer` for interactive prompts.
- **Distribution:** Publish as a scoped package on npm.

### Python (Click)
- **Structure:** Use `@click.group()` for nested commands (Git-like interface).
- **Validation:** Use `click.BadParameter` for input validation.
- **Distribution:** Use `setuptools` and distribute via PyPI.

## Sources
- [AnonymMail: Privacy Practices](https://anonymmail.net)
- [Temp-Mail.org GDPR Policy](https://temp-mail.org)
- [Nordic APIs: SDK Design 2025](https://nordicapis.com)
- [Click Documentation](https://click.palletsprojects.com)
- [Commander.js Documentation](https://github.com/tj/commander.js)

## Unresolved Questions
1. Should the CLI support offline mode or cached lookups for recent mail IDs?
2. What is the specific data retention limit for the Ephemera MVP (10m, 1h, 24h)?
3. Will the SDK require API keys for anonymous usage, or is it purely open-access?
