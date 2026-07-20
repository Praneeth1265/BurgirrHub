import { MenuItem } from "../models/menuItem.js";

// Cycled across items below -- the project only ships a handful of real
// food photos (public/*.{png,jpg,jpeg}), so several dishes intentionally
// share an image rather than link to a photo that doesn't exist.
const IMAGES = [
  "/dinner1.jpeg",
  "/dinner2.png",
  "/dinner3.png",
  "/dinner4.png",
  "/dinner5.png",
  "/dinner6.png",
  "/dinner.jpg",
  "/breakfast1.png",
  "/lunch1.png",
  "/lunchchi.jpg",
  "/fish.jpg",
  "/hyd_biry.jpg",
  "/sandwich.png",
  "/cake.jpg",
];
const img = (i) => IMAGES[i % IMAGES.length];

const MENU_ITEMS = [
  // ---------------- Burgers (American) ----------------
  { name: "Classic Cheeseburger", description: "Beef patty, cheddar, lettuce, tomato, house sauce", price: 199, category: "Burgers", cuisine: "American", calories: 560, ingredients: ["Beef patty", "Cheddar", "Lettuce", "Tomato", "Brioche bun", "House sauce"], isVeg: false, isPopular: true, imageUrl: img(8) },
  { name: "Double Patty Burger", description: "Two beef patties, double cheese, pickles", price: 299, category: "Burgers", cuisine: "American", calories: 780, ingredients: ["Beef patty x2", "Cheddar", "Pickles", "Brioche bun"], isVeg: false, imageUrl: img(0) },
  { name: "Spicy Paneer Burger", description: "Crispy paneer, spicy mayo, jalapenos (veg)", price: 179, category: "Burgers", cuisine: "American", calories: 480, ingredients: ["Paneer", "Spicy mayo", "Jalapenos", "Lettuce", "Bun"], isVeg: true, imageUrl: img(9) },
  { name: "BBQ Bacon Burger", description: "Beef patty, bacon, BBQ sauce, crispy onions", price: 249, category: "Burgers", cuisine: "American", calories: 690, ingredients: ["Beef patty", "Bacon", "BBQ sauce", "Crispy onions", "Bun"], isVeg: false, isPopular: true, imageUrl: img(1) },
  // Deliberately branch-exclusive, to exercise the branch-availability
  // filtering both when browsing the menu and when placing an order.
  { name: "ITPL Special Triple Stack", description: "Branch-exclusive triple patty stack", price: 349, category: "Burgers", cuisine: "American", branches: ["ITPL"], calories: 940, ingredients: ["Beef patty x3", "Cheese", "Special sauce", "Bun"], isVeg: false, imageUrl: img(2) },
  { name: "Mushroom Swiss Burger", description: "Grilled mushrooms, swiss cheese, garlic aioli", price: 219, category: "Burgers", cuisine: "American", calories: 610, ingredients: ["Beef patty", "Mushrooms", "Swiss cheese", "Garlic aioli", "Bun"], isVeg: false, imageUrl: img(3) },

  // ---------------- Sides ----------------
  { name: "French Fries", description: "Classic salted fries", price: 99, category: "Sides", cuisine: "American", calories: 340, ingredients: ["Potato", "Salt", "Oil"], isVeg: true, imageUrl: img(4) },
  { name: "Onion Rings", description: "Crispy battered onion rings", price: 129, category: "Sides", cuisine: "American", calories: 320, ingredients: ["Onion", "Batter", "Oil"], isVeg: true, imageUrl: img(5) },
  { name: "Garlic Bread", description: "Toasted bread with garlic butter and herbs", price: 119, category: "Sides", cuisine: "Italian", calories: 280, ingredients: ["Bread", "Garlic butter", "Parsley"], isVeg: true, imageUrl: img(6) },
  { name: "Loaded Nachos", description: "Tortilla chips, cheese sauce, salsa, jalapenos", price: 179, category: "Sides", cuisine: "American", calories: 520, ingredients: ["Tortilla chips", "Cheese sauce", "Salsa", "Jalapenos"], isVeg: true, imageUrl: img(7) },
  { name: "Coleslaw", description: "Crunchy cabbage-carrot slaw in a light dressing", price: 89, category: "Sides", cuisine: "American", calories: 180, ingredients: ["Cabbage", "Carrot", "Mayo dressing"], isVeg: true, imageUrl: img(8) },

  // ---------------- Beverages ----------------
  { name: "Cola", description: "Chilled soft drink, 300ml", price: 60, category: "Beverages", cuisine: "American", calories: 140, ingredients: ["Carbonated cola"], isVeg: true, imageUrl: img(9) },
  { name: "Chocolate Milkshake", description: "Thick chocolate shake", price: 149, category: "Beverages", cuisine: "American", calories: 420, ingredients: ["Milk", "Chocolate", "Ice cream"], isVeg: true, imageUrl: img(10) },
  { name: "Fresh Lime Soda", description: "Sweet & salty lime soda, served chilled", price: 79, category: "Beverages", cuisine: "American", calories: 90, ingredients: ["Lime", "Soda water", "Sugar/salt"], isVeg: true, imageUrl: img(11) },
  { name: "Iced Tea", description: "Peach iced tea over ice", price: 89, category: "Beverages", cuisine: "American", calories: 110, ingredients: ["Tea", "Peach syrup", "Ice"], isVeg: true, imageUrl: img(12) },
  { name: "Cold Coffee", description: "Blended cold coffee with a hint of cocoa", price: 129, category: "Beverages", cuisine: "American", calories: 260, ingredients: ["Coffee", "Milk", "Ice cream", "Cocoa"], isVeg: true, imageUrl: img(13) },

  // ---------------- Desserts (American) ----------------
  { name: "Chocolate Brownie", description: "Warm brownie with chocolate drizzle", price: 129, category: "Desserts", cuisine: "American", calories: 410, ingredients: ["Chocolate", "Flour", "Butter", "Sugar"], isVeg: true, isPopular: true, imageUrl: img(13) },
  { name: "Molten Lava Cake", description: "Warm chocolate cake with a gooey molten centre", price: 159, category: "Desserts", cuisine: "American", calories: 450, ingredients: ["Chocolate", "Butter", "Egg", "Flour"], isVeg: true, imageUrl: img(3) },
  { name: "New York Cheesecake", description: "Classic baked cheesecake with berry compote", price: 169, category: "Desserts", cuisine: "American", calories: 470, ingredients: ["Cream cheese", "Biscuit base", "Berry compote"], isVeg: true, imageUrl: img(2) },
  { name: "Gulab Jamun", description: "Warm milk-solid dumplings in cardamom syrup", price: 99, category: "Desserts", cuisine: "American", calories: 380, ingredients: ["Milk solids", "Sugar syrup", "Cardamom"], isVeg: true, imageUrl: img(13) },

  // ---------------- Italian ----------------
  { name: "Margherita Pizza", description: "San Marzano tomato, fresh mozzarella, basil", price: 289, category: "Pizza", cuisine: "Italian", calories: 640, ingredients: ["Tomato sauce", "Mozzarella", "Basil", "Pizza dough"], isVeg: true, isPopular: true, imageUrl: img(4) },
  { name: "Pepperoni Pizza", description: "Tomato sauce, mozzarella, spicy pepperoni", price: 329, category: "Pizza", cuisine: "Italian", calories: 780, ingredients: ["Tomato sauce", "Mozzarella", "Pepperoni", "Pizza dough"], isVeg: false, imageUrl: img(5) },
  { name: "Quattro Formaggi Pizza", description: "Mozzarella, gorgonzola, parmesan, fontina", price: 349, category: "Pizza", cuisine: "Italian", calories: 820, ingredients: ["Mozzarella", "Gorgonzola", "Parmesan", "Fontina", "Pizza dough"], isVeg: true, imageUrl: img(6) },
  { name: "Spaghetti Aglio e Olio", description: "Garlic, chilli flakes, olive oil, parsley", price: 249, category: "Pasta", cuisine: "Italian", calories: 520, ingredients: ["Spaghetti", "Garlic", "Olive oil", "Chilli flakes", "Parsley"], isVeg: true, imageUrl: img(4) },
  { name: "Fettuccine Alfredo", description: "Creamy parmesan sauce, cracked black pepper", price: 279, category: "Pasta", cuisine: "Italian", calories: 690, ingredients: ["Fettuccine", "Cream", "Parmesan", "Butter"], isVeg: true, imageUrl: img(4) },
  { name: "Penne Arrabbiata", description: "Spicy tomato sauce, garlic, red chilli", price: 259, category: "Pasta", cuisine: "Italian", calories: 540, ingredients: ["Penne", "Tomato", "Garlic", "Red chilli"], isVeg: true, imageUrl: img(4) },
  { name: "Spaghetti Carbonara", description: "Egg, parmesan, pancetta, black pepper", price: 289, category: "Pasta", cuisine: "Italian", calories: 710, ingredients: ["Spaghetti", "Egg", "Parmesan", "Pancetta", "Black pepper"], isVeg: false, isPopular: true, imageUrl: img(4) },
  { name: "Lasagna Al Forno", description: "Layered pasta, ragu, béchamel, mozzarella", price: 319, category: "Mains", cuisine: "Italian", calories: 750, ingredients: ["Pasta sheets", "Ragu", "Béchamel", "Mozzarella"], isVeg: false, imageUrl: img(6) },
  { name: "Bruschetta al Pomodoro", description: "Toasted bread, tomato, basil, olive oil", price: 149, category: "Starters", cuisine: "Italian", calories: 220, ingredients: ["Bread", "Tomato", "Basil", "Olive oil", "Garlic"], isVeg: true, imageUrl: img(6) },
  { name: "Caprese Salad", description: "Buffalo mozzarella, tomato, basil, balsamic glaze", price: 199, category: "Starters", cuisine: "Italian", calories: 310, ingredients: ["Mozzarella", "Tomato", "Basil", "Balsamic glaze"], isVeg: true, imageUrl: img(7) },
  { name: "Minestrone Soup", description: "Hearty vegetable & bean soup", price: 159, category: "Soups", cuisine: "Italian", calories: 210, ingredients: ["Mixed vegetables", "Beans", "Tomato broth", "Pasta"], isVeg: true, imageUrl: img(3) },
  { name: "Risotto ai Funghi", description: "Creamy arborio rice, wild mushrooms, parmesan", price: 299, category: "Mains", cuisine: "Italian", calories: 610, ingredients: ["Arborio rice", "Mushrooms", "Parmesan", "White wine"], isVeg: true, imageUrl: img(11) },
  { name: "Chicken Parmigiana", description: "Breaded chicken, marinara, melted mozzarella", price: 329, category: "Mains", cuisine: "Italian", calories: 720, ingredients: ["Chicken breast", "Breadcrumb", "Marinara", "Mozzarella"], isVeg: false, imageUrl: img(1) },
  { name: "Tiramisu", description: "Espresso-soaked ladyfingers, mascarpone, cocoa", price: 189, category: "Desserts", cuisine: "Italian", calories: 430, ingredients: ["Ladyfingers", "Mascarpone", "Espresso", "Cocoa"], isVeg: true, imageUrl: img(13) },
  { name: "Panna Cotta", description: "Silky vanilla cream set with a berry coulis", price: 169, category: "Desserts", cuisine: "Italian", calories: 360, ingredients: ["Cream", "Vanilla", "Gelatine", "Berry coulis"], isVeg: true, imageUrl: img(13) },

  // ---------------- Chinese ----------------
  { name: "Veg Manchurian", description: "Fried vegetable dumplings in tangy Manchurian sauce", price: 189, category: "Starters", cuisine: "Chinese", calories: 380, ingredients: ["Mixed vegetables", "Cornflour", "Soy sauce", "Garlic", "Chilli"], isVeg: true, imageUrl: img(9) },
  { name: "Chicken Manchurian", description: "Fried chicken tossed in tangy Manchurian sauce", price: 239, category: "Starters", cuisine: "Chinese", calories: 460, ingredients: ["Chicken", "Cornflour", "Soy sauce", "Garlic", "Chilli"], isVeg: false, isPopular: true, imageUrl: img(9) },
  { name: "Hakka Noodles", description: "Wok-tossed noodles with vegetables & soy", price: 199, category: "Rice & Noodles", cuisine: "Chinese", calories: 480, ingredients: ["Noodles", "Cabbage", "Carrot", "Capsicum", "Soy sauce"], isVeg: true, isPopular: true, imageUrl: img(12) },
  { name: "Schezwan Fried Rice", description: "Spicy schezwan sauce, wok-fried rice & vegetables", price: 209, category: "Rice & Noodles", cuisine: "Chinese", calories: 510, ingredients: ["Rice", "Schezwan sauce", "Mixed vegetables"], isVeg: true, imageUrl: img(11) },
  { name: "Veg Spring Rolls", description: "Crispy rolls stuffed with julienned vegetables", price: 159, category: "Starters", cuisine: "Chinese", calories: 300, ingredients: ["Vegetables", "Spring roll sheet", "Soy sauce"], isVeg: true, imageUrl: img(7) },
  { name: "Chilli Paneer", description: "Crisp paneer tossed in a spicy chilli-soy glaze", price: 219, category: "Starters", cuisine: "Chinese", calories: 420, ingredients: ["Paneer", "Capsicum", "Onion", "Soy sauce", "Chilli"], isVeg: true, imageUrl: img(9) },
  { name: "Chilli Chicken", description: "Crisp chicken tossed in a spicy chilli-soy glaze", price: 259, category: "Starters", cuisine: "Chinese", calories: 480, ingredients: ["Chicken", "Capsicum", "Onion", "Soy sauce", "Chilli"], isVeg: false, isPopular: true, imageUrl: img(9) },
  { name: "Dim Sum Basket", description: "Steamed vegetable & chicken dumplings, mixed basket", price: 249, category: "Starters", cuisine: "Chinese", calories: 340, ingredients: ["Dumpling wrapper", "Vegetables", "Chicken", "Ginger"], isVeg: false, imageUrl: img(7) },
  { name: "Sweet Corn Soup", description: "Silky corn soup with a hint of pepper", price: 129, category: "Soups", cuisine: "Chinese", calories: 190, ingredients: ["Sweet corn", "Cornflour", "Vegetable stock"], isVeg: true, imageUrl: img(3) },
  { name: "Hot & Sour Soup", description: "Spicy, tangy vegetable & tofu broth", price: 139, category: "Soups", cuisine: "Chinese", calories: 170, ingredients: ["Tofu", "Vegetables", "Vinegar", "White pepper"], isVeg: true, imageUrl: img(3) },
  { name: "Chicken Manchow Soup", description: "Peppery chicken broth topped with crispy noodles", price: 159, category: "Soups", cuisine: "Chinese", calories: 230, ingredients: ["Chicken", "Vegetables", "Crispy noodles", "Soy sauce"], isVeg: false, imageUrl: img(3) },
  { name: "Kung Pao Chicken", description: "Wok-tossed chicken, peanuts, dried chilli", price: 269, category: "Rice & Noodles", cuisine: "Chinese", calories: 540, ingredients: ["Chicken", "Peanuts", "Dried chilli", "Soy sauce"], isVeg: false, imageUrl: img(1) },
  { name: "Honey Chilli Potato", description: "Crispy potato fingers glazed in sweet chilli sauce", price: 169, category: "Starters", cuisine: "Chinese", calories: 400, ingredients: ["Potato", "Honey", "Chilli sauce", "Sesame"], isVeg: true, imageUrl: img(7) },
];

// Idempotent: safe to run on every service boot. Insert-only ($setOnInsert)
// on purpose -- once a document exists, admin edits made through the
// dashboard (stock, isAvailable, price -- see updateMenuItem) must survive
// the next service restart instead of being clobbered by this seed.
export async function seedMenu() {
  for (const item of MENU_ITEMS) {
    await MenuItem.updateOne({ name: item.name }, { $setOnInsert: item }, { upsert: true });
  }
  console.log(`Menu seeded (${MENU_ITEMS.length} items, idempotent)`);
}
