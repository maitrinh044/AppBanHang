import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart, Order, OrderItem } from '../context/CartContext';
import { DEFAULT_TABLES } from '../constants/tables';
import { useCurrentTime } from '../utils/orderTime';
import OrderTimeBadge from '../components/OrderTimeBadge';

interface TableMapScreenProps {
  onBack: () => void;
  onOrderForTable: (tableNumber: string) => void;
}

const formatPrice = (price?: number | null) => {
  return (Number(price) || 0).toLocaleString('vi-VN') + ' đ';
};

const cleanFoodName = (name: string) => {
  const cleaned = name.replace(/^[Bb]ánh\s+[Cc]anh\s+/, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export default function TableMapScreen({ onBack, onOrderForTable }: TableMapScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const isTablet = screenWidth >= 600;

  const { orders, updateOrderStatus, transferTable, mergeTables } = useCart();
  const now = useCurrentTime(15000);

  // Filter & Search states
  const [activeFilter, setActiveFilter] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected table modal states
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [targetTransferTable, setTargetTransferTable] = useState<string>('');
  const [customTransferTable, setCustomTransferTable] = useState('');

  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [targetMergeTable, setTargetMergeTable] = useState<string>('');

  // Bill preview modal
  const [billOrder, setBillOrder] = useState<Order | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Group active (unpaid) orders by tableNumber
  const unpaidOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'paid');
  }, [orders]);

  const tableOrderMap = useMemo(() => {
    const map = new Map<string, Order[]>();
    unpaidOrders.forEach((o) => {
      const existing = map.get(o.tableNumber) || [];
      existing.push(o);
      map.set(o.tableNumber, existing);
    });
    return map;
  }, [unpaidOrders]);

  // Combine DEFAULT_TABLES with any custom tables that have orders
  const allTables = useMemo(() => {
    const set = new Set<string>(DEFAULT_TABLES);
    unpaidOrders.forEach((o) => set.add(o.tableNumber));
    return Array.from(set);
  }, [unpaidOrders]);

  // Filtered table list
  const displayedTables = useMemo(() => {
    return allTables.filter((table) => {
      const hasOrder = (tableOrderMap.get(table)?.length || 0) > 0;
      if (activeFilter === 'occupied' && !hasOrder) return false;
      if (activeFilter === 'empty' && hasOrder) return false;
      if (searchQuery.trim() !== '') {
        return table.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [allTables, tableOrderMap, activeFilter, searchQuery]);

  // Statistics
  const occupiedTables = useMemo(() => {
    return allTables.filter((t) => (tableOrderMap.get(t)?.length || 0) > 0);
  }, [allTables, tableOrderMap]);

  const emptyTablesCount = allTables.length - occupiedTables.length;

  const totalCurrentRevenue = useMemo(() => {
    return unpaidOrders.reduce((sum, o) => sum + o.total, 0);
  }, [unpaidOrders]);

  // Detail data for selected table
  const selectedTableOrders = selectedTable ? tableOrderMap.get(selectedTable) || [] : [];
  const selectedTablePrimaryOrder = selectedTableOrders[0] || null;
  const selectedTableTotal = selectedTableOrders.reduce((sum, o) => sum + o.total, 0);
  const selectedTableItems = useMemo(() => {
    const items: OrderItem[] = [];
    selectedTableOrders.forEach((o) => items.push(...o.items));
    return items;
  }, [selectedTableOrders]);

  // Handlers
  const handleOpenTransfer = (table: string) => {
    setSelectedTable(table);
    setTargetTransferTable('');
    setCustomTransferTable('');
    setTransferModalVisible(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTable) return;
    const dest = customTransferTable.trim() !== '' ? customTransferTable.trim() : targetTransferTable;
    if (!dest) {
      showToast('Vui lòng chọn bàn đích muốn chuyển đến!');
      return;
    }
    if (dest === selectedTable) {
      showToast('Bàn đích phải khác bàn hiện tại!');
      return;
    }

    await transferTable(selectedTable, dest);
    showToast(`Đã chuyển đơn từ ${selectedTable} sang ${dest}`);
    setTransferModalVisible(false);
    setSelectedTable(null);
  };

  const handleOpenMerge = (table: string) => {
    setSelectedTable(table);
    setTargetMergeTable('');
    setMergeModalVisible(true);
  };

  const handleConfirmMerge = async () => {
    if (!selectedTable) return;
    if (!targetMergeTable) {
      showToast('Vui lòng chọn bàn bạn muốn gộp vào!');
      return;
    }
    if (targetMergeTable === selectedTable) {
      showToast('Không thể gộp vào chính bàn này!');
      return;
    }

    await mergeTables(selectedTable, targetMergeTable);
    showToast(`Đã gộp đơn từ ${selectedTable} vào ${targetMergeTable}`);
    setMergeModalVisible(false);
    setSelectedTable(null);
  };

  const handleMarkTablePaid = async (order: Order) => {
    await updateOrderStatus(order.id, 'paid');
    showToast(`Đã thanh toán đơn ${order.tableNumber}`);
    setBillOrder(null);
    setSelectedTable(null);
  };

  // Grid column calculation
  const numColumns = isTablet ? (isLandscape ? 4 : 3) : 2;
  const cardWidthPercent = numColumns === 4 ? '23.5%' : numColumns === 3 ? '31.3%' : '48%';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Sơ Đồ Bàn Ăn 🪑</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Quản lý trạng thái bàn, chuyển bàn & gộp bàn
            </Text>
          </View>
        </View>

        {/* Summary Stats Row */}
        <View style={styles.summaryRow}>
          <View style={[styles.statBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bàn trống</Text>
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{emptyTablesCount}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Có khách</Text>
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{occupiedTables.length}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tạm tính</Text>
            <Text style={[styles.statValue, { color: colors.primary }]} numberOfLines={1}>
              {formatPrice(totalCurrentRevenue)}
            </Text>
          </View>
        </View>

        {/* Filter Tabs & Search */}
        <View style={styles.filterSection}>
          <View style={styles.filterTabs}>
            <TouchableOpacity
              onPress={() => setActiveFilter('all')}
              style={[
                styles.filterTab,
                activeFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                Tất cả ({allTables.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('occupied')}
              style={[
                styles.filterTab,
                activeFilter === 'occupied' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
              ]}
            >
              <Text style={[styles.filterTabText, activeFilter === 'occupied' && styles.filterTabTextActive]}>
                Có khách ({occupiedTables.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('empty')}
              style={[
                styles.filterTab,
                activeFilter === 'empty' && { backgroundColor: '#10B981', borderColor: '#10B981' },
              ]}
            >
              <Text style={[styles.filterTabText, activeFilter === 'empty' && styles.filterTabTextActive]}>
                Trống ({emptyTablesCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder="Tìm bàn..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Table Cards Grid */}
        <ScrollView contentContainerStyle={styles.gridScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {displayedTables.map((table) => {
              const ordersForTable = tableOrderMap.get(table) || [];
              const isOccupied = ordersForTable.length > 0;
              const primaryOrder = ordersForTable[0];
              const tableTotal = ordersForTable.reduce((sum, o) => sum + o.total, 0);
              const totalDishesCount = ordersForTable.reduce(
                (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
                0
              );

              return (
                <TouchableOpacity
                  key={table}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isOccupied) {
                      setSelectedTable(table);
                    } else {
                      onOrderForTable(table);
                    }
                  }}
                  style={[
                    styles.tableCard,
                    {
                      width: cardWidthPercent,
                      backgroundColor: isOccupied ? colors.backgroundElement : colors.backgroundElement,
                      borderColor: isOccupied ? '#FCA5A5' : '#D1FAE5',
                      borderWidth: isOccupied ? 1.5 : 1,
                    },
                    isTablet && { padding: 14 },
                  ]}
                >
                  {/* Card Top Row: Table Name & Status */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.tableCardName, { color: colors.text }, isTablet && { fontSize: 18 }]}>
                      📍 {table}
                    </Text>
                    {isOccupied ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {primaryOrder && <OrderTimeBadge order={primaryOrder} now={now} compact />}
                      </View>
                    ) : (
                      <View style={styles.emptyBadge}>
                        <Text style={styles.emptyBadgeText}>Trống</Text>
                      </View>
                    )}
                  </View>

                  {/* Card Middle: Content depending on occupied or empty */}
                  {isOccupied ? (
                    <View style={styles.occupiedDetails}>
                      <View style={styles.occupiedInfoRow}>
                        <Ionicons name="fast-food-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.occupiedInfoText, { color: colors.textSecondary }]}>
                          {totalDishesCount} phần món
                        </Text>
                      </View>
                      <Text style={[styles.occupiedTotalText, { color: colors.primary }]}>
                        {formatPrice(tableTotal)}
                      </Text>

                      {/* Dish preview snippets */}
                      <View style={styles.dishPreviewBox}>
                        {ordersForTable
                          .flatMap((o) => o.items)
                          .slice(0, 2)
                          .map((item, idx) => (
                            <Text
                              key={idx}
                              numberOfLines={1}
                              style={[styles.dishPreviewText, { color: colors.textSecondary }]}
                            >
                              • {item.quantity}x {cleanFoodName(item.name)}
                            </Text>
                          ))}
                        {ordersForTable.flatMap((o) => o.items).length > 2 && (
                          <Text style={[styles.dishPreviewMore, { color: colors.primary }]}>
                            +{ordersForTable.flatMap((o) => o.items).length - 2} món nữa...
                          </Text>
                        )}
                      </View>

                      {/* Bottom action pills */}
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          onPress={() => handleOpenTransfer(table)}
                          style={[styles.miniActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                        >
                          <Ionicons name="swap-horizontal" size={13} color="#3B82F6" />
                          <Text style={[styles.miniActionText, { color: "#3B82F6" }]}>Đổi bàn</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenMerge(table)}
                          style={[styles.miniActionBtn, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}
                        >
                          <Ionicons name="git-merge-outline" size={13} color="#8B5CF6" />
                          <Text style={[styles.miniActionText, { color: "#8B5CF6" }]}>Gộp</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyDetails}>
                      <Ionicons
                        name="restaurant-outline"
                        size={isTablet ? 36 : 28}
                        color="#10B981"
                        style={{ opacity: 0.7, marginVertical: 8 }}
                      />
                      <TouchableOpacity
                        onPress={() => onOrderForTable(table)}
                        style={[styles.addOrderFastBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                      >
                        <Ionicons name="add-circle" size={15} color="#059669" />
                        <Text style={styles.addOrderFastText}>Đặt món</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Modal Chi Tiết Bàn Ăn ──────────────────────────────────── */}
        {selectedTable && selectedTableOrders.length > 0 && !transferModalVisible && !mergeModalVisible && (
          <Modal
            visible
            animationType="slide"
            transparent
            onRequestClose={() => setSelectedTable(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.detailTitle, { color: colors.text }]}>
                        📍 {selectedTable}
                      </Text>
                      {selectedTablePrimaryOrder && (
                        <OrderTimeBadge order={selectedTablePrimaryOrder} now={now} />
                      )}
                    </View>
                    <Text style={[styles.detailSub, { color: colors.textSecondary }]}>
                      Mã đơn: {selectedTableOrders.map((o) => o.id).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTable(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Dishes list */}
                <ScrollView style={styles.detailItemsList} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                    DANH SÁCH MÓN ĂN ĐANG PHỤC VỤ
                  </Text>
                  {selectedTableItems.map((item, idx) => (
                    <View key={idx} style={[styles.itemDetailRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.itemDetailQty, { color: colors.primary }]}>{item.quantity}x</Text>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.itemDetailName, { color: colors.text }]}>{item.name}</Text>
                        {item.note ? (
                          <Text style={[styles.itemDetailNote, { color: '#E05C00' }]}>↳ {item.note}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.itemDetailPrice, { color: colors.text }]}>
                        {formatPrice(item.price * item.quantity)}
                      </Text>
                    </View>
                  ))}

                  {/* Notes summary if any */}
                  {selectedTableOrders.some((o) => o.note) && (
                    <View style={[styles.orderNoteCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
                      <Text style={[styles.orderNoteLabel, { color: colors.textSecondary }]}>📝 Ghi chú đơn:</Text>
                      <Text style={[styles.orderNoteText, { color: colors.text }]}>
                        {selectedTableOrders
                          .filter((o) => o.note)
                          .map((o) => o.note)
                          .join(' | ')}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Total Row */}
                <View style={[styles.detailTotalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.detailTotalLabel, { color: colors.text }]}>Tổng tiền bàn:</Text>
                  <Text style={[styles.detailTotalValue, { color: colors.primary }]}>
                    {formatPrice(selectedTableTotal)}
                  </Text>
                </View>

                {/* Actions Button Grid */}
                <View style={styles.detailActionsGrid}>
                  <TouchableOpacity
                    onPress={() => {
                      const t = selectedTable;
                      setSelectedTable(null);
                      onOrderForTable(t);
                    }}
                    style={[styles.actionBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#059669" />
                    <Text style={[styles.actionBtnText, { color: '#059669' }]}>Gọi thêm món</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenTransfer(selectedTable)}
                    style={[styles.actionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                  >
                    <Ionicons name="swap-horizontal" size={20} color="#3B82F6" />
                    <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Chuyển bàn</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenMerge(selectedTable)}
                    style={[styles.actionBtn, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}
                  >
                    <Ionicons name="git-merge-outline" size={20} color="#8B5CF6" />
                    <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Gộp bàn</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (selectedTablePrimaryOrder) {
                        setBillOrder({
                          ...selectedTablePrimaryOrder,
                          items: selectedTableItems,
                          total: selectedTableTotal,
                        });
                      }
                    }}
                    style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Ionicons name="receipt-outline" size={20} color="#FFF" />
                    <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Thanh toán</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* ── Modal Chuyển Bàn ───────────────────────────────────────── */}
        {transferModalVisible && selectedTable && (
          <Modal
            visible
            animationType="fade"
            transparent
            onRequestClose={() => setTransferModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.dialogCard, { backgroundColor: colors.background }]}>
                <View style={styles.dialogHeader}>
                  <Ionicons name="swap-horizontal" size={26} color="#3B82F6" />
                  <Text style={[styles.dialogTitle, { color: colors.text }]}>Chuyển Bàn Ăn</Text>
                </View>

                <Text style={[styles.dialogDesc, { color: colors.textSecondary }]}>
                  Chuyển toàn bộ đơn hàng của <Text style={{ fontWeight: 'bold', color: colors.text }}>{selectedTable}</Text> sang bàn mới:
                </Text>

                {/* List of empty tables */}
                <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Chọn bàn trống có sẵn:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {allTables
                      .filter((t) => (tableOrderMap.get(t)?.length || 0) === 0 && t !== selectedTable)
                      .map((t) => {
                        const isSelected = targetTransferTable === t && !customTransferTable;
                        return (
                          <TouchableOpacity
                            key={t}
                            onPress={() => {
                              setTargetTransferTable(t);
                              setCustomTransferTable('');
                            }}
                            style={[
                              styles.tablePickChip,
                              { backgroundColor: isSelected ? '#3B82F6' : colors.backgroundElement, borderColor: isSelected ? '#3B82F6' : colors.border },
                            ]}
                          >
                            <Text style={{ color: isSelected ? '#FFF' : colors.text, fontWeight: '600', fontSize: 13 }}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </ScrollView>

                {/* Custom table input */}
                <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Hoặc nhập số bàn khác:</Text>
                <TextInput
                  placeholder="Ví dụ: Bàn 15, Bàn VIP..."
                  placeholderTextColor={colors.textSecondary}
                  value={customTransferTable}
                  onChangeText={(text) => {
                    setCustomTransferTable(text);
                    if (text) setTargetTransferTable('');
                  }}
                  style={[styles.dialogInput, { color: colors.text, borderColor: colors.border }]}
                />

                {/* Buttons */}
                <View style={styles.dialogActionsRow}>
                  <TouchableOpacity
                    onPress={() => setTransferModalVisible(false)}
                    style={[styles.dialogBtn, { backgroundColor: colors.border }]}
                  >
                    <Text style={[styles.dialogBtnText, { color: colors.textSecondary }]}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmTransfer}
                    style={[styles.dialogBtn, { backgroundColor: '#3B82F6' }]}
                  >
                    <Text style={[styles.dialogBtnText, { color: '#FFF' }]}>Xác nhận chuyển</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* ── Modal Gộp Bàn ─────────────────────────────────────────── */}
        {mergeModalVisible && selectedTable && (
          <Modal
            visible
            animationType="fade"
            transparent
            onRequestClose={() => setMergeModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.dialogCard, { backgroundColor: colors.background }]}>
                <View style={styles.dialogHeader}>
                  <Ionicons name="git-merge-outline" size={26} color="#8B5CF6" />
                  <Text style={[styles.dialogTitle, { color: colors.text }]}>Gộp Bàn Ăn</Text>
                </View>

                <Text style={[styles.dialogDesc, { color: colors.textSecondary }]}>
                  Gộp toàn bộ món ăn và hóa đơn của <Text style={{ fontWeight: 'bold', color: colors.text }}>{selectedTable}</Text> vào bàn:
                </Text>

                {/* List of other occupied tables */}
                <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Chọn bàn đang có khách để gộp vào:</Text>
                <ScrollView style={{ maxHeight: 180, marginBottom: 14 }} showsVerticalScrollIndicator={false}>
                  {occupiedTables
                    .filter((t) => t !== selectedTable)
                    .map((t) => {
                      const isSelected = targetMergeTable === t;
                      const tOrders = tableOrderMap.get(t) || [];
                      const tTotal = tOrders.reduce((s, o) => s + o.total, 0);
                      const tItemsCount = tOrders.reduce((s, o) => s + o.items.reduce((c, i) => c + i.quantity, 0), 0);

                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setTargetMergeTable(t)}
                          style={[
                            styles.mergeTargetRow,
                            {
                              backgroundColor: isSelected ? '#F5F3FF' : colors.backgroundElement,
                              borderColor: isSelected ? '#8B5CF6' : colors.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.mergeTargetName, { color: colors.text }]}>📍 {t}</Text>
                            <Text style={[styles.mergeTargetSub, { color: colors.textSecondary }]}>
                              {tItemsCount} món • {formatPrice(tTotal)}
                            </Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />}
                        </TouchableOpacity>
                      );
                    })}

                  {occupiedTables.filter((t) => t !== selectedTable).length === 0 && (
                    <Text style={{ textAlign: 'center', color: colors.textSecondary, paddingVertical: 12 }}>
                      Không có bàn nào khác đang có khách để gộp!
                    </Text>
                  )}
                </ScrollView>

                <View style={styles.dialogActionsRow}>
                  <TouchableOpacity
                    onPress={() => setMergeModalVisible(false)}
                    style={[styles.dialogBtn, { backgroundColor: colors.border }]}
                  >
                    <Text style={[styles.dialogBtnText, { color: colors.textSecondary }]}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmMerge}
                    style={[styles.dialogBtn, { backgroundColor: '#8B5CF6' }]}
                  >
                    <Text style={[styles.dialogBtnText, { color: '#FFF' }]}>Xác nhận gộp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* ── Bill Preview Modal ─────────────────────────────────────── */}
        {billOrder && (
          <Modal visible animationType="fade" transparent onRequestClose={() => setBillOrder(null)}>
            <View style={styles.billOverlay}>
              <ScrollView contentContainerStyle={styles.billScrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.billSheet, { backgroundColor: '#FFFFFF' }]}>
                  {/* Shop Header */}
                  <View style={styles.billHeader}>
                    <Text style={styles.billShopName}>BÁNH CANH GIA TRUYỀN</Text>
                    <Text style={styles.billShopPhone}>Hotline: 0909.123.456</Text>
                    <Text style={styles.billShopSub}>PHIẾU THANH TOÁN TẠM TÍNH</Text>
                  </View>

                  <View style={styles.billDashedLine} />

                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>Bàn ăn:</Text>
                    <Text style={styles.billInfoValue}>📍 {billOrder.tableNumber}</Text>
                  </View>
                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>Thời gian:</Text>
                    <Text style={styles.billInfoValue}>{billOrder.timestamp}</Text>
                  </View>

                  <View style={styles.billDashedLine} />

                  {/* Items list */}
                  {billOrder.items.map((item, idx) => (
                    <View key={idx} style={styles.billItemRow}>
                      <Text style={[styles.billItemName, { flex: 2 }]} numberOfLines={1}>
                        {cleanFoodName(item.name)}
                      </Text>
                      <Text style={[styles.billItemText, { width: 36, textAlign: 'center' }]}>
                        x{item.quantity}
                      </Text>
                      <Text style={[styles.billItemPrice, { flex: 1.5, textAlign: 'right' }]}>
                        {formatPrice(item.price * item.quantity)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.billDashedLine} />

                  {/* Total */}
                  <View style={styles.billTotalRow}>
                    <Text style={styles.billTotalLabel}>TỔNG CỘNG:</Text>
                    <Text style={styles.billTotalValue}>{formatPrice(billOrder.total)}</Text>
                  </View>

                  {/* Actions */}
                  <View style={{ gap: 8, marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={() => handleMarkTablePaid(billOrder)}
                      style={[styles.billActionBtn, { backgroundColor: '#10B981' }]}
                    >
                      <Ionicons name="checkmark-done" size={18} color="#FFF" />
                      <Text style={styles.billActionBtnText}>Đã thu tiền (Hoàn tất)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setBillOrder(null)}
                      style={[styles.billActionBtn, { backgroundColor: '#1A1A2E' }]}
                    >
                      <Text style={styles.billActionBtnText}>Đóng</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <View style={[styles.toast, { backgroundColor: colors.text }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.toastText, { color: colors.background }]}>{toastMessage}</Text>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  filterSection: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    gap: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  gridScrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  tableCard: {
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tableCardName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: 'bold',
  },
  occupiedDetails: {
    gap: 4,
  },
  occupiedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  occupiedInfoText: {
    fontSize: 11,
  },
  occupiedTotalText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  dishPreviewBox: {
    gap: 2,
    marginVertical: 2,
  },
  dishPreviewText: {
    fontSize: 11,
  },
  dishPreviewMore: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  miniActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  miniActionText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyDetails: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  addOrderFastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addOrderFastText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Modal Detail Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: Spacing.four,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  detailItemsList: {
    maxHeight: 280,
    marginVertical: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemDetailQty: {
    fontSize: 15,
    fontWeight: 'bold',
    width: 32,
  },
  itemDetailName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemDetailNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemDetailPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderNoteCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  orderNoteLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  orderNoteText: {
    fontSize: 12,
  },
  detailTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  detailTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  detailActionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Dialog styles
  dialogCard: {
    margin: 20,
    borderRadius: 16,
    padding: 18,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dialogDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  tablePickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dialogInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dialogBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  dialogBtnText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  mergeTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  mergeTargetName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mergeTargetSub: {
    fontSize: 11,
    marginTop: 2,
  },

  // Bill modal styles
  billOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  billScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
  },
  billHeader: { alignItems: 'center', marginBottom: 12 },
  billShopName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', letterSpacing: 1 },
  billShopPhone: { fontSize: 13, color: '#444', marginTop: 3 },
  billShopSub: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 10 },
  billDashedLine: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCCCCC', marginVertical: 8 },
  billInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  billInfoLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  billInfoValue: { fontSize: 12, color: '#1a1a2e', fontWeight: 'bold' },
  billItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  billItemName: { fontSize: 13, color: '#1a1a2e', fontWeight: '600' },
  billItemText: { fontSize: 12, color: '#444' },
  billItemPrice: { fontSize: 13, color: '#1a1a2e', fontWeight: 'bold' },
  billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  billTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  billTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#10B981' },
  billActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  billActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
