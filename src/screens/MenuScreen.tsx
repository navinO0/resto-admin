import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Switch, 
  ScrollView,
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { useAdminStore } from '../store/useAdminStore';
import { EditDishModal } from '../components/EditDishModal';
import { MenuItem } from '../types';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export const MenuScreen = () => {
  const { menuItems, categories, toggleStock, currency, fetchMenu, isLoading } = useAdminStore();
  
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [modalItem, setModalItem] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null });
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  const handleToggleStock = async (itemId: string, val: boolean) => {
    setUpdatingStockId(itemId);
    try {
      await toggleStock(itemId, val);
    } finally {
      setUpdatingStockId(null);
    }
  };

  const getCatName = (catId: string) => categories.find((c) => c.id === catId)?.name ?? '';

  const filteredItems = menuItems.filter((item) => {
    const matchesCat =
      selectedCatId === 'all' ||
      item.categoryId === selectedCatId ||
      (item.category != null && item.category === getCatName(selectedCatId));

    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || item.shortDescription || '').toLowerCase().includes(search.toLowerCase());

    return matchesCat && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={15} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search dishes..."
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity
            style={styles.addDishBtn}
            onPress={() => setModalItem({ open: true, item: null })}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addDishBtnText}>Add Dish</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catPill, selectedCatId === 'all' ? styles.catPillActive : null]}
            onPress={() => setSelectedCatId('all')}
          >
            <Text style={[styles.catText, selectedCatId === 'all' ? styles.catTextActive : null]}>
              All ({menuItems.length})
            </Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const count = menuItems.filter((m) => m.category === c.name || m.categoryId === c.id).length;
            const isActive = selectedCatId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, isActive ? styles.catPillActive : null]}
                onPress={() => setSelectedCatId(c.id)}
              >
                <Text style={[styles.catText, isActive ? styles.catTextActive : null]}>
                  {c.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.resultBar}>
          <Text style={styles.resultText}>Showing {filteredItems.length} items</Text>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchMenu} colors={['#EA580C']} />
        }
        renderItem={({ item }) => (
          <View style={styles.dishCard}>
            <View style={styles.dishLeft}>
              <View style={[styles.vegBadge, item.isVeg !== false ? styles.vegBorder : styles.nonVegBorder]}>
                <View style={[styles.vegDot, item.isVeg !== false ? styles.vegDotColor : styles.nonVegDotColor]} />
              </View>
              <View style={styles.dishInfo}>
                <View style={styles.dishHeaderRow}>
                  <Text style={styles.dishName}>{item.name}</Text>
                  {item.isChefSpecial && (
                    <View style={styles.specialBadge}>
                      <Text style={styles.specialBadgeText}>Special</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dishCategory}>{item.category || 'Menu'}</Text>
                <Text style={styles.dishPrice}>{currency}{item.price}</Text>
              </View>
            </View>

            <View style={styles.dishRight}>
              <View style={styles.stockToggle}>
                <Text style={[styles.stockLabel, item.isAvailable !== false ? styles.inStockText : styles.outStockText]}>
                  {item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                </Text>
                {updatingStockId === item.id ? (
                  <View style={{ width: 44, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color="#EA580C" />
                  </View>
                ) : (
                  <Switch
                    value={item.isAvailable !== false}
                    onValueChange={(val) => handleToggleStock(item.id, val)}
                    trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setModalItem({ open: true, item })}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={15} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="restaurant" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Dishes Found</Text>
            <Text style={styles.emptySub}>
              {search ? `No items match "${search}"` : 'No items in this category.'}
            </Text>
          </View>
        }
      />

      {modalItem.open && (
        <EditDishModal
          item={modalItem.item}
          onClose={() => setModalItem({ open: false, item: null })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    paddingTop: 10,
    paddingBottom: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  addDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    gap: 4,
  },
  addDishBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  catScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  resultBar: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dishLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  vegBorder: {
    borderColor: '#16A34A',
  },
  nonVegBorder: {
    borderColor: '#DC2626',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegDotColor: {
    backgroundColor: '#16A34A',
  },
  nonVegDotColor: {
    backgroundColor: '#DC2626',
  },
  dishInfo: {
    flex: 1,
  },
  dishHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dishName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3,
  },
  specialBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  dishCategory: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA580C',
    marginTop: 4,
  },
  dishRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockToggle: {
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  inStockText: {
    color: '#10B981',
  },
  outStockText: {
    color: '#94A3B8',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
