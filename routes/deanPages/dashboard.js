import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();

// ✅ Protect route and ensure user exists
router.get("/", requireAuth, requireRole("Dean"), (req, res) => {
  const user = req.session.user || { fullName: "Guest" };

  res.render("dean/Dashboard", {
    title: "Dean Dashboard",
    user,
  });
});

export default router;
