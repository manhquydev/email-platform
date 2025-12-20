import { useEffect } from 'react';

export function TermsOfService() {
    useEffect(() => {
        document.title = 'Terms of Service - Ephemera';
    }, []);

    return (
        <div className="legal-content">
            <h1>Terms of Service</h1>
            <p className="legal-updated">Last updated: December 2025</p>

            <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing and using Ephemera ("Service"), you agree to be bound by these Terms of Service.
                    If you do not agree to these terms, please do not use the Service.
                </p>
            </section>

            <section>
                <h2>2. Description of Service</h2>
                <p>
                    Ephemera provides email hosting services including custom domain email,
                    disposable/temporary inboxes, and related functionality. The Service allows users to:
                </p>
                <ul>
                    <li>Add and verify custom domains for email hosting</li>
                    <li>Create and manage email inboxes</li>
                    <li>Receive and view email messages via webmail</li>
                    <li>Access email via API for automation purposes</li>
                </ul>
            </section>

            <section>
                <h2>3. User Accounts</h2>
                <p>
                    You must register for an account to use certain features. You are responsible for:
                </p>
                <ul>
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of any unauthorized use</li>
                </ul>
            </section>

            <section>
                <h2>4. Acceptable Use</h2>
                <p>
                    You agree not to use the Service for any unlawful purposes or to violate any applicable laws.
                    See our <a href="/acceptable-use">Acceptable Use Policy</a> for detailed guidelines.
                </p>
            </section>

            <section>
                <h2>5. Service Modifications</h2>
                <p>
                    We reserve the right to modify, suspend, or discontinue the Service at any time,
                    with or without notice. We will not be liable for any modification, suspension,
                    or discontinuation of the Service.
                </p>
            </section>

            <section>
                <h2>6. Data and Privacy</h2>
                <p>
                    Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>.
                    By using the Service, you consent to the collection and use of your data as described therein.
                </p>
            </section>

            <section>
                <h2>7. Limitation of Liability</h2>
                <p>
                    THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT
                    PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                    CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                </p>
            </section>

            <section>
                <h2>8. Termination</h2>
                <p>
                    We may terminate or suspend your account at any time for violation of these Terms.
                    Upon termination, your right to use the Service will immediately cease.
                </p>
            </section>

            <section>
                <h2>9. Changes to Terms</h2>
                <p>
                    We may update these Terms from time to time. Continued use of the Service after
                    changes constitutes acceptance of the new Terms.
                </p>
            </section>

            <section>
                <h2>10. Contact</h2>
                <p>
                    For questions about these Terms, please contact us at legal@manhquy.click.
                </p>
            </section>

            <div className="legal-nav">
                <a href="/privacy">Privacy Policy</a>
                <a href="/acceptable-use">Acceptable Use Policy</a>
            </div>
        </div>
    );
}

