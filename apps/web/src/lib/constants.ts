import { Profile } from '@linkiac/shared';

export const defaultCurrentUser: Profile = {
  id: '',
  username: '',
  display_name: '',
  avatar_url: null,
  is_admin: false,
  status: 'active',
  created_at: new Date().toISOString(),
};
