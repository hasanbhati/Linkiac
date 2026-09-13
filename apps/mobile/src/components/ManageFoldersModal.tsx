import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Folder, FolderPlus, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface ManageFoldersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageFoldersModal({ visible, onClose }: ManageFoldersModalProps) {
  const { folders, links, addFolder, deleteFolder } = useApp();
  const { theme, isDark } = useTheme();

  // Folder creation state
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await addFolder(newFolderName.trim(), parentFolderId);
      setNewFolderName('');
      setParentFolderId(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (id: string, name: string) => {
    Alert.alert(
      'Delete Folder',
      `Delete folder "${name}"? Contained links will remain in your library as unfiled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(id);
            } catch {
              Alert.alert('Error', 'Could not delete folder.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.content, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.titleRow}>
              <Folder color="#f59e0b" size={20} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Manage Folders
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={theme.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              {/* Create Folder Box */}
              <View style={[styles.createBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <Text style={[styles.createLabel, { color: theme.textMuted }]}>CREATE NEW FOLDER</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary, marginBottom: 10 }]}
                  placeholder="Folder name (e.g. Articles, Dev Tools)..."
                  placeholderTextColor={theme.textMuted}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                />

                {/* Optional parent folder picker for nesting */}
                {folders.length > 0 && (
                  <View style={styles.pickerRow}>
                    <Text style={[styles.pickerLabel, { color: theme.textMuted }]}>Nest under parent folder (Optional):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerChips}>
                      <TouchableOpacity
                        style={[
                          styles.pickerChip,
                          {
                            backgroundColor: parentFolderId === null ? theme.accentPrimaryMuted : theme.surface,
                            borderColor: parentFolderId === null ? theme.accentPrimary : theme.border,
                          }
                        ]}
                        onPress={() => setParentFolderId(null)}
                      >
                        <Text style={[
                          styles.pickerChipText,
                          {
                            color: parentFolderId === null ? theme.accentPrimary : theme.textSecondary,
                            fontWeight: parentFolderId === null ? '600' : '400',
                          }
                        ]}>
                          Root Folder
                        </Text>
                      </TouchableOpacity>
                      {folders.map(f => {
                        const isFolderSelected = parentFolderId === f.id;
                        return (
                          <TouchableOpacity
                            key={f.id}
                            style={[
                              styles.pickerChip,
                              {
                                backgroundColor: isFolderSelected ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)') : theme.surface,
                                borderColor: isFolderSelected ? '#f59e0b' : theme.border,
                              }
                            ]}
                            onPress={() => setParentFolderId(f.id)}
                          >
                            <Folder
                              color={isFolderSelected ? (isDark ? '#fbbf24' : '#b45309') : '#f59e0b'}
                              size={12}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[
                              styles.pickerChipText,
                              {
                                color: isFolderSelected ? (isDark ? '#fbbf24' : '#b45309') : theme.textSecondary,
                                fontWeight: isFolderSelected ? '600' : '400',
                              }
                            ]}>
                              {f.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.folderSubmitBtn, { backgroundColor: theme.accentPrimary }, !newFolderName.trim() && styles.btnDisabled]}
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  onPress={handleCreateFolder}
                >
                  <FolderPlus color={theme.accentText} size={16} />
                  <Text style={[styles.folderSubmitBtnText, { color: theme.accentText }]}>Create Folder</Text>
                </TouchableOpacity>
              </View>

              {/* Folder List */}
              <Text style={[styles.listHeader, { color: theme.textMuted }]}>EXISTING FOLDERS ({folders.length})</Text>
              {folders.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>No folders created yet.</Text>
                </View>
              ) : (
                folders.map(folder => {
                  const count = links.filter(l => l.folder_id === folder.id).length;
                  const parentName = folders.find(f => f.id === folder.parent_folder_id)?.name;
                  return (
                    <View key={folder.id} style={[styles.itemRow, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemIconFolder}>
                          <Folder color="#f59e0b" size={16} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, { color: theme.textPrimary }]}>{folder.name}</Text>
                          <Text style={[styles.itemSub, { color: theme.textMuted }]} numberOfLines={1}>
                            {count} {count === 1 ? 'link' : 'links'}
                            {parentName ? ` • in ${parentName}` : ' • Root'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteFolder(folder.id, folder.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 color={theme.danger} size={16} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    gap: 16,
  },
  createBox: {
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 14,
  },
  createLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  folderSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
  },
  folderSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pickerRow: {
    marginBottom: 10,
  },
  pickerLabel: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 6,
  },
  pickerChips: {
    flexDirection: 'row',
    gap: 6,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pickerChipText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  listHeader: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemIconFolder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 13,
  },
});
