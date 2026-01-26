/**
 * Template API hooks for admin notification templates
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';

export interface TemplateVariable {
  name: string;
  required: boolean;
  description?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMOTION';
  variables?: TemplateVariable[];
  imageUrl?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    notifications: number;
    scheduledNotifications: number;
  };
}

export interface TemplatePayload {
  name: string;
  title: string;
  message: string;
  type?: string;
  variables?: TemplateVariable[];
  imageUrl?: string;
}

// Available system variables
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: 'username', required: false, description: 'Tên người dùng' },
  { name: 'email', required: false, description: 'Email người dùng' },
  { name: 'tier', required: false, description: 'Gói đăng ký' },
  { name: 'date', required: false, description: 'Ngày hiện tại' },
  { name: 'appName', required: false, description: 'Tên ứng dụng' },
];

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Hook for listing templates
 */
export function useTemplates() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (includeArchived = false) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = includeArchived ? '?includeArchived=true' : '';
      const res = await fetch(`${API_BASE}/admin/notifications/templates${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { templates, loading, error, fetchTemplates };
}

/**
 * Hook for template CRUD operations
 */
export function useTemplateActions() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const createTemplate = useCallback(async (payload: TemplatePayload): Promise<NotificationTemplate | null> => {
    if (!token) return null;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create template');
      const json = await res.json();
      return json.template;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateTemplate = useCallback(async (id: string, payload: Partial<TemplatePayload>): Promise<NotificationTemplate | null> => {
    if (!token) return null;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/templates/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update template');
      const json = await res.json();
      return json.template;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const archiveTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!token) return false;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cloneTemplate = useCallback(async (id: string, newName?: string): Promise<NotificationTemplate | null> => {
    if (!token) return null;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/templates/${id}/clone`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      if (!res.ok) throw new Error('Failed to clone template');
      const json = await res.json();
      return json.template;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const restoreTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!token) return false;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/templates/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return { createTemplate, updateTemplate, archiveTemplate, cloneTemplate, restoreTemplate, loading };
}
