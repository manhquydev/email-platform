import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface EditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
}

export function Editor({ value, onChange, placeholder, style }: EditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

    useEffect(() => {
        if (editorRef.current && !quillRef.current) {
            const quill = new Quill(editorRef.current, {
                theme: 'snow',
                placeholder: placeholder,
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link'],
                        ['clean']
                    ]
                }
            });

            quill.on('text-change', () => {
                const html = editorRef.current?.querySelector('.ql-editor')?.innerHTML;
                onChange(html || '');
            });

            quillRef.current = quill;

            // Initial value
            if (value) {
                quill.clipboard.dangerouslyPasteHTML(value);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle external value changes (e.g. reset)
    useEffect(() => {
        if (quillRef.current && value !== quillRef.current.root.innerHTML) {
            // Only update if significantly different to avoid cursor jumps, 
            // but for simple cases like reset (value="") it works.
            if (value === "" || value === "<p><br></p>") {
                quillRef.current.setText("");
            }
        }
    }, [value]);

    return (
        <div style={style}>
            <div ref={editorRef} style={{ height: '100%' }} />
        </div>
    );
}
