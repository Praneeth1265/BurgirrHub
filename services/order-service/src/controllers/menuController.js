import { MenuItem } from "../models/menuItem.js";
import { ErrorHandler } from "../error/error.js";

export const listMenu = async (req, res, next) => {
  try {
    const { branch, category, cuisine, popular, all } = req.query;
    // `all=true` is for the manager dashboard's stock view -- it needs to
    // see unavailable/out-of-stock items too, not just what customers can
    // order. Anyone can pass it (this route is public), which is fine: it
    // only widens a read of already-public menu data, nothing sensitive.
    const filter = all === "true" ? {} : { isAvailable: true };

    if (branch) {
      // Empty branches array = available everywhere.
      filter.$or = [{ branches: { $size: 0 } }, { branches: branch }];
    }
    if (category) filter.category = category;
    if (cuisine) filter.cuisine = cuisine;
    if (popular === "true") filter.isPopular = true;

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: items.length, items });
  } catch (error) {
    next(error);
  }
};

// Admin-only (see gateway route). Lets the manager dashboard adjust stock,
// availability, and price without going through a full menu-management
// CRUD surface -- editing existing seeded items is the demo's scope, not
// adding/removing dishes.
export const updateMenuItem = async (req, res, next) => {
  try {
    const { stock, isAvailable, price } = req.body;
    const update = {};
    if (stock !== undefined) update.stock = stock;
    if (isAvailable !== undefined) update.isAvailable = isAvailable;
    if (price !== undefined) update.price = price;

    const item = await MenuItem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return next(new ErrorHandler("Menu item not found", 404));

    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

export const getMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return next(new ErrorHandler("Menu item not found", 404));
    res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};
