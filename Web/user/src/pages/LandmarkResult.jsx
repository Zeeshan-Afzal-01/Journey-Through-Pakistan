import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiMessageSquare, FiBookmark, FiMapPin, FiStar } from "react-icons/fi";
import "../assests/css/landmark-result.css";

export default function LandmarkResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get result from sessionStorage
    const storedResult = sessionStorage.getItem("landmarkResult");
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        setResult(parsed);
      } catch (error) {
        console.error("Error parsing landmark result:", error);
      }
    }
    setLoading(false);
  }, []);

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

  if (!result) {
    return (
      <div className="container-fluid py-3">
        <div className="card shadow-sm">
          <div className="card-body text-center">
            <h5 className="mb-3">No landmark result found</h5>
            <button className="btn btn-primary" onClick={() => navigate("/landmark")}>
              Identify a Landmark
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { landmark_found, name, location, confidence, distance, address, types, rating, nearest_places, labels } = result;

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

  return (
    <div className="container-fluid py-3 landmark-result-page">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="badge bg-primary-subtle text-primary p-2 rounded-3">🏛️</div>
        <h5 className="mb-0 fw-semibold">Landmark Explorer</h5>
      </div>

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

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary">
                    <FiBookmark className="me-2" /> Save
                  </button>
                  <button className="btn btn-primary">
                    <FiMessageSquare className="me-2" /> Discuss
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <h4 className="mb-3">No Landmark Detected</h4>
                <p className="text-muted">
                  We couldn't identify a specific landmark in your image, but here are some nearby places you might be interested in.
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-3">
            <button className="btn btn-primary px-4" onClick={() => navigate("/landmark")}>
              Identify Another Landmark
            </button>
          </div>

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
          {/* Nearby Places */}
          {nearest_places && nearest_places.length > 0 && (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Nearby Places</h6>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr className="text-muted small">
                        <th scope="col">Name</th>
                        <th scope="col">Rating</th>
                        <th scope="col">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nearest_places.slice(0, 5).map((place, i) => (
                        <tr key={i}>
                          <td className="fw-semibold">{place.name}</td>
                          <td className="text-danger fw-semibold">
                            {place.rating ? `⭐ ${place.rating}` : "-"}
                          </td>
                          <td className="text-muted">
                            {place.distance ? formatDistance(place.distance) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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

          {/* Mini footer */}
          <div className="card shadow-sm mt-3">
            <div className="card-body text-center">
              <div className="fw-semibold mb-2">Landmark Explorer</div>
              <div className="text-muted small mb-3">Explore more with us!</div>
              <button className="btn btn-primary" onClick={() => navigate("/landmark")}>
                Identify Another Landmark
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
