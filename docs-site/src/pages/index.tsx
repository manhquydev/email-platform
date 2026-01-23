import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/getting-started">
            Get Started →
          </Link>
          <Link className="button button--outline button--lg" to="/api-explorer" style={{ marginLeft: '1rem', color: 'white', borderColor: 'white' }}>
            Try API Explorer
          </Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  { icon: '📧', title: 'Disposable Inboxes', description: 'Create temporary email addresses on-demand for testing' },
  { icon: '🔑', title: 'OTP Extraction', description: 'Automatically extract verification codes from emails' },
  { icon: '🧪', title: 'Test Automation', description: 'Perfect for E2E testing with Playwright, Cypress, Selenium' },
  { icon: '⚡', title: 'Real-time Webhooks', description: 'Get notified instantly when emails arrive' },
  { icon: '🔒', title: 'Secure by Design', description: 'HMAC signature verification for webhooks' },
  { icon: '🌍', title: '7 SDKs', description: 'JavaScript, Python, Go, PHP, Java, .NET, CLI' },
];

const sdks = [
  { name: 'JavaScript', install: 'npm install @ephemera/sdk', link: '/docs/sdks/javascript' },
  { name: 'Python', install: 'pip install ephemera', link: '/docs/sdks/python' },
  { name: 'Go', install: 'go get github.com/ephemera/sdk-go', link: '/docs/sdks/go' },
  { name: 'PHP', install: 'composer require ephemera/sdk', link: '/docs/sdks/php' },
  { name: 'Java', install: 'Maven: com.ephemera:sdk', link: '/docs/sdks/java' },
  { name: '.NET', install: 'dotnet add package Ephemera.Sdk', link: '/docs/sdks/dotnet' },
];

export default function Home(): JSX.Element {
  return (
    <Layout title="Home" description="Ephemera API - Temporary email platform for developers">
      <HomepageHeader />
      <main>
        <section className="container" style={{ padding: '4rem 0' }}>
          <Heading as="h2" style={{ textAlign: 'center', marginBottom: '2rem' }}>Features</Heading>
          <div className="row">
            {features.map((f, i) => (
              <div key={i} className="col col--4" style={{ marginBottom: '1.5rem' }}>
                <div className="feature-card">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                  <Heading as="h3">{f.title}</Heading>
                  <p>{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="container" style={{ padding: '2rem 0 4rem' }}>
          <Heading as="h2" style={{ textAlign: 'center', marginBottom: '2rem' }}>Install SDK</Heading>
          <div className="sdk-grid">
            {sdks.map((sdk, i) => (
              <Link key={i} to={sdk.link} style={{ textDecoration: 'none' }}>
                <div className="feature-card">
                  <Heading as="h4">{sdk.name}</Heading>
                  <code style={{ fontSize: '0.85rem' }}>{sdk.install}</code>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
