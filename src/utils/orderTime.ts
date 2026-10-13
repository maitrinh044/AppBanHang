import { useState, useEffect } from 'react';
import { Order } from '../context/CartContext';

/**
 * Tạo chuỗi timestamp chuẩn "HH:mm:ss dd/MM/yyyy" độc lập với locale của trình duyệt/thiết bị.
 * Tuyệt đối không bao giờ bị lệch SA/CH hay AM/PM.
 */
export function formatOrderTimestamp(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${hh}:${mm}:${ss} ${d}/${m}/${y}`;
}

/**
 * Trích xuất timestamp thành mili-giây chính xác tuyệt đối.
 * Ưu tiên dùng số createdAt (mili-giây chuẩn epoch) có sẵn trong đơn.
 * Nếu không có createdAt, dùng regex phân tích chuỗi timestamp (hỗ trợ cả SA/CH, AM/PM, ISO...).
 */
export function getOrderTimestampMs(order: { createdAt?: number; timestamp?: string }): number {
  if (typeof order.createdAt === 'number' && !isNaN(order.createdAt) && order.createdAt > 0) {
    return order.createdAt;
  }
  if (order.timestamp) {
    const str = String(order.timestamp).trim();

    // 1. Luôn ưu tiên định dạng chuẩn Việt Nam: dd/MM/yyyy (ví dụ: "14:30:00 01/09/2026" hoặc "01/09/2026")
    // KHÔNG BAO GIỜ dùng new Date(str) trước vì JavaScript coi ký tự '/' là MM/dd/yyyy theo chuẩn Mỹ,
    // làm đảo lộn ngày 1-12 thành các tháng 1-12 trong năm!
    const dateMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const timeMatch = str.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const year = parseInt(dateMatch[3], 10);

      let hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
      const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      const seconds = timeMatch && timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

      if (/CH|PM/i.test(str) && hours < 12) {
        hours += 12;
      } else if (/SA|AM/i.test(str) && hours === 12) {
        hours = 0;
      }

      const d = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // 2. Định dạng có dấu gạch ngang: yyyy-MM-dd hoặc dd-MM-yyyy
    const dashMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dashMatch) {
      const year = parseInt(dashMatch[1], 10);
      const month = parseInt(dashMatch[2], 10) - 1;
      const day = parseInt(dashMatch[3], 10);
      let hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
      const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      const seconds = timeMatch && timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const d = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // 3. Fallback cho chuỗi ISO 8601 hợp lệ
    const nativeTime = new Date(str).getTime();
    if (!isNaN(nativeTime)) return nativeTime;
  }
  return 0;
}

/**
 * Trả về đối tượng Date chuẩn từ đơn hàng.
 */
export function getOrderDate(order: { createdAt?: number; timestamp?: string }): Date {
  const ms = getOrderTimestampMs(order);
  return ms > 0 ? new Date(ms) : new Date();
}

/**
 * Kiểm tra xem đơn hàng có phải được tạo trong ngày hôm nay hay không.
 */
export function isOrderToday(order: { createdAt?: number; timestamp?: string }): boolean {
  const orderDate = getOrderDate(order);
  const today = new Date();
  return (
    orderDate.getDate() === today.getDate() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getFullYear() === today.getFullYear()
  );
}

/**
 * Kiểm tra 2 ngày có cùng ngày/tháng/năm hay không.
 */
export function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getDate() === dateB.getDate() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getFullYear() === dateB.getFullYear()
  );
}

/**
 * Returns the elapsed minutes from order creation to `now`.
 */
export function getOrderElapsedMinutes(order: Partial<Order>, now: number = Date.now()): number {
  const orderTimeMs = getOrderTimestampMs(order);
  if (orderTimeMs === 0) return 0;
  const diffMs = now - orderTimeMs;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 60000);
}

export type OrderWaitUrgency = 'normal' | 'warning' | 'late';

export interface OrderWaitInfo {
  elapsedMinutes: number;
  urgency: OrderWaitUrgency;
  badgeLabel: string; // e.g. "Vừa gọi", "Chờ 5p", "Trễ 18p"
  detailLabel: string; // e.g. "Vừa gọi (< 1 phút)", "Đã chờ 5 phút", "Trễ 18 phút"
  color: string;
  bgColor: string;
  borderColor: string;
  iconName: 'time-outline' | 'hourglass-outline' | 'alert-circle';
}

/**
 * Analyzes elapsed minutes and provides formatted display info and severity level.
 * - < 10 mins: Normal wait (Green)
 * - 10-14 mins: Warning wait (Amber/Orange)
 * - >= 15 mins: Late / Overdue (Red alert "Trễ X phút")
 */
export function getOrderWaitInfo(order: Partial<Order>, now: number = Date.now()): OrderWaitInfo {
  // Đơn đã làm xong (completed) hoặc đã thanh toán (paid) thì không hiển thị trễ
  if (order.status && order.status !== 'pending') {
    return {
      elapsedMinutes: 0,
      urgency: 'normal',
      badgeLabel: '',
      detailLabel: '',
      color: '#6B7280',
      bgColor: '#F3F4F6',
      borderColor: '#E5E7EB',
      iconName: 'time-outline',
    };
  }

  const elapsedMinutes = getOrderElapsedMinutes(order, now);
  const minutesText = elapsedMinutes < 1 ? '< 1m' : `${elapsedMinutes}m`;

  if (elapsedMinutes < 10) {
    return {
      elapsedMinutes,
      urgency: 'normal',
      badgeLabel: minutesText,
      detailLabel: minutesText,
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      iconName: 'time-outline',
    };
  }

  if (elapsedMinutes < 15) {
    return {
      elapsedMinutes,
      urgency: 'warning',
      badgeLabel: minutesText,
      detailLabel: minutesText,
      color: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      iconName: 'hourglass-outline',
    };
  }

  // Quá 15 phút (cần làm gấp) - chỉ hiển thị số phút (ví dụ 15m, 20m)
  return {
    elapsedMinutes,
    urgency: 'late',
    badgeLabel: minutesText,
    detailLabel: minutesText,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    iconName: 'alert-circle',
  };
}

/**
 * Hook to tick every `intervalMs` (default 15s) so elapsed time stays accurate in real-time.
 */
export function useCurrentTime(intervalMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
