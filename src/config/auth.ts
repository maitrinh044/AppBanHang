// MẬT KHẨU TRUY CẬP MẶC ĐỊNH — đọc từ biến môi trường .env
// Sao chép .env.example → .env và điền giá trị thực tế
export const STAFF_PASSWORD = process.env.EXPO_PUBLIC_STAFF_PASSWORD ?? '123456';
export const MANAGER_PASSWORD = process.env.EXPO_PUBLIC_MANAGER_PASSWORD ?? '000000';

// EMAIL NHẬN OTP KHI THAY ĐỔI MẬT KHẨU
export const ADMIN_GMAIL = process.env.EXPO_PUBLIC_ADMIN_GMAIL ?? '';

// ĐƯỜNG DẪN GOOGLE APPS SCRIPT WEB APP (để gửi Email OTP)
// Đọc hướng dẫn cài đặt tại walkthrough.md
export const GOOGLE_SCRIPT_URL = process.env.EXPO_PUBLIC_GOOGLE_SCRIPT_URL ?? '';
