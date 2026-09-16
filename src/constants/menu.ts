export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: 'main' | 'extra' | 'drink';
  isAvailable?: boolean; // default true. If false: Tạm hết món
  dailyStock?: number;   // optional: giới hạn số suất bán hôm nay
}

export interface Category {
  id: 'main' | 'extra' | 'drink';
  name: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'main', name: 'Món chính', icon: 'restaurant-outline' },
  { id: 'extra', name: 'Món thêm', icon: 'add-circle-outline' },
  { id: 'drink', name: 'Nước uống', icon: 'cafe-outline' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Bánh canh chả cá',
    price: 35000,
    image: 'https://i.ibb.co/ZbD3RPH/IMG-4901.jpg',
    category: 'main',
  },
  {
    id: '2',
    name: 'Bánh canh cá um',
    price: 40000,
    image: 'https://i.ibb.co/XxQSDrp3/z7788463770964-edd5dac5151821cf5a8682036f9611b6.jpg',
    category: 'main',
  },
  {
    id: '3',
    name: 'Bánh canh cá chiên',
    price: 45000,
    image: 'https://i.ibb.co/kVmCrDzr/471584531-122135551412444119-7880839340141585417-n.jpg',
    category: 'main',
  },
  {
    id: '4',
    name: 'Bánh canh thập cẩm',
    price: 50000,
    image: 'https://i.ibb.co/RpDnBRjd/z7788675664873-217520f03bdad37bb04a6dc8c86eb4ff.jpg',
    category: 'main',
  },
  {
    id: '5',
    name: 'Bánh canh đầu cá nhỏ',
    price: 50000,
    image: 'https://i.ibb.co/VWFyPKMt/471703189-122135781986444119-799567060267085368-n.jpg',
    category: 'main',
  },
  {
    id: '6',
    name: 'Bánh canh đầu cá lớn',
    price: 55000,
    image: 'https://i.ibb.co/VWFyPKMt/471703189-122135781986444119-799567060267085368-n.jpg',
    category: 'main',
  },
  {
    id: '7',
    name: 'Bánh canh vịt(thịt)',
    price: 45000,
    image: 'https://i.ibb.co/4yG8md0/z7788393330926-cd23757e8576f97f92301bf6be80fe17.jpg',
    category: 'main',
  },
  {
    id: '8',
    name: 'Bánh canh đùi vịt',
    price: 50000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'main',
  },
  {
    id: '9',
    name: 'Nước suối',
    price: 10000,
    image: 'https://sonhawater.com/wp-content/uploads/2019/10/aquafina-15-lit.jpg',
    category: 'drink',
  },
  {
    id: '10',
    name: 'Coca',
    price: 15000,
    image: 'https://www.coca-cola.com/content/dam/onexp/eg/en/home-images/coca-cola-classic/928x928.png',
    category: 'drink',
  },
  {
    id: '11',
    name: 'Chả cá thêm',
    price: 20000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: '12',
    name: 'Cá um thêm',
    price: 20000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: '13',
    name: 'Cá chiên thêm',
    price: 25000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: '14',
    name: 'Đầu cá thêm',
    price: 40000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: '15',
    name: 'Đùi vịt thêm',
    price: 40000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: 'extra_5k',
    name: 'Extra 5k',
    price: 5000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: 'extra_10k',
    name: 'Extra 10k',
    price: 10000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: 'extra_15k',
    name: 'Extra 15k',
    price: 15000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'extra',
  },
  {
    id: '16',
    name: 'Bánh canh thường',
    price: 40000,
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    category: 'main',
  },
];
