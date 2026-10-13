export const DEFAULT_TABLES = [
  ...Array.from({ length: 14 }, (_, i) => `Bàn ${i + 1}`),
  'Mang về',
  'Vỉa hè',
  'Grab',
  'ShopeeFood',
];

export const DEFAULT_TABLE_DISCOUNTS: Record<string, number> = {
  'Grab': 20,
  'ShopeeFood': 25,
};
