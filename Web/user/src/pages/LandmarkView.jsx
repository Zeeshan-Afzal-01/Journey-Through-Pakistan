import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FiMapPin, FiStar, FiLogIn } from "react-icons/fi";
import { getLandmarkById } from "../api/landmarkApi";
import { useAuth } from "../context/AuthContext";
import "../assests/css/landmark-result.css";

export default function LandmarkView() {
  const { landmarkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [landmark, setLandmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLandmark = async () => {
      try {
        setLoading(true);
        const response = await getLandmarkById(landmarkId);
        setLandmark(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching landmark:", err);
        setError(err.response?.data?.message || "Landmark not found");
      } finally {
        setLoading(false);
      }
    };

    if (landmarkId) {
      fetchLandmark();
    }
  }, [landmarkId]);

  // Generate a placeholder image URL based on landmark name
  const getImageUrl = (landmarkName) => {
    const encodedName = encodeURIComponent(landmarkName || "landmark");
    return `https://source.unsplash.com/1600x900/?${encodedName},pakistan,monument`;
  };

  const formatDistance = (dist) => {
    if (!dist) return "Unknown";
    if (dist < 1000) return `${dist}m`;
    return `${(dist / 1000).toFixed(1)} km`;
  };

  if (loading) {
    return (
      <div className="container-fluid py-3">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !landmark) {
    return (
      <div className="container-fluid py-3">
        <div className="card shadow-sm">
          <div className="card-body text-center">
            <h5 className="mb-3">Landmark Not Found</h5>
            <p className="text-muted">{error || "The requested landmark could not be found."}</p>
            {!user && (
              <div className="mt-3">
                <Link to="/login" className="btn btn-primary">
                  <FiLogIn className="me-2" /> Sign In to Explore More
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { landmark_found, name, location, confidence, distance, address, types, rating, labels } = landmark;

  return (
    <div className="container-fluid py-3 landmark-result-page">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="badge bg-primary-subtle text-primary p-2 rounded-3">🏛️</div>
        <h5 className="mb-0 fw-semibold">Landmark Explorer</h5>
      </div>

      {/* Login prompt for non-authenticated users */}
      {!user && (
        <div className="alert alert-info mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <span>Sign in to save landmarks, discuss, and explore more features!</span>
            <Link to="/login" className="btn btn-sm btn-primary">
              <FiLogIn className="me-1" /> Sign In
            </Link>
          </div>
        </div>
      )}

      <div className="row g-3">
        {/* Left content */}
        <div className="col-12 col-lg-8">
          {/* Hero */}
          {landmark_found && name ? (
            <div className="card shadow-sm mb-3">
              <div className="ratio ratio-21x9 rounded-top overflow-hidden">
                <img
                  className="object-fit-cover"
                  src={getImageUrl(name)}
                  alt={name}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1600&auto=format&fit=crop";
                  }}
                />
              </div>
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <div>
                    <h2 className="display-6 fw-bolder mb-1">{name}</h2>
                    {address && (
                      <p className="text-muted mb-2">
                        <FiMapPin className="me-1" />
                        {address}
                      </p>
                    )}
                  </div>
                  {confidence && (
                    <span className="badge bg-success">
                      {Math.round(confidence * 100)}% Match
                    </span>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  {distance && (
                    <span className="badge bg-light text-dark">
                      📍 {formatDistance(distance)} away
                    </span>
                  )}
                  {rating && (
                    <span className="badge bg-warning text-dark">
                      <FiStar className="me-1" />
                      {rating}
                    </span>
                  )}
                  {types && types.slice(0, 3).map((type, i) => (
                    <span key={i} className="badge bg-info text-dark">
                      {type.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>

                {labels && labels.length > 0 && (
                  <div className="mb-3">
                    <small className="text-muted">Detected: {labels.slice(0, 5).join(", ")}</small>
                  </div>
                )}

                {user ? (
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary">
                      <span className="me-2">🔖</span> Save
                    </button>
                    <button className="btn btn-primary">
                      <span className="me-2">💬</span> Discuss
                    </button>
                  </div>
                ) : (
                  <div className="alert alert-secondary mb-0">
                    <Link to="/login" className="text-decoration-none">
                      Sign in to save and discuss this landmark
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <h4 className="mb-3">Landmark Information</h4>
                <p className="text-muted">
                  This landmark was identified but no specific details are available.
                </p>
              </div>
            </div>
          )}

          {/* Description sections */}
          {landmark_found && name && (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h4 className="fw-bold mb-3">{name}</h4>

                {address && (
                  <div className="mb-3 pb-3 border-bottom">
                    <div className="fw-semibold mb-1">Location</div>
                    <p className="text-muted mb-0">{address}</p>
                    {location && (
                      <a
                        href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary mt-2"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                )}

                {types && (
                  <div className="mb-3 pb-3 border-bottom">
                    <div className="fw-semibold mb-1">Type</div>
                    <p className="text-muted mb-0">
                      {types.map(t => t.replace(/_/g, " ")).join(", ")}
                    </p>
                  </div>
                )}

                {confidence && (
                  <div>
                    <div className="fw-semibold mb-1">Confidence Score</div>
                    <p className="text-muted mb-0">
                      {Math.round(confidence * 100)}% - This landmark was identified with high confidence using Google Vision AI.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-lg-4">
          {/* Map Preview */}
          {location && (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Location</h6>
                <div className="ratio ratio-16x9 rounded overflow-hidden">
                  <iframe
                    title="location map"
                    src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Call to action */}
          {!user && (
            <div className="card shadow-sm mt-3">
              <div className="card-body text-center">
                <div className="fw-semibold mb-2">Explore More Landmarks</div>
                <div className="text-muted small mb-3">Sign in to identify and share landmarks!</div>
                <Link to="/login" className="btn btn-primary">
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

