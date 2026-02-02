# Phase 4: Frontend Enhancements

## Context
The current `ComposeModal` is functional but basic. We want a modern, Gmail-like experience.

## Requirements
1.  **Editor**: Replace basic textarea with **Tiptap**.
2.  **UX**: "Docked" mode vs "Modal" mode.
3.  **Attachments**: Optimistic uploading (upload starts on drop).

## Implementation Steps
1.  **Install Dependencies**:
    - `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link`
    - `npm install react-dropzone`
    - `npm install lucide-react` (if not present)
2.  **Create Components**:
    - `src/components/editor/RichTextEditor.tsx` (Tiptap wrapper with Tailwind prose).
    - `src/components/compose/AttachmentList.tsx`.
3.  **Update ComposeModal**:
    - Replace body input with `RichTextEditor`.
    - Implement `useDropzone` for file handling.
    - Add "Minimize/Maximize" state management.
4.  **Optimistic Uploads**:
    - When file dropped -> Add to state with `uploading: true`.
    - Trigger API upload.
    - On success -> `uploading: false`, `url: ...`.
    - On fail -> Show error, allow retry.

## Todo List
- [ ] Install Tiptap & Dropzone
- [ ] Build `RichTextEditor` component
- [ ] Build `AttachmentList` component
- [ ] Refactor `ComposeModal`
- [ ] Test with large files
