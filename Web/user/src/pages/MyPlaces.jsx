import React, { useEffect, useState } from "react";
import { FiBookmark, FiCheckCircle, FiStar } from "react-icons/fi";
import { getSavedPlaces, getVisitedPlaces, toggleSavePlace, markPlaceVisited } from "../api/placesApi.jsx";

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

export default function MyPlaces() {
  const [tab, setTab] = useState("saved"); // saved | visited
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
  const [actionLoading, setActionLoading] = useState({});

  const load = async (t = tab) => {
    setLoading(true);
    try {
      const res = t === "visited" ? await getVisitedPlaces() : await getSavedPlaces();
      setPlaces(Array.isArray(res?.data?.places) ? res.data.places : []);
    } catch (e) {
      console.error("Failed to load places:", e);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const setItemLoading = (id, v) => setActionLoading((p) => ({ ...p, [id]: v }));

  const onToggleSave = async (id) => {
    if (!id) return;
    try {
      setItemLoading(id, true);
      const res = await toggleSavePlace(id);
      const saved = !!res?.data?.saved;
      if (!saved && tab === "saved") {
        setPlaces((prev) => prev.filter((p) => p?._id !== id));
      }
    } catch (e) {
      console.error("Toggle save failed:", e);
    } finally {
      setItemLoading(id, false);
    }
  };

  const onMarkVisited = async (id) => {
    if (!id) return;
    try {
      setItemLoading(id, true);
      await markPlaceVisited(id);
      if (tab === "saved") {
        // keep it saved but also allow user to view it in visited tab
      }
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
          <h4 className="fw-bold mb-1">My Places</h4>
          <div className="text-muted small">
            Flow: Recommendations → <span className="fw-semibold">Save</span> for later, and{" "}
            <span className="fw-semibold">Mark visited</span> when you actually visit.
          </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => load(tab)} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="btn-group mb-3" role="tablist" aria-label="Saved and visited tabs">
        <button
          type="button"
          className={`btn btn-sm ${tab === "saved" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("saved")}
        >
          <FiBookmark className="me-1" /> Saved
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "visited" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("visited")}
        >
          <FiCheckCircle className="me-1" /> Visited
        </button>
      </div>

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : places.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <p className="mb-0">{tab === "saved" ? "No saved places yet" : "No visited places yet"}</p>
          <small>{tab === "saved" ? "Save a place from Recommendations." : "Mark visited from Recommendations."}</small>
        </div>
      ) : (
        <div className="row g-3">
          {places.map((p) => {
            const id = p?._id;
            const disabled = !!actionLoading[id];
            return (
              <div key={id} className="col-12 col-md-6 col-xl-4">
                <div className="card shadow-sm h-100">
                  <div className="recommendation-cover"></div>
                  <div className="card-body">
                    <h6 className="fw-bold mb-2">{p?.name || "Unnamed place"}</h6>
                    <div className="d-flex flex-wrap gap-2 text-muted small mb-3">
                      <span>
                        <FiStar className="me-1" />
                        Rating: {isFiniteNumber(p?.rating) ? p.rating : 0}
                      </span>
                      {isFiniteNumber(p?.popularityScore) ? (
                        <span>Popularity: {p.popularityScore}</span>
                      ) : null}
                    </div>

                    <div className="d-flex gap-2">
                      {tab === "saved" ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => onToggleSave(id)}
                            disabled={disabled}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => onMarkVisited(id)}
                            disabled={disabled}
                          >
                            Mark visited
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => onToggleSave(id)}
                          disabled={disabled}
                        >
                          Save again
                        </button>
                      )}
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


