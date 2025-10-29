import React, { useState } from "react";
import OtpInput from "react-otp-input";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./otp.css";

const OTPVerification = () => {
  const location = useLocation();
  const email = location.state?.email || ""; // ✅ Email passed from Register page
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  // ✅ Verify OTP
  const handleVerify = async () => {
    if (otp.length === 6) {
      try {
        const response = await axios.post(
          "http://localhost:3000/users/verify-otp",
          {
            email,
            otp,
          }
        );

        alert(response.data.message);

        if (response.data.success === true) {
          navigate("/dashboard");
        }
      } catch (error) {
        alert(
          error.response?.data?.message || "Invalid OTP. Please try again."
        );
        console.error("OTP Verification Error:", error);
      }
    } else {
      alert("Please enter a valid 6-digit OTP");
    }
  };

  // ✅ Resend OTP
  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3000/users/resend-otp",
        {
          email,
        }
      );

      alert(response.data.message || "OTP resent successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to resend OTP.");
      console.error("Resend OTP Error:", error);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="otp-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="otp-card"
      >
        <motion.img
          src="https://i.gifer.com/WFH.gif"
          alt="OTP Animation"
          className="otp-animation"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />

        <h2>Enter OTP</h2>
        <p>
          We've sent a 6-digit OTP to <strong>{email}</strong>.
        </p>

        <OtpInput
          value={otp}
          onChange={setOtp}
          numInputs={6}
          renderInput={(props) => <input {...props} />}
          shouldAutoFocus
          containerStyle="otp-inputs"
          inputStyle="otp-input"
        />

        {/* Verify Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="verify-btn"
          onClick={handleVerify}
        >
          Verify OTP
        </motion.button>

        {/* Resend Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="resend-btn"
          onClick={handleResendOTP}
          disabled={resendLoading}
        >
          {resendLoading ? "Resending..." : "Resend OTP"}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default OTPVerification;
