import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

// Mock API for serving documentation files
// In production, this would be replaced with actual API calls
export const useDocumentationServer = (path: string) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocumentation = async () => {
      try {
        setLoading(true);
        setError(null);

        // For development, load from local files
        // In production, this would fetch from your backend
        const response = await fetch(`/docs${path}`);

        if (!response.ok) {
          throw new Error('Documentation not found');
        }

        const markdown = await response.text();
        setContent(markdown);
      } catch (err) {
        console.error('Error loading documentation:', err);
        setError('Failed to load documentation');
      } finally {
        setLoading(false);
      }
    };

    if (path) {
      loadDocumentation();
    }
  }, [path]);

  return { content, loading, error };
};

// Helper function to convert markdown to HTML
export const markdownToHTML = (markdown: string): string => {
  // Basic markdown parsing
  let html = markdown
    // Headers with IDs
    .replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 id="$1">$1</h1>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (lang, code) => {
      const language = lang || 'javascript';
      return `<div class="code-block-container"><pre class="code-block"><code class="language-${language}">${escapeHtml(code)}</code></pre><button class="copy-code" onclick="navigator.clipboard.writeText(\`${escapeHtml(code)}\`)">Copy</button></div>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|p|b|b|l|q|hr])(.+)$/gm, '<p>$1</p>')
    // Clean up
    .replace(/<p><\/p>/g, '')
    .replace(/<p><(h[1-6]|ul|ol|blockquote|hr)/g, '<$1')
    .replace(/<\/(h[1-6]|ul|ol|blockquote|hr)><\/p>/g, '</$1>');

  return DOMPurify.sanitize(html);
};

// Escape HTML for code blocks
const escapeHtml = (text: string): string => {
  const map: {[key: string]: string} = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// Generate table of contents
export const generateTOC = (markdown: string): Array<{id: string, text: string, level: number}> => {
  const toc: Array<{id: string, text: string, level: number}> = [];
  const lines = markdown.split('\n');

  lines.forEach((line) => {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      toc.push({ id, text, level });
    }
  });

  return toc;
};

// Syntax highlighter component - placeholder for future implementation
export const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  return (
    <div className="code-block-container">
      <pre className="code-block">
        <code className="language-javascript">{code}</code>
      </pre>
      <button
        className="copy-code"
        onClick={() => navigator.clipboard.writeText(code)}
      >
        Copy
      </button>
    </div>
  );
};