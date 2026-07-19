import { MenuItem } from "../models/menuItem.js";

const MENU_ITEMS = [
  { name: "Classic Cheeseburger", description: "Beef patty, cheddar, lettuce, tomato, house sauce", price: 199, category: "Burgers", branches: [] },
  { name: "Double Patty Burger", description: "Two beef patties, double cheese, pickles", price: 299, category: "Burgers", branches: [] },
  { name: "Spicy Paneer Burger", description: "Crispy paneer, spicy mayo, jalapenos (veg)", price: 179, category: "Burgers", branches: [] },
  { name: "BBQ Bacon Burger", description: "Beef patty, bacon, BBQ sauce, crispy onions", price: 249, category: "Burgers", branches: [] },
  // Deliberately branch-exclusive, to exercise the branch-availability
  // filtering both when browsing the menu and when placing an order.
  { name: "ITPL Special Triple Stack", description: "Branch-exclusive triple patty stack", price: 349, category: "Burgers", branches: ["ITPL"] },
  { name: "French Fries", description: "Classic salted fries", price: 99, category: "Sides", branches: [] },
  { name: "Onion Rings", description: "Crispy battered onion rings", price: 129, category: "Sides", branches: [] },
  { name: "Cola", description: "Chilled soft drink, 300ml", price: 60, category: "Beverages", branches: [] },
  { name: "Chocolate Milkshake", description: "Thick chocolate shake", price: 149, category: "Beverages", branches: [] },
  { name: "Chocolate Brownie", description: "Warm brownie with chocolate drizzle", price: 129, category: "Desserts", branches: [] },
];

// Idempotent: safe to run on every service boot.
export async function seedMenu() {
  for (const item of MENU_ITEMS) {
    await MenuItem.updateOne({ name: item.name }, { $setOnInsert: item }, { upsert: true });
  }
  console.log(`Menu seeded (${MENU_ITEMS.length} items, idempotent)`);
}
