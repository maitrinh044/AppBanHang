# 🍲 Bánh Canh POS — Hệ Thống Quản Lý Bán Hàng & Order Nhà Hàng

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20iOS%20%7C%20Android-blue" alt="Platforms" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

Ứng dụng quản lý bán hàng (Point of Sale - POS) chuyên biệt dành cho quán ăn và nhà hàng vừa & nhỏ. Được xây dựng trên nền tảng **React Native / Expo** và **Cloud Firestore**, hỗ trợ hoạt động mượt mà trên cả trình duyệt Web, máy tính bảng (Tablet) và điện thoại di động (iOS/Android).

---

## 🌟 Tính Năng Nổi Bật

### 1. 📋 Quản Lý Gọi Món & Bán Hàng (POS)
- **Menu trực quan:** Phân loại món ăn khoa học (*Món chính, Món thêm, Nước uống*) kèm hình ảnh sắc nét.
- **Giới hạn suất bán theo ngày:** Nhập số suất còn lại hôm nay, tự động trừ dần khi có đơn và báo hết món khi hết suất.
- **Ghi chú linh hoạt:** Cho phép thêm ghi chú cho từng món (*"ít ớt", "không hành"*) và ghi chú toàn đơn.

### 2. 👨‍🍳 Màn Hình Bếp Chờ Làm (Kitchen Display)
- Danh sách đơn hàng chờ chế biến dạng thẻ trượt (Slider), sắp xếp theo thứ tự đơn cũ làm trước.
- **Cảnh báo thông minh:** Tự động đổi viền đỏ và đếm thời gian khi đơn chờ quá 15 phút.

### 3. 🪑 Sơ Đồ Bàn Trực Quan (Table Map)
- Hiển thị sơ đồ bàn ăn với trạng thái màu sắc (*Bàn trống / Bàn đang có khách*).
- **Chuyển bàn & Gộp bàn:** Chuyển toàn bộ món từ bàn này sang bàn khác hoặc gộp hai bàn ăn lại với nhau chỉ trong 1 thao tác.

### 4. 📊 Báo Cáo Doanh Thu & Xuất File Excel Chuẩn
- Thống kê doanh thu theo ngày, tuần, tháng hoặc khoảng ngày tùy chọn.
- Quản lý chi phí nhập hàng ngày (*rau củ, gas, đá lạnh...*) $\rightarrow$ tự động tính **Lợi nhuận ròng (Thu - Chi)**.
- **Xuất Excel Table chính thức (`.xlsx`):** 
  - Tạo bảng chuẩn Microsoft Excel (`ListObject`) kèm định dạng màu sắc xen kẽ đẹp mắt.
  - Tích hợp sẵn nút lọc (Filter dropdown) trên từng cột.
  - Tự động dãn độ rộng cột và định dạng phân cách hàng nghìn (`#,##0 đ`).

### 5. 🔐 Phân Quyền & Bảo Mật OTP
- Hai cấp bậc quyền: **Nhân viên (Staff)** và **Quản lý (Manager)**.
- **Xác thực đổi mật khẩu qua OTP:** Tích hợp Google Apps Script tự động gửi mã OTP 6 số về Gmail của Admin khi có yêu cầu đổi mật khẩu.

### 6. ⚡ Chế Độ Demo Tự Động (Offline-Ready)
- Khi chạy thử mà chưa cấu hình Firebase, app **tự động chuyển sang Chế độ Demo**:
  - Nạp sẵn danh sách món ăn, đơn hàng chờ làm, đơn hoàn thành và chi phí mẫu.
  - Dữ liệu lưu cục bộ trên trình duyệt (LocalStorage / AsyncStorage) của người xem.
  - Nút **"Dữ liệu mẫu"** giúp khôi phục dữ liệu ban đầu bất cứ lúc nào.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** [React Native](https://reactnative.dev/) (v0.86), [Expo](https://expo.dev/) (SDK 57), [TypeScript](https://www.typescriptlang.org/)
- **Backend / Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Firebase Storage](https://firebase.google.com/docs/storage)
- **Xử lý File Excel:** [ExcelJS](https://github.com/exceljs/exceljs)
- **Lưu trữ Cục bộ:** [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage)
- **Triển khai Web:** [Vercel](https://vercel.com/)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử

### Yêu Cầu Hệ Thống
- [Node.js](https://nodejs.org/) (phiên bản 18 trở lên)
- Trình quản lý gói `npm` hoặc `yarn`

### 1. Tải Mã Nguồn Về Máy
```bash
git clone https://github.com/YOUR_USERNAME/AppBanHang.git
cd AppBanHang
```

### 2. Cài Đặt Thư Viện
```bash
npm install
```

### 3. Chạy Thử Ứng Dụng (Chế Độ Demo)
Bạn có thể khởi chạy app ngay lập tức ở chế độ Demo mà không cần tạo tài khoản Firebase:
```bash
# Chạy trên trình duyệt Web
npm run web

# Hoặc khởi động Expo CLI
npx expo start
```

---

## ⚙️ Cấu Hình Firebase (Khi Đưa Vào Kinh Doanh Thực Tế)

Nếu muốn đồng bộ dữ liệu thời gian thực giữa nhiều thiết bị qua Firebase:

1. Tạo một dự án trên [Firebase Console](https://console.firebase.google.com/) và kích hoạt **Cloud Firestore**.
2. Sao chép file cấu hình mẫu:
   ```bash
   cp .env.example .env
   ```
3. Mở file `.env` và điền các thông số Firebase của bạn:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Mật khẩu mặc định
   EXPO_PUBLIC_STAFF_PASSWORD=123456
   EXPO_PUBLIC_MANAGER_PASSWORD=000000

   # Thông tin cửa hàng
   EXPO_PUBLIC_SHOP_NAME=QUÁN ĂN CỦA BẠN
   EXPO_PUBLIC_SHOP_PHONE=0909 123 456
   EXPO_PUBLIC_SHOP_ADDRESS=Địa chỉ quán của bạn
   ```
4. Khởi động lại server dev (`npx expo start -c`) để nạp biến môi trường mới.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
AppBanHang/
├── assets/                 # Hình ảnh, icon, font chữ
├── src/
│   ├── components/         # Các component dùng chung (DatePicker, Badge, Modal...)
│   ├── config/             # Cấu hình Firebase, Shop, Auth
│   ├── constants/          # Menu mặc định, Sơ đồ bàn, Theme màu sắc, Demo data
│   ├── context/            # Quản lý State toàn cục (CartContext / Firestore Realtime)
│   ├── screens/            # Màn hình chính, Gọi món, Bếp, Báo cáo, Đổi mật khẩu...
│   └── utils/              # Tiện ích định dạng thời gian, tính giờ chờ đơn
├── .env.example            # Mẫu biến môi trường bảo mật
├── firebase.json           # Cấu hình dịch vụ Firebase
├── firestore.rules         # Quy tắc bảo mật Cloud Firestore
├── vercel.json             # Cấu hình triển khai tự động lên Vercel
└── package.json            # Danh sách dependencies và scripts
```

---

## 📄 Bản Quyền (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn được tự do sử dụng, chỉnh sửa và phát triển cho mục đích cá nhân hoặc thương mại.
