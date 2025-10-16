import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route GET /dean/account
 * @desc Display the Dean’s account settings page
 * @access Dean only
 */
router.get(
  "/",
  requireAuth,
  requireRole("Dean"),
  async (req, res) => {
    try {
      // Use the logged-in Dean’s info
      const user = req.session.user;

      if (!user) {
        return res.redirect("/login");
      }

      // Render the Dean Account page
      res.render("dean/Account", {
        title: "Dean Account",
        user, // ✅ Pass user data for EJS display
      });
    } catch (err) {
      console.error("Error loading Dean Account page:", err);
      res.status(500).send("Server Error");
    }
  }
);

export default router;
