import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MenuItem } from '../types';
import { useAdminStore } from '../store/useAdminStore';
import { X, Check, Trash2, Plus } from 'lucide-react-native';

interface EditDishModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const EditDishModal: React.FC<EditDishModalProps> = ({ item, onClose }) => {
  const { updateItem, createItem, deleteItem, categories, currency } = useAdminStore();
  
  const isEditing = !!item;
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isVeg, setIsVeg] = useState(true);
  const [isChefSpecial, setIsChefSpecial] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setPrice(String(item.price || 0));
      setDescription(item.description || item.shortDescription || '');
      setCategoryId(item.categoryId || '');
      setIsAvailable(item.isAvailable !== false);
      setIsVeg(item.isVeg !== false);
      setIsChefSpecial(!!item.isChefSpecial);
    } else {
      setName('');
      setPrice('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      setIsAvailable(true);
      setIsVeg(true);
      setIsChefSpecial(false);
    }
  }, [item, categories]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a dish name');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    setIsSaving(true);
    try {
      const selectedCategory = categories.find((c) => c.id === categoryId);
      const payload: Partial<MenuItem> = {
        name: name.trim(),
        price: numPrice,
        description: description.trim(),
        shortDescription: description.trim(),
        categoryId: categoryId || categories[0]?.id,
        category: selectedCategory?.name || 'Main',
        isAvailable,
        isVeg,
        isChefSpecial,
      };

      if (isEditing && item) {
        await updateItem(item.id, payload);
      } else {
        await createItem(payload);
      }
      onClose();
    } catch (err: any) {
      console.warn('Failed to save dish:', err);
      Alert.alert('Error', err?.message || 'Could not save dish');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(
      'Delete Dish',
      `Are you sure you want to permanently remove "${item.name}" from the menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteItem(item.id);
            onClose();
          } 
        }
      ]
    );
  };

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Dish Details' : 'Create New Dish'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>DISH NAME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Special Chicken Biryani"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PRICE ({currency}) *</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="249"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {categories.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.label}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsScroll}>
                  {categories.map((c) => {
                    const isSelected = categoryId === c.id || (!categoryId && c.id === categories[0]?.id);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.catChip, isSelected ? styles.catChipActive : null]}
                        onPress={() => setCategoryId(c.id)}
                      >
                        <Text style={[styles.catChipText, isSelected ? styles.catChipTextActive : null]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>DESCRIPTION / CHEF NOTES</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="Fresh ingredients, spices, and cooking style..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.switchesContainer}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>In Stock / Available</Text>
                  <Text style={styles.switchSub}>Visible on customer QR menu</Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Vegetarian Dish</Text>
                  <Text style={styles.switchSub}>Display green veg dot badge</Text>
                </View>
                <Switch
                  value={isVeg}
                  onValueChange={setIsVeg}
                  trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Chef's Special</Text>
                  <Text style={styles.switchSub}>Highlight at top of menu</Text>
                </View>
                <Switch
                  value={isChefSpecial}
                  onValueChange={setIsChefSpecial}
                  trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={16} color="#E11D48" />
                <Text style={styles.deleteButtonText}>Delete Dish from Menu</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave} 
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {isEditing ? 'Save Changes' : 'Create Dish'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  catChipsScroll: {
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  switchesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 6,
    marginBottom: 10,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
