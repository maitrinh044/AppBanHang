import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Colors, Spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { MenuItem } from '../constants/menu';
import { storage } from '../config/firebase';

const formatPrice = (price?: number | null) => {
  return (Number(price) || 0).toLocaleString('vi-VN') + ' đ';
};

interface ManageDishesScreenProps {
  onBack: () => void;
}

export default function ManageDishesScreen({ onBack }: ManageDishesScreenProps) {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  
  const {
    menuItems,
    addMenuItem,
    editMenuItem,
    removeMenuItem,
    toggleMenuItemAvailability,
    setMenuItemDailyStock,
    getDishSoldToday,
    getDishRemainingStock,
  } = useCart();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState<'main' | 'extra' | 'drink'>('main');
  const [isAvailable, setIsAvailable] = useState(true);
  const [dailyStock, setDailyStock] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'extra' | 'drink'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'out_of_stock'>('all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Quick Stock Modal state & handlers
  const [stockModalItem, setStockModalItem] = useState<MenuItem | null>(null);
  const [quickStockValue, setQuickStockValue] = useState<string>('');

  const handleOpenStockModal = (item: MenuItem) => {
    setStockModalItem(item);
    // Hiển thị số suất CÒN LẠI (không phải tổng)
    const remaining = getDishRemainingStock(item);
    setQuickStockValue(remaining !== null ? String(remaining) : '');
  };

  const handleSaveQuickStock = async () => {
    if (!stockModalItem) return;
    const trimmed = quickStockValue.trim();
    if (trimmed === '') {
      await setMenuItemDailyStock(stockModalItem.id, undefined);
      showToast(`Đã bỏ giới hạn suất cho "${stockModalItem.name}"`);
    } else {
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed) || parsed < 0) {
        showToast('Vui lòng nhập số suất còn lại hợp lệ!');
        return;
      }
      // dailyStock = suất còn lại + đã bán hôm nay
      const soldToday = getDishSoldToday(stockModalItem.id);
      const newDailyStock = parsed + soldToday;
      await setMenuItemDailyStock(stockModalItem.id, newDailyStock);
      showToast(`Đã cài còn ${parsed} suất cho "${stockModalItem.name}"`);
    }
    setStockModalItem(null);
  };

  const handleToggleForm = () => {
    if (isAdding) {
      setIsAdding(false);
      setEditingItem(null);
      setName('');
      setPrice('');
      setImage('');
      setCategory('main');
      setIsAvailable(true);
      setDailyStock('');
    } else {
      setIsAdding(true);
    }
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;

        if (!storage) {
          // Firebase Storage chưa cấu hình → dùng URI cục bộ tạm thời
          setImage(uri);
          showToast('Ảnh đã chọn (chưa kết nối Firebase Storage)');
          return;
        }

        setIsUploading(true);
        showToast('Đang xử lý ảnh...');

        // Bước 1: Resize + nén ảnh về 500x500px, quality 60%
        // Giảm từ vài MB xuống còn ~50-100KB → upload nhanh hơn 10-50 lần!
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        showToast('Đang tải ảnh lên...');

        // Bước 2: Fetch blob từ ảnh đã tối ưu (nhỏ hơn nhiều)
        const response = await fetch(manipResult.uri);
        const blob = await response.blob();

        // Create unique path in Firebase Storage
        const fileName = `menu_images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const storageRef = ref(storage, fileName);

        // Upload to Firebase Storage
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        setImage(downloadURL);
        setIsUploading(false);
        showToast('Tải ảnh lên thành công!');
      }
    } catch (err) {
      console.error('Error picking/uploading image:', err);
      setIsUploading(false);
      showToast('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
    }
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(String(item.price));
    setImage(item.image);
    setCategory(item.category);
    setIsAvailable(item.isAvailable !== false);
    // Hiển thị số suất CÒN LẠI khi chỉnh sửa
    const remaining = getDishRemainingStock(item);
    setDailyStock(remaining !== null ? String(remaining) : '');
    setIsAdding(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 60);
  };

  const handleSubmitDish = () => {
    if (name.trim() === '') {
      showToast('Vui lòng nhập tên món ăn!');
      return;
    }
    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('Vui lòng nhập giá tiền hợp lệ!');
      return;
    }

    // Người dùng nhập số suất CÒN LẠI → tính ngược dailyStock = còn lại + đã bán
    let parsedStock: number | undefined = undefined;
    if (dailyStock.trim() !== '') {
      const remainingInput = parseInt(dailyStock, 10);
      if (!isNaN(remainingInput) && remainingInput >= 0) {
        const soldToday = editingItem ? getDishSoldToday(editingItem.id) : 0;
        parsedStock = remainingInput + soldToday;
      }
    }

    if (editingItem) {
      editMenuItem(editingItem.id, name, parsedPrice, image, category, isAvailable, parsedStock);
      showToast(`Đã sửa món "${name}" thành công!`);
    } else {
      addMenuItem(name, parsedPrice, image, category, isAvailable, parsedStock);
      showToast(`Đã thêm món "${name}" vào thực đơn!`);
    }
    
    // Clear inputs and close form
    setName('');
    setPrice('');
    setImage('');
    setCategory('main');
    setIsAvailable(true);
    setDailyStock('');
    setEditingItem(null);
    setIsAdding(false);
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
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Quản Lý Thực Đơn</Text>
            <TouchableOpacity
              onPress={handleToggleForm}
              style={[styles.addToggleBtn, { backgroundColor: isAdding ? '#FF4D4D' : colors.primary }]}
            >
              <Ionicons name={isAdding ? 'close' : 'add'} size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            

            {/* Create Dish Form (Collapsible) */}
            {isAdding && (
              <View style={[styles.formCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  {editingItem ? 'Chỉnh Sửa Món Ăn' : 'Tạo Món Ăn Mới'}
                </Text>
                
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tên món ăn</Text>
                <TextInput
                  placeholder="Ví dụ: Cơm tấm sườn bì chả"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  style={[styles.inputBox, { color: colors.text, borderColor: colors.border }]}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.two }]}>Giá bán (đ)</Text>
                <TextInput
                  placeholder="Ví dụ: 45000"
                  placeholderTextColor={colors.textSecondary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  style={[styles.inputBox, { color: colors.text, borderColor: colors.border }]}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.two }]}>Ảnh món ăn</Text>

                {/* Image Preview */}
                {image ? (
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <Image
                      source={{ uri: image }}
                      style={{ width: 100, height: 100, borderRadius: 12, marginBottom: 6 }}
                    />
                    <TouchableOpacity onPress={() => setImage('')}>
                      <Text style={{ color: '#FF4D4D', fontSize: 12 }}>✕ Xóa ảnh</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Pick from gallery button */}
                <TouchableOpacity
                  onPress={handlePickImage}
                  disabled={isUploading}
                  style={[styles.imagePickerBtn, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="image-outline" size={18} color={colors.primary} />
                  )}
                  <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13, marginLeft: 8 }}>
                    {isUploading ? 'Đang tải lên...' : 'Chọn ảnh từ điện thoại'}
                  </Text>
                </TouchableOpacity>

                {/* Fallback: manual URL input */}
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6, marginBottom: 2 }}>Hoặc dán link ảnh (URL):</Text>
                <TextInput
                  placeholder="https://..."
                  placeholderTextColor={colors.textSecondary}
                  value={image}
                  onChangeText={setImage}
                  style={[styles.inputBox, { color: colors.text, borderColor: colors.border }]}
                />



                {/* Category Selection dropdown-menu style pills */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.two }]}>Phân loại món</Text>
                <View style={styles.categorySelectorRow}>
                  {(['main', 'extra', 'drink'] as const).map((cat) => {
                    const label = cat === 'main' ? 'Món chính' : cat === 'extra' ? 'Món thêm' : 'Nước uống';
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={[
                          styles.categorySelectorBadge,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={{ color: isSelected ? '#FFF' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Daily Stock Limit Input */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.two }]}>
                  Số suất còn lại hôm nay (để trống nếu không giới hạn)
                </Text>
                <TextInput
                  placeholder="Ví dụ: 20 (còn 20 suất sẽ tự báo hết khi bán hết)"
                  placeholderTextColor={colors.textSecondary}
                  value={dailyStock}
                  onChangeText={setDailyStock}
                  keyboardType="numeric"
                  style={[styles.inputBox, { color: colors.text, borderColor: colors.border }]}
                />

                {/* Availability Toggle in Form */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.two }]}>
                  Trạng thái món
                </Text>
                <View style={styles.formAvailRow}>
                  <TouchableOpacity
                    onPress={() => setIsAvailable(true)}
                    style={[
                      styles.formAvailBtn,
                      {
                        backgroundColor: isAvailable ? '#DCFCE7' : colors.background,
                        borderColor: isAvailable ? '#16A34A' : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: '#16A34A' }]} />
                    <Text style={[styles.formAvailText, { color: isAvailable ? '#16A34A' : colors.textSecondary }]}>
                      Đang bán
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsAvailable(false)}
                    style={[
                      styles.formAvailBtn,
                      {
                        backgroundColor: !isAvailable ? '#FEE2E2' : colors.background,
                        borderColor: !isAvailable ? '#DC2626' : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: '#DC2626' }]} />
                    <Text style={[styles.formAvailText, { color: !isAvailable ? '#DC2626' : colors.textSecondary }]}>
                      Tạm hết món
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSubmitDish}
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.submitBtnText}>
                    {editingItem ? 'Lưu thay đổi' : 'Thêm món'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Category Filter Tabs */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.two }]}>Danh sách món ăn</Text>
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

            {/* Status Filter Tabs */}
            <View style={styles.statusFilterRow}>
              {[
                { key: 'all', label: `Tất cả (${menuItems.length})` },
                { key: 'available', label: '🟢 Đang bán' },
                { key: 'out_of_stock', label: '🔴 Tạm hết / Hết suất' },
              ].map((filter) => {
                const isActive = statusFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setStatusFilter(filter.key as any)}
                    style={[
                      styles.statusFilterChip,
                      {
                        backgroundColor: isActive ? colors.primary + '20' : colors.backgroundElement,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusFilterText,
                        { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? 'bold' : 'normal' },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dishesList}>
              {menuItems
                .filter((item) => activeTab === 'all' || item.category === activeTab)
                .filter((item) => {
                  const remaining = getDishRemainingStock(item);
                  const isOutOfStock = item.isAvailable === false || (remaining !== null && remaining <= 0);
                  if (statusFilter === 'available') return !isOutOfStock;
                  if (statusFilter === 'out_of_stock') return isOutOfStock;
                  return true;
                })
                .map((item) => {
                  const catLabel = item.category === 'main' ? 'Món chính' : item.category === 'extra' ? 'Món thêm' : 'Nước uống';
                  const catColor = item.category === 'main' ? '#FF5E36' : item.category === 'extra' ? '#2EC4B6' : '#3B82F6';
                  const soldToday = getDishSoldToday(item.id);
                  const remaining = getDishRemainingStock(item);
                  const isOutOfStock = item.isAvailable === false || (remaining !== null && remaining <= 0);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.dishCard,
                        {
                          backgroundColor: colors.backgroundElement,
                          borderColor: isOutOfStock ? '#FCA5A5' : colors.border,
                          opacity: item.isAvailable === false ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Image source={{ uri: item.image }} style={styles.dishImage} />
                      <View style={styles.dishInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.dishName, { color: colors.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={[styles.itemCategoryBadge, { backgroundColor: catColor + '20' }]}>
                            <Text style={{ color: catColor, fontSize: 9, fontWeight: 'bold' }}>{catLabel}</Text>
                          </View>
                        </View>

                        <Text style={[styles.dishPrice, { color: colors.primary }]}>{formatPrice(item.price)}</Text>

                        {/* Nút bấm hết món & Thông tin suất (nếu có) */}
                        <View style={styles.dishBadgeRow}>
                          <TouchableOpacity
                            onPress={() => {
                              const nextStatus = item.isAvailable === false ? true : false;
                              toggleMenuItemAvailability(item.id, nextStatus);
                              showToast(nextStatus ? `Đã mở bán lại "${item.name}"` : `Đã báo hết món "${item.name}"`);
                            }}
                            style={[
                              styles.quickAvailBtn,
                              {
                                backgroundColor: item.isAvailable === false ? '#DC2626' : '#FEE2E2',
                                borderColor: item.isAvailable === false ? '#B91C1C' : '#FCA5A5',
                              },
                            ]}
                          >
                            <Ionicons
                              name={item.isAvailable === false ? 'checkmark-circle' : 'ban-outline'}
                              size={13}
                              color={item.isAvailable === false ? '#FFF' : '#DC2626'}
                            />
                            <Text
                              style={[
                                styles.quickAvailText,
                                { color: item.isAvailable === false ? '#FFF' : '#DC2626' },
                              ]}
                            >
                              {item.isAvailable === false ? 'Mở bán lại' : 'Báo hết món'}
                            </Text>
                          </TouchableOpacity>

                          {/* Nút / Thẻ số suất bán hôm nay (Bấm để sửa nhanh) */}
                          <TouchableOpacity
                            onPress={() => handleOpenStockModal(item)}
                            style={[
                              styles.stockInfoBadge,
                              {
                                backgroundColor:
                                  item.dailyStock !== undefined && item.dailyStock !== null
                                    ? remaining !== null && remaining <= 0
                                      ? '#FEE2E2'
                                      : '#EFF6FF'
                                    : colors.background,
                                borderColor:
                                  item.dailyStock !== undefined && item.dailyStock !== null
                                    ? remaining !== null && remaining <= 0
                                      ? '#FCA5A5'
                                      : '#BFDBFE'
                                    : colors.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                item.dailyStock !== undefined && item.dailyStock !== null
                                  ? 'cube-outline'
                                  : 'add-circle-outline'
                              }
                              size={12}
                              color={
                                item.dailyStock !== undefined && item.dailyStock !== null
                                  ? remaining !== null && remaining <= 0
                                    ? '#DC2626'
                                    : '#2563EB'
                                  : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.stockInfoBadgeText,
                                {
                                  color:
                                    item.dailyStock !== undefined && item.dailyStock !== null
                                      ? remaining !== null && remaining <= 0
                                        ? '#DC2626'
                                        : '#2563EB'
                                      : colors.textSecondary,
                                },
                              ]}
                            >
                              {item.dailyStock !== undefined && item.dailyStock !== null
                                ? remaining !== null && remaining <= 0
                                  ? `Hết suất (${soldToday}/${item.dailyStock}) ✏️`
                                  : `Còn ${remaining}/${item.dailyStock} ✏️`
                                : '+ Cài suất'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => handleStartEdit(item)}
                        style={[styles.editBtn, { marginRight: 4 }]}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          removeMenuItem(item.id);
                          showToast(`Đã xóa món "${item.name}"`);
                        }}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Quick Stock Modal */}
      <Modal
        visible={!!stockModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setStockModalItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setStockModalItem(null)}
          />
          <View style={[styles.stockModalContent, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={styles.stockModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stockModalTitle, { color: colors.text }]} numberOfLines={1}>
                  {stockModalItem?.name}
                </Text>
                <Text style={[styles.stockModalSubtitle, { color: colors.textSecondary }]}>
                  Đã bán hôm nay: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{stockModalItem ? getDishSoldToday(stockModalItem.id) : 0}</Text> suất
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStockModalItem(null)} style={styles.stockModalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Số suất còn lại hôm nay:
            </Text>
            <View style={[styles.stockInputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.stockTextInput, { color: colors.text }]}
                placeholder="Ví dụ: 10 (để trống = không giới hạn)"
                placeholderTextColor={colors.textSecondary}
                value={quickStockValue}
                onChangeText={setQuickStockValue}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              {quickStockValue.length > 0 && (
                <TouchableOpacity onPress={() => setQuickStockValue('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick preset buttons — giá trị là số suất CÒN LẠI */}
            <View style={styles.quickStockPresetRow}>
              {[
                { label: 'Không giới hạn', val: '' },
                { label: 'Còn 3', val: '3' },
                { label: 'Còn 5', val: '5' },
                { label: 'Còn 10', val: '10' },
                { label: 'Còn 15', val: '15' },
                { label: 'Còn 20', val: '20' },
              ].map((preset) => {
                const isSelected = quickStockValue === preset.val;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    onPress={() => setQuickStockValue(preset.val)}
                    style={[
                      styles.stockPresetBtn,
                      {
                        backgroundColor: isSelected ? colors.primary + '20' : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockPresetBtnText,
                        { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? 'bold' : 'normal' },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.stockModalActionRow}>
              <TouchableOpacity
                onPress={() => setStockModalItem(null)}
                style={[styles.stockModalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.stockModalCancelText, { color: colors.textSecondary }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveQuickStock}
                style={[styles.stockModalSaveBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.stockModalSaveText}>Lưu số suất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  addToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },

  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inputBox: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },

  submitBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  dishesList: {
    gap: 10,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.two,
  },
  dishImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  dishInfo: {
    flex: 1,
    marginLeft: Spacing.two,
  },
  dishName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dishPrice: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  editBtn: {
    padding: 8,
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
  categorySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  categorySelectorBadge: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.three,
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
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  formAvailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  formAvailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  formAvailText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
  },
  statusFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusFilterText: {
    fontSize: 11,
  },
  dishBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  quickAvailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAvailText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  stockInfoBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockInfoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  stockModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  stockModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockModalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  stockModalCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  stockInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 6,
  },
  stockTextInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  quickStockPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  stockPresetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  stockPresetBtnText: {
    fontSize: 12,
  },
  stockModalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  stockModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockModalSaveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockModalSaveText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
