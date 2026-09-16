import { Order } from '../context/CartContext';
import { Expense } from '../context/CartContext';

const formatTs = (date: Date): string => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${hh}:${mm}:${ss} ${d}/${m}/${y}`;
};

export const getDemoOrders = (): Order[] => {
  const now = new Date();

  // Đơn 1: Đang phục vụ tại Bàn 2 (chờ làm ~5 phút trước)
  const t1 = new Date(now.getTime() - 5 * 60 * 1000);
  const order1: Order = {
    id: 'DEMO-001',
    tableNumber: 'Bàn 2',
    status: 'pending',
    timestamp: formatTs(t1),
    createdAt: t1.getTime(),
    note: 'Không hành tây',
    total: 95000,
    items: [
      {
        foodId: '1',
        name: 'Bánh canh chả cá',
        price: 35000,
        quantity: 2,
        image: 'https://i.ibb.co/ZbD3RPH/IMG-4901.jpg',
        note: 'Ít ớt',
      },
      {
        foodId: '10',
        name: 'Trà đào cam sả',
        price: 25000,
        quantity: 1,
        image: 'https://i.ibb.co/6R57f0yS/z7788487707412-2826cfd4e92a2a07d4b4a3901b0b7593.jpg',
      },
    ],
  };

  // Đơn 2: Đang phục vụ tại Bàn 5 (chờ làm ~18 phút trước - cảnh báo quá 15 phút)
  const t2 = new Date(now.getTime() - 18 * 60 * 1000);
  const order2: Order = {
    id: 'DEMO-002',
    tableNumber: 'Bàn 5',
    status: 'pending',
    timestamp: formatTs(t2),
    createdAt: t2.getTime(),
    total: 65000,
    items: [
      {
        foodId: '4',
        name: 'Bánh canh thập cẩm',
        price: 50000,
        quantity: 1,
        image: 'https://i.ibb.co/RpDnBRjd/z7788675664873-217520f03bdad37bb04a6dc8c86eb4ff.jpg',
        note: 'Nhiều hành phi',
      },
      {
        foodId: '8',
        name: 'Nước sâm',
        price: 15000,
        quantity: 1,
        image: 'https://i.ibb.co/VcxQ1JtY/z7788494883446-0c6ad6d6b1d4411129994c63bf9f4305.jpg',
      },
    ],
  };

  // Đơn 3: Hoàn thành tại Bàn 1 (hôm nay lúc sáng)
  const t3 = new Date(now.getTime() - 90 * 60 * 1000);
  const order3: Order = {
    id: 'DEMO-003',
    tableNumber: 'Bàn 1',
    status: 'completed',
    timestamp: formatTs(t3),
    createdAt: t3.getTime(),
    total: 120000,
    items: [
      {
        foodId: '3',
        name: 'Bánh canh cá chiên',
        price: 45000,
        quantity: 2,
        image: 'https://i.ibb.co/kVmCrDzr/471584531-122135551412444119-7880839340141585417-n.jpg',
      },
      {
        foodId: '9',
        name: 'Trà chanh mật ong',
        price: 15000,
        quantity: 2,
        image: 'https://i.ibb.co/6R57f0yS/z7788487707412-2826cfd4e92a2a07d4b4a3901b0b7593.jpg',
      },
    ],
  };

  // Đơn 4: Đã thanh toán (Mang về hôm nay)
  const t4 = new Date(now.getTime() - 150 * 60 * 1000);
  const order4: Order = {
    id: 'DEMO-004',
    tableNumber: 'Mang về',
    status: 'paid',
    timestamp: formatTs(t4),
    createdAt: t4.getTime(),
    note: 'Đóng gói riêng bánh và nước lèo',
    total: 150000,
    items: [
      {
        foodId: '5',
        name: 'Bánh canh đầu cá nhỏ',
        price: 50000,
        quantity: 3,
        image: 'https://i.ibb.co/VWFyPKMt/471703189-122135781986444119-799567060267085368-n.jpg',
      },
    ],
  };

  // Đơn 5: Đã hoàn thành (hôm qua) — giúp màn hình Báo cáo có biểu đồ nhiều ngày
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const order5: Order = {
    id: 'DEMO-005',
    tableNumber: 'Bàn 4',
    status: 'completed',
    timestamp: formatTs(yesterday),
    createdAt: yesterday.getTime(),
    total: 80000,
    items: [
      {
        foodId: '2',
        name: 'Bánh canh cá um',
        price: 40000,
        quantity: 2,
        image: 'https://i.ibb.co/XxQSDrp3/z7788463770964-edd5dac5151821cf5a8682036f9611b6.jpg',
      },
    ],
  };

  return [order1, order2, order3, order4, order5];
};

export const getDemoExpenses = (): Expense[] => {
  const now = new Date();
  const t1 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return [
    {
      id: 'EXP-DEMO-01',
      name: 'Mua rau thơm, hành lá, giá đỗ',
      amount: 85000,
      timestamp: formatTs(t1),
      createdAt: t1.getTime(),
    },
    {
      id: 'EXP-DEMO-02',
      name: 'Đá lạnh & ly mang về',
      amount: 50000,
      timestamp: formatTs(t1),
      createdAt: t1.getTime(),
    },
    {
      id: 'EXP-DEMO-03',
      name: 'Gas nấu bánh canh',
      amount: 320000,
      timestamp: formatTs(yesterday),
      createdAt: yesterday.getTime(),
    },
  ];
};
