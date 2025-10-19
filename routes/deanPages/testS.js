import express from "express";

const router = express.Router();

// GET /dean/test-static - Display static test page
router.get("/", async (req, res) => {
  try {
    res.render("dean/TestStatic", {
      title: "Test Management (Static)",
      user: req.user || { fullName: "Dean User" }
    });
  } catch (error) {
    console.error("Error loading test static page:", error);
    res.status(500).render("Error", {
      message: "Error loading test static page",
      error: {}
    });
  }
});

export default router;
