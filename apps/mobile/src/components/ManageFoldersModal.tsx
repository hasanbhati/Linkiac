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
import { X, Folder, FolderPlus, Trash2, Plus, Tag, Layers, ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

interface ManageFoldersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageFoldersModal({ visible, onClose }: ManageFoldersModalProps) {
  const { categories, folders, links, addCategory, deleteCategory, addFolder, deleteFolder } = useApp();
  const [activeTab, setActiveTab] = useState<'categories' | 'folders'>('categories');

  // Category creation
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Folder creation
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderCatId, setSelectedFolderCatId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      await addCategory(newCatName.trim());
      setNewCatName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create category.');
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? Links inside it will become unfiled, and folders will be unassigned.`,
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await addFolder(newFolderName.trim(), selectedFolderCatId);
      setNewFolderName('');
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Layers color="#818cf8" size={20} />
              <Text style={styles.title}>Organize Library</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          {/* Sub-tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'categories' && styles.tabBtnActive]}
              onPress={() => setActiveTab('categories')}
            >
              <Tag color={activeTab === 'categories' ? '#ffffff' : '#71717a'} size={15} />
              <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
                Categories ({categories.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'folders' && styles.tabBtnActive]}
              onPress={() => setActiveTab('folders')}
            >
              <Folder color={activeTab === 'folders' ? '#ffffff' : '#71717a'} size={15} />
              <Text style={[styles.tabText, activeTab === 'folders' && styles.tabTextActive]}>
                Folders ({folders.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {activeTab === 'categories' ? (
              <View style={styles.section}>
                {/* Create Category */}
                <View style={styles.createBox}>
                  <Text style={styles.createLabel}>CREATE NEW CATEGORY</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="Category name (e.g. Work, Tech, Design)..."
                      placeholderTextColor="#71717a"
                      value={newCatName}
                      onChangeText={setNewCatName}
                    />
                    <TouchableOpacity
                      style={[styles.createBtn, !newCatName.trim() && styles.btnDisabled]}
                      disabled={!newCatName.trim() || isCreatingCat}
                      onPress={handleCreateCategory}
                    >
                      <Plus color="#ffffff" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Category List */}
                <Text style={styles.listHeader}>EXISTING CATEGORIES</Text>
                {categories.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No categories created yet.</Text>
                  </View>
                ) : (
                  categories.map(cat => {
                    const count = links.filter(l => l.category_id === cat.id).length;
                    const folderCount = folders.filter(f => f.category_id === cat.id).length;
                    return (
                      <View key={cat.id} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconCat}>
                            <Tag color="#818cf8" size={16} />
                          </View>
                          <View>
                            <Text style={styles.itemName}>{cat.name}</Text>
                            <Text style={styles.itemSub}>
                              {count} {count === 1 ? 'link' : 'links'} • {folderCount} folders
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteCategory(cat.id, cat.name)}
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
                {/* Create Folder */}
                <View style={styles.createBox}>
                  <Text style={styles.createLabel}>CREATE NEW FOLDER</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    placeholder="Folder name (e.g. Articles, Tutorials)..."
                    placeholderTextColor="#71717a"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                  />

                  {categories.length > 0 && (
                    <View style={styles.catPickerRow}>
                      <Text style={styles.catPickerLabel}>Assign to Category (Optional):</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                        <TouchableOpacity
                          style={[styles.catChip, selectedFolderCatId === null && styles.catChipActive]}
                          onPress={() => setSelectedFolderCatId(null)}
                        >
                          <Text style={[styles.catChipText, selectedFolderCatId === null && styles.catChipTextActive]}>
                            None (Standalone)
                          </Text>
                        </TouchableOpacity>
                        {categories.map(c => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.catChip, selectedFolderCatId === c.id && styles.catChipActive]}
                            onPress={() => setSelectedFolderCatId(c.id)}
                          >
                            <Text style={[styles.catChipText, selectedFolderCatId === c.id && styles.catChipTextActive]}>
                              {c.name}
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
                <Text style={styles.listHeader}>EXISTING FOLDERS</Text>
                {folders.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No folders created yet.</Text>
                  </View>
                ) : (
                  folders.map(folder => {
                    const count = links.filter(l => l.folder_id === folder.id).length;
                    const catName = categories.find(c => c.id === folder.category_id)?.name;
                    return (
                      <View key={folder.id} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconFolder}>
                            <Folder color="#f59e0b" size={16} />
                          </View>
                          <View>
                            <Text style={styles.itemName}>{folder.name}</Text>
                            <Text style={styles.itemSub}>
                              {count} {count === 1 ? 'link' : 'links'} {catName ? `• in ${catName}` : '• Standalone'}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#27272a',
  },
  tabText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollBody: {
    padding: 16,
  },
  section: {
    gap: 14,
  },
  createBox: {
    backgroundColor: '#09090b',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  createLabel: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#fafafa',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  createBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
    gap: 6,
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
    color: '#a1a1aa',
    fontSize: 11,
    marginBottom: 6,
  },
  catChips: {
    flexDirection: 'row',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  catChipActive: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  catChipText: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  catChipTextActive: {
    color: '#c7d2fe',
    fontWeight: '600',
  },
  listHeader: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09090b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemIconCat: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconFolder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
    fontSize: 11,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 13,
  },
});
