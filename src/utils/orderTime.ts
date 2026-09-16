import { useState, useEffect } from 'react';
import { Order } from '../context/CartContext';

/**
 * Extracts order timestamp in milliseconds.
 * Checks order.createdAt first, then parses order.timestamp string ("HH:mm:ss dd/mm/yyyy").
 */
export function getOrderTimestampMs(order: Partial<Order>): number {
  if (typeof order.createdAt === 'number' && !isNaN(order.createdAt) && order.createdAt > 0) {
    return order.createdAt;
  }
  if (order.timestamp) {
    const parts = order.timestamp.trim().split(/\s+/);
    if (parts.length >= 2) {
      const timeParts = parts[0].split(':');
      const dateParts = parts[1].split('/');
      if (dateParts.length === 3 && timeParts.length >= 2) {
        const d = new Date(
          parseInt(dateParts[2], 10),
          parseInt(dateParts[1], 10) - 1,
          parseInt(dateParts[0], 10),
          parseInt(timeParts[0], 10),
          parseInt(timeParts[1], 10),
          timeParts[2] ? parseInt(timeParts[2], 10) : 0
        );
        if (!isNaN(d.getTime())) return d.getTime();
      }
    }
  }
  return Date.now();
}

/**
 * Returns the elapsed minutes from order creation to `now`.
 */
export function getOrderElapsedMinutes(order: Partial<Order>, now: number = Date.now()): number {
  const orderTimeMs = getOrderTimestampMs(order);
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

