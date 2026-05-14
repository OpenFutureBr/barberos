export type CatalogoProduto = {
  name: string
  category: string
  subCategory: string
  hasAlcohol: boolean
  costPrice: number
  salePrice: number
  photoUrl: string
}

export const GRUPOS: Record<string, string[]> = {
  "Bebidas": ["Refrigerante", "Cerveja", "Energético", "Água", "Suco", "Água de Coco", "Drink", "Whisky", "Vodka", "Vinho"],
  "Salgadinhos": ["Chips", "Amendoim", "Castanha", "Mix de Nuts", "Biscoito Salgado", "Pipoca", "Torrada"],
  "Doces": ["Chocolate", "Bala/Goma", "Biscoito Doce", "Wafer", "Pirulito", "Barrinha"],
  "Higiene": ["Shampoo", "Condicionador", "Pomada", "Gel", "Óleo", "Loção", "Creme"],
  "Outros": ["Acessório", "Descartável", "Outros"],
}

// Grupos que contêm bebidas alcoólicas por padrão
export const SUBGRUPOS_ALCOOLICOS = ["Cerveja", "Whisky", "Vodka", "Vinho", "Drink"]

export const catalogoProdutos: CatalogoProduto[] = [
  // BEBIDAS - Refrigerante
  {
    name: "Coca-Cola Lata 350ml",
    category: "Bebidas", subCategory: "Refrigerante", hasAlcohol: false,
    costPrice: 2.50, salePrice: 5.00,
    photoUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80",
  },
  {
    name: "Pepsi Lata 350ml",
    category: "Bebidas", subCategory: "Refrigerante", hasAlcohol: false,
    costPrice: 2.50, salePrice: 5.00,
    photoUrl: "https://images.unsplash.com/photo-1604054094723-3a949e4f8f23?w=400&q=80",
  },
  {
    name: "Guaraná Antarctica Lata 350ml",
    category: "Bebidas", subCategory: "Refrigerante", hasAlcohol: false,
    costPrice: 2.50, salePrice: 5.00,
    photoUrl: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400&q=80",
  },
  {
    name: "Sprite Lata 350ml",
    category: "Bebidas", subCategory: "Refrigerante", hasAlcohol: false,
    costPrice: 2.50, salePrice: 5.00,
    photoUrl: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&q=80",
  },
  // BEBIDAS - Cerveja
  {
    name: "Heineken Long Neck 330ml",
    category: "Bebidas", subCategory: "Cerveja", hasAlcohol: true,
    costPrice: 5.00, salePrice: 10.00,
    photoUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80",
  },
  {
    name: "Budweiser Long Neck 330ml",
    category: "Bebidas", subCategory: "Cerveja", hasAlcohol: true,
    costPrice: 4.50, salePrice: 9.00,
    photoUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80",
  },
  {
    name: "Corona Extra Long Neck 330ml",
    category: "Bebidas", subCategory: "Cerveja", hasAlcohol: true,
    costPrice: 6.00, salePrice: 12.00,
    photoUrl: "https://images.unsplash.com/photo-1566633806827-98fea442c1a7?w=400&q=80",
  },
  {
    name: "Brahma Lata 350ml",
    category: "Bebidas", subCategory: "Cerveja", hasAlcohol: true,
    costPrice: 3.50, salePrice: 7.00,
    photoUrl: "https://images.unsplash.com/photo-1561830465-a8b39a400b52?w=400&q=80",
  },
  // BEBIDAS - Energético
  {
    name: "Red Bull 250ml",
    category: "Bebidas", subCategory: "Energético", hasAlcohol: false,
    costPrice: 7.00, salePrice: 14.00,
    photoUrl: "https://images.unsplash.com/photo-1551529834-525807d6b4f3?w=400&q=80",
  },
  {
    name: "Monster Energy 473ml",
    category: "Bebidas", subCategory: "Energético", hasAlcohol: false,
    costPrice: 8.00, salePrice: 16.00,
    photoUrl: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&q=80",
  },
  // BEBIDAS - Água
  {
    name: "Água Mineral Sem Gás 500ml",
    category: "Bebidas", subCategory: "Água", hasAlcohol: false,
    costPrice: 1.50, salePrice: 3.00,
    photoUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80",
  },
  {
    name: "Água com Gás 500ml",
    category: "Bebidas", subCategory: "Água", hasAlcohol: false,
    costPrice: 2.00, salePrice: 4.00,
    photoUrl: "https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=400&q=80",
  },
  // SALGADINHOS
  {
    name: "Batata Ruffles Original 57g",
    category: "Salgadinhos", subCategory: "Chips", hasAlcohol: false,
    costPrice: 4.00, salePrice: 8.00,
    photoUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
  },
  {
    name: "Cheetos Cheddar 45g",
    category: "Salgadinhos", subCategory: "Chips", hasAlcohol: false,
    costPrice: 3.50, salePrice: 7.00,
    photoUrl: "https://images.unsplash.com/photo-1509442455176-00a424a5f79e?w=400&q=80",
  },
  {
    name: "Amendoim Crocante 100g",
    category: "Salgadinhos", subCategory: "Amendoim", hasAlcohol: false,
    costPrice: 3.00, salePrice: 6.00,
    photoUrl: "https://images.unsplash.com/photo-1567069736273-f7e2e432ca60?w=400&q=80",
  },
  {
    name: "Mix de Castanhas 100g",
    category: "Salgadinhos", subCategory: "Castanha", hasAlcohol: false,
    costPrice: 5.00, salePrice: 10.00,
    photoUrl: "https://images.unsplash.com/photo-1509912150916-66c05c84c88e?w=400&q=80",
  },
  {
    name: "Pipoca Microondas Manteiga 100g",
    category: "Salgadinhos", subCategory: "Pipoca", hasAlcohol: false,
    costPrice: 3.00, salePrice: 6.00,
    photoUrl: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&q=80",
  },
  // DOCES
  {
    name: "Chocolate Kit Kat 45g",
    category: "Doces", subCategory: "Chocolate", hasAlcohol: false,
    costPrice: 3.50, salePrice: 7.00,
    photoUrl: "https://images.unsplash.com/photo-1548907040-4d42bde3a4b1?w=400&q=80",
  },
  {
    name: "Snickers 45g",
    category: "Doces", subCategory: "Chocolate", hasAlcohol: false,
    costPrice: 3.50, salePrice: 7.00,
    photoUrl: "https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400&q=80",
  },
  {
    name: "Halls Cereja 28g",
    category: "Doces", subCategory: "Bala/Goma", hasAlcohol: false,
    costPrice: 2.00, salePrice: 4.00,
    photoUrl: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&q=80",
  },
  {
    name: "Trident Menta 8g",
    category: "Doces", subCategory: "Bala/Goma", hasAlcohol: false,
    costPrice: 2.50, salePrice: 5.00,
    photoUrl: "https://images.unsplash.com/photo-1560296600-b0e5c47a3dc5?w=400&q=80",
  },
  {
    name: "Wafer Bauducco Baunilha 140g",
    category: "Doces", subCategory: "Wafer", hasAlcohol: false,
    costPrice: 4.00, salePrice: 8.00,
    photoUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&q=80",
  },
]
