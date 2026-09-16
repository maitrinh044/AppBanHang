import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../context/CartContext';
import { getOrderWaitInfo, useCurrentTime } from '../utils/orderTime';

interface OrderTimeBadgeProps {
  order: Partial<Order>;
  now?: number;
  compact?: boolean;
  showIcon?: boolean;
  isTablet?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function OrderTimeBadge({
  order,
  now,
  compact = false,
  showIcon = true,
  isTablet = false,
  style,
  textStyle,
}: OrderTimeBadgeProps) {
  const localNow = useCurrentTime(now === undefined ? 15000 : 0);
  const currentNow = now ?? localNow;

  // Đơn đã làm xong hoặc đã thanh toán thì không hiển thị thời gian trễ
  if (order.status && order.status !== 'pending') {
    return null;
  }

  const waitInfo = getOrderWaitInfo(order, currentNow);
  const displayText = compact ? waitInfo.badgeLabel : waitInfo.detailLabel;

  if (!displayText) {
    return null;
  }

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: waitInfo.bgColor,
          borderColor: waitInfo.borderColor,
        },
        isTablet && styles.badgeTablet,
        waitInfo.urgency === 'late' && styles.lateShadow,
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={waitInfo.iconName}
          size={isTablet ? 18 : 13}
          color={waitInfo.color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: waitInfo.color },
          isTablet && styles.badgeTextTablet,
          waitInfo.urgency === 'late' && styles.lateText,
          textStyle,
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeTablet: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  icon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextTablet: {
    fontSize: 15,
  },
  lateShadow: {
    borderWidth: 1.5,
  },
  lateText: {
    fontWeight: '700',
  },
});
