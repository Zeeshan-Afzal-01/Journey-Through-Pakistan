import "bootstrap/dist/css/bootstrap.min.css"; // ✅ Bootstrap Styles
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // ✅ Bootstrap JS (collapse/offcanvas)
import "./pages/login.css"; // import custom login styles
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
