// routes/authRoutes.js
import express from "express";
import { authCallback } from "../controller/authController.js";
const router = express.Router();
import {config} from 'dotenv';
config();

function buildAuthorizeUrl(connection) {
    return (
        `https://${process.env.AUTH0_DOMAIN}/authorize` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(process.env.AUTH0_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(process.env.AUTH0_CALLBACK_URL)}` +
        `&scope=${encodeURIComponent("openid profile email")}` +
        (connection ? `&connection=${encodeURIComponent(connection)}` : '') +
        `&prompt=select_account`
    );
}

// Generic route (shows universal login if no connection enforced)
router.get("/login", (req, res) => {
    const authorizeUrl = buildAuthorizeUrl(null);
    res.redirect(authorizeUrl);
});

// Provider-specific routes
router.get("/login/google", (req, res) => {
    res.redirect(buildAuthorizeUrl("google-oauth2"));
});

router.get("/login/facebook", (req, res) => {
    res.redirect(buildAuthorizeUrl("facebook"));
});

router.get("/login/apple", (req, res) => {
    res.redirect(buildAuthorizeUrl("apple"));
});

router.get("/callback", authCallback);

export default router;
