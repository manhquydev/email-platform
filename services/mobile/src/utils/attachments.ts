import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '@/api/client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

/**
 * Download an attachment and open share dialog
 */
export async function downloadAttachment(id: string, filename: string): Promise<void> {
  const token = api.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const uri = `${API_BASE}/attachments/${id}/download`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileUri = ((FileSystem as any).documentDirectory || '') + filename;

  const downloadResult = await FileSystem.downloadAsync(uri, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (downloadResult.status !== 200) {
    throw new Error('Download failed');
  }

  // Check if sharing is available
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri);
  }
}

/**
 * Get file icon based on mime type
 */
export function getFileIcon(mimeType: string | null | undefined): string {
  if (!mimeType) return 'document-outline';

  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive-outline';

  return 'document-outline';
}
