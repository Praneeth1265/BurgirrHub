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
