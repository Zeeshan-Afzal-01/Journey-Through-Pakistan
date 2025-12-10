// controllers/authController.js
import axios from "axios";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import User from "../models/user.models.js";
import { config } from "dotenv";
config();

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export const authCallback = async (req, res) => {
  try {
    const code = req.query.code;
    console.log("Auth callback received code:", code);
    if (!code) return res.status(400).send("No code provided");

    const tokenResp = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: "authorization_code",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: process.env.AUTH0_CALLBACK_URL,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("Token response data:", tokenResp.data);

    const { id_token } = tokenResp.data;
    if (!id_token) return res.status(500).send("No id_token received");

    const decodedHeader = jwt.decode(id_token, { complete: true });
    if (!decodedHeader) return res.status(500).send("Invalid id_token");

    const verified = await new Promise((resolve, reject) => {
      jwt.verify(
        id_token,
        getKey,
        {
          audience: process.env.AUTH0_CLIENT_ID,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        },
        (err, payload) => {
          if (err) return reject(err);
          resolve(payload);
        }
      );
    });

    console.log("Verified id_token payload:", verified);

    const auth0Id = verified.sub;
    const email = verified.email;
    const name = verified.name;
    const picture = verified.picture;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        auth0Id,
        email,
        name,
        profilePicture: picture,
      });
    }

    const appToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });

    // Set HttpOnly cookie for SPA consumption (use appToken to match user app)
    res.cookie("appToken", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: "/",
    });

    // Redirect to dashboard after successful OAuth login
    const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error(
      "Auth callback error:",
      err.response?.data || err.message || err
    );
    return res.status(500).send("Authentication failed");
  }
};
