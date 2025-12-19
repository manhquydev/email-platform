# TempMail Pro Documentation

Welcome to the TempMail Pro documentation portal. This comprehensive guide covers all aspects of using, configuring, and integrating TempMail Pro.

## 📚 Documentation Structure

### Getting Started
- [Introduction](getting-started/introduction.md) - Learn about TempMail Pro and its features
- [Quick Start](getting-started/quick-start.md) - Get up and running in minutes with Docker
- [Your First Inbox](getting-started/your-first-inbox.md) - Create and use your first temporary email address

### API Documentation
- [Authentication](api/authentication.md) - JWT-based authentication and security
- [Domains](api/endpoints/domains.md) - Manage custom domains and DNS configuration
- [Inboxes](api/endpoints/inboxes.md) - Create and manage temporary email addresses
- [Messages](api/endpoints/messages.md) - Retrieve and manage email messages

### Guides
- [Custom Domains](guides/custom-domains.md) - Configure and manage your own domains
- [Email Forwarding](guides/email-forwarding.md) - Forward emails to your regular inbox
- [Using the API](guides/using-the-api.md) - Advanced API usage and best practices

### FAQ
- [General Questions](faq/general.md) - Common questions about TempMail Pro
- [Troubleshooting](faq/troubleshooting.md) - Solutions to common technical issues

### Tutorials
- [Node.js SDK](tutorials/nodejs-sdk.md) - Integrate TempMail Pro with Node.js applications
- [Python SDK](tutorials/python-sdk.md) - Integrate TempMail Pro with Python applications

## 🚀 Quick Navigation

### For New Users
1. Start with [Introduction](getting-started/introduction.md)
2. Follow [Quick Start](getting-started/quick-start.md) to install
3. Create your first inbox with [Your First Inbox](getting-started/your-first-inbox.md)

### For Developers
1. Read [Authentication](api/authentication.md) to understand API access
2. Explore [Domains](api/endpoints/domains.md) for custom domain setup
3. Learn about inbox management with [Inboxes](api/endpoints/inboxes.md)
4. Check out message handling in [Messages](api/endpoints/messages.md)

### For System Administrators
1. Review [Custom Domains](guides/custom-domains.md) for DNS configuration
2. Set up email forwarding with [Email Forwarding](guides/email-forwarding.md)
3. Consult [Troubleshooting](faq/troubleshooting.md) for common issues

### For Integration
1. Choose your SDK: [Node.js](tutorials/nodejs-sdk.md) or [Python](tutorials/python-sdk.md)
2. Follow the comprehensive guides in [Using the API](guides/using-the-api.md)

## 📖 Using the Documentation Portal

The documentation portal is built with React and features:

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode** - Toggle between light and dark themes
- **Search** - Find content quickly with the table of contents
- **Syntax Highlighting** - Code examples are beautifully highlighted
- **Copy-to-Clipboard** - Easily copy code snippets

### Viewing Documentation

Access the documentation at:
- Development: `http://localhost:5173/docs/getting-started/introduction.md`
- Production: `https://yourdomain.com/docs/getting-started/introduction.md`

### Navigation Tips

- Use the sidebar to browse by category
- Click on headers in the table of contents to jump to sections
- Mobile users can use the dropdown navigation at the top
- The breadcrumb path shows your current location

## 🔧 Contributing to Documentation

We welcome contributions to improve our documentation!

### Guidelines

1. **Keep content up to date** - Documentation should reflect the current version
2. **Use clear examples** - Provide practical, working code examples
3. **Follow Markdown format** - Use standard Markdown with proper headers
4. **Include error handling** - Show both success and error cases
5. **Add troubleshooting** - Include common issues and solutions

### Adding New Documentation

1. Create your markdown file in the appropriate directory
2. Add an entry to `sidebar.json` for navigation
3. Test the documentation rendering locally
4. Submit a pull request with your changes

### File Structure

```
docs/
├── getting-started/          # For new users
├── api/                     # API documentation
│   └── endpoints/           # Individual endpoint docs
├── guides/                  # How-to guides and tutorials
├── faq/                     # Frequently asked questions
├── tutorials/               # SDK and integration tutorials
├── assets/                  # Images and other assets
├── sidebar.json            # Navigation configuration
└── README.md               # This file
```

## 📝 Code Examples

All code examples should be executable and tested. Include:

### Bash Examples
```bash
# Include proper error checking and explanations
curl -X POST "https://api.tempmailpro.com/domains" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

### JavaScript Examples
```javascript
// Include error handling
try {
  const response = await fetch('/api/domains', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain: 'example.com' })
  });

  if (!response.ok) {
    throw new Error('Failed to create domain');
  }

  const data = await response.json();
  console.log('Domain created:', data);
} catch (error) {
  console.error('Error:', error);
}
```

### Python Examples
```python
# Include proper error handling and imports
import requests

try:
    response = requests.post(
        'https://api.tempmailpro.com/domains',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={'domain': 'example.com'}
    )

    response.raise_for_status()
    domain = response.json()
    print(f'Domain created: {domain["domain"]}')

except requests.exceptions.RequestException as e:
    print(f'Error: {e}')
```

## 🎨 Styling Guide

### Text Formatting
- **Bold** for important terms
- *Italic* for emphasis
- `Code` for inline code and commands
- [Links](#) for references

### Headers
Use proper header hierarchy:
```markdown
# Main sections
## Subsections
### Subsections
#### If needed
```

### Lists
- Use unordered lists for bullet points
- Use numbered lists for sequences
- Use nested lists for sub-points

### Code Blocks
```bash
# Shell commands
npm install tempmailpro-sdk
```

```javascript
// JavaScript code
const client = new TempMailClient({...});
```

```python
# Python code
client = TempMailClient(...)
```

## 📞 Support

### Getting Help
1. **Search the documentation** first
2. **Check the FAQ** for common issues
3. **Search existing issues** on GitHub
4. **Open a new issue** if needed

### Community
- [GitHub Discussions](https://github.com/tempmailpro/tempmailpro/discussions)
- [Community Forum](https://community.tempmailpro.com)
- [Discord Server](https://discord.gg/tempmailpro)

### Reporting Issues
When reporting issues, include:
1. **Environment** (OS, browser, TempMail Pro version)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Error messages** (if any)
5. **Relevant code** or screenshots

## 📄 License

This documentation is licensed under the MIT License. See the LICENSE file for more details.

## 🗺️ Roadmap

### Planned Features
- [ ] Interactive API playground
- [ ] Video tutorials
- [ ] Advanced integration examples
- [ ] Performance optimization guides
- [ ] Deployment automation guides

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial documentation release |
| 1.1.0 | TBD | Enhanced API examples, SDK tutorials |

---

**Happy reading!** If you have any questions or suggestions, feel free to reach out to our community.