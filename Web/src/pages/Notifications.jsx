import React from "react";
import { FiBell, FiAlertTriangle, FiSettings, FiMessageSquare } from "react-icons/fi";
import "../assests/css/notifications.css";

export default function Notifications() {
  const highlight = [
    { icon: <FiAlertTriangle />, text: "Urgent Alert: Unauthorized access attempt detected on your account. Review security settings immediately.", time: "Now" },
    { icon: <FiSettings />, text: "Critical Update: Security patch available for immediate installation. Restart required to apply changes.", time: "5 minutes ago" },
    { icon: <FiMessageSquare />, text: "Important Message: Your support ticket #12345 has been updated. A specialist has responded to your inquiry.", time: "15 minutes ago" },
  ];

  const cards = [
    { title: "Travel Alert", meta: "Today, 10:30 AM", tag: "Travel", body: "Your flight BA249 to London has been delayed by 1 hour due to air traffic control restrictions. New departure time: 11:30 AM." },
    { title: "System Update", meta: "Today, 09:15 AM", tag: "Updates", body: "Important system maintenance completed. All services are now fully operational. Thank you for your patience." },
    { title: "Community Post", meta: "Yesterday, 04:00 PM", tag: "Announcements", body: "New post in 'React Developers' group: 'Best practices for state management in large applications'." },
    { title: "Financial Update", meta: "Yesterday, 02:00 PM", tag: "Financial", body: "Your monthly statement for March is now available. Review your spending habits for last month." },
    { title: "Reminder", meta: "2 days ago", tag: "Support", body: "Your subscription to Pro Plan will expire in 7 days. Renew now to avoid service interruption." },
    { title: "Product Launch", meta: "3 days ago", tag: "Promotions", body: "Exciting news! Our new AI-powered analytics dashboard is now live. Explore powerful insights." },
    { title: "Account Security", meta: "3 days ago", tag: "Security", body: "Suspicious login attempt detected from an unrecognized device. Please verify your account activity." },
    { title: "Travel Update", meta: "4 days ago", tag: "Travel", body: "Flight KL100 to Amsterdam confirmed. Check-in opens 24 hours before departure." },
    { title: "Feedback Request", meta: "Last week", tag: "Support", body: "We value your feedback! Share your experience with our recent customer service interaction." },
  ];

  return (
    <div className="container-fluid py-3 notifications-page">
      <h3 className="fw-bold mb-3">Notification Center</h3>

      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="btn-group flex-grow-1" role="group">
          <button className="btn btn-light border active">All Notifications</button>
          <button className="btn btn-light border">Archived (0)</button>
        </div>
        <div className="input-group" style={{ maxWidth: 360 }}>
          <input className="form-control" placeholder="Search notifications..." />
        </div>
        <button className="btn btn-outline-secondary">Mark All Read</button>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="text-center mb-3 text-primary"><FiBell size={22} /></div>
          <h5 className="fw-bold text-center mb-4">Today's Highlights</h5>
          <div className="d-flex flex-column gap-3">
            {highlight.map((h, i) => (
              <div key={i} className="d-flex align-items-start gap-2">
                <div className="text-primary mt-1">{h.icon}</div>
                <div className="flex-grow-1">
                  <div>{h.text}</div>
                  <div className="text-muted xsmall">{h.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h6 className="fw-bold mb-2">All Recent Notifications</h6>
      <div className="row g-3">
        {cards.map((c, i) => (
          <div key={i} className="col-12 col-md-6 col-xl-4">
            <div className="card shadow-sm h-100 notify-card">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="fw-semibold">{c.title}</div>
                  <span className="badge bg-light text-dark border">{c.tag}</span>
                </div>
                <div className="text-muted xsmall mb-2">{c.meta}</div>
                <p className="text-muted mb-3 flex-grow-1">{c.body}</p>
                <div className="d-flex align-items-center gap-3 text-muted xsmall">
                  <a href="#" className="text-decoration-none">Mark Read</a>
                  <a href="#" className="text-decoration-none">Archive</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-between align-items-center my-3">
        <button className="btn btn-light border">Previous</button>
        <div className="xsmall text-muted">Page 1 of 2</div>
        <button className="btn btn-light border">Next</button>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Notification Preferences</h5>
          <div className="accordion" id="prefs">
            {[
              "General Notifications",
              "Account Activity",
              "Social Interactions",
              "System & Security",
            ].map((h, i) => (
              <div className="accordion-item" key={i}>
                <h2 className="accordion-header" id={`ph${i}`}>
                  <button className={`accordion-button ${i!==0?"collapsed":""}`} type="button" data-bs-toggle="collapse" data-bs-target={`#pc${i}`}>{h}</button>
                </h2>
                <div id={`pc${i}`} className={`accordion-collapse collapse ${i===0?"show":""}`} data-bs-parent="#prefs">
                  <div className="accordion-body text-muted xsmall">Configure how you want to receive updates for {h.toLowerCase()}.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


