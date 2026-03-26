import api from '../lib/api'
export const sharingService = {
  invite: (accountId: number, email: string, role: string) =>
    api.post(`/api/sharing/${accountId}/invite`, { email, role }).then(r => r.data),
  listMembers: (accountId: number) =>
    api.get(`/api/sharing/${accountId}/members`).then(r => r.data),
  removeMember: (accountId: number, userId: number) =>
    api.delete(`/api/sharing/${accountId}/members/${userId}`).then(r => r.data),
  listInvitations: () =>
    api.get('/api/sharing/invitations').then(r => r.data),
  acceptInvitation: (token: string) =>
    api.post(`/api/sharing/invitations/${token}/accept`).then(r => r.data),
}
