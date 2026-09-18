import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  useColorScheme,
  ActivityIndicator,
  Modal,
} from 'react-native';
import ExcelJS from 'exceljs';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart, Order, OrderStatus } from '../context/CartContext';
import { useCurrentTime, getOrderDate, getOrderTimestampMs, isOrderToday } from '../utils/orderTime';
import OrderTimeBadge from '../components/OrderTimeBadge';
import DatePickerModal from '../components/DatePickerModal';
import { SHOP_NAME, SHOP_PHONE, SHOP_ADDRESS, SHOP_TAGLINE } from '../config/shop';

const formatPrice = (price?: number | null) => {
  return (Number(price) || 0).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const STATUS_CONFIGS: {
  [key in OrderStatus]: { label: string; color: string; bgColor: string };
} = {
  pending: { label: 'Chưa làm', color: '#FF4D4D', bgColor: '#FFEBEB' },
  completed: { label: 'Đã xong', color: '#2EC4B6', bgColor: '#E6F9F5' },
  paid: { label: 'Đã thanh toán', color: '#3B82F6', bgColor: '#EBF4FF' },
};

interface OrderHistoryScreenProps {
  onBack: () => void;
}

export default function OrderHistoryScreen({ onBack }: OrderHistoryScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];

  const { orders, updateOrderStatus, deleteOrder, updateOrderNote } = useCart();
  const now = useCurrentTime(15000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Bill modal
  const [billOrder, setBillOrder] = useState<Order | null>(null);

  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'range'>('all');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilterType, setExportFilterType] = useState<'day' | 'range' | 'month' | 'year'>('day');
  const [exportStartDate, setExportStartDate] = useState(new Date());
  const [exportEndDate, setExportEndDate] = useState(new Date());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [showExportStartDatePicker, setShowExportStartDatePicker] = useState(false);
  const [showExportEndDatePicker, setShowExportEndDatePicker] = useState(false);

  // Phân trang hiển thị tránh lag
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20); // Reset phân trang khi thay đổi bộ lọc
  }, [filterType, startDate, endDate, searchTableQuery]);

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 100;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  const handleLoadMore = () => {
    const totalCount = getFilteredAndSortedOrders().length;
    if (visibleCount < totalCount) {
      setVisibleCount((prev) => prev + 20);
    }
  };

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

  const handleExportExcel = async () => {
    try {
      // Đơn đã xóa mềm không xuất ra Excel (đã chuyển vào Thùng rác)
      let filtered = orders.filter((o) => !o.isDeleted).slice();

      if (exportFilterType === 'day') {
        const d = exportStartDate;
        filtered = filtered.filter((order) => {
          const orderDate = getOrderDate(order);
          return orderDate.getDate() === d.getDate() &&
                 orderDate.getMonth() === d.getMonth() &&
                 orderDate.getFullYear() === d.getFullYear();
        });
      } else if (exportFilterType === 'range') {
        const start = new Date(exportStartDate.getFullYear(), exportStartDate.getMonth(), exportStartDate.getDate(), 0, 0, 0);
        const end = new Date(exportEndDate.getFullYear(), exportEndDate.getMonth(), exportEndDate.getDate(), 23, 59, 59);
        filtered = filtered.filter((order) => {
          const orderDate = getOrderDate(order);
          return orderDate >= start && orderDate <= end;
        });
      } else if (exportFilterType === 'month') {
        filtered = filtered.filter((order) => {
          const orderDate = getOrderDate(order);
          return orderDate.getMonth() + 1 === exportMonth &&
                 orderDate.getFullYear() === exportYear;
        });
      } else if (exportFilterType === 'year') {
        filtered = filtered.filter((order) => {
          const orderDate = getOrderDate(order);
          return orderDate.getFullYear() === exportYear;
        });
      }

      if (filtered.length === 0) {
        showToast('Không có đơn hàng nào trong thời gian này');
        return;
      }

      const rows: any[][] = [];

      filtered.forEach(order => {
        if (order.items.length === 0) {
          rows.push([
            order.id,
            order.timestamp,
            order.tableNumber,
            STATUS_CONFIGS[order.status].label,
            '',
            0,
            0,
            0,
            order.total,
            order.note || '',
            ''
          ]);
        } else {
          order.items.forEach(item => {
            rows.push([
              order.id,
              order.timestamp,
              order.tableNumber,
              STATUS_CONFIGS[order.status].label,
              item.name,
              item.quantity,
              item.price,
              item.price * item.quantity,
              order.total,
              order.note || '',
              item.note || ''
            ]);
          });
        }
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = SHOP_NAME || 'App Bán Hàng';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Lịch sử đơn hàng', {
        views: [{ showGridLines: true }],
      });

      // Tạo bảng Excel Table chính thức (ListObject kèm Style và Bộ lọc tự động)
      worksheet.addTable({
        name: 'BangLichSuDonHang',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium9',
          showRowStripes: true,
        },
        columns: [
          { name: 'Mã đơn', filterButton: true },
          { name: 'Thời gian', filterButton: true },
          { name: 'Bàn', filterButton: true },
          { name: 'Trạng thái', filterButton: true },
          { name: 'Tên món', filterButton: true },
          { name: 'Số lượng', filterButton: true },
          { name: 'Đơn giá (đ)', filterButton: true },
          { name: 'Thành tiền món (đ)', filterButton: true },
          { name: 'Tổng tiền đơn (đ)', filterButton: true },
          { name: 'Ghi chú đơn', filterButton: true },
          { name: 'Ghi chú món', filterButton: true },
        ],
        rows,
      });

      // Định dạng kiểu số tiền cho các cột tiền
      worksheet.getColumn(6).numFmt = '#,##0';
      worksheet.getColumn(7).numFmt = '#,##0';
      worksheet.getColumn(8).numFmt = '#,##0';
      worksheet.getColumn(9).numFmt = '#,##0';

      // Căn giữa cho các cột ngắn / mã / trạng thái
      worksheet.getColumn(1).alignment = { horizontal: 'center' };
      worksheet.getColumn(2).alignment = { horizontal: 'center' };
      worksheet.getColumn(3).alignment = { horizontal: 'center' };
      worksheet.getColumn(4).alignment = { horizontal: 'center' };
      worksheet.getColumn(6).alignment = { horizontal: 'center' };

      // Tự động căn chỉnh độ rộng các cột vừa vặn với nội dung
      worksheet.columns.forEach((col, index) => {
        let maxLength = 0;
        const headerCell = worksheet.getRow(1).getCell(index + 1);
        maxLength = headerCell.value ? headerCell.value.toString().length : 0;

        col.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
          if (rowNumber > 1 && cell.value !== null && cell.value !== undefined) {
            const str = typeof cell.value === 'number'
              ? cell.value.toLocaleString('vi-VN')
              : cell.value.toString();
            if (str.length > maxLength) {
              maxLength = str.length;
            }
          }
        });
        col.width = Math.max(maxLength + 4, 12);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `LichSuDonHang_${Date.now()}.xlsx`;

      if (Platform.OS === 'web') {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        let base64String = '';
        const globalBuffer = (globalThis as any)?.Buffer;
        if (globalBuffer) {
          base64String = globalBuffer.from(buffer).toString('base64');
        } else {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
          }
          base64String = (globalThis as any).btoa ? (globalThis as any).btoa(binary) : binary;
        }

        const fileUri = FileSystem.cacheDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, base64String, {
          encoding: 'base64',
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Chia sẻ file Excel',
            UTI: 'com.microsoft.excel.xlsx',
          });
        } else {
          showToast('Chia sẻ không khả dụng trên thiết bị này');
        }
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error(error);
      showToast('Có lỗi xảy ra khi xuất file');
    }
  };

  const getFilteredAndSortedOrders = () => {
    // Đơn đã xóa mềm ẩn hoàn toàn khỏi lịch sử (vào Thùng rác thay thế)
    // Doanh thu của đơn paid+deleted vẫn được tính riêng ở màn hình Báo cáo
    let filtered = orders.filter((o) => !o.isDeleted).slice();

    if (searchTableQuery.trim() !== '') {
      const query = searchTableQuery.trim().toLowerCase();
      filtered = filtered.filter(order => 
        order.tableNumber.toLowerCase().includes(query)
      );
    }

    if (filterType === 'today') {
      filtered = filtered.filter((order) => isOrderToday(order));
    } else if (filterType === 'range') {
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      filtered = filtered.filter((order) => {
        const orderDate = getOrderDate(order);
        return orderDate >= start && orderDate <= end;
      });
    }

    // Sort newest first (chính xác tuyệt đối theo mili-giây)
    const newestFirst = filtered.sort((a, b) => {
      const timeA = getOrderTimestampMs(a);
      const timeB = getOrderTimestampMs(b);
      return timeB - timeA;
    });
    return newestFirst;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Lịch Sử Đơn Hàng</Text>
          <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.exportBtn}>
            <Ionicons name="download-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm theo số bàn..."
            placeholderTextColor={colors.textSecondary}
            value={searchTableQuery}
            onChangeText={setSearchTableQuery}
          />
          {searchTableQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTableQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Filter Tabs */}
        <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
              <TouchableOpacity
                onPress={() => setFilterType('all')}
                style={[
                  styles.filterTabBtn,
                  filterType === 'all' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, filterType === 'all' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Tất cả đơn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterType('today')}
                style={[
                  styles.filterTabBtn,
                  filterType === 'today' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, filterType === 'today' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Trong ngày
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterType('range')}
                style={[
                  styles.filterTabBtn,
                  filterType === 'range' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, filterType === 'range' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Theo khoảng ngày
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Date Picker Inputs if range is active */}
          {filterType === 'range' && (
            <View style={styles.dateInputsRow}>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={[styles.dateSelectorBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.dateLabelText, { color: colors.textSecondary }]}>Từ ngày:</Text>
                <Text style={[styles.dateValueText, { color: colors.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowEndDatePicker(true)}
                style={[styles.dateSelectorBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.dateLabelText, { color: colors.textSecondary }]}>Đến ngày:</Text>
                <Text style={[styles.dateValueText, { color: colors.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Date Pickers Modals */}
        <DatePickerModal
          visible={showStartDatePicker}
          onClose={() => setShowStartDatePicker(false)}
          selectedDate={startDate}
          onSelectDate={setStartDate}
          title="Chọn ngày bắt đầu"
        />
        <DatePickerModal
          visible={showEndDatePicker}
          onClose={() => setShowEndDatePicker(false)}
          selectedDate={endDate}
          onSelectDate={setEndDate}
          title="Chọn ngày kết thúc"
        />

        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có đơn hàng nào được tạo.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={({ nativeEvent }) => {
              if (isCloseToBottom(nativeEvent)) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            <View style={styles.ordersList}>
              {(() => {
                const sortedOrders = getFilteredAndSortedOrders();
                const displayedOrders = sortedOrders.slice(0, visibleCount);
                return displayedOrders.map((order) => {
                  const currentStatusConfig = STATUS_CONFIGS[order.status];
                  return (
                    <View
                      key={order.id}
                      style={[styles.orderCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                    >

                      {/* Header Row */}
                      <View style={styles.orderHeaderRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <Text style={[styles.tableLabel, { color: colors.text }]}>
                              📍 {order.tableNumber}
                            </Text>
                            {order.status === 'pending' && (
                              <OrderTimeBadge order={order} now={now} />
                            )}
                          </View>
                          <Text style={[styles.orderIdText, { color: colors.textSecondary }]}>
                            Mã: {order.id} • {order.timestamp}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            deleteOrder(order.id);
                            showToast('Đã xóa đơn hàng khỏi lịch sử');
                          }}
                          style={styles.deleteBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
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
                              <Text style={[styles.noteText, { color: colors.textSecondary }]}>📝 Ghi chú:</Text>
                              <TouchableOpacity onPress={() => startEditingNote(order.id, order.note || '')}>
                                <Text style={[styles.editNoteBtnText, { color: colors.primary }]}>Sửa</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={[styles.noteContent, { color: colors.text }]}>{order.note}</Text>
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
                            <Text style={[styles.addNotePlaceholderText, { color: colors.textSecondary }]}>Thêm ghi chú...</Text>
                          </TouchableOpacity>
                          <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        </>
                      )}

                      {/* Food Items Breakdown */}
                      <View style={styles.itemsBreakdown}>
                        {order.items.map((item, idx) => (
                          <View key={idx} style={styles.itemContainer}>
                            <View style={styles.itemRow}>
                              <Text style={[styles.itemQtyText, { color: colors.text }]}>{item.quantity}x</Text>
                              <Text style={[styles.itemNameText, { color: colors.text }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={[styles.itemPriceText, { color: colors.textSecondary }]}>
                                {formatPrice(item.price * item.quantity)}
                              </Text>
                            </View>
                            {item.note ? (
                              <Text style={[styles.itemNoteText, { color: colors.primary }]}>
                                ↳ Ghi chú: {item.note}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>

                      <View style={[styles.divider, { backgroundColor: colors.border }]} />

                      {/* Total Row */}
                      <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: colors.text }]}>Tổng tiền:</Text>
                        <Text style={[styles.totalValue, { color: colors.primary }]}>
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
                });
              })()}

              {visibleCount < getFilteredAndSortedOrders().length && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingMoreText, { color: colors.textSecondary }]}>
                    Đang tải thêm đơn hàng...
                  </Text>
                </View>
              )}
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

      {/* ── Bill Modal ──────────────────────────────────────────── */}
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
                      <Text style={styles.billInfoLabel}>Ghi chú: </Text>
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

      {/* ── Export Modal ──────────────────────────────────────────── */}
      {showExportModal && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setShowExportModal(false)}>
          <View style={styles.exportOverlay}>
            <View style={[styles.exportSheet, { backgroundColor: colors.background }]}>
              <Text style={[styles.exportTitle, { color: colors.text }]}>Xuất Excel</Text>
              
              <View style={styles.exportOptions}>
                <TouchableOpacity onPress={() => setExportFilterType('day')} style={styles.exportOptionBtn}>
                  <View style={[styles.radioBtn, exportFilterType === 'day' && { borderColor: colors.primary }]}>
                    {exportFilterType === 'day' && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.exportOptionText, { color: colors.text }]}>Theo ngày</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setExportFilterType('range')} style={styles.exportOptionBtn}>
                  <View style={[styles.radioBtn, exportFilterType === 'range' && { borderColor: colors.primary }]}>
                    {exportFilterType === 'range' && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.exportOptionText, { color: colors.text }]}>Theo khoảng ngày</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setExportFilterType('month')} style={styles.exportOptionBtn}>
                  <View style={[styles.radioBtn, exportFilterType === 'month' && { borderColor: colors.primary }]}>
                    {exportFilterType === 'month' && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.exportOptionText, { color: colors.text }]}>Theo tháng</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setExportFilterType('year')} style={styles.exportOptionBtn}>
                  <View style={[styles.radioBtn, exportFilterType === 'year' && { borderColor: colors.primary }]}>
                    {exportFilterType === 'year' && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.exportOptionText, { color: colors.text }]}>Theo năm</Text>
                </TouchableOpacity>
              </View>

              {/* Inputs based on type */}
              <View style={styles.exportInputsContainer}>
                {exportFilterType === 'day' && (
                  <TouchableOpacity onPress={() => setShowExportStartDatePicker(true)} style={[styles.dateSelectorBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.dateLabelText, { color: colors.textSecondary }]}>Chọn ngày:</Text>
                    <Text style={[styles.dateValueText, { color: colors.text }]}>{formatDate(exportStartDate)}</Text>
                  </TouchableOpacity>
                )}

                {exportFilterType === 'range' && (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowExportStartDatePicker(true)} style={[styles.dateSelectorBtn, { borderColor: colors.border }]}>
                      <Text style={[styles.dateLabelText, { color: colors.textSecondary }]}>Từ ngày:</Text>
                      <Text style={[styles.dateValueText, { color: colors.text }]}>{formatDate(exportStartDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowExportEndDatePicker(true)} style={[styles.dateSelectorBtn, { borderColor: colors.border }]}>
                      <Text style={[styles.dateLabelText, { color: colors.textSecondary }]}>Đến ngày:</Text>
                      <Text style={[styles.dateValueText, { color: colors.text }]}>{formatDate(exportEndDate)}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {exportFilterType === 'month' && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dateLabelText, { color: colors.textSecondary, marginBottom: 4 }]}>Tháng</Text>
                      <TextInput
                        style={[styles.editingNoteInput, { color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                        keyboardType="numeric"
                        value={exportMonth.toString()}
                        onChangeText={(t) => setExportMonth(parseInt(t) || 1)}
                        maxLength={2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dateLabelText, { color: colors.textSecondary, marginBottom: 4 }]}>Năm</Text>
                      <TextInput
                        style={[styles.editingNoteInput, { color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                        keyboardType="numeric"
                        value={exportYear.toString()}
                        onChangeText={(t) => setExportYear(parseInt(t) || 2024)}
                        maxLength={4}
                      />
                    </View>
                  </View>
                )}

                {exportFilterType === 'year' && (
                  <View>
                    <Text style={[styles.dateLabelText, { color: colors.textSecondary, marginBottom: 4 }]}>Năm</Text>
                    <TextInput
                      style={[styles.editingNoteInput, { color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                      keyboardType="numeric"
                      value={exportYear.toString()}
                      onChangeText={(t) => setExportYear(parseInt(t) || 2024)}
                      maxLength={4}
                    />
                  </View>
                )}
              </View>

              <View style={styles.exportActionRow}>
                <TouchableOpacity onPress={() => setShowExportModal(false)} style={[styles.exportActionBtn, { backgroundColor: colors.border }]}>
                  <Text style={[styles.exportActionBtnText, { color: colors.textSecondary }]}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExportExcel} style={[styles.exportActionBtn, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.exportActionBtnText, { color: '#FFF' }]}>Xuất Excel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      {/* DatePickerModal cho export nằm trong Modal xuất → luôn nằm trên modal cha */}
          <DatePickerModal
            visible={showExportStartDatePicker}
            onClose={() => setShowExportStartDatePicker(false)}
            selectedDate={exportStartDate}
            onSelectDate={setExportStartDate}
            title="Chọn ngày"
            useInlineOverlay
          />
          <DatePickerModal
            visible={showExportEndDatePicker}
            onClose={() => setShowExportEndDatePicker(false)}
            selectedDate={exportEndDate}
            onSelectDate={setExportEndDate}
            title="Chọn ngày"
            useInlineOverlay
          />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
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
    fontSize: 12,
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
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterTabsScroll: {
    paddingHorizontal: Spacing.three,
    gap: 8,
    flexDirection: 'row',
  },
  filterTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabBtnActive: {
    // Custom bg color applied dynamically
  },
  filterTabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterTabBtnTextActive: {
    color: '#FFF',
  },
  dateInputsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    gap: 12,
    marginTop: 12,
  },
  dateSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  dateLabelText: {
    fontSize: 12,
  },
  dateValueText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    fontWeight: '500',
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
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportSheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  exportOptions: {
    gap: 12,
    marginBottom: 20,
  },
  exportOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  exportOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exportInputsContainer: {
    marginBottom: 24,
    minHeight: 60,
  },
  exportActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportActionBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
