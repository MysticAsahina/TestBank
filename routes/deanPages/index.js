import express from "express";
import dashboardRoutes from "./dashboard.js";
import manageAccountsRoutes from "./manageAccounts.js";
import sectionsRoutes from "./sections.js";
import testRoutes from "./testManagement.js";
import studentPerformanceRoutes from "./studentPerformance.js";
import reportsRoutes from "./reports.js";
import myAccountsRoutes from "./myAccounts.js";

const router = express.Router();

// map both routes to the same controller so TestStatic becomes the main Tests page
router.use("/dashboard", dashboardRoutes);
router.use("/manage-accounts", manageAccountsRoutes);
router.use("/sections", sectionsRoutes);
router.use("/tests", testRoutes);       // <-- now serves the Tests page
router.use("/student-performance", studentPerformanceRoutes);
router.use("/reports", reportsRoutes);
router.use("/account", myAccountsRoutes);

export default router;