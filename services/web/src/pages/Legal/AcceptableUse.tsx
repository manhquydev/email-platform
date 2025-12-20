import { useEffect } from 'react';

export function AcceptableUse() {
    useEffect(() => {
        document.title = 'Acceptable Use Policy - Ephemera';
    }, []);

    return (
        <div className="legal-content">
            <h1>Acceptable Use Policy</h1>
            <p className="legal-updated">Last updated: December 2025</p>

            <section>
                <h2>1. Overview</h2>
                <p>
                    This Acceptable Use Policy ("AUP") outlines the rules for using Ephemera.
                    Violation of this policy may result in suspension or termination of your account.
                </p>
            </section>

            <section>
                <h2>2. Prohibited Activities</h2>
                <p>You may NOT use the Service to:</p>

                <h3>2.1 Spamming and Abuse</h3>
                <ul>
                    <li>Send unsolicited bulk email (spam)</li>
                    <li>Send email to purchased or harvested email lists</li>
                    <li>Forge email headers or sender information</li>
                    <li>Participate in email bombing or denial of service attacks</li>
                </ul>

                <h3>2.2 Illegal Activities</h3>
                <ul>
                    <li>Conduct fraud, phishing, or identity theft</li>
                    <li>Distribute malware, viruses, or harmful code</li>
                    <li>Promote or facilitate illegal activities</li>
                    <li>Violate intellectual property rights</li>
                    <li>Distribute child sexual abuse material (CSAM)</li>
                </ul>

                <h3>2.3 Harmful Content</h3>
                <ul>
                    <li>Harass, threaten, or abuse others</li>
                    <li>Distribute hate speech or discriminatory content</li>
                    <li>Share personal information without consent (doxxing)</li>
                    <li>Distribute content promoting violence or terrorism</li>
                </ul>

                <h3>2.4 Service Misuse</h3>
                <ul>
                    <li>Bypass verification requirements</li>
                    <li>Create accounts for fraudulent purposes</li>
                    <li>Resell or redistribute the service without authorization</li>
                    <li>Attempt to access accounts or data of other users</li>
                    <li>Interfere with service operation or security</li>
                </ul>
            </section>

            <section>
                <h2>3. Email Best Practices</h2>
                <p>When using Ephemera for sending email, you must:</p>
                <ul>
                    <li>Only send email to recipients who have opted in</li>
                    <li>Include a clear unsubscribe mechanism in marketing emails</li>
                    <li>Honor unsubscribe requests promptly</li>
                    <li>Maintain accurate sender information</li>
                    <li>Comply with CAN-SPAM, CASL, GDPR, and other applicable laws</li>
                </ul>
            </section>

            <section>
                <h2>4. Authentication Requirements</h2>
                <p>For domains used for sending email, you must properly configure:</p>
                <ul>
                    <li>SPF records to authorize sending servers</li>
                    <li>DKIM signatures for email authentication</li>
                    <li>DMARC policy for domain protection</li>
                </ul>
            </section>

            <section>
                <h2>5. Rate Limits</h2>
                <p>
                    The Service enforces rate limits to ensure fair usage.
                    Attempts to circumvent these limits are prohibited.
                </p>
                <table className="limits-table">
                    <thead>
                        <tr>
                            <th>Resource</th>
                            <th>Limit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Emails per IP (5 min)</td>
                            <td>300</td>
                        </tr>
                        <tr>
                            <td>Emails per domain (5 min)</td>
                            <td>500</td>
                        </tr>
                        <tr>
                            <td>Emails per inbox (5 min)</td>
                            <td>200</td>
                        </tr>
                        <tr>
                            <td>Max attachment size</td>
                            <td>5MB</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section>
                <h2>6. Reporting Violations</h2>
                <p>
                    To report abuse or violations of this policy, please email
                    abuse@manhquy.click with details including:
                </p>
                <ul>
                    <li>Description of the violation</li>
                    <li>Relevant email addresses or domains</li>
                    <li>Supporting evidence (email headers, screenshots)</li>
                </ul>
            </section>

            <section>
                <h2>7. Enforcement</h2>
                <p>Violations may result in:</p>
                <ul>
                    <li>Warning notification</li>
                    <li>Temporary suspension of service</li>
                    <li>Permanent account termination</li>
                    <li>Reporting to law enforcement if required</li>
                    <li>Cooperation with legal proceedings</li>
                </ul>
            </section>

            <section>
                <h2>8. Contact</h2>
                <p>
                    For questions about this policy, contact abuse@manhquy.click.
                </p>
            </section>

            <div className="legal-nav">
                <a href="/terms">Terms of Service</a>
                <a href="/privacy">Privacy Policy</a>
            </div>
        </div>
    );
}
