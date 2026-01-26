/**
 * TipTap Editor with variable support for notification templates
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useState } from 'react';
import { TEMPLATE_VARIABLES } from './template-hooks';

interface Props {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TiptapEditor({ content, onChange, placeholder = 'Nhập nội dung...' }: Props) {
  const [showVarMenu, setShowVarMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const insertVariable = (varName: string) => {
    editor.chain().focus().insertContent(`{{${varName}}}`).run();
    setShowVarMenu(false);
  };

  return (
    <div className="border rounded-lg dark:border-gray-600 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('strike') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('code') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Code"
        >
          {'</>'}
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVarMenu(!showVarMenu)}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
            title="Insert Variable"
          >
            <span className="text-blue-600">{'{{}}'}</span>
            <span className="text-xs">Biến</span>
          </button>
          {showVarMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-[200px]">
              {TEMPLATE_VARIABLES.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                >
                  <code className="text-blue-600 text-sm">{`{{${v.name}}}`}</code>
                  <span className="text-xs text-gray-500">{v.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert max-w-none p-3 min-h-[150px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px]"
      />
    </div>
  );
}
