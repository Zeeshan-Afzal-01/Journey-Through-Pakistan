import React, { useEffect, useState } from "react";
import { FiBookmark, FiGrid, FiStar, FiRefreshCw } from "react-icons/fi";
import { getPersonalizedRecommendations } from "../api/recommendationsApi.jsx";
import { markPlaceVisited, toggleSavePlace, getSavedPlaces, getVisitedPlaces } from "../api/placesApi.jsx";

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function formatDistance(meters) {
  if (!isFiniteNumber(meters)) return "Distance unavailable";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export default function Recommendations() {
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("Based on your interests and nearby location");
  const [items, setItems] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [savedSet, setSavedSet] = useState(new Set());
  const [visitedSet, setVisitedSet] = useState(new Set());

  const loadUserPlaceSets = async () => {
    try {
      const [savedRes, visitedRes] = await Promise.all([getSavedPlaces(), getVisitedPlaces()]);
      const savedIds = (savedRes?.data?.places || []).map((p) => p._id);
      const visitedIds = (visitedRes?.data?.places || []).map((p) => p._id);
      setSavedSet(new Set(savedIds));
      setVisitedSet(new Set(visitedIds));
    } catch (e) {
      // non-fatal
      console.error("Failed to load saved/visited sets:", e);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const loc = await getBrowserLocation();
      const params = loc ? { lat: loc.lat, lng: loc.lng } : {};
      const { data } = await getPersonalizedRecommendations(params);
      setReason(data?.reason || "Based on your interests and nearby location");
      setItems(Array.isArray(data?.recommendations) ? data.recommendations : []);
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    loadUserPlaceSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setItemLoading = (id, v) => setActionLoading((p) => ({ ...p, [id]: v }));

  const onToggleSave = async (id) => {
    if (!id) return;
    try {
      setItemLoading(id, true);
      const res = await toggleSavePlace(id);
      const saved = !!res?.data?.saved;
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (saved) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setItemLoading(id, false);
    }
  };

  const onMarkVisited = async (id) => {
    if (!id) return;
    try {
      setItemLoading(id, true);
      await markPlaceVisited(id);
      setVisitedSet((prev) => new Set(prev).add(id));
      // remove from list to make the flow obvious
      setItems((prev) => prev.filter((p) => p?._id !== id));
    } catch (e) {
      console.error("Mark visited failed:", e);
    } finally {
      setItemLoading(id, false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Recommendations</h4>
          <div className="text-muted small">
            Flow: choose interests in <span className="fw-semibold">Settings</span> → fetch places → you can{" "}
            <span className="fw-semibold">Save</span> or <span className="fw-semibold">Mark visited</span>.
          </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchRecommendations} disabled={loading}>
          <FiRefreshCw className="me-1" /> Refresh
        </button>
      </div>

      <div className="text-muted mb-3">{reason}</div>

      {loading ? (
        <div className="row g-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="col-12 col-md-6 col-xl-4">
              <div className="card shadow-sm h-100">
                <div className="recommendation-cover"></div>
                <div className="card-body">
                  <div className="skeleton-text mb-2" style={{ width: "70%", height: 16 }}></div>
                  <div className="skeleton-text mb-2" style={{ width: "50%", height: 14 }}></div>
                  <div className="skeleton-text" style={{ width: "90%", height: 14 }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <p className="mb-0">No recommendations found</p>
          <small>Update interests in Settings and try refresh.</small>
        </div>
      ) : (
        <div className="row g-3">
          {items.map((place) => {
            const id = place?._id;
            const isSaved = id ? savedSet.has(id) : false;
            const isVisited = id ? visitedSet.has(id) : false;
            const disabled = !!actionLoading[id];

            return (
              <div key={id} className="col-12 col-md-6 col-xl-4">
                <div className="card shadow-sm h-100">
                  <div className="recommendation-cover"></div>
                  <div className="card-body">
                    <h6 className="fw-bold mb-2">{place?.name || "Unnamed place"}</h6>

                    <div className="d-flex flex-wrap gap-2 text-muted small mb-2">
                      <span>
                        <FiGrid className="me-1" />
                        {formatDistance(place?.distanceMeters)}
                      </span>
                      <span>
                        <FiStar className="me-1" />
                        Rating: {isFiniteNumber(place?.rating) ? place.rating : 0}
                      </span>
                    </div>

                    <div className="text-muted small mb-3">Reason: {reason}</div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm ${isSaved ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => onToggleSave(id)}
                        disabled={disabled}
                      >
                        <FiBookmark className="me-1" /> {isSaved ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onMarkVisited(id)}
                        disabled={disabled || isVisited}
                        title={isVisited ? "Already marked visited" : "Mark visited"}
                      >
                        Mark visited
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


