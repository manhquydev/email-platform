
import { File, X, Image as ImageIcon } from 'lucide-react';

export interface Attachment {
  id: string;
  file: File;
  previewUrl?: string;
  uploading?: boolean;
  error?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-2 pr-1 max-w-[200px] relative group"
        >
          <div className="mr-2 text-gray-500 dark:text-gray-400">
            {att.file.type.startsWith('image/') ? <ImageIcon size={16} /> : <File size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-gray-700 dark:text-gray-200" title={att.file.name}>
              {att.file.name}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {(att.file.size / 1024).toFixed(0)} KB
            </p>
          </div>

          {att.uploading && (
             <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center rounded-md">
                 <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          )}

          <button
            onClick={() => onRemove(att.id)}
            className="ml-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
