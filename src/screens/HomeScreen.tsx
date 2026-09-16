import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Platform,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart, Order, OrderItem } from '../context/CartContext';
import { useCurrentTime, getOrderWaitInfo } from '../utils/orderTime';
import OrderTimeBadge from '../components/OrderTimeBadge';

const parseTimestamp = (ts: string): Date => {
  const parts = ts.split(' ');
  if (parts.length < 2) return new Date();
  const dateParts = parts[1].split('/');
  const timeParts = parts[0].split(':');
  return new Date(
    parseInt(dateParts[2]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[0]),
    parseInt(timeParts[0]),
    parseInt(timeParts[1]),
    parseInt(timeParts[2])
  );
};

const isTodayDate = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const cleanFoodName = (name: string) => {
  const cleaned = name.replace(/^[Bb]ánh\s+[Cc]anh\s+/, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

interface HomeScreenProps {
  userRole: 'staff' | 'manager';
  onNavigateToAddOrder: () => void;
  onNavigateToManageDishes: () => void;
  onNavigateToHistory: () => void;
  onNavigateToActiveOrders: () => void;
  onNavigateToUnpaidOrders: () => void;
  onNavigateToRevenueStats: () => void;
  onNavigateToChangePassword: () => void;
  onNavigateToTrashOrders?: () => void;
  onNavigateToTableMap?: () => void;
  onLogout?: () => void;
}

export default function HomeScreen({
  userRole,
  onNavigateToAddOrder,
  onNavigateToTableMap,
  onNavigateToManageDishes,
  onNavigateToHistory,
  onNavigateToActiveOrders,
  onNavigateToUnpaidOrders,
  onNavigateToRevenueStats,
  onNavigateToChangePassword,
  onNavigateToTrashOrders,
  onLogout,
}: HomeScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const { orders, expenses, updateOrderStatus, isDemoMode, resetDemoData } = useCart();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleResetDemo = async () => {
    await resetDemoData();
    showToast('✨ Đã khôi phục dữ liệu mẫu ban đầu!');
  };

  const flatListRef = useRef<FlatList>(null);

  // Đơn không bị xóa mềm (dùng cho màn hình bán hàng)
  const activeOrders = orders.filter((o) => !o.isDeleted);
  const pendingOrders = activeOrders.filter((o) => o.status === 'pending');
  const pendingCount = pendingOrders.length;
  const occupiedTablesCount = new Set(
    activeOrders.filter((o) => o.status !== 'paid').map((o) => o.tableNumber)
  ).size;
  const completedOrders = activeOrders.filter(
    (o) => (o.status === 'completed' || o.status === 'paid') && isTodayDate(parseTimestamp(o.timestamp))
  ).length;
  const unpaidOrdersCount = activeOrders.filter((o) => o.status !== 'paid').length;
  // Đơn paid bị xóa mềm vẫn tính vào doanh thu (đã thu tiền thật)
  const totalRevenue = orders
    .filter((o) => o.status === 'paid' && (!o.isDeleted || o.status === 'paid') && isTodayDate(parseTimestamp(o.timestamp)))
    .reduce((sum, o) => sum + o.total, 0);

  const todayExpenses = expenses
    .filter((e) => isTodayDate(parseTimestamp(e.timestamp)))
    .reduce((sum, e) => sum + e.amount, 0);
  const todayProfit = totalRevenue - todayExpenses;

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const isTablet = screenWidth >= 600;

  // State for layout width measurement (with a safe initial estimate)
  const [sliderWidth, setSliderWidth] = useState(screenWidth - Spacing.three * 4 - 4);

  const [currentPage, setCurrentPage] = useState(0);

  const formatPrice = (price?: number | null) => (Number(price) || 0).toLocaleString('vi-VN') + ' đ';

  const now = useCurrentTime(15000);

  // Oldest first for kitchen display
  const kitchenOrders = [...pendingOrders].reverse();
  const lateKitchenCount = kitchenOrders.filter(
    (o) => getOrderWaitInfo(o, now).urgency === 'late'
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Hệ thống bán hàng - {userRole === 'manager' ? 'Quyền Quản lý' : 'Quyền Nhân viên'}
              </Text>
              <Text style={[styles.headerTitle, { color: colors.primary }]}>
                Bánh canh POS 🏪
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.success }]}>
                <View style={styles.greenPulse} />
                <Text style={styles.statusText}>
                  {userRole === 'manager' ? 'Quản lý' : 'Nhân viên'}
                </Text>
              </View>
              {onLogout && (
                <TouchableOpacity
                  onPress={onLogout}
                  style={[
                    styles.logoutBtn,
                    { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={18} color="#FF4D4D" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Chế độ Demo Banner */}
          {isDemoMode && (
            <View
              style={[
                styles.demoBanner,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: '#FF7B5940',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View style={styles.demoDot} />
                <Text style={[styles.demoBannerText, { color: colors.textSecondary }]} numberOfLines={1}>
                  <Text style={{ fontWeight: '700', color: '#FF7B59' }}>Demo Mode</Text> · Dữ liệu lưu trên máy bạn
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleResetDemo}
                style={[styles.demoResetBtn, { backgroundColor: '#FF7B5915', borderColor: '#FF7B5940' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="reload-outline" size={13} color="#FF7B59" />
                <Text style={styles.demoResetBtnText}>Dữ liệu mẫu</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Stats — compact single row */}
          <View style={styles.statsRow}>
            <View
              style={[
                styles.miniStatCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              <Ionicons name="restaurant-outline" size={16} color="#FF7B59" />
              <Text style={[styles.miniStatValue, { color: colors.text }]}>{pendingCount}</Text>
              <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>
                Chế biến
              </Text>
            </View>

            <View
              style={[
                styles.miniStatCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              <Ionicons name="checkmark-done-circle-outline" size={16} color="#2EC4B6" />
              <Text style={[styles.miniStatValue, { color: colors.text }]}>{completedOrders}</Text>
              <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>
                Hoàn thành
              </Text>
            </View>

            {userRole === 'manager' && (
              <View
                style={[
                  styles.miniStatCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                    flex: 1.8,
                  },
                ]}
              >
                <Ionicons name="wallet-outline" size={16} color="#FFC72C" />
                <Text style={[styles.miniStatValue, { color: todayProfit >= 0 ? colors.success : '#FF4D4D', fontSize: 13 }]}>
                  {formatPrice(todayProfit)}
                </Text>
                <Text style={[styles.miniStatLabel, { color: colors.textSecondary, fontSize: 9 }]} numberOfLines={1}>
                  Lợi nhuận (Thu: {formatPrice(totalRevenue)} - Chi: {formatPrice(todayExpenses)})
                </Text>
              </View>
            )}
          </View>

          {/* Kitchen Ticket — Pending Orders */}
          <View
            style={[
              styles.kitchenCard,
              { backgroundColor: colors.backgroundElement, borderColor: '#FF7B59' },
            ]}
          >
            <View style={styles.kitchenHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flame-outline" size={isTablet ? 26 : 20} color="#FF7B59" />
                <Text style={[styles.kitchenTitle, { color: colors.text }, isTablet && { fontSize: 20 }]}>
                  Đơn cần làm ngay
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {lateKitchenCount > 0 && (
                  <View style={[styles.lateBadge, isTablet && { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }]}>
                    <Ionicons name="alert-circle" size={isTablet ? 16 : 12} color="#DC2626" />
                    <Text style={[styles.lateBadgeText, isTablet && { fontSize: 13 }]}>
                      {lateKitchenCount} &gt; 15m
                    </Text>
                  </View>
                )}
                {pendingCount > 0 && (
                  <View style={[styles.pendingBadge, isTablet && { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 }]}>
                    <Text style={[styles.pendingBadgeText, isTablet && { fontSize: 16 }]}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            </View>

            {kitchenOrders.length === 0 ? (
              <View style={styles.kitchenEmpty}>
                <Ionicons name="checkmark-circle-outline" size={isTablet ? 48 : 32} color={colors.success} />
                <Text style={[styles.kitchenEmptyText, { color: colors.textSecondary }, isTablet && { fontSize: 18 }]}>
                  Không có đơn nào đang chờ làm!
                </Text>
              </View>
            ) : (
              <View onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setSliderWidth(w - 2); // subtract 2px for slide borders to prevent overflow
              }}>
                <FlatList
                  ref={flatListRef}
                  key={`slider-${isLandscape ? 'land' : 'port'}`}
                  data={kitchenOrders}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  getItemLayout={(data, index) => ({
                    length: sliderWidth,
                    offset: sliderWidth * index,
                    index,
                  })}
                  onScroll={(e) => {
                    const xOffset = e.nativeEvent.contentOffset.x;
                    if (sliderWidth > 0) {
                      const page = Math.round(xOffset / sliderWidth);
                      if (page >= 0 && page < kitchenOrders.length) {
                        setCurrentPage(page);
                      }
                    }
                  }}
                  scrollEventThrottle={16}
                  renderItem={({ item: order }: { item: Order }) => {
                    const waitInfo = getOrderWaitInfo(order, now);
                    const isLate = waitInfo.urgency === 'late';
                    return (
                      <View
                        style={[
                          styles.kitchenSlide,
                          {
                            width: sliderWidth,
                            borderColor: isLate ? '#FCA5A5' : colors.border,
                            borderWidth: isLate ? 1.5 : 1,
                          },
                          isTablet && { padding: 16 },
                        ]}
                      >
                        {/* Table badge + elapsed time badge + timestamp */}
                        <View style={styles.kitchenOrderHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={[styles.tableBadge, { backgroundColor: '#FF7B5920' }, isTablet && { paddingHorizontal: 14, paddingVertical: 6 }]}>
                              <Text style={[styles.tableBadgeText, { color: '#FF7B59' }, isTablet && { fontSize: 20 }]}>
                                📍 {order.tableNumber}
                              </Text>
                            </View>
                            <OrderTimeBadge order={order} now={now} compact isTablet={isTablet} />
                          </View>
                          <Text style={[styles.kitchenTimestamp, { color: colors.textSecondary }, isTablet && { fontSize: 16, fontWeight: '600' }]}>
                            {order.timestamp.split(' ')[0]}
                          </Text>
                        </View>

                      {/* Items list */}
                      <View style={[styles.kitchenItemsList, { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }]}>
                        {order.items.map((item: OrderItem, i: number) => (
                          <View
                            key={i}
                            style={[
                              styles.kitchenItemRow,
                              { width: isLandscape ? '31%' : '48%', marginBottom: 4 },
                              isTablet && { marginBottom: 10, gap: 12 }
                            ]}
                          >
                            <Text style={[styles.kitchenItemQty, { color: '#FF7B59' }, isTablet && { fontSize: 24, width: 38 }]}>
                              ×{item.quantity}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.kitchenItemName, { color: colors.text }, isTablet && { fontSize: 20, fontWeight: 'bold' }]} numberOfLines={1}>
                                {cleanFoodName(item.name)}
                              </Text>
                              {item.note ? (
                                <Text style={[styles.kitchenItemNote, { color: colors.primary }, isTablet && { fontSize: 16, fontWeight: 'bold', marginTop: 3 }]}>
                                  ↳ {item.note}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Order-level note */}
                      {order.note ? (
                        <Text
                          style={[
                            styles.kitchenOrderNote,
                            { color: colors.textSecondary, borderTopColor: colors.border },
                            isTablet && { fontSize: 16, fontWeight: 'bold', marginTop: 12, paddingTop: 12 }
                          ]}
                        >
                          📝 {order.note}
                        </Text>
                      ) : null}
                    </View>
                  );
                }}
                />

                {/* Page dots + action buttons */}
                <View style={styles.sliderFooter}>
                  {/* Return to first order */}
                  <TouchableOpacity
                    onPress={() => {
                      if (kitchenOrders.length > 0) {
                        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                        setCurrentPage(0);
                      }
                    }}
                    style={[
                      styles.sliderActionBtn,
                      { backgroundColor: colors.border, opacity: currentPage === 0 ? 0.3 : 1 },
                      isTablet && { width: 44, height: 44, borderRadius: 22 }
                    ]}
                    disabled={currentPage === 0}
                  >
                    <Ionicons name="return-up-back-outline" size={isTablet ? 22 : 16} color={colors.text} />
                  </TouchableOpacity>

                  {/* Dots */}
                  {kitchenOrders.length > 1 && (
                    <View style={styles.dotsRow}>
                      {kitchenOrders.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            {
                              backgroundColor: i === currentPage ? '#FF7B59' : colors.border,
                              width: i === currentPage ? 16 : 6,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}

                  {/* Mark current order as done */}
                  <TouchableOpacity
                    onPress={() => {
                      const order = kitchenOrders[currentPage];
                      if (order) {
                        updateOrderStatus(order.id, 'completed');
                        // snap back to first after marking done
                        setTimeout(() => {
                          if (kitchenOrders.length > 1) {
                            flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                          }
                          setCurrentPage(0);
                        }, 300);
                      }
                    }}
                    style={[
                      styles.sliderActionBtn,
                      { backgroundColor: '#2EC4B620' },
                      isTablet && { width: 44, height: 44, borderRadius: 22 }
                    ]}
                  >
                    <Ionicons name="checkmark-done" size={isTablet ? 24 : 18} color="#2EC4B6" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Main Navigation Actions */}
          <View style={styles.actionsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Công Cụ Quản Lý</Text>

            <TouchableOpacity
              onPress={onNavigateToAddOrder}
              style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FFF0EC' }]}>
                <Ionicons name="add-circle" size={32} color="#FF5E36" />
              </View>
              <View style={styles.actionDetails}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Thêm Đơn Hàng</Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  Chọn món ăn, nhập số bàn và ghi nhận đơn hàng mới cho nhà bếp.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* {onNavigateToTableMap && (
              <TouchableOpacity
                onPress={onNavigateToTableMap}
                style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              >
                <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="grid" size={32} color="#8B5CF6" />
                </View>
                <View style={styles.actionDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Sơ Đồ Bàn Ăn</Text>
                    {occupiedTablesCount > 0 && (
                      <View style={[styles.lateBadge, { backgroundColor: '#F3E8FF', borderColor: '#DDD6FE' }]}>
                        <Text style={[styles.lateBadgeText, { color: '#7C3AED' }]}>{occupiedTablesCount} bàn có khách</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                    Xem sơ đồ bàn trực quan, bàn trống/có khách, đổi bàn và gộp bàn dễ dàng.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )} */}

            <TouchableOpacity
              onPress={onNavigateToActiveOrders}
              style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FFF9E6' }]}>
                <Ionicons name="time" size={32} color="#FFA500" />
              </View>
              <View style={styles.actionDetails}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  Đơn Chưa Làm Xong ({pendingCount})
                </Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  Xem các đơn hàng chưa bắt đầu làm, sắp xếp từ cũ nhất lên trên.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNavigateToUnpaidOrders}
              style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            >
              <View style={[styles.iconBox, { backgroundColor: '#EBF4FF' }]}>
                <Ionicons name="card" size={32} color="#3B82F6" />
              </View>
              <View style={styles.actionDetails}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  Đơn Chưa Thanh Toán ({unpaidOrdersCount})
                </Text>
                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  Xem tất cả đơn chưa thanh toán, sắp xếp từ mới nhất.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {userRole === 'manager' && (
              <>

                <TouchableOpacity
                  onPress={onNavigateToManageDishes}
                  style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#E6F9F5' }]}>
                    <Ionicons name="fast-food" size={32} color="#2EC4B6" />
                  </View>
                  <View style={styles.actionDetails}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Quản Lý Món Ăn</Text>
                    <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                      Tạo món ăn mới với tên, hình ảnh, giá cả và tùy chỉnh danh sách thực đơn.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* <TouchableOpacity
                  onPress={onNavigateToRevenueStats}
                  style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#FFEBEB' }]}>
                    <Ionicons name="calculator" size={32} color="#FF4D4D" />
                  </View>
                  <View style={styles.actionDetails}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Quản Lý Chi Phí</Text>
                    <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                      Ghi nhận các khoản chi tiêu hàng ngày (mua đá, mua rau, gia vị...) và tính lợi nhuận ròng.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity> */}

                <TouchableOpacity
                  onPress={onNavigateToHistory}
                  style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#EBF4FF' }]}>
                    <Ionicons name="receipt" size={32} color="#3B82F6" />
                  </View>
                  <View style={styles.actionDetails}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Lịch Sử Đơn Hàng</Text>
                    <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                      Xem danh sách bàn ăn, tổng tiền và cập nhật trạng thái làm món của bếp.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onNavigateToRevenueStats}
                  style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="bar-chart" size={32} color="#A855F7" />
                  </View>
                  <View style={styles.actionDetails}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Báo Cáo Doanh Thu</Text>
                    <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                      Xem doanh thu, đơn hàng theo ngày, tuần, tháng hoặc khoảng thời gian tùy chọn.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onNavigateToChangePassword}
                  style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="key" size={32} color="#0EA5E9" />
                  </View>
                  <View style={styles.actionDetails}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Cấu Hình Mật Khẩu</Text>
                    <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                      Thay đổi mật khẩu đăng nhập của Nhân viên và Quản lý qua xác thực OTP Gmail.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {onNavigateToTrashOrders && (
                  <TouchableOpacity
                    onPress={onNavigateToTrashOrders}
                    style={[styles.actionCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}>
                      <Ionicons name="trash" size={32} color="#EF4444" />
                    </View>
                    <View style={styles.actionDetails}>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>Thùng Rác Đơn Hàng</Text>
                      <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                        Xem các đơn đã xóa. Có thể khôi phục hoặc xóa vĩnh viễn.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  scrollContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  // ── Compact stats row ──────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.three,
  },
  miniStatCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 3,
  },
  miniStatValue: { fontSize: 18, fontWeight: 'bold' },
  miniStatLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  // ── Kitchen ticket card ────────────────────────────────────
  kitchenCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  kitchenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  kitchenTitle: { fontSize: 15, fontWeight: 'bold' },
  pendingBadge: {
    backgroundColor: '#FF7B59',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  lateBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  kitchenEmpty: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  kitchenEmptyText: { fontSize: 13 },
  kitchenOrdersList: { gap: 0 },
  kitchenOrderItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  kitchenSlide: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  sliderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  sliderActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitchenOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tableBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tableBadgeText: { fontSize: 13, fontWeight: 'bold' },
  kitchenTimestamp: { fontSize: 11 },
  kitchenItemsList: { gap: 5 },
  kitchenItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  kitchenItemQty: { fontSize: 15, fontWeight: 'bold', width: 28 },
  kitchenItemName: { fontSize: 14, fontWeight: '600' },
  kitchenItemNote: { fontSize: 11, fontStyle: 'italic', marginTop: 1 },
  kitchenOrderNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },

  // ── Action cards ───────────────────────────────────────────
  actionsContainer: { gap: Spacing.three },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionDetails: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  actionDesc: { fontSize: 12, lineHeight: 16 },

  // ── Demo banner & Toast ─────────────────────────────────────
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.two,
    gap: 8,
  },
  demoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7B59',
  },
  demoBannerText: {
    fontSize: 12,
  },
  demoResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  demoResetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF7B59',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
