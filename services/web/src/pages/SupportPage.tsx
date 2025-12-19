import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'account', label: 'Account Issue' }
  ];

  const priorities = [
    { value: 'low', label: 'Low - Not urgent' },
    { value: 'normal', label: 'Normal - Standard priority' },
    { value: 'high', label: 'High - Urgent issue' },
    { value: 'critical', label: 'Critical - System down' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          category: 'general',
          message: '',
          priority: 'normal'
        });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit ticket');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (submitted) {
    return (
      <>
        <SEO
          title="Support - TempMail Pro"
          description="Get help with TempMail Pro. Contact our support team for technical issues, billing questions, and feature requests."
          keywords={['support', 'help', 'contact', 'customer service', 'technical support']}
        />
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ticket Submitted Successfully</h2>
              <p className="text-lg text-gray-600 mb-8">
                We've received your support request and will get back to you within 24 hours.
              </p>
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
                <ul className="text-left text-gray-600 space-y-2">
                  <li>• You'll receive an email confirmation with your ticket ID</li>
                  <li>• Our support team will review your request</li>
                  <li>• We'll respond within 24 hours during business days</li>
                  <li>• You can check your ticket status in your dashboard</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/"
                  className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </Link>
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-flex justify-center items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Submit Another Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Support - TempMail Pro"
        description="Get help with TempMail Pro. Contact our support team for technical issues, billing questions, and feature requests."
        keywords={['support', 'help', 'contact', 'customer service', 'technical support']}
      />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help?</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our support team is here to help. Submit a ticket and we'll get back to you within 24 hours.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4 5.477 4 6.253v13C4 17.77 6.832 19 9.5 19s5.5-1.23 5.5-3.747V6.253z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Documentation</h3>
              <p className="text-gray-600 mb-4">Find answers in our comprehensive documentation</p>
              <Link
                to="/docs"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Browse Docs →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.657 2.03-2 3.472-2C13.616 7 15 8.412 15 10c0 1.588-1.384 3-3.3 3-1.442 0-2.923-.342-3.472-2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">FAQ</h3>
              <p className="text-gray-600 mb-4">Quick answers to common questions</p>
              <Link
                to="/docs/faq/general"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View FAQ →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9 9m9-9H9m3 9a3 3 0 003-3m0 0a3 3 0 00-3 3m0 0v3m0-6V3" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Community</h3>
              <p className="text-gray-600 mb-4">Get help from other users in our community</p>
              <a
                href="https://github.com/manhquydev/tempmail-pro/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Join Community →
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit a Support Ticket</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {priorities.map(pri => (
                    <option key={pri.value} value={pri.value}>
                      {pri.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Please provide as much detail as possible about your issue or question..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>

          {/* Contact Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600">support@manhquy.click</p>
              <p className="text-sm text-gray-500 mt-1">24-48 hour response time</p>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
              <p className="text-gray-600">Monday - Friday</p>
              <p className="text-sm text-gray-500 mt-1">9:00 AM - 6:00 PM (GMT+7)</p>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Emergency</h3>
              <p className="text-gray-600">For critical issues</p>
              <p className="text-sm text-gray-500 mt-1">Mark ticket as "Critical"</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}