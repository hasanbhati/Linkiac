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
import { X, Folder, FolderPlus, Trash2, Plus, ChevronRight, Layers } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

interface ManageFoldersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageFoldersModal({ visible, onClose }: ManageFoldersModalProps) {
  const { folders, links, categories, addFolder, deleteFolder, addCategory, deleteCategory } = useApp();

  // Active sub-tab in modal
  const [modalTab, setModalTab] = useState<'folders' | 'categories'>('folders');

  // Folder creation state
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [folderCategoryId, setFolderCategoryId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await addFolder(newFolderName.trim(), folderCategoryId, parentFolderId);
      setNewFolderName('');
      setParentFolderId(null);
      setFolderCategoryId(null);
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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create category.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Delete category "${name}"? Folders and links inside this category will remain, but will no longer be grouped under it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch {
              Alert.alert('Error', 'Could not delete category.');
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {modalTab === 'folders' ? (
                <Folder color="#f59e0b" size={20} />
              ) : (
                <Layers color="#818cf8" size={20} />
              )}
              <Text style={styles.title}>
                {modalTab === 'folders' ? 'Manage Folders' : 'Manage Categories'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, modalTab === 'folders' && styles.segmentBtnActive]}
              onPress={() => setModalTab('folders')}
              activeOpacity={0.8}
            >
              <Folder
                color={modalTab === 'folders' ? '#ffffff' : '#a1a1aa'}
                size={14}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, modalTab === 'folders' && styles.segmentTextActive]}>
                Folders ({folders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, modalTab === 'categories' && styles.segmentBtnActive]}
              onPress={() => setModalTab('categories')}
              activeOpacity={0.8}
            >
              <Layers
                color={modalTab === 'categories' ? '#ffffff' : '#a1a1aa'}
                size={14}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, modalTab === 'categories' && styles.segmentTextActive]}>
                Categories ({categories.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {modalTab === 'folders' ? (
              <View style={styles.section}>
                {/* Create Folder Box */}
                <View style={styles.createBox}>
                  <Text style={styles.createLabel}>CREATE NEW FOLDER</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 10 }]}
                    placeholder="Folder name (e.g. Articles, Dev Tools)..."
                    placeholderTextColor="#71717a"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                  />

                  {/* Optional Category Picker */}
                  {categories.length > 0 && (
                    <View style={styles.catPickerRow}>
                      <Text style={styles.catPickerLabel}>Assign to Category (Optional):</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                        <TouchableOpacity
                          style={[styles.catChip, folderCategoryId === null && styles.catChipActive]}
                          onPress={() => setFolderCategoryId(null)}
                        >
                          <Text style={[styles.catChipText, folderCategoryId === null && styles.catChipTextActive]}>
                            No Category
                          </Text>
                        </TouchableOpacity>
                        {categories.map(c => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.catChip, folderCategoryId === c.id && styles.catChipActive]}
                            onPress={() => setFolderCategoryId(c.id)}
                          >
                            <Layers
                              color={folderCategoryId === c.id ? '#ffffff' : '#818cf8'}
                              size={12}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.catChipText, folderCategoryId === c.id && styles.catChipTextActive]}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Optional parent folder picker for nesting */}
                  {folders.length > 0 && (
                    <View style={styles.catPickerRow}>
                      <Text style={styles.catPickerLabel}>Nest under parent folder (Optional):</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                        <TouchableOpacity
                          style={[styles.catChip, parentFolderId === null && styles.catChipActive]}
                          onPress={() => setParentFolderId(null)}
                        >
                          <Text style={[styles.catChipText, parentFolderId === null && styles.catChipTextActive]}>
                            Root Folder
                          </Text>
                        </TouchableOpacity>
                        {folders.map(f => (
                          <TouchableOpacity
                            key={f.id}
                            style={[styles.catChip, parentFolderId === f.id && styles.catChipActive]}
                            onPress={() => setParentFolderId(f.id)}
                          >
                            <Folder
                              color={parentFolderId === f.id ? '#ffffff' : '#f59e0b'}
                              size={12}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.catChipText, parentFolderId === f.id && styles.catChipTextActive]}>
                              {f.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.folderSubmitBtn, !newFolderName.trim() && styles.btnDisabled]}
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    onPress={handleCreateFolder}
                  >
                    <FolderPlus color="#ffffff" size={16} />
                    <Text style={styles.folderSubmitBtnText}>Create Folder</Text>
                  </TouchableOpacity>
                </View>

                {/* Folder List */}
                <Text style={styles.listHeader}>EXISTING FOLDERS ({folders.length})</Text>
                {folders.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No folders created yet.</Text>
                  </View>
                ) : (
                  folders.map(folder => {
                    const count = links.filter(l => l.folder_id === folder.id).length;
                    const parentName = folders.find(f => f.id === folder.parent_folder_id)?.name;
                    const catName = categories.find(c => c.id === folder.category_id)?.name;
                    return (
                      <View key={folder.id} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconFolder}>
                            <Folder color="#f59e0b" size={16} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{folder.name}</Text>
                            <Text style={styles.itemSub} numberOfLines={1}>
                              {count} {count === 1 ? 'link' : 'links'}
                              {catName ? ` • Category: ${catName}` : ''}
                              {parentName ? ` • in ${parentName}` : ' • Root'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteFolder(folder.id, folder.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 color="#ef4444" size={16} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            ) : (
              <View style={styles.section}>
                {/* Create Category Box */}
                <View style={styles.createBox}>
                  <Text style={styles.createLabel}>CREATE NEW CATEGORY</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 10 }]}
                    placeholder="Category name (e.g. Work, Tech, Personal)..."
                    placeholderTextColor="#71717a"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                  />

                  <TouchableOpacity
                    style={[styles.folderSubmitBtn, !newCategoryName.trim() && styles.btnDisabled]}
                    disabled={!newCategoryName.trim() || isCreatingCategory}
                    onPress={handleCreateCategory}
                  >
                    <Plus color="#ffffff" size={16} />
                    <Text style={styles.folderSubmitBtnText}>Create Category</Text>
                  </TouchableOpacity>
                </View>

                {/* Category List */}
                <Text style={styles.listHeader}>EXISTING CATEGORIES ({categories.length})</Text>
                {categories.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No categories created yet.</Text>
                  </View>
                ) : (
                  categories.map(category => {
                    const folderCount = folders.filter(f => f.category_id === category.id).length;
                    const directLinksCount = links.filter(l => l.category_id === category.id).length;
                    return (
                      <View key={category.id} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconCategory}>
                            <Layers color="#818cf8" size={16} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{category.name}</Text>
                            <Text style={styles.itemSub}>
                              {folderCount} {folderCount === 1 ? 'folder' : 'folders'} • {directLinksCount} direct links
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteCategory(category.id, category.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 color="#ef4444" size={16} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            )}
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
    backgroundColor: '#4f46e5',
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
  catPickerRow: {
    marginBottom: 10,
  },
  catPickerLabel: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 6,
  },
  catChips: {
    flexDirection: 'row',
    gap: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  catChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  catChipText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#27272a',
  },
  segmentText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemIconCategory: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
