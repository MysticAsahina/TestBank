import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// All professor routes require authentication and Professor role
router.use(requireAuth);
router.use(requireRole(["Professor"]));

// ✅ Dashboard (landing route)
router.get("/", (req, res) => {
    res.render("professor/Dashboard", {
        title: "Professor Dashboard",
        user: req.session.user
    });
});

// ✅ Optional alias for /professor/dashboard
router.get("/dashboard", (req, res) => {
    res.render("professor/Dashboard", {
        title: "Professor Dashboard",
        user: req.session.user
    });
});

router.get("/sections", (req, res) => {
    res.render("professor/Sections", {
        title: "Sections Management",
        user: req.session.user,
        sections: []
    });
});

router.get("/tests", (req, res) => {
    res.render("professor/Tests", {
        title: "Test Management",
        user: req.session.user
    });
});

router.get("/performance", (req, res) => {
    res.render("professor/StudentPerformance", {
        title: "Student Performance",
        user: req.session.user
    });
});

router.get("/reports", (req, res) => {
    res.render("professor/Reports", {
        title: "Reports",
        user: req.session.user
    });
});

router.get("/account", (req, res) => {
    res.render("professor/Account", {
        title: "My Account",
        user: req.session.user
    });
});

export default router;

// FUCK THIS SHIT FEFUADAWJIPASZFDCJIKMDACIASWJFC;AIFSZEDW;FDVE FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK 
// FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK
// FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK
// FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK
// FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK
// FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK FUCK