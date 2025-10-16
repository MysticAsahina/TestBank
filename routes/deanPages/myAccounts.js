import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = express.Router();

/**
 * @route GET /dean/account
 * @desc Display Dean account/profile page
 * @access Dean only
 */
router.get("/", requireAuth, requireRole("Dean"), async (req, res) => {
  try {
    const user = req.session.user;

    res.render("dean/Account", {
      title: "My Account",
      user,
    });
  } catch (err) {
    console.error("❌ Error loading Dean Account page:", err);
    res.status(500).send("Server Error");
  }
});

export default router;
