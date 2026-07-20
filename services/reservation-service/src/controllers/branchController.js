import { Branch } from "../models/branch.js";
import { ErrorHandler } from "../error/error.js";

export const listBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find().sort("name");
    res.status(200).json({ success: true, branches });
  } catch (error) {
    next(error);
  }
};

export const getBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return next(new ErrorHandler("Branch not found", 404));
    res.status(200).json({ success: true, branch });
  } catch (error) {
    next(error);
  }
};

// Admin-only (see gateway route). Lets the manager dashboard's
// Availability tab manually reset/adjust a branch's live seat count (e.g.
// at the start of each day) or its total capacity.
export const updateBranch = async (req, res, next) => {
  try {
    const { availableSeats, capacity } = req.body;
    const update = {};
    if (availableSeats !== undefined) update.availableSeats = availableSeats;
    if (capacity !== undefined) update.capacity = capacity;

    const branch = await Branch.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!branch) return next(new ErrorHandler("Branch not found", 404));

    res.status(200).json({ success: true, branch });
  } catch (error) {
    next(error);
  }
};
