const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false
}));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));


// ================= USERS =================
const users = {
    student1: { password: "123", role: "student" },
    admin1: { password: "123", role: "admin" },
    security1: { password: "123", role: "security" }
};


// ================= GLOBAL STORAGE =================
let allPasses = [];
let securityLogs = [];


// ================= DEFAULT ROUTE (LOGIN PAGE) =================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});


// ================= LOGIN =================
app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (users[username] && users[username].password === password) {

        req.session.user = username;
        req.session.role = users[username].role;

        return res.json({
            success: true,
            role: users[username].role
        });
    }

    res.json({ success: false });
});


// ================= LOGOUT =================
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});


// ================= GENERATE PASS (STUDENT ONLY) =================
app.post("/generatePass", (req, res) => {

    if (!req.session.user || req.session.role !== "student") {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const pass = {
        id: Date.now(),
        studentName: req.session.user,
        event: req.body.event,
        location: req.body.location,
        startTime: req.body.startTime,
        expiryTime: req.body.expiryTime,
        passType: req.body.passType,
        generatedAt: new Date().toLocaleString(),
        scanned: false
    };

    allPasses.push(pass);

    res.json({
        success: true,
        pass: pass
    });
});


// ================= STUDENT HISTORY =================
app.get("/student/passes", (req, res) => {

    if (!req.session.user || req.session.role !== "student") {
        return res.status(403).json([]);
    }

    const studentPasses = allPasses.filter(
        pass => pass.studentName === req.session.user
    );

    res.json(studentPasses);
});


// ================= ADMIN - VIEW ALL PASSES =================
app.get("/admin/passes", (req, res) => {

    if (!req.session.user || req.session.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(allPasses);
});


// ================= ADMIN - VIEW SECURITY LOGS =================
app.get("/admin/securityLogs", (req, res) => {

    if (!req.session.user || req.session.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(securityLogs);
});


// ================= SECURITY SCAN =================
app.post("/scan", (req, res) => {

    if (!req.session.user || req.session.role !== "security") {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const passId = req.body.id;

    const pass = allPasses.find(p => p.id == passId);

    if (!pass) {
        return res.json({ success: false, message: "Invalid Pass" });
    }

    // Prevent double scanning
    if (pass.scanned) {
        return res.json({ success: false, message: "Already Scanned" });
    }

    pass.scanned = true;

    const log = {
        studentName: pass.studentName,
        event: pass.event,
        location: pass.location,
        scannedAt: new Date().toLocaleString(),
        scannedBy: req.session.user
    };

    securityLogs.push(log);

    res.json({
        success: true,
        pass: pass
    });
});


// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
