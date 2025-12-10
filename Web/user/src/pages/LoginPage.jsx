import React from "react";
import LoginForm from "../components/LoginForm";
import { motion } from "framer-motion";
import Particles from "react-tsparticles";
// import { loadFull } from "tsparticles";
import { FaFacebook, FaTwitter, FaInstagram } from "react-icons/fa";
import travelImage from "../images/download.jpeg";

export default function LoginPage() {
  // const particlesInit = async (main) => {
  //   await loadFull(main);
  // };

  return (
    <div
      className="d-flex flex-column min-vh-100"
      style={{ backgroundColor: "#f5f5f5" }}
    >
      {/* MAIN WRAPPER */}
      <div className="container-fluid d-flex flex-column flex-lg-row flex-grow-1 p-0">
        {/* LEFT SECTION (hidden on small screens) */}
        <div
          className="d-none d-lg-flex flex-column justify-content-start align-items-start p-5"
          style={{ flex: 1, backgroundColor: "#f8f9fa" }}
        >
       

          {/* Content */}
          <div style={{ marginTop: "20px" }}>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: "600",
                color: "#000000ff",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Welcome Back!
            </h2>
            <p
              style={{
                marginTop: "15px",
                fontSize: "1.1rem",
                maxWidth: "500px",
                lineHeight: "1.6",
              }}
            >
              Sign in to continue your journey and access your personalized
              travel plans with JTP.
            </p>
          </div>

          {/* Image */}
          <motion.img
            src={travelImage}
            alt="Explore Pakistan"
            style={{
              width: "100%",
              maxWidth: "550px",
              height: "auto",
              borderRadius: "12px",
              marginTop: "30px",
              boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.2)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          />
        </div>

        {/* RIGHT SECTION (LOGIN FORM) */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="d-flex flex-column justify-content-center align-items-center p-4 p-md-5 position-relative w-100"
          style={{
            flex: 1,
            backgroundColor: "#fff",
            minHeight: "100vh",
            overflow: "hidden",
          }}
        >
          {/* Particles Animation */}
          <Particles
            // id="tsparticles"
            // init={particlesInit}
            options={{
              fullScreen: { enable: false },
              background: { color: "transparent" },
              particles: {
                number: { value: 40 },
                size: { value: 3 },
                move: { enable: true, speed: 0.6 },
                links: { enable: true, color: "#a4c639" },
                opacity: { value: 0.6 },
              },
              interactivity: {
                events: { onHover: { enable: true, mode: "attract" } },
                modes: { attract: { distance: 150, duration: 0.4 } },
              },
              detectRetina: true,
            }}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
            }}
          />

          {/* Login Form */}
          <div
            className="shadow-lg rounded-4 bg-white p-4 p-md-5"
            style={{
              width: "100%",
              maxWidth: "500px",
              zIndex: 1,
              border: "1px solid #e5e5e5",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <LoginForm />
          </div>
        </motion.div>
      </div>

      {/* FOOTER */}
      <footer
        className="d-flex flex-column flex-md-row justify-content-between align-items-center px-4 py-3"
        style={{ backgroundColor: "#222", color: "white" }}
      >
        <p className="m-0 text-center text-md-start">
          &copy; {new Date().getFullYear()} Journey Through Pakistan
        </p>
        <div className="d-flex gap-3 mt-3 mt-md-0">
          <a href="#" style={{ color: "white" }}>
            <FaFacebook size={20} />
          </a>
          <a href="#" style={{ color: "white" }}>
            <FaTwitter size={20} />
          </a>
          <a href="#" style={{ color: "white" }}>
            <FaInstagram size={20} />
          </a>
        </div>
      </footer>
    </div>
  );
}
