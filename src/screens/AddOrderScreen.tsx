import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';

const formatPrice = (price?: number | null) => {
  return (Number(price) || 0).toLocaleString('vi-VN') + ' đ';
};

const getShortName = (name: string) => {
  const short = name.replace(/^bánh canh\s+/i, '');
  return short.charAt(0).toUpperCase() + short.slice(1);
};

const TABLE_OPTIONS = [
  ...Array.from({ length: 14 }, (_, i) => `Bàn ${i + 1}`),
  'Mang về',
  'Vỉa hè'
];

interface AddOrderScreenProps {
  onBack: (successMsg?: string) => void;
  initialTable?: string;
}

export default function AddOrderScreen({ onBack, initialTable }: AddOrderScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const { menuItems, addOrder, getDishRemainingStock } = useCart();

  const [step, setStep] = useState<'table' | 'food'>(initialTable ? 'food' : 'table');
  const [tableNumber, setTableNumber] = useState(initialTable || '');
  const [note, setNote] = useState('');
  const [selectedVeg, setSelectedVeg] = useState<{ raw: boolean; boiled: boolean }>({ raw: false, boiled: false });
  
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [itemNotes, setItemNotes] = useState<{ [foodId: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'extra' | 'drink'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Responsive columns
  const tableCols = width > 1000 ? 6 : width > 600 ? 4 : 2;
  // isSplitLayout: true only for tablet/desktop (width >= 768) to prevent cramped split view on rotated phones
  const isSplitLayout = width >= 768;
  // Landscape: 3 cols only for screens with width >= 600. All others (including phones when keyboard shrinks height): 2 cols.
  const foodCols = (isLandscape && width >= 600) ? 3 : 2;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleUpdateQuantity = (foodId: string, delta: number) => {
    const item = menuItems.find((f) => f.id === foodId);
    if (!item) return;

    if (delta > 0) {
      if (item.isAvailable === false) {
        showToast(`Món "${item.name}" đã tạm hết hàng!`);
        return;
      }
      const remaining = getDishRemainingStock(item);
      if (remaining !== null) {
        const currentInCart = quantities[foodId] || 0;
        if (currentInCart >= remaining) {
          showToast(`Chỉ còn lại ${remaining} suất cho món "${item.name}"!`);
          return;
        }
      }
    }

    setQuantities((prev) => {
      const current = prev[foodId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [foodId]: next };
    });
  };

  const getSelectedItems = () => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([foodId, qty]) => ({
        foodId,
        quantity: qty,
      }));
  };

  const calculateTotal = () => {
    const selected = getSelectedItems();
    return selected.reduce((sum, item) => {
      const food = menuItems.find((f) => f.id === item.foodId);
      return sum + (food ? food.price * item.quantity : 0);
    }, 0);
  };

  const handleSaveOrder = async () => {
    const selected = getSelectedItems().map((item) => ({
      foodId: item.foodId,
      quantity: item.quantity,
      note: itemNotes[item.foodId] || undefined,
    }));
    if (selected.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 món ăn!');
      return;
    }

    // Kiểm tra chốt chặn số suất còn lại trước khi lưu đơn (tránh 2 máy cùng lưu vượt số lượng)
    const adjustedQuantities: { [key: string]: number } = { ...quantities };
    let hasStockIssue = false;
    let issueMessage = '';

    for (const orderItem of selected) {
      const food = menuItems.find((f) => f.id === orderItem.foodId);
      if (!food) continue;

      if (food.isAvailable === false) {
        hasStockIssue = true;
        adjustedQuantities[food.id] = 0;
        issueMessage = `Món "${food.name}" vừa hết hàng!`;
        break;
      }

      const remaining = getDishRemainingStock(food);
      if (remaining !== null && orderItem.quantity > remaining) {
        hasStockIssue = true;
        adjustedQuantities[food.id] = Math.max(0, remaining);
        if (remaining <= 0) {
          issueMessage = `Món "${food.name}" vừa hết suất do bàn khác đã đặt trước!`;
        } else {
          issueMessage = `Món "${food.name}" vừa được đặt trước, hiện chỉ còn lại ${remaining} suất!\n\nHệ thống đã tự động chỉnh lại số lượng trong đơn về ${remaining} suất.`;
        }
        break;
      }
    }

    if (hasStockIssue) {
      setQuantities(adjustedQuantities);
      if (Platform.OS === 'web') {
        alert(issueMessage);
      } else {
        Alert.alert('Số lượng không đủ', issueMessage);
      }
      return;
    }

    const tableLabel = tableNumber.trim() !== '' ? tableNumber.trim() : 'Mang về';
    
    const vegList: string[] = [];
    if (selectedVeg.raw) vegList.push('Rau sống');
    if (selectedVeg.boiled) vegList.push('Rau trụng');
    const vegNote = vegList.length > 0 ? `Rau: ${vegList.join(', ')}` : '';
    const finalNote = [note.trim(), vegNote].filter(Boolean).join(' - ');

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addOrder(tableLabel, selected, finalNote);
      onBack(`Đã lưu đơn hàng ${tableLabel} thành công!`);
    } catch (err) {
      console.error('Lỗi khi lưu đơn hàng:', err);
      showToast('Có lỗi xảy ra khi lưu đơn. Vui lòng thử lại!');
      setIsSubmitting(false);
    }
  };

  const totalAmount = calculateTotal();
  const selectedItemsCount = getSelectedItems().reduce((sum, item) => sum + item.quantity, 0);

  const handleBack = () => {
    if (step === 'food') {
      setStep('table');
    } else {
      onBack();
    }
  };

  const handleSelectTable = (label: string) => {
    setTableNumber(label);
    setStep('food');
  };

  const renderTableSelection = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.two }]}>Chọn vị trí / bàn</Text>
      <View style={styles.gridContainer}>
        {TABLE_OPTIONS.map((label) => {
          const isSelected = tableNumber === label;
          return (
            <View key={label} style={[styles.gridItem, { width: `${100 / tableCols}%` }]}>
              <TouchableOpacity
                onPress={() => handleSelectTable(label)}
                style={[
                  styles.tableCard,
                  { 
                    backgroundColor: isSelected ? colors.primary : colors.backgroundElement,
                    borderColor: isSelected ? colors.primary : colors.border
                  }
                ]}
              >
                <Text style={[
                  styles.tableCardText, 
                  { color: isSelected ? '#FFF' : colors.text }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      
      {/* Fallback input for custom table name if needed */}
      <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.four }]}>Hoặc nhập tên bàn/khách hàng khác:</Text>
      <View style={[styles.inputBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Nhập tên khách..."
          placeholderTextColor={colors.textSecondary}
          value={tableNumber}
          onChangeText={setTableNumber}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      {tableNumber.trim() !== '' && !TABLE_OPTIONS.includes(tableNumber) && (
        <TouchableOpacity
          onPress={() => setStep('food')}
          style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: Spacing.two, justifyContent: 'center' }]}
        >
          <Text style={styles.saveBtnText}>Tiếp tục chọn món</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderFoodGrid = () => (
    <>
      {/* Category Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(['all', 'main', 'extra', 'drink'] as const).map((tab) => {
          const label = tab === 'all' ? 'Tất cả' : tab === 'main' ? 'Món chính' : tab === 'extra' ? 'Món thêm' : 'Nước uống';
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? colors.primary : colors.backgroundElement,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterTabText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.gridContainer}>
        {menuItems
          .filter((item) => activeTab === 'all' || item.category === activeTab)
          .sort((a, b) => {
            if (activeTab !== 'all') return 0;
            const order = { main: 0, extra: 1, drink: 2 };
            return order[a.category] - order[b.category];
          })
          .map((item) => {
            const qty = quantities[item.id] || 0;
            const catLabel = item.category === 'main' ? 'Chính' : item.category === 'extra' ? 'Thêm' : 'Nước';
            const catColor = item.category === 'main' ? '#FF5E36' : item.category === 'extra' ? '#2EC4B6' : '#3B82F6';
            const remaining = getDishRemainingStock(item);
            const isOutOfStock = item.isAvailable === false || (remaining !== null && remaining <= 0);
            const outOfStockLabel = item.isAvailable === false ? 'TẠM HẾT' : 'HẾT SUẤT';

            return (
              <View key={item.id} style={[styles.gridItem, { width: `${100 / foodCols}%` }]}>
                <View
                  style={[
                    styles.foodCard,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: isOutOfStock ? '#FCA5A5' : colors.border,
                      opacity: isOutOfStock ? 0.65 : 1,
                    },
                  ]}
                >
                  <View style={styles.foodInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.foodName, { color: colors.text }]} numberOfLines={2}>
                        {getShortName(item.name)}
                      </Text>
                      <View style={[styles.itemCategoryBadge, { backgroundColor: catColor + '20' }]}>
                        <Text style={{ color: catColor, fontSize: 9, fontWeight: 'bold' }}>{catLabel}</Text>
                      </View>
                      {isOutOfStock ? (
                        <View style={styles.outOfStockBadge}>
                          <Text style={styles.outOfStockBadgeText}>{outOfStockLabel}</Text>
                        </View>
                      ) : remaining !== null ? (
                        <View style={styles.stockRemainBadge}>
                          <Text style={styles.stockRemainBadgeText}>Còn {remaining}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.foodPrice, { color: colors.primary }]}>{formatPrice(item.price)}</Text>
                    
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        onPress={() => handleUpdateQuantity(item.id, -1)}
                        style={[styles.qtyBtn, { borderColor: colors.border }]}
                      >
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>{qty}</Text>
                      <TouchableOpacity
                        onPress={() => handleUpdateQuantity(item.id, 1)}
                        style={[
                          styles.qtyBtn,
                          {
                            borderColor: colors.border,
                            opacity: isOutOfStock ? 0.4 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    
                    {qty > 0 ? (
                      <View style={styles.itemNoteInputBox}>
                        <TextInput
                          placeholder="Ghi chú (ít cay...)"
                          placeholderTextColor={colors.textSecondary}
                          value={itemNotes[item.id] || ''}
                          onChangeText={(val) => setItemNotes((prev) => ({ ...prev, [item.id]: val }))}
                          style={[styles.itemNoteInput, { color: colors.text, borderColor: colors.border }]}
                          autoComplete="off"
                          autoCorrect={false}
                          spellCheck={false}
                          textContentType="none"
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
      </View>
    </>
  );

  const renderFoodSelection = () => {
    if (isSplitLayout) {
      // ── SPLIT LAYOUT (landscape or tablet portrait): 70 / 30 ───────────
      return (
        <View style={styles.splitRow}>
          {/* LEFT PANEL 70% — food grid */}
          <View style={styles.splitLeft}>
            <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: Spacing.three }]}>
              Chọn món cho {tableNumber}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentLandscape}
            >
              {renderFoodGrid()}
            </ScrollView>
          </View>

          {/* RIGHT PANEL 30% — cart + total + save */}
          <View style={[styles.splitRight, { backgroundColor: colors.backgroundElement, borderLeftColor: colors.border }]}>
            {/* Note input */}
            <View style={{ paddingHorizontal: Spacing.two, paddingTop: Spacing.two }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Ghi chú</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border, height: 38 }]}>
                <TextInput
                  placeholder="Ít cay, không hành..."
                  placeholderTextColor={colors.textSecondary}
                  value={note}
                  onChangeText={setNote}
                  style={[styles.input, { color: colors.text, fontSize: 16 }]}
                  autoComplete="off"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                />
              </View>
            </View>

            {/* Lựa chọn rau */}
            <View style={{ paddingHorizontal: Spacing.two, marginTop: Spacing.two }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Lựa chọn rau</Text>
              <View style={styles.vegSelectionRow}>
                <TouchableOpacity
                  onPress={() => setSelectedVeg((prev) => ({ ...prev, raw: !prev.raw }))}
                  style={[
                    styles.vegCheckboxBtn,
                    { flex: 1, backgroundColor: colors.background, borderColor: selectedVeg.raw ? colors.primary : colors.border }
                  ]}
                >
                  <Ionicons
                    name={selectedVeg.raw ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={selectedVeg.raw ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.vegCheckboxText, { color: colors.text, fontSize: 13 }]}>Rau sống</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedVeg((prev) => ({ ...prev, boiled: !prev.boiled }))}
                  style={[
                    styles.vegCheckboxBtn,
                    { flex: 1, backgroundColor: colors.background, borderColor: selectedVeg.boiled ? colors.primary : colors.border }
                  ]}
                >
                  <Ionicons
                    name={selectedVeg.boiled ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={selectedVeg.boiled ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.vegCheckboxText, { color: colors.text, fontSize: 13 }]}>Rau trụng</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected items list header with clear button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.two, marginTop: Spacing.two }}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 13, marginVertical: 0 }]}>
                Đơn hàng ({selectedItemsCount} món)
              </Text>
              {getSelectedItems().length > 0 && (
                <TouchableOpacity
                  onPress={() => setQuantities({})}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="trash-outline" size={13} color="#FF4D4D" />
                  <Text style={{ color: '#FF4D4D', fontSize: 11, fontWeight: 'bold' }}>Xóa tất cả</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {getSelectedItems().length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20, fontSize: 12 }}>
                  Chưa chọn món nào
                </Text>
              ) : (
                getSelectedItems().map(({ foodId, quantity }) => {
                  const food = menuItems.find((f) => f.id === foodId);
                  if (!food) return null;
                  return (
                    <View
                      key={foodId}
                      style={[styles.cartItem, { borderBottomColor: colors.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold' }} numberOfLines={1}>
                          {getShortName(food.name)}
                        </Text>
                        <Text style={{ color: colors.primary, fontSize: 11 }}>
                          {formatPrice(food.price * quantity)}
                        </Text>
                        <TextInput
                          placeholder="Ghi chú (ít cay...)"
                          placeholderTextColor={colors.textSecondary}
                          value={itemNotes[foodId] || ''}
                          onChangeText={(val) => setItemNotes((prev) => ({ ...prev, [foodId]: val }))}
                          style={{
                            fontSize: 16,
                            color: colors.text,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 5,
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            marginTop: 3,
                          }}
                          autoComplete="off"
                          autoCorrect={false}
                          spellCheck={false}
                          textContentType="none"
                        />
                      </View>
                      <View style={styles.cartQtyRow}>
                        <TouchableOpacity
                          onPress={() => handleUpdateQuantity(foodId, -1)}
                          style={[styles.cartQtyBtn, { borderColor: colors.border }]}
                        >
                          <Ionicons name="remove" size={12} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.cartQtyText, { color: colors.text }]}>{quantity}</Text>
                        <TouchableOpacity
                          onPress={() => handleUpdateQuantity(foodId, 1)}
                          style={[styles.cartQtyBtn, { borderColor: colors.border }]}
                        >
                          <Ionicons name="add" size={12} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Total + Save */}
            <View style={[styles.cartFooter, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Tổng cộng</Text>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
                {formatPrice(totalAmount)}
              </Text>
              <TouchableOpacity
                onPress={handleSaveOrder}
                style={[styles.saveBtn, { backgroundColor: colors.primary, justifyContent: 'center' }]}
              >
                <Ionicons name="save-outline" size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>Lưu Đơn Hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // ── PORTRAIT: original single-column layout ───────────────────────
    return (
      <>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: Spacing.two }]}>Ghi chú chung cho đơn hàng</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border, marginBottom: Spacing.two }]}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Ví dụ: Ít cay, không hành, nhiều đá..."
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              style={[styles.input, { color: colors.text }]}
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              textContentType="none"
            />
          </View>

          {/* Lựa chọn rau */}
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 4, marginBottom: 8 }]}>Lựa chọn rau</Text>
          <View style={styles.vegSelectionRow}>
            <TouchableOpacity
              onPress={() => setSelectedVeg((prev) => ({ ...prev, raw: !prev.raw }))}
              style={[
                styles.vegCheckboxBtn,
                { backgroundColor: colors.backgroundElement, borderColor: selectedVeg.raw ? colors.primary : colors.border }
              ]}
            >
              <Ionicons
                name={selectedVeg.raw ? 'checkbox' : 'square-outline'}
                size={20}
                color={selectedVeg.raw ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.vegCheckboxText, { color: colors.text }]}>Rau sống</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedVeg((prev) => ({ ...prev, boiled: !prev.boiled }))}
              style={[
                styles.vegCheckboxBtn,
                { backgroundColor: colors.backgroundElement, borderColor: selectedVeg.boiled ? colors.primary : colors.border }
              ]}
            >
              <Ionicons
                name={selectedVeg.boiled ? 'checkbox' : 'square-outline'}
                size={20}
                color={selectedVeg.boiled ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.vegCheckboxText, { color: colors.text }]}>Rau trụng</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.three }]}>Chọn món ăn cho {tableNumber}</Text>
          {renderFoodGrid()}
        </ScrollView>

        {/* Bottom Total & Save action bar */}
        <View style={[styles.footer, { backgroundColor: colors.backgroundElement, borderTopColor: colors.border }]}>
          <View style={styles.totalContainer}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Đã chọn {selectedItemsCount} món</Text>
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>{formatPrice(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            onPress={handleSaveOrder}
            disabled={isSubmitting}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.saveBtnText}>Lưu Đơn Hàng</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {step === 'table' ? 'Chọn Vị Trí' : 'Tạo Đơn Hàng'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {step === 'table' ? renderTableSelection() : renderFoodSelection()}

        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Toast popup */}
      {toastMessage && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <Text style={[styles.toastText, { color: colors.background }]}>{toastMessage}</Text>
        </View>
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
  keyboardView: {
    flex: 1,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: Spacing.two,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridItem: {
    padding: 4,
  },
  tableCard: {
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tableCardText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  foodCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.two,
    flex: 1,
  },
  foodImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  foodInfo: {
    flex: 1,
    marginLeft: Spacing.two,
    justifyContent: 'space-between',
  },
  foodName: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
  },
  foodPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },
  splitLeft: {
    flex: 7,
  },
  splitRight: {
    flex: 3,
    borderLeftWidth: 1,
    flexDirection: 'column',
  },
  scrollContentLandscape: {
    paddingHorizontal: Spacing.two,
    paddingBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cartQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartQtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 6,
  },
  cartFooter: {
    padding: Spacing.two,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
  },
  totalContainer: {
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    bottom: 90,
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
  itemNoteInputBox: {
    marginTop: 6,
    width: '100%',
  },
  itemNoteInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.two,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vegSelectionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.two,
  },
  vegCheckboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  vegCheckboxText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  outOfStockBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  outOfStockBadgeText: {
    color: '#DC2626',
    fontSize: 8,
    fontWeight: '800',
  },
  stockRemainBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stockRemainBadgeText: {
    color: '#2563EB',
    fontSize: 8,
    fontWeight: '700',
  },
});
