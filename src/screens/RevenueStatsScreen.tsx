import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useColorScheme,
  FlatList,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart, Order } from '../context/CartContext';
import DatePickerModal from '../components/DatePickerModal';
import { getOrderDate } from '../utils/orderTime';

const formatDate = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const parseTimestamp = (ts: string): Date => {
  return getOrderDate({ timestamp: ts });
};

const isTodayDate = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const getWeekRange = (refDate: Date) => {
  const currentDayOfWeek = refDate.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const startOfWeek = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + mondayOffset, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start: startOfWeek, end: endOfWeek };
};

const isOrderInWeek = (orderDate: Date, refDate: Date) => {
  const { start, end } = getWeekRange(refDate);
  return orderDate >= start && orderDate <= end;
};

const isOrderInMonth = (orderDate: Date, refDate: Date) => {
  return orderDate.getMonth() === refDate.getMonth() && orderDate.getFullYear() === refDate.getFullYear();
};

const isOrderInYear = (orderDate: Date, refDate: Date) => {
  return orderDate.getFullYear() === refDate.getFullYear();
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
};

interface RevenueStatsScreenProps {
  onBack: () => void;
}

export default function RevenueStatsScreen({ onBack }: RevenueStatsScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  const { orders, expenses, addExpense, deleteExpense, editExpense } = useCart();

  const [statsPeriod, setStatsPeriod] = useState<'today' | 'custom' | 'week' | 'month' | 'year' | 'range'>('today');
  const [statsDate, setStatsDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Khoảng ngày
  const [rangeStartDate, setRangeStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  });
  const [rangeEndDate, setRangeEndDate] = useState<Date>(new Date());
  const [showRangeStartPicker, setShowRangeStartPicker] = useState(false);
  const [showRangeEndPicker, setShowRangeEndPicker] = useState(false);

  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);

  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    setZoomLevel(1); // Reset zoom level when period or date changes
  }, [statsPeriod, statsDate, rangeStartDate, rangeEndDate]);

  const formatPrice = (price?: number | null) => {
    return (Number(price) || 0).toLocaleString('vi-VN') + ' đ';
  };

  const handleSaveExpense = () => {
    if (expName.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập tên chi phí');
      return;
    }
    const amount = parseFloat(expAmount.replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền chi phí hợp lệ');
      return;
    }
    if (editingExpenseId !== null) {
      editExpense(editingExpenseId, expName.trim(), amount, expenseDate);
      setEditingExpenseId(null);
    } else {
      addExpense(expName.trim(), amount, expenseDate);
    }
    setExpName('');
    setExpAmount('');
    setExpenseDate(new Date());
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setExpName('');
    setExpAmount('');
    setExpenseDate(new Date());
  };

  const getFilteredOrders = () => {
    // Đơn đã xóa mềm (isDeleted=true) chỉ bị loại nếu chưa thanh toán.
    // Đơn đã thanh toán (paid) vẫn tính vào doanh thu dù đã xóa khỏi màn hình.
    const visibleOrders = orders.filter((o) => !o.isDeleted || o.status === 'paid');

    if (statsPeriod === 'today') {
      return visibleOrders.filter((o) => isTodayDate(parseTimestamp(o.timestamp)));
    } else if (statsPeriod === 'custom') {
      return visibleOrders.filter((o) => isSameDay(parseTimestamp(o.timestamp), statsDate));
    } else if (statsPeriod === 'week') {
      return visibleOrders.filter((o) => isOrderInWeek(parseTimestamp(o.timestamp), statsDate));
    } else if (statsPeriod === 'month') {
      return visibleOrders.filter((o) => isOrderInMonth(parseTimestamp(o.timestamp), statsDate));
    } else if (statsPeriod === 'year') {
      return visibleOrders.filter((o) => isOrderInYear(parseTimestamp(o.timestamp), statsDate));
    } else if (statsPeriod === 'range') {
      const start = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), rangeStartDate.getDate(), 0, 0, 0);
      const end = new Date(rangeEndDate.getFullYear(), rangeEndDate.getMonth(), rangeEndDate.getDate(), 23, 59, 59);
      return visibleOrders.filter((o) => {
        const d = parseTimestamp(o.timestamp);
        return d >= start && d <= end;
      });
    }
    return visibleOrders;
  };

  const getFilteredExpenses = () => {
    if (statsPeriod === 'today') {
      return expenses.filter((e) => isTodayDate(parseTimestamp(e.timestamp)));
    } else if (statsPeriod === 'custom') {
      return expenses.filter((e) => isSameDay(parseTimestamp(e.timestamp), statsDate));
    } else if (statsPeriod === 'week') {
      return expenses.filter((e) => isOrderInWeek(parseTimestamp(e.timestamp), statsDate));
    } else if (statsPeriod === 'month') {
      return expenses.filter((e) => isOrderInMonth(parseTimestamp(e.timestamp), statsDate));
    } else if (statsPeriod === 'year') {
      return expenses.filter((e) => isOrderInYear(parseTimestamp(e.timestamp), statsDate));
    } else if (statsPeriod === 'range') {
      const start = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), rangeStartDate.getDate(), 0, 0, 0);
      const end = new Date(rangeEndDate.getFullYear(), rangeEndDate.getMonth(), rangeEndDate.getDate(), 23, 59, 59);
      return expenses.filter((e) => {
        const d = parseTimestamp(e.timestamp);
        return d >= start && d <= end;
      });
    }
    return expenses;
  };

  const filteredOrders = getFilteredOrders();
  const paidOrders = filteredOrders.filter((o) => o.status === 'paid');
  const paidRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const unpaidOrders = filteredOrders.filter((o) => o.status !== 'paid');
  const unpaidRevenue = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = paidRevenue + unpaidRevenue;

  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = paidRevenue - totalExpenses;

  // HÀM TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ DOANH THU & CHI PHÍ
  const getChartData = () => {
    if (statsPeriod === 'range') {
      // Nhóm theo từng ngày trong khoảng
      const start = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), rangeStartDate.getDate());
      const end = new Date(rangeEndDate.getFullYear(), rangeEndDate.getMonth(), rangeEndDate.getDate());
      const data = [];
      const current = new Date(start);
      while (current <= end) {
        const targetDate = new Date(current);
        const revenue = paidOrders
          .filter((o) => isSameDay(parseTimestamp(o.timestamp), targetDate))
          .reduce((sum, o) => sum + o.total, 0);
        const expense = filteredExpenses
          .filter((e) => isSameDay(parseTimestamp(e.timestamp), targetDate))
          .reduce((sum, e) => sum + e.amount, 0);
        data.push({
          label: `${targetDate.getDate()}/${targetDate.getMonth() + 1}`,
          revenue,
          expense,
        });
        current.setDate(current.getDate() + 1);
      }
      return data;
    }

    if (statsPeriod === 'today' || statsPeriod === 'custom') {
      // Nhóm theo các khung giờ từ 6h-20h theo yêu cầu của cửa hàng
      const intervals = [
        { label: '6h-8h', startHour: 6, endHour: 8 },
        { label: '8h-10h', startHour: 8, endHour: 10 },
        { label: '10h-12h', startHour: 10, endHour: 12 },
        { label: '12h-14h', startHour: 12, endHour: 14 },
        { label: '14h-16h', startHour: 14, endHour: 16 },
        { label: '16h-18h', startHour: 16, endHour: 18 },
        { label: '18h-20h', startHour: 18, endHour: 20 },
      ];

      return intervals.map(inter => {
        const revenue = paidOrders
          .filter((o) => {
            const h = parseTimestamp(o.timestamp).getHours();
            return h >= inter.startHour && h < inter.endHour;
          })
          .reduce((sum, o) => sum + o.total, 0);

        const expense = filteredExpenses
          .filter((e) => {
            const h = parseTimestamp(e.timestamp).getHours();
            return h >= inter.startHour && h < inter.endHour;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        return { label: inter.label, revenue, expense };
      });
    }

    if (statsPeriod === 'week') {
      const { start } = getWeekRange(statsDate);
      const shortLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      return shortLabels.map((label, idx) => {
        const targetDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx);
        const revenue = paidOrders.filter(o => isSameDay(parseTimestamp(o.timestamp), targetDate)).reduce((sum, o) => sum + o.total, 0);
        const expense = filteredExpenses.filter(e => isSameDay(parseTimestamp(e.timestamp), targetDate)).reduce((sum, e) => sum + e.amount, 0);

        return { label, revenue, expense };
      });
    }

    if (statsPeriod === 'month') {
      const year = statsDate.getFullYear();
      const month = statsDate.getMonth(); // 0-indexed
      const daysCount = new Date(year, month + 1, 0).getDate();

      const data = [];
      for (let i = 0; i < daysCount; i++) {
        const targetDate = new Date(year, month, i + 1);
        const revenue = paidOrders
          .filter((o) => isSameDay(parseTimestamp(o.timestamp), targetDate))
          .reduce((sum, o) => sum + o.total, 0);
        const expense = filteredExpenses
          .filter((e) => isSameDay(parseTimestamp(e.timestamp), targetDate))
          .reduce((sum, e) => sum + e.amount, 0);

        data.push({
          label: `${i + 1}`,
          revenue,
          expense,
        });
      }
      return data;
    }

    if (statsPeriod === 'year') {
      const months = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];
      return months.map((mName, idx) => {
        const revenue = paidOrders.filter(o => {
          const orderDate = parseTimestamp(o.timestamp);
          return orderDate.getMonth() === idx;
        }).reduce((sum, o) => sum + o.total, 0);

        const expense = filteredExpenses.filter(e => {
          const expDate = parseTimestamp(e.timestamp);
          return expDate.getMonth() === idx;
        }).reduce((sum, e) => sum + e.amount, 0);

        return { label: mName, revenue, expense };
      });
    }

    return [];
  };

  const formatChartVal = (val: number) => {
    if (val === 0) return '';
    if (val >= 1000000) {
      const formatted = (val / 1000000).toFixed(1);
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'M' : formatted + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(0) + 'k';
    }
    return val.toString();
  };

  const renderChart = () => {
    const chartData = getChartData();
    if (chartData.length === 0) return null;

    const n = chartData.length;

    // Tính toán chiều rộng khả dụng của màn hình để biểu đồ vừa khít khi ở zoom 1.0x
    const { width: screenWidth } = useWindowDimensions();
    const availableWidth = screenWidth - 48; // Trừ lề ngoài (24px) và lề trong của Card (24px)

    const chartWidth = availableWidth * zoomLevel;
    const chartHeight = 120; // Chiều cao vẽ đồ thị

    const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.expense)), 100000);

    // Tính khoảng cách bước ngang giữa các điểm
    const stepX = n > 1 ? (chartWidth - 50) / (n - 1) : 0;

    // Tự động ẩn nhãn số liệu hoặc nhãn trục X nếu mật độ quá dày để tránh đè chữ lên nhau
    // Hiển thị số liệu khi zoomLevel > 1.0 (người dùng phóng to) hoặc khi các điểm đủ rộng
    const showValText = stepX >= 35 || zoomLevel > 1.0;
    const showAllXLabels = n <= 12 || stepX >= 22;

    // Tính tọa độ (x, y) cho từng điểm dữ liệu
    const coords = chartData.map((item, i) => {
      // Chừa lề hai bên 25px để không bị khuất chữ nhãn ngoài biên
      const x = n > 1 ? (i / (n - 1)) * (chartWidth - 50) + 25 : 25;
      // Chừa lề trên dưới 20px
      const yRevenue = chartHeight - (item.revenue / maxVal) * (chartHeight - 40) - 20;
      const yExpense = chartHeight - (item.expense / maxVal) * (chartHeight - 40) - 20;
      return { x, yRevenue, yExpense, label: item.label, revenue: item.revenue, expense: item.expense };
    });

    const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, key: string) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const angleDeg = (angle * 180) / Math.PI;

      return (
        <View
          key={key}
          style={{
            position: 'absolute',
            left: x1,
            top: y1,
            width: length,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: `${angleDeg}deg` }],
            transformOrigin: 'left center',
          }}
        />
      );
    };

    return (
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>📈 Biểu đồ doanh thu & chi phí</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Thu</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#A0A0A0' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Chi</Text>
              </View>
            </View>
          </View>

          {/* Điều khiển Zoom */}
          <View style={[styles.zoomControls, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
              disabled={zoomLevel <= 1}
              style={[styles.zoomBtn, { opacity: zoomLevel <= 1 ? 0.3 : 1 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={14} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: colors.text }]}>{zoomLevel.toFixed(1)}x</Text>
            <TouchableOpacity
              onPress={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
              disabled={zoomLevel >= 3}
              style={[styles.zoomBtn, { opacity: zoomLevel >= 3 ? 0.3 : 1 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
          <View style={[styles.chartWrapper, { width: chartWidth, height: chartHeight + 35 }]}>
            {/* Đường lưới ngang */}
            <View style={[styles.gridLine, { top: 20, borderBottomColor: colors.border }]} />
            <View style={[styles.gridLine, { top: chartHeight / 2, borderBottomColor: colors.border }]} />
            <View style={[styles.gridLine, { top: chartHeight - 20, borderBottomColor: colors.border }]} />

            {/* Các phân đoạn đường nối */}
            {coords.map((curr, idx) => {
              if (idx === coords.length - 1) return null;
              const next = coords[idx + 1];
              return (
                <React.Fragment key={`lines-${idx}`}>
                  {drawLine(curr.x, curr.yRevenue, next.x, next.yRevenue, colors.primary, `line-rev-${idx}`)}
                  {drawLine(curr.x, curr.yExpense, next.x, next.yExpense, '#A0A0A0', `line-exp-${idx}`)}
                </React.Fragment>
              );
            })}

            {/* Các điểm nút và nhãn số liệu */}
            {coords.map((pt, idx) => (
              <React.Fragment key={`dots-${idx}`}>
                {/* Doanh thu */}
                <View
                  style={[
                    styles.dot,
                    {
                      left: pt.x - 4,
                      top: pt.yRevenue - 4,
                      backgroundColor: colors.primary,
                      borderColor: colors.backgroundElement,
                    },
                  ]}
                />
                {pt.revenue > 0 && showValText && (
                  <Text style={[styles.chartValText, { left: pt.x - 25, top: pt.yRevenue - 14, color: colors.text }]}>
                    {formatChartVal(pt.revenue)}
                  </Text>
                )}

                {/* Chi phí */}
                <View
                  style={[
                    styles.dot,
                    {
                      left: pt.x - 4,
                      top: pt.yExpense - 4,
                      backgroundColor: '#A0A0A0',
                      borderColor: colors.backgroundElement,
                    },
                  ]}
                />
                {pt.expense > 0 && showValText && (
                  <Text style={[styles.chartValText, { left: pt.x - 25, top: pt.yExpense - 14, color: colors.textSecondary }]}>
                    {formatChartVal(pt.expense)}
                  </Text>
                )}

                {/* Nhãn trục X */}
                {(showAllXLabels || idx === 0 || idx === n - 1 || (idx + 1) % 5 === 0) && (
                  <Text style={[styles.colLabel, { left: pt.x - 20, top: chartHeight + 8, color: colors.textSecondary }]}>
                    {pt.label}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const STATUS_LABELS: { [key: string]: string } = {
    pending: 'Chưa làm',
    completed: 'Đã xong',
    paid: 'Đã thanh toán',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Thống Kê Doanh Thu</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Period Selector Tabs */}
        <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
              <TouchableOpacity
                onPress={() => setStatsPeriod('today')}
                style={[
                  styles.filterTabBtn,
                  statsPeriod === 'today' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, statsPeriod === 'today' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Hôm nay
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStatsPeriod('custom')}
                style={[
                  styles.filterTabBtn,
                  statsPeriod === 'custom' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, statsPeriod === 'custom' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Chọn ngày
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStatsPeriod('range')}
                style={[
                  styles.filterTabBtn,
                  statsPeriod === 'range' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, statsPeriod === 'range' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Khoảng ngày
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStatsPeriod('week')}
                style={[
                  styles.filterTabBtn,
                  statsPeriod === 'week' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, statsPeriod === 'week' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Tuần này
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStatsPeriod('month')}
                style={[
                  styles.filterTabBtn,
                  statsPeriod === 'month' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, statsPeriod === 'month' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Tháng này
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStatsPeriod('year')}
                style={[
                  styles.filterTabBtn,
                  statsPeriod === 'year' && [styles.filterTabBtnActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[styles.filterTabBtnText, statsPeriod === 'year' ? styles.filterTabBtnTextActive : { color: colors.textSecondary }]}>
                  Năm nay
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Date Selector inputs */}
          {statsPeriod !== 'today' && statsPeriod !== 'range' && (
            <View style={styles.dateSelectorWrapper}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateSelectorBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.dateValueText, { color: colors.text }]}>
                  {statsPeriod === 'custom' && `Ngày thống kê: ${formatDate(statsDate)}`}
                  {statsPeriod === 'week' && (() => {
                    const { start, end } = getWeekRange(statsDate);
                    return `Tuần thống kê: ${formatDate(statsDate)} (Từ ${start.getDate()}/${start.getMonth() + 1} Đến ${end.getDate()}/${end.getMonth() + 1})`;
                  })()}
                  {statsPeriod === 'month' && `Tháng thống kê: Tháng ${statsDate.getMonth() + 1}/${statsDate.getFullYear()}`}
                  {statsPeriod === 'year' && `Năm thống kê: Năm ${statsDate.getFullYear()}`}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Range Date Selector */}
          {statsPeriod === 'range' && (
            <View style={[styles.dateSelectorWrapper, { flexDirection: 'row', gap: 8 }]}>
              <TouchableOpacity
                onPress={() => setShowRangeStartPicker(true)}
                style={[styles.dateSelectorBtn, { flex: 1, borderColor: colors.border }]}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Từ ngày</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{formatDate(rangeStartDate)}</Text>
                </View>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowRangeEndPicker(true)}
                style={[styles.dateSelectorBtn, { flex: 1, borderColor: colors.border }]}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Đến ngày</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{formatDate(rangeEndDate)}</Text>
                </View>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          selectedDate={statsDate}
          onSelectDate={setStatsDate}
          title="Chọn ngày thống kê"
        />

        {/* Range Start Date Picker */}
        <DatePickerModal
          visible={showRangeStartPicker}
          onClose={() => setShowRangeStartPicker(false)}
          selectedDate={rangeStartDate}
          onSelectDate={(date) => {
            if (date > rangeEndDate) {
              Alert.alert('Lỗi', 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
              return;
            }
            setRangeStartDate(date);
          }}
          title="Chọn ngày bắt đầu"
        />

        {/* Range End Date Picker */}
        <DatePickerModal
          visible={showRangeEndPicker}
          onClose={() => setShowRangeEndPicker(false)}
          selectedDate={rangeEndDate}
          onSelectDate={(date) => {
            if (date < rangeStartDate) {
              Alert.alert('Lỗi', 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
              return;
            }
            setRangeEndDate(date);
          }}
          title="Chọn ngày kết thúc"
        />

        {/* Date Picker Modal for Expense */}
        <DatePickerModal
          visible={showExpenseDatePicker}
          onClose={() => setShowExpenseDatePicker(false)}
          selectedDate={expenseDate}
          onSelectDate={setExpenseDate}
          title="Chọn ngày chi phí"
        />

        {/* Main Content Scroll */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Summary Box */}
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Tổng quan khoảng thời gian</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Doanh thu đã thu</Text>
                <Text style={[styles.summaryValue, { color: colors.success, fontSize: 16 }]}>{formatPrice(paidRevenue)}</Text>
                <Text style={[styles.summarySub, { color: colors.textSecondary }]}>{paidOrders.length} đơn đã thanh toán</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Chi phí phát sinh</Text>
                <Text style={[styles.summaryValue, { color: '#E28743', fontSize: 16 }]}>{formatPrice(totalExpenses)}</Text>
                <Text style={[styles.summarySub, { color: colors.textSecondary }]}>{filteredExpenses.length} khoản chi phí</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Lợi nhuận thực tế</Text>
                <Text style={[styles.summaryValue, { color: netProfit >= 0 ? colors.primary : '#FF4D4D', fontSize: 16 }]}>
                  {formatPrice(netProfit)}
                </Text>
                <Text style={[styles.summarySub, { color: colors.textSecondary }]}>Đã thu - Chi phí</Text>
              </View>
            </View>



            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.summaryTotalRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.totalLabel, { color: colors.text, fontSize: 12 }]}>Doanh thu chưa thu: <Text style={{ color: '#E28743', fontWeight: 'bold' }}>{formatPrice(unpaidRevenue)}</Text> ({unpaidOrders.length} đơn)</Text>
                <Text style={[styles.totalSub, { color: colors.textSecondary, fontSize: 11, marginTop: 4 }]}>Doanh thu dự kiến: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{formatPrice(totalRevenue)}</Text></Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Lợi nhuận dự kiến</Text>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                  {formatPrice(totalRevenue - totalExpenses)}
                </Text>
              </View>
            </View>
          </View>

          {/* Biểu đồ doanh thu */}
          {renderChart()}

          {/* Expenses Management Section */}
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginBottom: 20 }]}>
            <Text style={[styles.summaryTitle, { color: colors.text, marginBottom: 12 }]}>
              {editingExpenseId !== null ? 'Sửa chi phí đã chọn' : 'Quản lý Chi phí phát sinh'}
            </Text>

            {/* Form */}
            <View style={styles.expenseFormContainer}>
              <TextInput
                placeholder="Tên chi phí (Ví dụ: Mua rau, lấy đá, gas...)"
                placeholderTextColor={colors.textSecondary}
                value={expName}
                onChangeText={setExpName}
                style={[styles.expenseInput, { color: colors.text, borderColor: colors.border, fontSize: 16, marginBottom: 8 }]}
              />
              <View style={[styles.expenseFormRow, { marginBottom: 8 }]}>
                <TouchableOpacity
                  onPress={() => setShowExpenseDatePicker(true)}
                  style={[
                    styles.dateSelectorBtn,
                    {
                      borderColor: colors.border,
                      flex: 1,
                      height: 42,
                      alignItems: 'center',
                      flexDirection: 'row',
                      paddingHorizontal: 12,
                      marginTop: 0,
                    }
                  ]}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.dateValueText, { color: colors.text, fontSize: 14, flex: 1 }]}>
                    Ngày chi: {formatDate(expenseDate)}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.expenseFormRow}>
                <TextInput
                  placeholder="Số tiền chi phí (đ)"
                  placeholderTextColor={colors.textSecondary}
                  value={expAmount}
                  onChangeText={setExpAmount}
                  keyboardType="numeric"
                  style={[styles.expenseInput, { flex: 1, color: colors.text, borderColor: colors.border, fontSize: 16 }]}
                />

                {editingExpenseId !== null ? (
                  <>
                    <TouchableOpacity
                      onPress={handleSaveExpense}
                      style={[styles.expenseAddBtn, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                      <Text style={styles.expenseAddBtnText}>Lưu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCancelEdit}
                      style={[styles.expenseCancelBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.expenseCancelBtnText, { color: colors.textSecondary }]}>Hủy</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={handleSaveExpense}
                    style={[styles.expenseAddBtn, { backgroundColor: colors.success }]}
                  >
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={styles.expenseAddBtnText}>Thêm</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* List */}
            <View style={{ marginTop: 12 }}>
              {filteredExpenses.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontStyle: 'italic', fontSize: 12, textAlign: 'center', marginVertical: 8 }}>
                  Chưa có khoản chi phí nào phát sinh trong thời gian này.
                </Text>
              ) : (
                filteredExpenses.map((exp) => (
                  <View key={exp.id} style={[styles.expenseItemRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expenseItemName, { color: colors.text }]}>{exp.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{exp.timestamp}</Text>
                    </View>
                    <Text style={[styles.expenseItemAmount, { color: colors.primary }]}>-{formatPrice(exp.amount)}</Text>
                    <View style={styles.expenseActionsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingExpenseId(exp.id);
                          setExpName(exp.name);
                          setExpAmount(exp.amount.toString());
                          setExpenseDate(parseTimestamp(exp.timestamp));
                        }}
                        style={styles.expenseActionItemBtn}
                      >
                        <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteExpense(exp.id)}
                        style={styles.expenseActionItemBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    // Dynamic background color
  },
  filterTabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterTabBtnTextActive: {
    color: '#FFF',
  },
  dateSelectorWrapper: {
    paddingHorizontal: Spacing.three,
    marginTop: 12,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateValueText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summarySub: {
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  totalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  ordersList: {
    gap: 10,
  },
  orderItemRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderTableText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderTimeText: {
    fontSize: 11,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  expenseFormContainer: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  expenseFormRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  expenseInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expenseAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    gap: 4,
  },
  expenseAddBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expenseItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  expenseItemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  expenseCancelBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  expenseCancelBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  expenseActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  expenseActionItemBtn: {
    padding: 6,
  },

  // Custom Line Chart & Zoom Styles
  chartCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 2,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: 11,
    fontWeight: 'bold',
    minWidth: 26,
    textAlign: 'center',
  },
  chartScroll: {
    paddingBottom: 4,
  },
  chartWrapper: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.15,
  },
  chartCol: {
    position: 'absolute',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  chartValText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: 'bold',
    width: 50,
    textAlign: 'center',
  },
  colLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
});
