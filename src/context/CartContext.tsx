import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MENU_ITEMS, MenuItem } from '../constants/menu';
import { getDemoOrders, getDemoExpenses } from '../constants/demoData';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

export interface OrderItem {
  foodId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  note?: string;
}

export type OrderStatus = 'pending' | 'completed' | 'paid';

export interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  timestamp: string;
  note?: string;
  createdAt?: number;
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  timestamp: string;
  createdAt?: number;
}

interface CartContextType {
  menuItems: MenuItem[];
  orders: Order[];
  expenses: Expense[];
  addMenuItem: (name: string, price: number, image: string, category: 'main' | 'extra' | 'drink', isAvailable?: boolean, dailyStock?: number) => Promise<void>;
  editMenuItem: (id: string, name: string, price: number, image: string, category: 'main' | 'extra' | 'drink', isAvailable?: boolean, dailyStock?: number) => Promise<void>;
  removeMenuItem: (id: string) => Promise<void>;
  toggleMenuItemAvailability: (id: string, isAvailable: boolean) => Promise<void>;
  setMenuItemDailyStock: (id: string, dailyStock: number | undefined) => Promise<void>;
  getDishSoldToday: (dishId: string) => number;
  getDishRemainingStock: (item: MenuItem) => number | null;
  addOrder: (tableNumber: string, items: Array<{ foodId: string; quantity: number; note?: string }>, note: string) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  updateOrderNote: (orderId: string, note: string) => Promise<void>;
  updateOrderItems: (orderId: string, items: OrderItem[], note?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  restoreOrder: (orderId: string) => Promise<void>;
  permanentlyDeleteOrder: (orderId: string) => Promise<void>;
  transferTable: (fromTableNumber: string, toTableNumber: string) => Promise<void>;
  mergeTables: (sourceTableNumber: string, targetTableNumber: string) => Promise<void>;
  resetMenuToDefault: () => Promise<void>;
  addExpense: (name: string, amount: number, customDate?: Date) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  editExpense: (id: string, name: string, amount: number, customDate?: Date) => Promise<void>;
  isDemoMode: boolean;
  resetDemoData: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Dynamically split test and production collections using react-native global __DEV__
const prefix = __DEV__ ? 'test_' : '';
const MENU_ITEMS_COL = `${prefix}menu_items`;
const ORDERS_COL = `${prefix}orders`;
const EXPENSES_COL = `${prefix}expenses`;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Tự động lưu vào AsyncStorage khi chạy ở chế độ Offline / Demo
  useEffect(() => {
    if (!db && isLoaded) {
      AsyncStorage.setItem('@pos_orders', JSON.stringify(orders)).catch(console.error);
    }
  }, [orders, isLoaded]);

  useEffect(() => {
    if (!db && isLoaded) {
      AsyncStorage.setItem('@pos_expenses', JSON.stringify(expenses)).catch(console.error);
    }
  }, [expenses, isLoaded]);

  useEffect(() => {
    if (!db && isLoaded) {
      AsyncStorage.setItem('@pos_menu_items', JSON.stringify(menuItems)).catch(console.error);
    }
  }, [menuItems, isLoaded]);

  // Load data and set up listeners
  useEffect(() => {
    if (!db) {
      // Local AsyncStorage fallback (Demo Mode)
      const loadPersistedData = async () => {
        try {
          const cachedMenu = await AsyncStorage.getItem('@pos_menu_items');
          const cachedOrders = await AsyncStorage.getItem('@pos_orders');
          const cachedExpenses = await AsyncStorage.getItem('@pos_expenses');
          
          if (cachedMenu !== null) {
            setMenuItems(JSON.parse(cachedMenu));
          } else {
            setMenuItems(MENU_ITEMS);
            await AsyncStorage.setItem('@pos_menu_items', JSON.stringify(MENU_ITEMS));
          }

          if (cachedOrders !== null) {
            setOrders(JSON.parse(cachedOrders));
          } else {
            // Nạp dữ liệu đơn hàng mẫu cho chế độ Demo lần đầu
            const demoOrders = getDemoOrders();
            setOrders(demoOrders);
            await AsyncStorage.setItem('@pos_orders', JSON.stringify(demoOrders));
          }

          if (cachedExpenses !== null) {
            setExpenses(JSON.parse(cachedExpenses));
          } else {
            // Nạp dữ liệu chi phí mẫu cho chế độ Demo lần đầu
            const demoExpenses = getDemoExpenses();
            setExpenses(demoExpenses);
            await AsyncStorage.setItem('@pos_expenses', JSON.stringify(demoExpenses));
          }
        } catch (error) {
          console.error('Error loading persistent cache data', error);
        } finally {
          setIsLoaded(true);
        }
      };

      loadPersistedData();
      return;
    }

    // Firebase live listeners
    console.log(`Setting up real-time Firebase listeners with collections: ${MENU_ITEMS_COL}, ${ORDERS_COL}`);
    
    // Subscribe to menu_items
    const unsubscribeMenu = onSnapshot(collection(db, MENU_ITEMS_COL), async (snapshot) => {
      if (snapshot.empty) {
        // Seed default menu items if Firestore is empty
        try {
          console.log(`Seeding default menu items to Firestore collection ${MENU_ITEMS_COL}...`);
          for (const item of MENU_ITEMS) {
            await setDoc(doc(db, MENU_ITEMS_COL, item.id), item);
          }
        } catch (err) {
          console.error("Failed to seed default menu items:", err);
        }
      } else {
        const items: MenuItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const defaultItem = MENU_ITEMS.find((m) => String(m.id) === String(docSnap.id));
          items.push({
            ...(defaultItem || {}),
            ...data,
            id: String(docSnap.id),
            name: data.name || defaultItem?.name || 'Món ăn',
            price: data.price !== undefined ? Number(data.price) : (defaultItem?.price || 0),
            image: data.image || defaultItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
            category: data.category || defaultItem?.category || 'main',
            isAvailable: data.isAvailable !== undefined ? data.isAvailable : (defaultItem?.isAvailable ?? true),
          } as MenuItem);
        });
        setMenuItems(items);
      }
    });

    // Subscribe to orders sorted by createdAt descending (giới hạn 500 đơn gần nhất để app luôn mượt)
    const qOrders = query(collection(db, ORDERS_COL), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ords: Order[] = [];
      snapshot.forEach((doc) => {
        ords.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ords);
    });

    // Subscribe to expenses sorted by createdAt descending (giới hạn 300 khoản chi gần nhất)
    const qExpenses = query(collection(db, EXPENSES_COL), orderBy('createdAt', 'desc'), limit(300));
    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      const exps: Expense[] = [];
      snapshot.forEach((docSnap) => {
        exps.push({ id: docSnap.id, ...docSnap.data() } as Expense);
      });
      setExpenses(exps);
      setIsLoaded(true);
    });

    return () => {
      unsubscribeMenu();
      unsubscribeOrders();
      unsubscribeExpenses();
    };
  }, []);

  // Save menuItems to AsyncStorage when modified (only in offline/local mode)
  useEffect(() => {
    if (!isLoaded || db) return;
    const saveMenu = async () => {
      try {
        await AsyncStorage.setItem('@pos_menu_items', JSON.stringify(menuItems));
      } catch (error) {
        console.error('Error saving menu to cache', error);
      }
    };
    saveMenu();
  }, [menuItems, isLoaded]);

  // Save orders to AsyncStorage when modified (only in offline/local mode)
  useEffect(() => {
    if (!isLoaded || db) return;
    const saveOrders = async () => {
      try {
        await AsyncStorage.setItem('@pos_orders', JSON.stringify(orders));
      } catch (error) {
        console.error('Error saving orders to cache', error);
      }
    };
    saveOrders();
  }, [orders, isLoaded]);

  // Save expenses to AsyncStorage when modified (only in offline/local mode)
  useEffect(() => {
    if (!isLoaded || db) return;
    const saveExpenses = async () => {
      try {
        await AsyncStorage.setItem('@pos_expenses', JSON.stringify(expenses));
      } catch (error) {
        console.error('Error saving expenses to cache', error);
      }
    };
    saveExpenses();
  }, [expenses, isLoaded]);

  const addMenuItem = async (
    name: string,
    price: number,
    image: string,
    category: 'main' | 'extra' | 'drink',
    isAvailable: boolean = true,
    dailyStock?: number
  ) => {
    const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
    const newFood: MenuItem = {
      id: `FOOD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      name,
      price,
      image: image.trim() !== '' ? image.trim() : defaultImage,
      category,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      ...(dailyStock !== undefined && dailyStock > 0 ? { dailyStock } : {}),
    };

    if (db) {
      try {
        await setDoc(doc(db, MENU_ITEMS_COL, newFood.id), newFood);
      } catch (err) {
        console.error("Error writing menu item to Firebase:", err);
      }
    } else {
      setMenuItems((prev) => [newFood, ...prev]);
    }
  };

  const editMenuItem = async (
    id: string,
    name: string,
    price: number,
    image: string,
    category: 'main' | 'extra' | 'drink',
    isAvailable: boolean = true,
    dailyStock?: number
  ) => {
    const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
    const hasStock = dailyStock !== undefined && dailyStock !== null && dailyStock >= 0;
    const finalStock = hasStock ? dailyStock : undefined;

    // Cập nhật state ngay lập tức (optimistic update)
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name,
              price,
              image: image.trim() !== '' ? image.trim() : defaultImage,
              category,
              isAvailable: isAvailable !== undefined ? isAvailable : true,
              dailyStock: finalStock,
            }
          : item
      )
    );

    if (db) {
      try {
        const firestoreUpdate: any = {
          name,
          price,
          image: image.trim() !== '' ? image.trim() : defaultImage,
          category,
          isAvailable: isAvailable !== undefined ? isAvailable : true,
          dailyStock: hasStock ? dailyStock : deleteField(),
        };
        await setDoc(doc(db, MENU_ITEMS_COL, id), firestoreUpdate, { merge: true });
      } catch (err) {
        console.error("Error updating menu item in Firebase:", err);
      }
    }
  };

  const toggleMenuItemAvailability = async (id: string, isAvailable: boolean) => {
    const stringId = String(id);
    const existing = menuItems.find((item) => String(item.id) === stringId) || MENU_ITEMS.find((m) => String(m.id) === stringId);

    // Cập nhật state ngay lập tức (so sánh String)
    setMenuItems((prev) =>
      prev.map((item) => (String(item.id) === stringId ? { ...item, isAvailable } : item))
    );

    if (db) {
      try {
        const fullData = {
          ...(existing || {}),
          id: stringId,
          isAvailable,
        };
        await setDoc(doc(db, MENU_ITEMS_COL, stringId), fullData, { merge: true });
      } catch (err) {
        console.error("Error updating menu item availability in Firebase:", err);
      }
    }
  };

  const setMenuItemDailyStock = async (id: string, dailyStock: number | undefined) => {
    const stringId = String(id);
    const existing = menuItems.find((item) => String(item.id) === stringId) || MENU_ITEMS.find((m) => String(m.id) === stringId);
    const hasStock = dailyStock !== undefined && dailyStock !== null && dailyStock >= 0;
    const finalStock = hasStock ? dailyStock : undefined;

    // Cập nhật state ngay lập tức
    setMenuItems((prev) =>
      prev.map((item) =>
        String(item.id) === stringId ? { ...item, dailyStock: finalStock } : item
      )
    );

    if (db) {
      try {
        const fullData: any = {
          ...(existing || {}),
          id: stringId,
          dailyStock: hasStock ? dailyStock : deleteField(),
        };
        await setDoc(doc(db, MENU_ITEMS_COL, stringId), fullData, { merge: true });
      } catch (err) {
        console.error("Error updating daily stock in Firebase:", err);
      }
    }
  };

  // Bảng đếm số suất đã bán hôm nay (tính toán nhanh 1 lần qua useMemo, tra cứu O(1))
  const todaySoldMap = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();
    const todayDateStr = new Date().toLocaleDateString('vi-VN');

    const map: Record<string, number> = {};
    for (const order of orders) {
      const isToday =
        (order.createdAt && order.createdAt >= startOfDayMs) ||
        (order.timestamp && order.timestamp.includes(todayDateStr));

      if (isToday) {
        for (const item of order.items) {
          map[item.foodId] = (map[item.foodId] || 0) + item.quantity;
        }
      }
    }
    return map;
  }, [orders]);

  const getDishSoldToday = (dishId: string): number => {
    return todaySoldMap[dishId] || 0;
  };

  const getDishRemainingStock = (item: MenuItem): number | null => {
    if (item.dailyStock === undefined || item.dailyStock === null || item.dailyStock < 0) {
      return null;
    }
    const sold = getDishSoldToday(item.id);
    return Math.max(0, item.dailyStock - sold);
  };

  const removeMenuItem = async (id: string) => {
    if (db) {
      try {
        await deleteDoc(doc(db, MENU_ITEMS_COL, id));
      } catch (err) {
        console.error("Error deleting menu item in Firebase:", err);
      }
    } else {
      setMenuItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const resetMenuToDefault = async () => {
    if (db) {
      try {
        console.log(`Resetting menu items in Firestore collection ${MENU_ITEMS_COL}...`);
        const snapshot = await getDocs(collection(db, MENU_ITEMS_COL));
        for (const document of snapshot.docs) {
          await deleteDoc(doc(db, MENU_ITEMS_COL, document.id));
        }
        for (const item of MENU_ITEMS) {
          await setDoc(doc(db, MENU_ITEMS_COL, item.id), item);
        }
      } catch (err) {
        console.error("Error resetting menu in Firebase:", err);
      }
    } else {
      setMenuItems(MENU_ITEMS);
    }
  };

  const addOrder = async (
    tableNumber: string,
    selectedItems: Array<{ foodId: string; quantity: number; note?: string }>,
    note: string
  ) => {
    const orderItems: OrderItem[] = selectedItems
      .map((selected) => {
        const food = menuItems.find((f) => f.id === selected.foodId);
        if (!food) return null;
        const item: OrderItem = {
          foodId: food.id,
          name: food.name,
          price: food.price,
          image: food.image,
          quantity: selected.quantity,
          note: selected.note,
        };
        return item;
      })
      .filter((item): item is OrderItem => item !== null);

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderCreatedAt = Date.now();
    const newOrder: Order = {
      id: `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      tableNumber: tableNumber.trim() !== '' ? tableNumber.trim() : 'Mang về',
      items: orderItems,
      total,
      status: 'pending',
      note: note.trim() !== '' ? note.trim() : undefined,
      timestamp: new Date(orderCreatedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' ' + new Date(orderCreatedAt).toLocaleDateString('vi-VN'),
      createdAt: orderCreatedAt,
    };

    // Cập nhật giao diện ngay lập tức (0ms delay)
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);

    if (db) {
      try {
        const firebaseOrderData = {
          ...newOrder,
          createdAt: orderCreatedAt,
        };
        const cleanData = JSON.parse(JSON.stringify(firebaseOrderData));
        await setDoc(doc(db, ORDERS_COL, newOrder.id), cleanData);
      } catch (err) {
        console.error("Error saving order to Firebase:", err);
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // Cập nhật giao diện ngay lập tức (0ms delay)
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );

    if (db) {
      try {
        await updateDoc(doc(db, ORDERS_COL, orderId), { status: newStatus });
      } catch (err) {
        console.error("Error updating order status in Firebase:", err);
      }
    }
  };

  const updateOrderNote = async (orderId: string, noteText: string) => {
    const formattedNote = noteText.trim() !== '' ? noteText.trim() : null;
    // Cập nhật giao diện ngay lập tức (0ms delay)
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, note: formattedNote || undefined } : order))
    );

    if (db) {
      try {
        await updateDoc(doc(db, ORDERS_COL, orderId), { note: formattedNote });
      } catch (err) {
        console.error("Error updating order note in Firebase:", err);
      }
    }
  };

  const updateOrderItems = async (orderId: string, items: OrderItem[], note?: string) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const update: Record<string, unknown> = { items, total };
    if (note !== undefined) update.note = note.trim() !== '' ? note.trim() : null;

    // Cập nhật giao diện ngay lập tức (0ms delay)
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, items, total, note: update.note as string | undefined } : order
      )
    );

    if (db) {
      try {
        await updateDoc(doc(db, ORDERS_COL, orderId), JSON.parse(JSON.stringify(update)));
      } catch (err) {
        console.error('Error updating order items in Firebase:', err);
      }
    }
  };

  const deleteOrder = async (orderId: string) => {
    const deletedAt = Date.now();
    // Cập nhật giao diện ngay lập tức (soft delete - ẩn khỏi UI)
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, isDeleted: true, deletedAt } : order
      )
    );

    if (db) {
      try {
        await updateDoc(doc(db, ORDERS_COL, orderId), { isDeleted: true, deletedAt });
      } catch (err) {
        console.error("Error soft-deleting order in Firebase:", err);
      }
    }
  };

  const restoreOrder = async (orderId: string) => {
    // Khôi phục đơn từ thùng rác
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, isDeleted: false, deletedAt: undefined } : order
      )
    );

    if (db) {
      try {
        await updateDoc(doc(db, ORDERS_COL, orderId), { isDeleted: false, deletedAt: deleteField() });
      } catch (err) {
        console.error("Error restoring order in Firebase:", err);
      }
    }
  };

  const permanentlyDeleteOrder = async (orderId: string) => {
    // Xóa vĩnh viễn (chỉ dùng từ màn hình Thùng rác, sau khi đã xác nhận)
    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    if (db) {
      try {
        await deleteDoc(doc(db, ORDERS_COL, orderId));
      } catch (err) {
        console.error("Error permanently deleting order in Firebase:", err);
      }
    }
  };

  const transferTable = async (fromTableNumber: string, toTableNumber: string) => {
    const affectedOrders = orders.filter(
      (o) => o.tableNumber === fromTableNumber && o.status !== 'paid'
    );

    if (affectedOrders.length === 0) return;

    // Cập nhật giao diện ngay lập tức (0ms delay)
    setOrders((prev) =>
      prev.map((order) =>
        order.tableNumber === fromTableNumber && order.status !== 'paid'
          ? { ...order, tableNumber: toTableNumber }
          : order
      )
    );

    if (db) {
      try {
        for (const order of affectedOrders) {
          await updateDoc(doc(db, ORDERS_COL, order.id), {
            tableNumber: toTableNumber,
          });
        }
      } catch (err) {
        console.error("Error transferring table in Firebase:", err);
      }
    }
  };

  const mergeTables = async (sourceTableNumber: string, targetTableNumber: string) => {
    const sourceOrders = orders.filter(
      (o) => o.tableNumber === sourceTableNumber && o.status !== 'paid'
    );
    const targetOrders = orders.filter(
      (o) => o.tableNumber === targetTableNumber && o.status !== 'paid'
    );

    if (sourceOrders.length === 0) return;

    const sourceItems: OrderItem[] = [];
    const sourceNotes: string[] = [];
    sourceOrders.forEach((o) => {
      sourceItems.push(...o.items);
      if (o.note) sourceNotes.push(o.note);
    });

    if (targetOrders.length > 0) {
      const primaryTargetOrder = targetOrders[0];
      const mergedItems: OrderItem[] = primaryTargetOrder.items.map((i) => ({ ...i }));

      sourceItems.forEach((sItem) => {
        const existing = mergedItems.find(
          (m) => m.foodId === sItem.foodId && (m.note || '') === (sItem.note || '')
        );
        if (existing) {
          existing.quantity += sItem.quantity;
        } else {
          mergedItems.push({ ...sItem });
        }
      });

      const newTotal = mergedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const combinedNoteParts = [
        primaryTargetOrder.note,
        sourceNotes.length > 0 ? `[Gộp từ ${sourceTableNumber}]: ${sourceNotes.join('; ')}` : '',
      ].filter(Boolean);
      const newNote = combinedNoteParts.join(' | ') || undefined;

      // Cập nhật giao diện ngay lập tức (0ms delay)
      const sourceIds = new Set(sourceOrders.map((o) => o.id));
      setOrders((prev) =>
        prev
          .filter((o) => !sourceIds.has(o.id))
          .map((o) =>
            o.id === primaryTargetOrder.id
              ? { ...o, items: mergedItems, total: newTotal, note: newNote }
              : o
          )
      );

      if (db) {
        try {
          await updateDoc(doc(db, ORDERS_COL, primaryTargetOrder.id), {
            items: mergedItems,
            total: newTotal,
            note: newNote || null,
          });
          // Soft delete các đơn nguồn sau khi gộp bàn
          const mergedAt = Date.now();
          for (const sOrder of sourceOrders) {
            await updateDoc(doc(db, ORDERS_COL, sOrder.id), { isDeleted: true, deletedAt: mergedAt });
          }
        } catch (err) {
          console.error("Error merging tables in Firebase:", err);
        }
      }
    } else {
      await transferTable(sourceTableNumber, targetTableNumber);
    }
  };

  const addExpense = async (name: string, amount: number, customDate?: Date) => {
    const now = new Date();
    const targetTime = customDate
      ? new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
      : now;

    const timeStr = targetTime.toLocaleTimeString('vi-VN', { hour12: false });
    const dateStr = targetTime.toLocaleDateString('vi-VN').replace(/\//g, '/');
    const fullTimestamp = `${timeStr} ${dateStr}`;

    const newExpense: Expense = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      amount,
      timestamp: fullTimestamp,
      createdAt: targetTime.getTime(),
    };

    // Cập nhật giao diện ngay lập tức (0ms delay)
    setExpenses((prev) => [newExpense, ...prev.filter((e) => e.id !== newExpense.id)]);

    if (db) {
      try {
        await setDoc(doc(db, EXPENSES_COL, newExpense.id), newExpense);
      } catch (err) {
        console.error("Error saving expense to Firebase:", err);
      }
    }
  };

  const deleteExpense = async (id: string) => {
    // Cập nhật giao diện ngay lập tức (0ms delay)
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));

    if (db) {
      try {
        await deleteDoc(doc(db, EXPENSES_COL, id));
      } catch (err) {
        console.error("Error deleting expense in Firebase:", err);
      }
    }
  };

  const editExpense = async (id: string, name: string, amount: number, customDate?: Date) => {
    let updateFields: any = {
      name: name.trim(),
      amount,
    };

    let targetTime: Date | null = null;
    if (customDate) {
      const now = new Date();
      targetTime = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
      const timeStr = targetTime.toLocaleTimeString('vi-VN', { hour12: false });
      const dateStr = targetTime.toLocaleDateString('vi-VN').replace(/\//g, '/');
      updateFields.timestamp = `${timeStr} ${dateStr}`;
      updateFields.createdAt = targetTime.getTime();
    }

    // Cập nhật giao diện ngay lập tức (0ms delay)
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updateFields } : exp))
    );

    if (db) {
      try {
        await updateDoc(doc(db, EXPENSES_COL, id), updateFields);
      } catch (err) {
        console.error("Error updating expense in Firebase:", err);
      }
    }
  };

  return (
    <CartContext.Provider
      value={{
        menuItems,
        orders,
        expenses,
        addMenuItem,
        editMenuItem,
        removeMenuItem,
        toggleMenuItemAvailability,
        setMenuItemDailyStock,
        getDishSoldToday,
        getDishRemainingStock,
        addOrder,
        updateOrderStatus,
        updateOrderNote,
        updateOrderItems,
        deleteOrder,
        restoreOrder,
        permanentlyDeleteOrder,
        transferTable,
        mergeTables,
        resetMenuToDefault,
        addExpense,
        deleteExpense,
        editExpense,
        isDemoMode: !db,
        resetDemoData: async () => {
          const demoOrders = getDemoOrders();
          const demoExpenses = getDemoExpenses();
          setOrders(demoOrders);
          setExpenses(demoExpenses);
          setMenuItems(MENU_ITEMS);
          await AsyncStorage.setItem('@pos_orders', JSON.stringify(demoOrders));
          await AsyncStorage.setItem('@pos_expenses', JSON.stringify(demoExpenses));
          await AsyncStorage.setItem('@pos_menu_items', JSON.stringify(MENU_ITEMS));
        },
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
