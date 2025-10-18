import express from "express";
import dashboardRoutes from "./dashboard.js";
import manageAccountsRoutes from "./manageAccounts.js";
import sectionsRoutes from "./sections.js";
import testManagementRoutes from "./testManagement.js";
import testStaticRoutes from "./testS.js";
import studentPerformanceRoutes from "./studentPerformance.js";
import reportsRoutes from "./reports.js";
import myAccountsRoutes from "./myAccounts.js";

const router = express.Router();

router.use("/dashboard", dashboardRoutes);
router.use("/manage-accounts", manageAccountsRoutes);
router.use("/sections", sectionsRoutes);
router.use("/tests", testManagementRoutes);
router.use("/test-static", testStaticRoutes);
router.use("/student-performance", studentPerformanceRoutes);
router.use("/reports", reportsRoutes);
router.use("/account", myAccountsRoutes);

export default router;