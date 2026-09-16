// Thông tin cửa hàng hiển thị trên bill in — đọc từ biến môi trường .env
// Sao chép .env.example → .env và điền thông tin thực tế của cửa hàng

export const SHOP_NAME = process.env.EXPO_PUBLIC_SHOP_NAME ?? 'TÊN CỬA HÀNG';
export const SHOP_PHONE = process.env.EXPO_PUBLIC_SHOP_PHONE ?? '0xxx xxx xxx';
export const SHOP_ADDRESS = process.env.EXPO_PUBLIC_SHOP_ADDRESS ?? 'Địa chỉ cửa hàng';
export const SHOP_TAGLINE = process.env.EXPO_PUBLIC_SHOP_TAGLINE ?? 'Cảm ơn quý khách!';
