import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';

const formatPrice = (price?: number | null) =>
  (Number(price) || 0).toLocaleString('vi-VN') + ' đ';

const formatDeletedAt = (ts?: number) => {
  if (!ts) return 'Không rõ';
  const d = new Date(ts);
  return (
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
    ' ' +
    d.toLocaleDateString('vi-VN')
  );
};

interface TrashOrdersScreenProps {
  onBack: () => void;
}

export default function TrashOrdersScreen({ onBack }: TrashOrdersScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const { orders, restoreOrder, permanentlyDeleteOrder } = useCart();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Chỉ lấy đơn bị soft-delete, sắp xếp theo deletedAt mới nhất
  const trashedOrders = orders
    .filter((o) => o.isDeleted === true)
    .slice()
    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

  const handleRestore = async (orderId: string) => {
    await restoreOrder(orderId);
    showToast('✅ Đã khôi phục đơn hàng!');
  };

  const handlePermanentDelete = (orderId: string) => {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          '⚠️ Bạn chắc chắn muốn xóa vĩnh viễn đơn này?\nThao tác này KHÔNG thể hoàn tác!'
        )
      ) {
        permanentlyDeleteOrder(orderId);
        showToast('🗑 Đã xóa vĩnh viễn đơn hàng.');
      }
    } else {
      Alert.alert(
        'Xóa vĩnh viễn',
        'Bạn chắc chắn muốn xóa vĩnh viễn đơn này?\nThao tác này KHÔNG thể hoàn tác!',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa vĩnh viễn',
            style: 'destructive',
            onPress: () => {
              permanentlyDeleteOrder(orderId);
              showToast('🗑 Đã xóa vĩnh viễn đơn hàng.');
            },
          },
        ]
      );
    }
  };

  const handleClearAll = () => {
    if (trashedOrders.length === 0) return;
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          `⚠️ Xóa toàn bộ ${trashedOrders.length} đơn trong thùng rác?\nThao tác này KHÔNG thể hoàn tác!`
        )
      ) {
        trashedOrders.forEach((o) => permanentlyDeleteOrder(o.id));
        showToast(`🗑 Đã xóa vĩnh viễn ${trashedOrders.length} đơn hàng.`);
      }
    } else {
      Alert.alert(
        'Dọn thùng rác',
        `Xóa toàn bộ ${trashedOrders.length} đơn trong thùng rác?\nThao tác này KHÔNG thể hoàn tác!`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa tất cả',
            style: 'destructive',
            onPress: () => {
              trashedOrders.forEach((o) => permanentlyDeleteOrder(o.id));
              showToast(`🗑 Đã xóa vĩnh viễn ${trashedOrders.length} đơn hàng.`);
            },
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              🗑 Thùng Rác Đơn Hàng
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {trashedOrders.length} đơn đã xóa • Chỉ Manager thấy
            </Text>
          </View>
          {trashedOrders.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={[styles.clearBtn, { borderColor: '#EF4444' }]}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.clearBtnText, { color: '#EF4444' }]}>Dọn sạch</Text>
            </TouchableOpacity>
          )}
        </View>

        {trashedOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="trash-outline"
              size={80}
              color={colors.textSecondary}
              style={{ opacity: 0.3, marginBottom: 16 }}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Thùng rác trống</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Các đơn hàng bị xóa sẽ xuất hiện tại đây.{'\n'}Bạn có thể khôi phục hoặc xóa vĩnh viễn.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.infoBanner, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#856404" />
              <Text style={[styles.infoText, { color: '#856404' }]}>
                Đơn bị xóa vẫn được lưu trong Firebase. Bấm{' '}
                <Text style={{ fontWeight: '700' }}>Khôi phục</Text> để đưa về hoặc{' '}
                <Text style={{ fontWeight: '700' }}>Xóa vĩnh viễn</Text> để dọn sạch.
              </Text>
            </View>

            {trashedOrders.map((order) => (
              <View
                key={order.id}
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: '#FCA5A5',
                    borderWidth: 1,
                  },
                ]}
              >
                {/* Deleted badge */}
                <View style={styles.deletedBadgeRow}>
                  <View style={styles.deletedBadge}>
                    <Ionicons name="trash" size={12} color="#EF4444" />
                    <Text style={styles.deletedBadgeText}>Đã xóa lúc {formatDeletedAt(order.deletedAt)}</Text>
                  </View>
                </View>

                {/* Order info */}
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableText, { color: colors.text }]}>
                      📍 {order.tableNumber}
                    </Text>
                    <Text style={[styles.orderId, { color: colors.textSecondary }]}>
                      Mã: {order.id} • {order.timestamp}
                    </Text>
                  </View>
                  <Text style={[styles.totalText, { color: '#EF4444' }]}>
                    {formatPrice(order.total)}
                  </Text>
                </View>

                {/* Items */}
                <View style={[styles.itemsDivider, { borderColor: colors.border }]} />
                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={[styles.itemQty, { color: colors.text }]}>×{item.quantity}</Text>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>
                        {formatPrice((Number(item.price) || 0) * (item.quantity || 1))}
                      </Text>
                    </View>
                  ))}
                  {order.note ? (
                    <Text style={[styles.orderNote, { color: colors.textSecondary }]}>
                      📝 {order.note}
                    </Text>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => handleRestore(order.id)}
                    style={[styles.restoreBtn, { borderColor: '#22C55E', backgroundColor: '#F0FDF4' }]}
                  >
                    <Ionicons name="refresh" size={16} color="#22C55E" />
                    <Text style={[styles.restoreBtnText, { color: '#22C55E' }]}>Khôi phục</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePermanentDelete(order.id)}
                    style={[styles.deleteBtn, { borderColor: '#EF4444', backgroundColor: '#FFF5F5' }]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Xóa vĩnh viễn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Toast */}
      {toastMessage && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Text style={[styles.toastText, { color: colors.background }]}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  scrollContent: { paddingHorizontal: Spacing.three, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  orderCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  deletedBadgeRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },
  deletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deletedBadgeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  tableText: {
    fontSize: 16,
    fontWeight: '700',
  },
  orderId: {
    fontSize: 11,
    marginTop: 2,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
  },

  itemsDivider: {
    borderTopWidth: 1,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  itemsList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    width: 28,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderNote: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },

  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  restoreBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
