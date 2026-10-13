import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useColorScheme,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { DEFAULT_TABLE_DISCOUNTS, DEFAULT_TABLES } from '../constants/tables';

interface DiscountConfigScreenProps {
  onBack: () => void;
}

export default function DiscountConfigScreen({ onBack }: DiscountConfigScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 600;

  const { tableDiscounts, setTableDiscount } = useCart();

  // Local state for editing discounts
  const [grabDiscount, setGrabDiscount] = useState<string>(
    String(tableDiscounts['Grab'] ?? DEFAULT_TABLE_DISCOUNTS['Grab'] ?? 20)
  );
  const [shopeeDiscount, setShopeeDiscount] = useState<string>(
    String(tableDiscounts['ShopeeFood'] ?? DEFAULT_TABLE_DISCOUNTS['ShopeeFood'] ?? 25)
  );

  // Other tables state
  const [showOtherTables, setShowOtherTables] = useState(false);
  const [otherDiscounts, setOtherDiscounts] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when tableDiscounts changes
  useEffect(() => {
    setGrabDiscount(String(tableDiscounts['Grab'] ?? DEFAULT_TABLE_DISCOUNTS['Grab'] ?? 20));
    setShopeeDiscount(String(tableDiscounts['ShopeeFood'] ?? DEFAULT_TABLE_DISCOUNTS['ShopeeFood'] ?? 25));

    const initialOthers: Record<string, string> = {};
    DEFAULT_TABLES.filter((t) => t !== 'Grab' && t !== 'ShopeeFood').forEach((t) => {
      initialOthers[t] = String(tableDiscounts[t] || 0);
    });
    setOtherDiscounts(initialOthers);
  }, [tableDiscounts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAdjust = (setter: React.Dispatch<React.SetStateAction<string>>, currentVal: string, delta: number) => {
    const currentNum = parseInt(currentVal, 10) || 0;
    const nextNum = Math.max(0, Math.min(100, currentNum + delta));
    setter(String(nextNum));
  };

  const handleSetQuick = (setter: React.Dispatch<React.SetStateAction<string>>, value: number) => {
    setter(String(value));
  };

  const calculatePreview = (percentStr: string, sampleAmount: number = 100000) => {
    const percent = Math.max(0, Math.min(100, parseInt(percentStr, 10) || 0));
    const discountAmount = Math.round((sampleAmount * percent) / 100);
    const netRevenue = Math.max(0, sampleAmount - discountAmount);
    return {
      percent,
      discountAmount,
      netRevenue,
    };
  };

  const handleSave = async () => {
    const grabNum = Math.max(0, Math.min(100, parseInt(grabDiscount, 10) || 0));
    const shopeeNum = Math.max(0, Math.min(100, parseInt(shopeeDiscount, 10) || 0));

    setIsSaving(true);
    try {
      await setTableDiscount('Grab', grabNum);
      await setTableDiscount('ShopeeFood', shopeeNum);

      // Save others if modified
      if (showOtherTables) {
        for (const [table, valStr] of Object.entries(otherDiscounts)) {
          const num = Math.max(0, Math.min(100, parseInt(valStr, 10) || 0));
          if (num !== (tableDiscounts[table] || 0)) {
            await setTableDiscount(table, num);
          }
        }
      }

      showToast('Đã lưu cấu hình chiết khấu thành công!');
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình chiết khấu:', err);
      Alert.alert('Lỗi', 'Không thể lưu cấu hình chiết khấu. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const confirmReset = () => {
      setGrabDiscount(String(DEFAULT_TABLE_DISCOUNTS['Grab'] ?? 20));
      setShopeeDiscount(String(DEFAULT_TABLE_DISCOUNTS['ShopeeFood'] ?? 25));
      showToast('Đã khôi phục mức chiết khấu mặc định (Grab: 20%, ShopeeFood: 25%)');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Khôi phục chiết khấu về mặc định (Grab 20%, ShopeeFood 25%)?')) {
        confirmReset();
      }
    } else {
      Alert.alert(
        'Khôi phục mặc định',
        'Khôi phục chiết khấu về giá trị ban đầu (Grab: 20%, ShopeeFood: 25%)?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Khôi phục', style: 'destructive', onPress: confirmReset },
        ]
      );
    }
  };

  const grabPreview = calculatePreview(grabDiscount);
  const shopeePreview = calculatePreview(shopeeDiscount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Cấu Hình Chiết Khấu</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Grab, ShopeeFood & Các kênh bán
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleResetDefaults}
          style={[styles.resetHeaderBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.resetHeaderBtnText, { color: colors.textSecondary }]}>Mặc định</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isTablet && { maxWidth: 720, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Information banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <View style={styles.infoBannerIcon}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.text }]}>Cơ chế tự động trừ chiết khấu</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              Khi thêm đơn hàng cho bàn <Text style={{ fontWeight: 'bold' }}>Grab</Text> hoặc <Text style={{ fontWeight: 'bold' }}>ShopeeFood</Text>, hệ thống sẽ tự động trừ đi tỷ lệ chiết khấu (hoa hồng) bên dưới. Doanh thu trong báo cáo sẽ phản ánh số tiền <Text style={{ fontWeight: 'bold' }}>thực nhận</Text> của quán.
            </Text>
          </View>
        </View>

        {/* 1. Grab Card */}
        <View style={[styles.channelCard, { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.channelLogoBadge, { backgroundColor: '#00B14F' }]}>
              <Ionicons name="bicycle" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.channelTitle}>Grab / GrabFood</Text>
                <View style={[styles.tagBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.tagBadgeText, { color: '#15803D' }]}>Kênh Giao Hàng</Text>
                </View>
              </View>
              <Text style={styles.channelSubtitle}>Mức chiết khấu hoa hồng của Grab</Text>
            </View>
            <View style={styles.percentDisplay}>
              <Text style={[styles.percentValue, { color: '#00B14F' }]}>{grabPreview.percent}%</Text>
            </View>
          </View>

          {/* Stepper + Input */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Tỷ lệ chiết khấu:</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => handleAdjust(setGrabDiscount, grabDiscount, -1)}
                style={styles.stepperBtn}
              >
                <Ionicons name="remove" size={18} color="#00B14F" />
              </TouchableOpacity>
              <TextInput
                style={[styles.stepperInput, { color: '#166534', borderColor: '#86EFAC' }]}
                keyboardType="numeric"
                value={grabDiscount}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9]/g, '');
                  if (clean === '' || parseInt(clean, 10) <= 100) {
                    setGrabDiscount(clean);
                  }
                }}
                maxLength={3}
                selectTextOnFocus
              />
              <Text style={styles.percentUnit}>%</Text>
              <TouchableOpacity
                onPress={() => handleAdjust(setGrabDiscount, grabDiscount, 1)}
                style={styles.stepperBtn}
              >
                <Ionicons name="add" size={18} color="#00B14F" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick choices */}
          <View style={styles.quickChoicesRow}>
            <Text style={styles.quickLabel}>Mức nhanh:</Text>
            {[15, 20, 25, 30].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => handleSetQuick(setGrabDiscount, val)}
                style={[
                  styles.quickChoiceBtn,
                  grabPreview.percent === val && { backgroundColor: '#00B14F', borderColor: '#00B14F' },
                ]}
              >
                <Text
                  style={[
                    styles.quickChoiceText,
                    grabPreview.percent === val && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}
                >
                  {val}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live Preview Box */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Minh họa tính toán (Đơn mẫu 100.000 đ):</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewItemLabel}>• Tổng tiền món:</Text>
              <Text style={styles.previewItemValue}>100.000 đ</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewItemLabel}>• Chiết khấu Grab ({grabPreview.percent}%):</Text>
              <Text style={[styles.previewItemValue, { color: '#DC2626' }]}>
                -{grabPreview.discountAmount.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotalRow]}>
              <Text style={styles.previewTotalLabel}>👉 Quán thực nhận (Doanh thu):</Text>
              <Text style={[styles.previewTotalValue, { color: '#00B14F' }]}>
                {grabPreview.netRevenue.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </View>

        {/* 2. ShopeeFood Card */}
        <View style={[styles.channelCard, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED', marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.channelLogoBadge, { backgroundColor: '#EE4D2D' }]}>
              <Ionicons name="bag-handle" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.channelTitle}>ShopeeFood</Text>
                <View style={[styles.tagBadge, { backgroundColor: '#FFEDD5' }]}>
                  <Text style={[styles.tagBadgeText, { color: '#C2410C' }]}>Kênh Giao Hàng</Text>
                </View>
              </View>
              <Text style={styles.channelSubtitle}>Mức chiết khấu hoa hồng của Shopee</Text>
            </View>
            <View style={styles.percentDisplay}>
              <Text style={[styles.percentValue, { color: '#EE4D2D' }]}>{shopeePreview.percent}%</Text>
            </View>
          </View>

          {/* Stepper + Input */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Tỷ lệ chiết khấu:</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => handleAdjust(setShopeeDiscount, shopeeDiscount, -1)}
                style={styles.stepperBtn}
              >
                <Ionicons name="remove" size={18} color="#EE4D2D" />
              </TouchableOpacity>
              <TextInput
                style={[styles.stepperInput, { color: '#9A3412', borderColor: '#FDBA74' }]}
                keyboardType="numeric"
                value={shopeeDiscount}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9]/g, '');
                  if (clean === '' || parseInt(clean, 10) <= 100) {
                    setShopeeDiscount(clean);
                  }
                }}
                maxLength={3}
                selectTextOnFocus
              />
              <Text style={styles.percentUnit}>%</Text>
              <TouchableOpacity
                onPress={() => handleAdjust(setShopeeDiscount, shopeeDiscount, 1)}
                style={styles.stepperBtn}
              >
                <Ionicons name="add" size={18} color="#EE4D2D" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick choices */}
          <View style={styles.quickChoicesRow}>
            <Text style={styles.quickLabel}>Mức nhanh:</Text>
            {[15, 20, 25, 30].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => handleSetQuick(setShopeeDiscount, val)}
                style={[
                  styles.quickChoiceBtn,
                  shopeePreview.percent === val && { backgroundColor: '#EE4D2D', borderColor: '#EE4D2D' },
                ]}
              >
                <Text
                  style={[
                    styles.quickChoiceText,
                    shopeePreview.percent === val && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}
                >
                  {val}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live Preview Box */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Minh họa tính toán (Đơn mẫu 100.000 đ):</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewItemLabel}>• Tổng tiền món:</Text>
              <Text style={styles.previewItemValue}>100.000 đ</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewItemLabel}>• Chiết khấu Shopee ({shopeePreview.percent}%):</Text>
              <Text style={[styles.previewItemValue, { color: '#DC2626' }]}>
                -{shopeePreview.discountAmount.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotalRow]}>
              <Text style={styles.previewTotalLabel}>👉 Quán thực nhận (Doanh thu):</Text>
              <Text style={[styles.previewTotalValue, { color: '#EE4D2D' }]}>
                {shopeePreview.netRevenue.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Expandable Section for Other Tables */}
        <View style={[styles.otherSection, { borderColor: colors.border, backgroundColor: colors.backgroundElement, marginTop: 16 }]}>
          <TouchableOpacity
            style={styles.otherSectionHeader}
            onPress={() => setShowOtherTables(!showOtherTables)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="options-outline" size={20} color={colors.primary} />
              <View>
                <Text style={[styles.otherSectionTitle, { color: colors.text }]}>Chiết khấu cho bàn khác (Tùy chọn)</Text>
                <Text style={[styles.otherSectionSubtitle, { color: colors.textSecondary }]}>
                  {showOtherTables ? 'Bấm để thu gọn' : 'Bấm để cấu hình chiết khấu cho Bàn 1..14, Mang về, Vỉa hè'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showOtherTables ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showOtherTables && (
            <View style={styles.otherTablesList}>
              <Text style={[styles.otherNote, { color: colors.textSecondary }]}>
                Nhập % chiết khấu (0-100) nếu bạn muốn tự động giảm giá cho bàn cụ thể:
              </Text>
              <View style={styles.tableGrid}>
                {DEFAULT_TABLES.filter((t) => t !== 'Grab' && t !== 'ShopeeFood').map((t) => (
                  <View key={t} style={[styles.tableGridItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.tableGridName, { color: colors.text }]} numberOfLines={1}>{t}</Text>
                    <View style={styles.tableGridInputRow}>
                      <TextInput
                        style={[styles.tableGridInput, { color: colors.text, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={otherDiscounts[t] || '0'}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          if (clean === '' || parseInt(clean, 10) <= 100) {
                            setOtherDiscounts((prev) => ({ ...prev, [t]: clean }));
                          }
                        }}
                        maxLength={3}
                        selectTextOnFocus
                      />
                      <Text style={[styles.tableGridPercent, { color: colors.textSecondary }]}>%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Chiết Khấu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.toastText, { color: colors.background }]}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoBannerIcon: {
    marginTop: 2,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  channelCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  channelLogoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  channelSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  percentDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  percentValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  stepperInput: {
    width: 48,
    height: 32,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 6,
    padding: 0,
    backgroundColor: '#FFFFFF',
  },
  percentUnit: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginRight: 4,
  },
  quickChoicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  quickLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  quickChoiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  quickChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  previewBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewItemLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  previewItemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  previewTotalRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  previewTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherSection: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  otherSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  otherSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  otherSectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  otherTablesList: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  otherNote: {
    fontSize: 12,
    marginBottom: 12,
    marginTop: 10,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tableGridItem: {
    width: '31%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  tableGridName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  tableGridInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableGridInput: {
    width: 36,
    height: 28,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    padding: 0,
  },
  tableGridPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
