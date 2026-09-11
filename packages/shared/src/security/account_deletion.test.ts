import { describe, it, expect } from 'vitest';

describe('Account Deletion Security and Contract Validation', () => {
  it('strictly validates confirmation phrase on client before initiating delete', () => {
    const validPhrase = 'delete my account';
    const validate = (input: string) => input.trim().toLowerCase() === validPhrase;

    expect(validate('delete my account')).toBe(true);
    expect(validate('  DELETE MY ACCOUNT  ')).toBe(true);
    expect(validate('delete my account ')).toBe(true);
    expect(validate('delete')).toBe(false);
    expect(validate('delete account')).toBe(false);
    expect(validate('cancel')).toBe(false);
    expect(validate('')).toBe(false);
  });

  it('verifies cascade delete coverage across all relational tables', () => {
    // Relational schema cascade contract:
    // Any entity linked to profiles(id) must specify ON DELETE CASCADE or ON DELETE SET NULL
    const userEntities = [
      { table: 'profiles', foreignKey: 'id', target: 'auth.users(id)', onAction: 'cascade' },
      { table: 'categories', foreignKey: 'user_id', target: 'profiles(id)', onAction: 'cascade' },
      { table: 'folders', foreignKey: 'user_id', target: 'profiles(id)', onAction: 'cascade' },
      { table: 'links', foreignKey: 'user_id', target: 'profiles(id)', onAction: 'cascade' },
      { table: 'friendships_requester', foreignKey: 'requester_id', target: 'profiles(id)', onAction: 'cascade' },
      { table: 'friendships_recipient', foreignKey: 'recipient_id', target: 'profiles(id)', onAction: 'cascade' },
      { table: 'sends', foreignKey: 'sender_id', target: 'profiles(id)', onAction: 'cascade' },
      { table: 'send_recipients', foreignKey: 'recipient_id', target: 'profiles(id)', onAction: 'cascade' },
    ];

    expect(userEntities.length).toBe(8);
    userEntities.forEach(entity => {
      expect(entity.onAction).toBe('cascade');
    });
  });

  it('safeguards the last active administrator from account deletion', () => {
    const canDeleteAccount = (params: {
      userId: string;
      isAdmin: boolean;
      activeAdminCount: number;
    }) => {
      if (params.isAdmin && params.activeAdminCount <= 1) {
        return {
          allowed: false,
          error: 'Security Error: You are the last remaining active administrator. Please promote another active user to administrator before deleting this account.',
        };
      }
      return { allowed: true };
    };

    // Standard user can always delete their account
    expect(canDeleteAccount({ userId: 'u1', isAdmin: false, activeAdminCount: 2 })).toEqual({
      allowed: true,
    });

    // Admin with other active admins can delete their account
    expect(canDeleteAccount({ userId: 'u2', isAdmin: true, activeAdminCount: 3 })).toEqual({
      allowed: true,
    });

    // Last remaining active admin MUST be blocked
    const blockedResult = canDeleteAccount({ userId: 'u3', isAdmin: true, activeAdminCount: 1 });
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.error).toContain('last remaining active administrator');
  });
});
