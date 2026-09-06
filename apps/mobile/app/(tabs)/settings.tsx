import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { User, Mail, Shield, Download, Upload, LogOut, Trash2 } from 'lucide-react-native';

export default function MobileSettingsScreen() {
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {} },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Account & Settings</Text>

      {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <User color="#ffffff" size={24} />
          </View>
          <View>
            <Text style={styles.username}>@admin_hasan</Text>
            <Text style={styles.email}>hasan@example.com</Text>
          </View>
        </View>
      </View>

      {/* Settings Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookmarks & Data</Text>
        <TouchableOpacity style={styles.row}>
          <Upload color="#818cf8" size={18} />
          <Text style={styles.rowText}>Import Browser Bookmarks (.html)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Download color="#818cf8" size={18} />
          <Text style={styles.rowText}>Export My Library (.html)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <LogOut color="#a1a1aa" size={18} />
          <Text style={styles.rowText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerRow}>
          <Trash2 color="#ef4444" size={18} />
          <Text style={styles.dangerText}>Delete Account (Danger Zone)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    padding: 16,
  },
  heading: {
    color: '#fafafa',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    color: '#71717a',
    fontSize: 13,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  rowText: {
    color: '#fafafa',
    fontSize: 14,
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
});
