import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// HƯỚNG DẪN CẤU HÌNH FIREBASE:
// 1. Sao chép file .env.example thành .env
// 2. Điền thông tin Firebase project của bạn vào .env
// 3. File .env đã được .gitignore — không bao giờ push lên git

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let db: any = null;
let storage: any = null;

try {
  if (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  ) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // ⚡ TỐI ƯU TỐC ĐỘ - Chiến lược "stale-while-revalidate":
    //
    // 1. persistentLocalCache + persistentMultipleTabManager:
    //    Lưu dữ liệu vào IndexedDB (ổ đĩa cục bộ) sau mỗi lần đồng bộ.
    //    Khi reload trang: hiện dữ liệu cũ từ cache NGAY LẬP TỨC (không cần chờ server),
    //    rồi tự động cập nhật trong nền khi kết nối Firebase xong.
    //    → Người dùng KHÔNG thấy màn hình trắng, dữ liệu hiện ra tức thì.
    //    persistentMultipleTabManager: Cho phép nhiều tab/thiết bị dùng chung cache
    //    mà không bị xung đột dữ liệu.
    //
    // 2. experimentalAutoDetectLongPolling: true
    //    Ưu tiên WebSocket thay vì long-polling → cập nhật realtime nhanh hơn.
    //
    // 3. useFetchStreams: false (Web only)
    //    Buộc dùng XHR thay vì Fetch Streams API không ổn định trên mobile web.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: true,
      ...(Platform.OS === 'web' ? { useFetchStreams: false } : {}),
    });

    storage = getStorage(app);
    console.log('🔥 Đã kết nối Firebase Firestore + Storage (cache bền vững + tốc độ cao)!');
  } else {
    console.warn('⚠️ Firebase chưa được cấu hình. Ứng dụng sẽ hoạt động offline qua bộ nhớ máy (AsyncStorage).');
  }
} catch (error) {
  console.error('❌ Lỗi khởi tạo Firebase:', error);
}

export { db, storage };
