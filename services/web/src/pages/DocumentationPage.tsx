import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useDocumentationServer, markdownToHTML, generateTOC } from '../components/DocumentationServer';

interface DocumentationPageProps {
  // Component will be used within routing context
}

interface SidebarItem {
  title: string;
  description?: string;
  items?: Array<{
    title: string;
    href: string;
    description?: string;
  }>;
}

const DocumentationPage: React.FC<DocumentationPageProps> = () => {
  const location = useLocation();
  const currentPage = location.pathname;
  const [darkMode, setDarkMode] = useState(false);

  // Use documentation server hook
  const { content: markdown, loading, error } = useDocumentationServer(currentPage.replace('/docs', ''));

  // Navigation structure
  const navItems: SidebarItem[] = [
    {
      title: "Getting Started",
      items: [
        { title: "Introduction", href: "/docs/getting-started/introduction.md" },
        { title: "Quick Start", href: "/docs/getting-started/quick-start.md" },
        { title: "Your First Inbox", href: "/docs/getting-started/your-first-inbox.md" }
      ]
    },
    {
      title: "API Documentation",
      items: [
        { title: "Authentication", href: "/docs/api/authentication.md" },
        { title: "Domains", href: "/docs/api/endpoints/domains.md" },
        { title: "Inboxes", href: "/docs/api/endpoints/inboxes.md" },
        { title: "Messages", href: "/docs/api/endpoints/messages.md" }
      ]
    },
    {
      title: "Guides",
      items: [
        { title: "Custom Domains", href: "/docs/guides/custom-domains.md" },
        { title: "Email Forwarding", href: "/docs/guides/email-forwarding.md" },
        { title: "Using the API", href: "/docs/guides/using-the-api.md" }
      ]
    },
    {
      title: "FAQ",
      items: [
        { title: "General Questions", href: "/docs/faq/general.md" },
        { title: "Troubleshooting", href: "/docs/faq/troubleshooting.md" }
      ]
    },
    {
      title: "Tutorials",
      items: [
        { title: "Node.js SDK", href: "/docs/tutorials/nodejs-sdk.md" },
        { title: "Python SDK", href: "/docs/tutorials/python-sdk.md" }
      ]
    }
  ];

  // Convert markdown to HTML
  const htmlContent = markdownToHTML(markdown);

  // Generate table of contents
  const toc = generateTOC(markdown);

  // Scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Render navigation
  const renderNavItem = (item: SidebarItem, level = 0) => {
    const isActive = currentPage === item.href;

    return (
      <div key={item.href} className={clsx('mb-1', level > 0 && 'ml-4')}>
        <Link
          to={item.href}
          className={clsx(
            'block px-3 py-2 rounded-md text-sm transition-colors',
            isActive
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          )}
        >
          {item.title}
        </Link>
        {item.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-3">
            {item.description}
          </p>
        )}
        {item.items && (
          <div className="mt-1">
            {item.items.map(subItem => renderNavItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error Loading Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}. Please try again later or check if the documentation exists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Document head would be added here */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0 hidden md:block">
              <div className="sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Documentation
                </h2>
                <nav className="space-y-1">
                  {navItems.map(section => (
                    <div key={section.title} className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        {section.title}
                      </h3>
                      {section.items?.map(item => renderNavItem(item))}
                    </div>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
                {/* Mobile Navigation */}
                <div className="md:hidden mb-6">
                  <select
                    value={currentPage || ''}
                    onChange={(e) => window.location.href = e.target.value}
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Select documentation...</option>
                    {navItems.map(section => (
                      <optgroup key={section.title} label={section.title}>
                        {section.items?.map(item => (
                          <option key={item.href} value={item.href}>
                            {item.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Table of Contents */}
                {toc.length > 0 && (
                  <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Table of Contents
                    </h3>
                    <nav>
                      <ul className="space-y-1">
                        {toc.map(item => (
                          <li key={item.id}>
                            <button
                              onClick={() => scrollToSection(item.id)}
                              className={clsx(
                                'text-left text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
                                item.level === 1 && 'font-medium',
                                item.level === 2 && 'ml-4',
                                item.level === 3 && 'ml-8 text-gray-600 dark:text-gray-400'
                              )}
                            >
                              {item.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                )}

                {/* Document Content */}
                <div
                  className="prose prose-gray dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

                {/* Code blocks will be rendered automatically by the markdown conversion */}

                {/* Theme Toggle */}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentationPage;