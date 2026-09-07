import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  User,
  Mail,
  Shield,
  Download,
  Upload,
  LogOut,
  Trash2,
  Lock,
  Edit3,
  Camera,
  X,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { supabase } from '../../lib/supabase';

export default function MobileSettingsScreen() {
  const { currentUser, signOut, updateProfile } = useApp();

  // User email
  const [userEmail, setUserEmail] = useState('');

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Edit Profile form state
  const [editUsername, setEditUsername] = useState(currentUser.username || '');
  const [editDisplayName, setEditDisplayName] = useState(currentUser.display_name || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser.avatar_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Email form state
  const [newEmail, setNewEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Change Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Fetch email from Supabase Auth
  useEffect(() => {
    async function loadEmail() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch (err) {
        console.warn('Failed to load user email:', err);
      }
    }
    loadEmail();
  }, []);

  // Sync edit profile form with currentUser
  useEffect(() => {
    setEditUsername(currentUser.username || '');
    setEditDisplayName(currentUser.display_name || '');
    setEditAvatarUrl(currentUser.avatar_url || '');
  }, [currentUser]);

  const handleSaveProfile = async () => {
    const cleanUsername = editUsername.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters (letters, numbers, underscores).');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        username: cleanUsername,
        display_name: editDisplayName.trim() || cleanUsername,
        avatar_url: editAvatarUrl.trim() || null,
      });
      setIsEditProfileOpen(false);
      Alert.alert('Success', 'Your profile and username have been updated!');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;

      setIsChangeEmailOpen(false);
      setNewEmail('');
      Alert.alert(
        'Confirmation Sent',
        `A confirmation email has been sent to ${newEmail.trim()}. Please click the link in your inbox to confirm your new email address.`
      );
    } catch (err: any) {
      Alert.alert('Email Update Failed', err.message || 'Failed to update email.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Invalid Password', 'New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setIsChangePasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed successfully!');
    } catch (err: any) {
      Alert.alert('Password Update Failed', err.message || 'Failed to update password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all saved links? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user_account');
              if (error) {
                await supabase.from('profiles').delete().eq('id', currentUser.id);
              }
              try {
                await supabase.auth.signOut({ scope: 'global' });
              } catch {}
              await signOut();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.heading}>Account & Settings</Text>

      {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            {currentUser.avatar_url ? (
              <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImg} />
            ) : (
              <User color="#ffffff" size={24} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {currentUser.display_name || `@${currentUser.username}`}
            </Text>
            <Text style={styles.usernameText}>@{currentUser.username}</Text>
            {userEmail ? <Text style={styles.emailText}>{userEmail}</Text> : null}
            {currentUser.is_admin && (
              <View style={styles.adminBadge}>
                <Shield color="#818cf8" size={12} />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            activeOpacity={0.8}
            onPress={() => setIsEditProfileOpen(true)}
          >
            <Edit3 color="#a5b4fc" size={16} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account & Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Security</Text>

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => setIsChangeEmailOpen(true)}
        >
          <View style={styles.rowLeft}>
            <Mail color="#818cf8" size={18} />
            <View>
              <Text style={styles.rowText}>Change Email</Text>
              <Text style={styles.rowSubtext}>{userEmail || 'Update account email'}</Text>
            </View>
          </View>
          <ChevronRight color="#52525b" size={16} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => setIsChangePasswordOpen(true)}
        >
          <View style={styles.rowLeft}>
            <Lock color="#818cf8" size={18} />
            <View>
              <Text style={styles.rowText}>Change Password</Text>
              <Text style={styles.rowSubtext}>Update your password (min 8 chars)</Text>
            </View>
          </View>
          <ChevronRight color="#52525b" size={16} />
        </TouchableOpacity>
      </View>

      {/* Bookmarks & Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookmarks & Data</Text>
        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <Upload color="#818cf8" size={18} />
            <Text style={styles.rowText}>Import Browser Bookmarks (.html)</Text>
          </View>
          <ChevronRight color="#52525b" size={16} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <Download color="#818cf8" size={18} />
            <Text style={styles.rowText}>Export My Library (.html)</Text>
          </View>
          <ChevronRight color="#52525b" size={16} />
        </TouchableOpacity>
      </View>

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handleLogout}>
          <View style={styles.rowLeft}>
            <LogOut color="#a1a1aa" size={18} />
            <Text style={styles.rowText}>Sign Out</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerRow} activeOpacity={0.7} onPress={handleDeleteAccount}>
          <View style={styles.rowLeft}>
            <Trash2 color="#ef4444" size={18} />
            <Text style={styles.dangerText}>Delete Account (Danger Zone)</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={isEditProfileOpen} animationType="slide" transparent onRequestClose={() => setIsEditProfileOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditProfileOpen(false)}>
                <X color="#a1a1aa" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USERNAME</Text>
                <View style={styles.usernameInputWrap}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    style={styles.usernameInput}
                    value={editUsername}
                    onChangeText={t => setEditUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="your_username"
                    placeholderTextColor="#52525b"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={styles.inputHint}>Unique handle for sharing links (min 3 chars).</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="e.g. Alex Curator"
                  placeholderTextColor="#52525b"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PROFILE PICTURE / AVATAR URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={editAvatarUrl}
                  onChangeText={setEditAvatarUrl}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor="#52525b"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.inputHint}>Paste an image URL for your profile avatar.</Text>
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSavingProfile && styles.btnDisabled]}
                disabled={isSavingProfile}
                onPress={handleSaveProfile}
              >
                {isSavingProfile ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.modalSubmitBtnText}>Save Profile Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={isChangeEmailOpen} animationType="slide" transparent onRequestClose={() => setIsChangeEmailOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Email Address</Text>
              <TouchableOpacity onPress={() => setIsChangeEmailOpen(false)}>
                <X color="#a1a1aa" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDesc}>
                A confirmation link will be sent to your new email address to verify the change.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NEW EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="new-email@example.com"
                  placeholderTextColor="#52525b"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSavingEmail && styles.btnDisabled]}
                disabled={isSavingEmail}
                onPress={handleUpdateEmail}
              >
                {isSavingEmail ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.modalSubmitBtnText}>Send Confirmation Email</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isChangePasswordOpen} animationType="slide" transparent onRequestClose={() => setIsChangePasswordOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setIsChangePasswordOpen(false)}>
                <X color="#a1a1aa" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NEW PASSWORD (MIN 8 CHARACTERS)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSavingPassword && styles.btnDisabled]}
                disabled={isSavingPassword}
                onPress={handleUpdatePassword}
              >
                {isSavingPassword ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.modalSubmitBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  usernameText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
  emailText: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  adminText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '500',
  },
  rowSubtext: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1917',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  dangerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 18,
  },
  modalDesc: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  usernameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
  },
  atSymbol: {
    color: '#71717a',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: '#fafafa',
    fontSize: 14,
    paddingVertical: 10,
  },
  textInput: {
    backgroundColor: '#09090b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fafafa',
    fontSize: 14,
  },
  inputHint: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 4,
  },
  modalSubmitBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
