import { useEffect } from 'react';

export function PrivacyPolicy() {
    useEffect(() => {
        document.title = 'Privacy Policy - Ephemera';
    }, []);

    return (
        <div className="legal-content">
            <h1>Privacy Policy</h1>
            <p className="legal-updated">Last updated: December 2025</p>

            <section>
                <h2>1. Information We Collect</h2>
                <h3>Account Information</h3>
                <p>When you create an account, we collect:</p>
                <ul>
                    <li>Email address</li>
                    <li>Password (stored securely using bcrypt hashing)</li>
                    <li>Account preferences and settings</li>
                </ul>

                <h3>Email Data</h3>
                <p>When you use our email services, we process:</p>
                <ul>
                    <li>Email content (subject, body, attachments)</li>
                    <li>Email metadata (sender, recipient, timestamps)</li>
                    <li>Domain and inbox information</li>
                </ul>

                <h3>Usage Data</h3>
                <p>We automatically collect:</p>
                <ul>
                    <li>IP addresses</li>
                    <li>Browser type and version</li>
                    <li>Pages visited and actions taken</li>
                    <li>Login timestamps</li>
                </ul>
            </section>

            <section>
                <h2>2. How We Use Your Information</h2>
                <ul>
                    <li>To provide and maintain the email hosting service</li>
                    <li>To process and deliver email messages</li>
                    <li>To send service-related notifications</li>
                    <li>To detect and prevent abuse, spam, and fraud</li>
                    <li>To improve our services</li>
                    <li>To comply with legal obligations</li>
                </ul>
            </section>

            <section>
                <h2>3. Data Retention</h2>
                <p>
                    Email messages are retained according to your plan settings and may be automatically
                    deleted after the configured retention period (default: 7 days for temporary inboxes).
                </p>
                <p>
                    Account data is retained for the duration of your account plus any period required
                    by applicable law after account deletion.
                </p>
            </section>

            <section>
                <h2>4. Data Sharing</h2>
                <p>We do not sell your personal data. We may share data with:</p>
                <ul>
                    <li>Service providers who assist in operating our services</li>
                    <li>Law enforcement when required by valid legal process</li>
                    <li>Third parties with your explicit consent</li>
                </ul>
            </section>

            <section>
                <h2>5. Security</h2>
                <p>We implement security measures including:</p>
                <ul>
                    <li>TLS encryption for data in transit</li>
                    <li>Password hashing using bcrypt</li>
                    <li>Two-factor authentication support</li>
                    <li>Regular security audits</li>
                    <li>Rate limiting and abuse prevention</li>
                </ul>
            </section>

            <section>
                <h2>6. Your Rights (GDPR/CCPA)</h2>
                <p>Depending on your location, you may have rights to:</p>
                <ul>
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Rectification:</strong> Correct inaccurate data</li>
                    <li><strong>Deletion:</strong> Request deletion of your data</li>
                    <li><strong>Portability:</strong> Receive your data in a portable format</li>
                    <li><strong>Opt-out:</strong> Opt out of certain data processing</li>
                </ul>
                <p>
                    To exercise these rights, contact us at privacy@manhquy.click.
                </p>
            </section>

            <section>
                <h2>7. Cookies</h2>
                <p>
                    We use essential cookies for authentication and session management.
                    We do not use tracking cookies for advertising purposes.
                </p>
            </section>

            <section>
                <h2>8. International Transfers</h2>
                <p>
                    Your data may be processed in servers located outside your country.
                    We ensure appropriate safeguards are in place for such transfers.
                </p>
            </section>

            <section>
                <h2>9. Children's Privacy</h2>
                <p>
                    Our Service is not intended for children under 13. We do not knowingly
                    collect personal information from children.
                </p>
            </section>

            <section>
                <h2>10. Contact Us</h2>
                <p>
                    For privacy-related inquiries, contact our Data Protection team at
                    privacy@manhquy.click.
                </p>
            </section>

            <div className="legal-nav">
                <a href="/terms">Terms of Service</a>
                <a href="/acceptable-use">Acceptable Use Policy</a>
            </div>
        </div>
    );
}
