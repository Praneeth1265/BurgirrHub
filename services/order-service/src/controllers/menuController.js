import { MenuItem } from "../models/menuItem.js";
import { ErrorHandler } from "../error/error.js";

export const listMenu = async (req, res, next) => {
  try {
    const { branch, category } = req.query;
    const filter = { isAvailable: true };

    if (branch) {
      // Empty branches array = available everywhere.
      filter.$or = [{ branches: { $size: 0 } }, { branches: branch }];
    }
    if (category) filter.category = category;

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: items.length, items });
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
