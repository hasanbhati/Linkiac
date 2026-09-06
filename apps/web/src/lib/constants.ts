import { Profile } from '@linkiac/shared';

export const defaultCurrentUser: Profile = {
  id: 'a0000000-0000-0000-0000-000000000001',
  username: 'admin_hasan',
  display_name: 'Hasan (Admin)',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  is_admin: true,
  status: 'active',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
};
