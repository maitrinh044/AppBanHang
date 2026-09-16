import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart, Order, OrderStatus, OrderItem } from '../context/CartContext';
import { useCurrentTime, getOrderWaitInfo } from '../utils/orderTime';
import OrderTimeBadge from '../components/OrderTimeBadge';
import { SHOP_NAME, SHOP_PHONE, SHOP_ADDRESS, SHOP_TAGLINE } from '../config/shop';

const formatPrice = (price?: number | null) => {
  return (Number(price) || 0).toLocaleString('vi-VN') + ' đ';
};

const cleanFoodName = (name: string) => {
  const cleaned = name.replace(/^[Bb]ánh\s+[Cc]anh\s+/, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const STATUS_CONFIGS: {
  [key in OrderStatus]: { label: string; color: string; bgColor: string };
} = {
  pending: { label: 'Chưa làm', color: '#FF4D4D', bgColor: '#FFEBEB' },
  completed: { label: 'Đã xong', color: '#2EC4B6', bgColor: '#E6F9F5' },
  paid: { label: 'Đã thanh toán', color: '#3B82F6', bgColor: '#EBF4FF' },
};

interface ActiveOrdersScreenProps {
  onBack: () => void;
}

export default function ActiveOrdersScreen({ onBack }: ActiveOrdersScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 600;

  const { orders, menuItems, updateOrderStatus, deleteOrder, updateOrderNote, updateOrderItems } = useCart();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Bill modal
  const [billOrder, setBillOrder] = useState<Order | null>(null);

  // Edit order items modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNote, setEditNote] = useState('');
  const [editTab, setEditTab] = useState<'all' | 'main' | 'extra' | 'drink'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    showToast(`Đã chuyển trạng thái sang "${STATUS_CONFIGS[status].label}"`);
  };

  const startEditingNote = (orderId: string, currentNote: string) => {
    setEditingNoteOrderId(orderId);
    setEditingNoteText(currentNote);
  };

  const cancelEditingNote = () => {
    setEditingNoteOrderId(null);
    setEditingNoteText('');
  };

  const saveEditingNote = (orderId: string) => {
    updateOrderNote(orderId, editingNoteText);
    setEditingNoteOrderId(null);
    setEditingNoteText('');
    showToast('Đã cập nhật ghi chú đơn hàng');
  };

  // ── Edit order items helpers ───────────────────────────────────────────
  const openEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditItems(order.items.map((i) => ({ ...i })));
    setEditNote(order.note || '');
    setEditTab('all');
  };

  const closeEditOrder = () => setEditingOrder(null);

  const changeEditQty = (foodId: string, delta: number) => {
    setEditItems((prev) => {
      const existing = prev.find((i) => i.foodId === foodId);
      if (!existing) {
        // Add new item from menu
        const food = menuItems.find((f) => f.id === foodId);
        if (!food || delta < 1) return prev;
        return [...prev, { foodId: food.id, name: food.name, price: food.price, image: food.image, quantity: 1 }];
      }
      const next = existing.quantity + delta;
      if (next <= 0) return prev.filter((i) => i.foodId !== foodId);
      return prev.map((i) => (i.foodId === foodId ? { ...i, quantity: next } : i));
    });
  };

  const changeEditItemNote = (foodId: string, noteText: string) => {
    setEditItems((prev) =>
      prev.map((i) => (i.foodId === foodId ? { ...i, note: noteText } : i))
    );
  };

  const saveEditOrder = async () => {
    if (!editingOrder || editItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 món!');
      return;
    }
    await updateOrderItems(editingOrder.id, editItems, editNote);
    showToast('Đã cập nhật đơn hàng!');
    closeEditOrder();
  };

  const now = useCurrentTime(15000);

  // Filter only pending orders (and not soft-deleted), sort oldest first
  const activeOrders = orders
    .slice()
    .reverse()
    .filter((o) => o.status === 'pending' && !o.isDeleted);

  const lateOrdersCount = activeOrders.filter(
    (o) => getOrderWaitInfo(o, now).urgency === 'late'
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Đơn Hàng Chưa Làm Xong</Text>
          <View style={{ width: 40 }} />
        </View>

        {lateOrdersCount > 0 && (
          <View style={[styles.lateAlertBanner, isTablet && { paddingVertical: 12, paddingHorizontal: 20 }]}>
            <Ionicons name="alert-circle" size={isTablet ? 22 : 18} color="#DC2626" />
            <Text style={[styles.lateAlertBannerText, isTablet && { fontSize: 16 }]}>
              Có {lateOrdersCount} đơn đợi trên 15m! Vui lòng ưu tiên làm trước.
            </Text>
          </View>
        )}

        {activeOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Tuyệt vời! Không có đơn hàng nào chưa làm.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.ordersList}>
              {activeOrders.map((order) => {
                const currentStatusConfig = STATUS_CONFIGS[order.status];
                const waitInfo = getOrderWaitInfo(order, now);
                const isLate = waitInfo.urgency === 'late';
                return (
                  <View
                    key={order.id}
                    style={[
                      styles.orderCard,
                      {
                        backgroundColor: colors.backgroundElement,
                        borderColor: isLate ? '#FCA5A5' : colors.border,
                        borderWidth: isLate ? 1.5 : 1,
                      },
                    ]}
                  >
                    {/* Header Row */}
                    <View style={styles.orderHeaderRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                          <Text style={[styles.tableLabel, { color: colors.text }, isTablet && { fontSize: 24 }]}>
                            📍 {order.tableNumber}
                          </Text>
                          <OrderTimeBadge order={order} now={now} isTablet={isTablet} />
                        </View>
                        <Text style={[styles.orderIdText, { color: colors.textSecondary }, isTablet && { fontSize: 14 }]}>
                          Mã: {order.id} • {order.timestamp}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-start' }}>
                        <TouchableOpacity
                          onPress={() => openEditOrder(order)}
                          style={[styles.editBtn, { backgroundColor: colors.primary + '20' }]}
                        >
                          <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            deleteOrder(order.id);
                            showToast('Đã xóa đơn hàng');
                          }}
                          style={styles.deleteBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {editingNoteOrderId === order.id ? (
                      <>
                        <View style={styles.editingNoteContainer}>
                          <TextInput
                            placeholder="Nhập ghi chú..."
                            placeholderTextColor={colors.textSecondary}
                            value={editingNoteText}
                            onChangeText={setEditingNoteText}
                            style={[styles.editingNoteInput, { color: colors.text, borderColor: colors.border }]}
                            autoFocus
                          />
                          <View style={styles.editingNoteActions}>
                            <TouchableOpacity
                              onPress={cancelEditingNote}
                              style={[styles.noteActionBtn, { backgroundColor: colors.border }]}
                            >
                              <Text style={[styles.noteActionBtnText, { color: colors.textSecondary }]}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => saveEditingNote(order.id)}
                              style={[styles.noteActionBtn, { backgroundColor: colors.primary }]}
                            >
                              <Text style={[styles.noteActionBtnText, { color: '#FFF' }]}>Lưu</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      </>
                    ) : order.note ? (
                      <>
                        <View style={styles.noteContainer}>
                          <View style={styles.noteHeaderRow}>
                            <Text style={[styles.noteText, { color: colors.textSecondary }, isTablet && { fontSize: 16 }]}>📝 Ghi chú:</Text>
                            <TouchableOpacity onPress={() => startEditingNote(order.id, order.note || '')}>
                              <Text style={[styles.editNoteBtnText, { color: colors.primary }, isTablet && { fontSize: 15 }]}>Sửa</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.noteContent, { color: colors.text }, isTablet && { fontSize: 16, lineHeight: 22 }]}>{order.note}</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => startEditingNote(order.id, '')}
                          style={styles.addNotePlaceholder}
                        >
                          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.addNotePlaceholderText, { color: colors.textSecondary }, isTablet && { fontSize: 16 }]}>Thêm ghi chú...</Text>
                        </TouchableOpacity>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      </>
                    )}

                    {/* Food Items Breakdown */}
                    <View style={styles.itemsBreakdown}>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={styles.itemContainer}>
                          <View style={styles.itemRow}>
                            <Text style={[styles.itemQtyText, { color: colors.text }, isTablet && { fontSize: 22, width: 36 }]}>{item.quantity}x</Text>
                            <Text style={[styles.itemNameText, { color: colors.text }, isTablet && { fontSize: 22, fontWeight: 'bold' }]} numberOfLines={1}>
                              {cleanFoodName(item.name)}
                            </Text>
                            <Text style={[styles.itemPriceText, { color: colors.textSecondary }, isTablet && { fontSize: 18 }]}>
                              {formatPrice(item.price * item.quantity)}
                            </Text>
                          </View>
                          {item.note ? (
                            <Text style={[styles.itemNoteText, { color: colors.primary }, isTablet && { fontSize: 18, fontWeight: 'bold', marginLeft: 36 }]}>
                              ↳ Ghi chú: {item.note}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Total Row */}
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: colors.text }, isTablet && { fontSize: 18 }]}>Tổng tiền:</Text>
                      <Text style={[styles.totalValue, { color: colors.primary }, isTablet && { fontSize: 22 }]}>
                        {formatPrice(order.total)}
                      </Text>
                    </View>

                    {/* Status + Bill Row */}
                    <View style={styles.statusAndBillRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.statusSwitcherTitle, { color: colors.textSecondary }]}>
                          Trạng thái:
                        </Text>
                        <View style={styles.pillsContainer}>
                          {(Object.keys(STATUS_CONFIGS) as OrderStatus[]).map((statusKey) => {
                            const config = STATUS_CONFIGS[statusKey];
                            const isActive = order.status === statusKey;
                            return (
                              <TouchableOpacity
                                key={statusKey}
                                onPress={() => handleUpdateStatus(order.id, statusKey)}
                                style={[
                                  styles.statusPill,
                                  {
                                    backgroundColor: isActive ? config.color : colors.background,
                                    borderColor: isActive ? config.color : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.pillText,
                                    { color: isActive ? '#FFF' : colors.textSecondary }
                                  ]}
                                >
                                  {config.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Bill Button */}
                      <TouchableOpacity
                        onPress={() => setBillOrder(order)}
                        style={[styles.billBtn, { backgroundColor: '#ffffffff', borderColor: '#000000ff' }]}
                      >
                        <Ionicons name="receipt-outline" size={10} color="#000000ff" />
                        <Text style={styles.billBtnText}>In Bill</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Toast popup */}
      {toastMessage && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <Text style={[styles.toastText, { color: colors.background }]}>{toastMessage}</Text>
        </View>
      )}

      {/* ── Bill Modal ─────────────────────────────────────────── */}
      {billOrder && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setBillOrder(null)}>
          <View style={styles.billOverlay}>
            <ScrollView
              style={styles.billScrollView}
              contentContainerStyle={styles.billScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.billSheet, { backgroundColor: '#FAFAF8' }]}>
                <View style={styles.billHeader}>
                  <Text style={styles.billShopName}> {SHOP_NAME}</Text>
                  <Text style={styles.billShopPhone}>📞 {SHOP_PHONE}</Text>
                  <Text style={styles.billShopAddress}>📍 {SHOP_ADDRESS}</Text>
                  <Text style={styles.billShopSub}>{SHOP_TAGLINE}</Text>
                  <View style={styles.billDashedLine} />
                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>Bàn: </Text>
                    <Text style={styles.billInfoValue}>{billOrder.tableNumber}</Text>
                  </View>
                  <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>Thời gian: </Text>
                    <Text style={styles.billInfoValue}>{billOrder.timestamp}</Text>
                  </View>
                  {billOrder.note ? (
                    <View style={styles.billInfoRow}>
                      <Text style={styles.billInfoLabel}>Ghi chú</Text>
                      <Text style={[styles.billInfoValue, { color: '#E05C00', flex: 1, textAlign: 'right' }]}>{billOrder.note}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.billDashedLine} />
                <View style={styles.billTableHeader}>
                  <Text style={[styles.billColMon, styles.billTableHeaderText]}>MÓN</Text>
                  <Text style={[styles.billColDg, styles.billTableHeaderText]}>ĐƠN GIÁ</Text>
                  <Text style={[styles.billColSl, styles.billTableHeaderText]}>SL</Text>
                  <Text style={[styles.billColTt, styles.billTableHeaderText]}>THÀNH TIỀN</Text>
                </View>
                <View style={styles.billDashedLine} />
                {/* Items List — hiển thị toàn bộ, không giới hạn chiều cao */}
                <View>
                  {billOrder.items.map((item, idx) => (
                    <View key={idx}>
                      <View style={styles.billItemRow}>
                        <Text style={[styles.billColMon, styles.billItemName]} numberOfLines={2}>{item.name}</Text>
                        <Text style={[styles.billColDg, styles.billItemText]}>{(Number(item.price) || 0).toLocaleString('vi-VN')}</Text>
                        <Text style={[styles.billColSl, styles.billItemText]}>x{item.quantity}</Text>
                        <Text style={[styles.billColTt, styles.billItemPrice]}>{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString('vi-VN')}</Text>
                      </View>
                      {item.note ? <Text style={styles.billItemNote}>  ↳ {item.note}</Text> : null}
                    </View>
                  ))}
                </View>
                <View style={styles.billDashedLine} />
                <View style={styles.billTotalRow}>
                  <Text style={styles.billTotalLabel}>TỔNG CỘNG</Text>
                  <Text style={styles.billTotalValue}>{(Number(billOrder.total) || 0).toLocaleString('vi-VN')} đ</Text>
                </View>
                <View style={styles.billDashedLine} />
                <Text style={styles.billFooterText}>★ Hẹn gặp lại quý khách! ★</Text>
                <TouchableOpacity onPress={() => setBillOrder(null)} style={styles.billCloseBtn}>
                  <Ionicons name="close" size={18} color="#FFF" />
                  <Text style={styles.billCloseBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Edit Order Modal ───────────────────────────────────────── */}
      {editingOrder && (
        <Modal visible animationType="slide" transparent onRequestClose={closeEditOrder}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
              {/* Modal header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  ✏️ Sửa đơn — {editingOrder.tableNumber}
                </Text>
                <TouchableOpacity onPress={closeEditOrder}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Category tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.modalTabsRow}
              >
                {(['all', 'main', 'extra', 'drink'] as const).map((tab) => {
                  const label = tab === 'all' ? 'Tất cả' : tab === 'main' ? 'Món chính' : tab === 'extra' ? 'Món thêm' : 'Nước uống';
                  const isActive = editTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setEditTab(tab)}
                      style={[styles.modalTab, { backgroundColor: isActive ? colors.primary : colors.backgroundElement, borderColor: isActive ? colors.primary : colors.border }]}
                    >
                      <Text style={{ color: isActive ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Menu items list */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {menuItems.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={32} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                      Không tải được danh sách món ăn.{'\n'}Vui lòng thử lại.
                    </Text>
                  </View>
                ) : (
                  menuItems
                    .filter((m) => editTab === 'all' || m.category === editTab)
                    .sort((a, b) => {
                      if (editTab !== 'all') return 0;
                      const order = { main: 0, extra: 1, drink: 2 };
                      return order[a.category] - order[b.category];
                    })
                    .map((food) => {
                      const editItem = editItems.find((i) => i.foodId === food.id);
                      const qty = editItem?.quantity || 0;
                      return (
                        <View key={food.id} style={[styles.modalItemWrapper, { borderBottomColor: colors.border }]}>
                          <View style={styles.modalItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.modalItemName, { color: colors.text }]} numberOfLines={1}>{food.name}</Text>
                              <Text style={{ color: colors.primary, fontSize: 12 }}>{formatPrice(food.price)}</Text>
                            </View>
                            <View style={styles.modalQtyRow}>
                              <TouchableOpacity onPress={() => changeEditQty(food.id, -1)} style={[styles.modalQtyBtn, { borderColor: colors.border }]}>
                                <Ionicons name="remove" size={14} color={colors.text} />
                              </TouchableOpacity>
                              <Text style={[styles.modalQtyText, { color: qty > 0 ? colors.primary : colors.textSecondary }]}>{qty}</Text>
                              <TouchableOpacity onPress={() => changeEditQty(food.id, 1)} style={[styles.modalQtyBtn, { borderColor: colors.border }]}>
                                <Ionicons name="add" size={14} color={colors.text} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {qty > 0 && (
                            <View style={[styles.modalItemNoteRow, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
                              <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                              <TextInput
                                placeholder="Ghi chú món ăn này..."
                                placeholderTextColor={colors.textSecondary}
                                value={editItem?.note || ''}
                                onChangeText={(text) => changeEditItemNote(food.id, text)}
                                style={[styles.modalItemNoteInput, { color: colors.text }]}
                              />
                            </View>
                          )}
                        </View>
                      );
                    })
                )}
              </ScrollView>

              {/* Note input + total + save */}
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <View style={[styles.modalNoteBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <TextInput
                    placeholder="Ghi chú đơn hàng..."
                    placeholderTextColor={colors.textSecondary}
                    value={editNote}
                    onChangeText={setEditNote}
                    style={{ flex: 1, color: colors.text, fontSize: 16, marginLeft: 6 }}
                  />
                </View>
                <View style={styles.modalSaveRow}>
                  <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Tổng cộng</Text>
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                      {formatPrice(editItems.reduce((s, i) => s + i.price * i.quantity, 0))}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={saveEditOrder} style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="save-outline" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Lưu thay đổi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
  },
  ordersList: {
    gap: Spacing.three,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  orderIdText: {
    fontSize: 11,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 6,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Modal styles ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 15, fontWeight: 'bold' },
  modalTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  modalTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalItemWrapper: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  modalItemNoteInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 6,
    padding: 0,
  },
  modalItemName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQtyText: { fontSize: 14, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  modalFooter: {
    padding: Spacing.three,
    borderTopWidth: 1,
    gap: 10,
  },
  modalNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
  },
  itemsBreakdown: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQtyText: {
    width: 24,
    fontSize: 13,
    fontWeight: 'bold',
  },
  itemNameText: {
    flex: 1,
    fontSize: 13,
  },
  itemPriceText: {
    fontSize: 13,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSwitcherRow: {
    marginTop: Spacing.two,
  },
  statusSwitcherTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: '#F3F4F620',
    padding: 8,
    borderRadius: 8,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noteContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  editNoteBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  addNotePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  addNotePlaceholderText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  editingNoteContainer: {
    gap: 8,
  },
  editingNoteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
  },
  editingNoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  noteActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noteActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemContainer: {
    marginBottom: 4,
  },
  itemNoteText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginLeft: 24,
    marginTop: 2,
  },

  statusAndBillRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    gap: 10,
  },
  billBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  billBtnText: {
    color: '#a8b4ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  billOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  billScrollView: {
    flex: 1,
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  billHeader: { alignItems: 'center', marginBottom: 12 },
  billShopName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', letterSpacing: 1 },
  billShopPhone: { fontSize: 13, color: '#444', marginTop: 3 },
  billShopAddress: { fontSize: 12, color: '#555', marginTop: 2 },
  billShopSub: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 10 },
  billDashedLine: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCCCCC', marginVertical: 8 },
  billInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  billInfoLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  billInfoValue: { fontSize: 12, color: '#1a1a2e', fontWeight: 'bold' },
  billTableHeader: { flexDirection: 'row', paddingVertical: 4 },
  billTableHeaderText: { fontSize: 10, fontWeight: 'bold', color: '#555', textTransform: 'uppercase' },
  billColMon: { flex: 2.2 },
  billColDg: { flex: 1.6, textAlign: 'right' },
  billColSl: { flex: 0.7, textAlign: 'center' },
  billColTt: { flex: 1.8, textAlign: 'right' },
  billItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  billItemName: { fontSize: 13, color: '#1a1a2e', fontWeight: '600' },
  billItemText: { fontSize: 12, color: '#444' },
  billItemPrice: { fontSize: 13, color: '#1a1a2e', fontWeight: 'bold' },
  billItemNote: { fontSize: 11, color: '#E05C00', fontStyle: 'italic', marginBottom: 4, paddingLeft: 4 },
  billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  billTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  billTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#2EC4B6' },
  billFooterText: { textAlign: 'center', fontSize: 12, color: '#888', marginTop: 8, marginBottom: 14, fontStyle: 'italic' },
  billCloseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1a1a2e', borderRadius: 12, paddingVertical: 12 },
  billCloseBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  lateAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: 12,
    gap: 8,
  },
  lateAlertBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
