import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useColorScheme, Text, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartProvider } from './src/context/CartContext';
import HomeScreen from './src/screens/HomeScreen';
import AddOrderScreen from './src/screens/AddOrderScreen';
import ManageDishesScreen from './src/screens/ManageDishesScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import ActiveOrdersScreen from './src/screens/ActiveOrdersScreen';
import UnpaidOrdersScreen from './src/screens/UnpaidOrdersScreen';
import RevenueStatsScreen from './src/screens/RevenueStatsScreen';
import LoginScreen from './src/screens/LoginScreen';
import TableMapScreen from './src/screens/TableMapScreen';
import { Colors } from './src/constants/theme';
import { db } from './src/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { STAFF_PASSWORD, MANAGER_PASSWORD } from './src/config/auth';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import DiscountConfigScreen from './src/screens/DiscountConfigScreen';

type ScreenName = 'dashboard' | 'add_order' | 'table_map' | 'manage_dishes' | 'history' | 'active_orders' | 'unpaid_orders' | 'revenue_stats' | 'change_password' | 'discount_config';

function AppContent() {
  const systemScheme = useColorScheme();
  const colors = Colors[systemScheme === 'dark' ? 'dark' : 'light'];
  const [activeScreen, setActiveScreen] = useState<ScreenName>('dashboard');
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'staff' | 'manager' | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const [passwords, setPasswords] = useState({
    staff: STAFF_PASSWORD,
    manager: MANAGER_PASSWORD,
  });

  // Đồng bộ mật khẩu thời gian thực từ Firestore
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'settings', 'auth'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPasswords({
          staff: data.staffPassword || STAFF_PASSWORD,
          manager: data.managerPassword || MANAGER_PASSWORD,
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const checkLoginState = async () => {
      try {
        const loginTimeStr = await AsyncStorage.getItem('@pos_login_timestamp');
        if (loginTimeStr) {
          const loginTime = parseInt(loginTimeStr, 10);
          const oneDayInMs = 1 * 24 * 60 * 60 * 1000;
          if (Date.now() - loginTime < oneDayInMs) {
            const role = await AsyncStorage.getItem('@pos_user_role');
            if (role === 'staff' || role === 'manager') {
              setUserRole(role);
              return;
            }
          }
          // Đã hết hạn -> xóa bộ nhớ
          await AsyncStorage.removeItem('@pos_login_timestamp');
          await AsyncStorage.removeItem('@pos_user_role');
        }
        setUserRole(null);
      } catch (err) {
        console.error('Error checking login state:', err);
      } finally {
        setIsValidating(false);
      }
    };
    checkLoginState();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@pos_login_timestamp');
      await AsyncStorage.removeItem('@pos_user_role');
      setUserRole(null);
      setActiveScreen('dashboard'); // Trở về màn hình chính khi khóa app
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleConfirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
        handleLogout();
      }
    } else {
      Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất và khóa ứng dụng không?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng xuất', style: 'destructive', onPress: handleLogout },
        ]
      );
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const renderActiveScreen = () => {
    const isManager = userRole === 'manager';
    switch (activeScreen) {
      case 'dashboard':
        return (
          <HomeScreen
            userRole={userRole || 'staff'}
            onNavigateToAddOrder={() => {
              setSelectedTableForOrder(undefined);
              setActiveScreen('add_order');
            }}
            onNavigateToTableMap={() => setActiveScreen('table_map')}
            onNavigateToManageDishes={() => isManager ? setActiveScreen('manage_dishes') : null}
            onNavigateToHistory={() => isManager ? setActiveScreen('history') : null}
            onNavigateToActiveOrders={() => setActiveScreen('active_orders')}
            onNavigateToUnpaidOrders={() => setActiveScreen('unpaid_orders')}
            onNavigateToRevenueStats={() => isManager ? setActiveScreen('revenue_stats') : null}
            onNavigateToChangePassword={() => isManager ? setActiveScreen('change_password') : null}
            onNavigateToDiscountConfig={() => isManager ? setActiveScreen('discount_config') : null}
            onLogout={handleConfirmLogout}
          />
        );
      case 'table_map':
        return (
          <TableMapScreen
            onBack={() => setActiveScreen('dashboard')}
            onOrderForTable={(table) => {
              setSelectedTableForOrder(table);
              setActiveScreen('add_order');
            }}
          />
        );
      case 'add_order':
        return (
          <AddOrderScreen
            initialTable={selectedTableForOrder}
            onBack={(successMsg) => {
              setSelectedTableForOrder(undefined);
              setActiveScreen('dashboard');
              if (successMsg) triggerToast(successMsg);
            }}
          />
        );
      case 'manage_dishes':
        if (!isManager) return null;
        return <ManageDishesScreen onBack={() => setActiveScreen('dashboard')} />;
      case 'history':
        if (!isManager) return null;
        return <OrderHistoryScreen onBack={() => setActiveScreen('dashboard')} />;
      case 'active_orders':
        return <ActiveOrdersScreen onBack={() => setActiveScreen('dashboard')} />;
      case 'unpaid_orders':
        return <UnpaidOrdersScreen onBack={() => setActiveScreen('dashboard')} />;
      case 'revenue_stats':
        if (!isManager) return null;
        return <RevenueStatsScreen onBack={() => setActiveScreen('dashboard')} />;
      case 'change_password':
        if (!isManager) return null;
        return (
          <ChangePasswordScreen
            currentManagerPassword={passwords.manager}
            onBack={() => setActiveScreen('dashboard')}
          />
        );
      case 'discount_config':
        if (!isManager) return null;
        return <DiscountConfigScreen onBack={() => setActiveScreen('dashboard')} />;
      default:
        return (
          <HomeScreen
            userRole={userRole || 'staff'}
            onNavigateToAddOrder={() => {
              setSelectedTableForOrder(undefined);
              setActiveScreen('add_order');
            }}
            onNavigateToTableMap={() => setActiveScreen('table_map')}
            onNavigateToManageDishes={() => isManager ? setActiveScreen('manage_dishes') : null}
            onNavigateToHistory={() => isManager ? setActiveScreen('history') : null}
            onNavigateToActiveOrders={() => setActiveScreen('active_orders')}
            onNavigateToUnpaidOrders={() => setActiveScreen('unpaid_orders')}
            onNavigateToRevenueStats={() => isManager ? setActiveScreen('revenue_stats') : null}
            onNavigateToChangePassword={() => isManager ? setActiveScreen('change_password') : null}
            onNavigateToDiscountConfig={() => isManager ? setActiveScreen('discount_config') : null}
            onLogout={handleConfirmLogout}
          />
        );
    }
  };

  if (isValidating) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style={systemScheme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (userRole === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={systemScheme === 'dark' ? 'light' : 'dark'} />
        <LoginScreen onLoginSuccess={(role) => setUserRole(role)} currentPasswords={passwords} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={systemScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>

      {/* Global Toast */}
      {toastMessage && (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <Text style={[styles.toastText, { color: colors.background }]}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  // Load Ionicons from local assets/fonts/ so Vercel can serve it
  // (Vercel blocks any path containing 'node_modules')
  const [fontsLoaded, fontError] = useFonts({
    'ionicons': require('./assets/fonts/Ionicons.ttf'),
  });

  // Wait for fonts before rendering to avoid square icons on web
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
