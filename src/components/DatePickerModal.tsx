import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  title?: string;
  /** Khi true: render như overlay View tuyệt đối thay vì dùng <Modal> — dùng khi nằm bên trong một Modal khác */
  useInlineOverlay?: boolean;
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  title = 'Chọn ngày',
  useInlineOverlay = false,
}: DatePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getTime()));

  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(selected);
    onClose();
  };

  const generateDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const cells = [];

    // Pre-fill empty cells for days from previous month
    for (let i = 0; i < firstDay; i++) {
      cells.push({ id: `empty-${i}`, value: null });
    }

    // Fill days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ id: `day-${i}`, value: i });
    }

    return cells;
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const cells = generateDays();

  const content = (
    <View style={styles.overlay}>
      <View style={styles.container}>
        
        {/* Header */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Month Navigator */}
        <View style={styles.navigator}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            Tháng {currentMonth.getMonth() + 1} / {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdaysRow}>
          {weekdays.map((w, idx) => (
            <Text key={idx} style={styles.weekdayText}>
              {w}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <FlatList
          data={cells}
          keyExtractor={(item) => item.id}
          numColumns={7}
          scrollEnabled={false}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => {
            if (item.value === null) {
              return <View style={styles.dayCellEmpty} />;
            }
            const active = isSelected(item.value);
            const today = isToday(item.value);
            return (
              <TouchableOpacity
                onPress={() => handleSelectDay(item.value as number)}
                style={[
                  styles.dayCell,
                  active && styles.dayCellActive,
                  today && !active && styles.dayCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    active && styles.dayTextActive,
                    today && !active && styles.dayTextToday,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Đóng</Text>
        </TouchableOpacity>

      </View>
    </View>
  );

  if (useInlineOverlay) {
    if (!visible) return null;
    return <View style={styles.inlineOverlay}>{content}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inlineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  navigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navBtn: {
    padding: 8,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  weekdaysRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellEmpty: {
    width: 36,
    height: 36,
  },
  dayCellActive: {
    backgroundColor: '#FF5E36',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#FF5E36',
  },
  dayText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: '#FF5E36',
    fontWeight: 'bold',
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF5E36',
  },
});
