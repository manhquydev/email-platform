import { api } from './client';
import type { Team, TeamMember, TeamInbox } from '@/types';

export const teamsApi = {
  /**
   * List all teams user is a member of
   */
  list: () =>
    api.request<{ teams: Team[] }>('/teams'),

  /**
   * Get team details
   */
  get: (id: string) =>
    api.request<{ team: Team }>(`/teams/${id}`),

  /**
   * Create a new team
   */
  create: (name: string, description?: string) =>
    api.request<{ team: Team }>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  /**
   * Get team members
   */
  getMembers: (teamId: string) =>
    api.request<{ members: TeamMember[] }>(`/teams/${teamId}/members`),

  /**
   * Add member to team
   */
  addMember: (teamId: string, email: string, role: string) =>
    api.request<{ member: TeamMember }>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  /**
   * Remove member from team
   */
  removeMember: (teamId: string, memberId: string) =>
    api.request<{ ok: boolean }>(`/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  /**
   * Get shared inboxes
   */
  getSharedInboxes: (teamId: string) =>
    api.request<{ inboxes: TeamInbox[] }>(`/teams/${teamId}/inboxes`),

  /**
   * Share inbox with team
   */
  shareInbox: (teamId: string, inboxId: string) =>
    api.request<{ ok: boolean }>(`/teams/${teamId}/inboxes/${inboxId}`, {
      method: 'POST',
    }),

  /**
   * Unshare inbox from team
   */
  unshareInbox: (teamId: string, inboxId: string) =>
    api.request<{ ok: boolean }>(`/teams/${teamId}/inboxes/${inboxId}`, {
      method: 'DELETE',
    }),
};
