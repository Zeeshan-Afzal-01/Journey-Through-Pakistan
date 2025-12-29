import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyPlaceSuggestions, submitPlaceSuggestion } from "../api/localPlacesApi.jsx";
import { toast } from "react-toastify";
import { loadGoogleMapsPlaces } from "../utils/loadGoogleMaps.js";
import { getGoogleMapsKey } from "../api/configApi.jsx";

const INTEREST_OPTIONS = [
  { value: "history", label: "History" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture" },
  { value: "food", label: "Food" },
  { value: "adventure", label: "Adventure" },
];

export default function SuggestPlace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);
  const [myPlaces, setMyPlaces] = useState([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const locationInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    description: "",
    latitude: "",
    longitude: "",
    tags: [],
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);

  const imagePreviews = useMemo(
    () => images.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [images]
  );
  const videoPreviews = useMemo(
    () => videos.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [videos]
  );

  useEffect(() => {
    if (user?.role !== "local") {
      toast.info("Only local users can suggest places.");
    }
  }, [user]);

  useEffect(() => {
    // Cleanup object URLs
    return () => {
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
      videoPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [imagePreviews, videoPreviews]);

  const loadMine = async () => {
    setLoadingMine(true);
    try {
      const res = await getMyPlaceSuggestions();
      setMyPlaces(Array.isArray(res?.data?.places) ? res.data.places : []);
    } catch (e) {
      console.error("Failed to load my suggestions:", e);
      setMyPlaces([]);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Google Places Autocomplete (optional)
    let mounted = true;
    const loadKeyAndInit = async () => {
      // Prefer frontend env var if present; otherwise fetch from backend for convenience.
      const envKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
      let key = envKey;
      if (!key) {
        try {
          const res = await getGoogleMapsKey();
          key = res?.data?.key || "";
        } catch (e) {
          // ignore
        }
      }

      if (!key) {
        setMapsError("Google Maps API key is not configured");
        return;
      }

      loadGoogleMapsPlaces(key)
      .then((g) => {
        if (!mounted) return;
        if (!locationInputRef.current) return;

        // Init map (right side)
        if (mapDivRef.current && !mapRef.current) {
          mapRef.current = new g.maps.Map(mapDivRef.current, {
            center: { lat: 30.3753, lng: 69.3451 }, // Pakistan
            zoom: 5,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          markerRef.current = new g.maps.Marker({
            map: mapRef.current,
          });
          markerRef.current.setVisible(false);
        }

        const ac = new g.maps.places.Autocomplete(locationInputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
        });
        ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          const lat = p?.geometry?.location?.lat?.();
          const lng = p?.geometry?.location?.lng?.();

          if (typeof lat === "number" && typeof lng === "number" && mapRef.current && markerRef.current) {
            const pos = { lat, lng };
            mapRef.current.setCenter(pos);
            mapRef.current.setZoom(15);
            markerRef.current.setPosition(pos);
            markerRef.current.setVisible(true);
          }

          setForm((prev) => ({
            ...prev,
            name: prev.name || p?.name || "",
            address: p?.formatted_address || prev.address,
            latitude: typeof lat === "number" ? String(lat) : prev.latitude,
            longitude: typeof lng === "number" ? String(lng) : prev.longitude,
          }));
        });
        autocompleteRef.current = ac;
        setMapsReady(true);
      })
      .catch((err) => {
        console.error("Maps load error:", err);
        setMapsError("Failed to load Google Maps. You can still submit manually.");
      });
    };

    loadKeyAndInit();

    return () => {
      mounted = false;
      autocompleteRef.current = null;
    };
  }, []);

  const toggleTag = (value) => {
    setForm((p) => {
      const tags = new Set(p.tags);
      if (tags.has(value)) tags.delete(value);
      else tags.add(value);
      return { ...p, tags: Array.from(tags) };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== "local") {
      toast.error("Only local users can suggest places.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Place name is required.");
      return;
    }
    if (form.tags.length === 0) {
      toast.error("Select at least one interest tag.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.address) fd.append("address", form.address);
      if (form.description) fd.append("description", form.description);
      if (form.latitude !== "") fd.append("latitude", String(Number(form.latitude)));
      if (form.longitude !== "") fd.append("longitude", String(Number(form.longitude)));
      fd.append("tags", JSON.stringify(form.tags));
      images.forEach((f) => fd.append("images", f));
      videos.forEach((f) => fd.append("videos", f));

      await submitPlaceSuggestion(fd);
      toast.success("Suggestion submitted! Admin approval required.");
      setForm({
        name: "",
        address: "",
        description: "",
        latitude: "",
        longitude: "",
        tags: [],
      });
      setLocationQuery("");
      if (mapRef.current && markerRef.current) {
        mapRef.current.setCenter({ lat: 30.3753, lng: 69.3451 });
        mapRef.current.setZoom(5);
        markerRef.current.setVisible(false);
      }
      setImages([]);
      setVideos([]);
      loadMine();
    } catch (err) {
      console.error("Submit suggestion error:", err);
      toast.error(err?.response?.data?.message || "Failed to submit suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Suggest a Place (Local)</h4>
          <p className="text-muted mb-0">
            Suggest places with interest tags. Admin will approve them, then users will see them in Recommendations.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadMine} disabled={loadingMine}>
          {loadingMine ? "Refreshing..." : "Refresh my suggestions"}
        </button>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <form onSubmit={onSubmit} className="card shadow-sm p-3">
            <div className="mb-3">
              <label className="form-label">Search location (Google Maps)</label>
              <input
                ref={locationInputRef}
                className="form-control"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder={mapsReady ? "Search and pick a place..." : "Search (optional)..." }
                disabled={loading}
              />
              {mapsError ? (
                <div className="text-muted small mt-1">{mapsError}</div>
              ) : (
                <div className="text-muted small mt-1">
                  Pick from suggestions to auto-fill address + coordinates.
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Place name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Shalimar Gardens"
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Address</label>
              <input
                className="form-control"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="City, Province"
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What makes this place special? What should tourists know?"
                disabled={loading}
              />
              <div className="text-muted small mt-1">{form.description.length}/2000</div>
            </div>

            <div className="mb-3">
              <label className="form-label">Interest tags</label>
              <div className="d-flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm ${form.tags.includes(opt.value) ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => toggleTag(opt.value)}
                    disabled={loading}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Images (max 5, 5MB each)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="form-control"
                  disabled={loading}
                  onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 5))}
                />
                {imagePreviews.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {imagePreviews.map((p) => (
                      <img
                        key={p.url}
                        src={p.url}
                        alt="preview"
                        style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 10 }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Videos (max 2, 50MB each)</label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="form-control"
                  disabled={loading}
                  onChange={(e) => setVideos(Array.from(e.target.files || []).slice(0, 2))}
                />
                {videoPreviews.length > 0 ? (
                  <div className="d-flex flex-column gap-2 mt-2">
                    {videoPreviews.map((p) => (
                      <video key={p.url} src={p.url} controls style={{ width: "100%", borderRadius: 10 }} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit for approval"}
            </button>
          </form>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card shadow-sm p-3 mb-3">
            <h6 className="fw-bold mb-2">Location Preview</h6>
            <div className="text-muted small mb-2">
              Search a place and select it from Google suggestions to pin it on the map.
            </div>
            {mapsError ? (
              <div className="text-muted">{mapsError}</div>
            ) : (
              <div
                ref={mapDivRef}
                style={{ width: "100%", height: 320, borderRadius: 12, overflow: "hidden", background: "#f3f4f6" }}
              />
            )}
          </div>

          <div className="card shadow-sm p-3">
            <h6 className="fw-bold mb-2">My previous suggestions</h6>
            <div className="text-muted small mb-3">
              Track approval status here (pending/approved/rejected).
            </div>

            {loadingMine ? (
              <div className="text-muted">Loading...</div>
            ) : myPlaces.length === 0 ? (
              <div className="text-muted">No suggestions yet.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {myPlaces.slice(0, 15).map((p) => (
                  <div key={p._id} className="border rounded p-2">
                    <div className="d-flex justify-content-between gap-2">
                      <div className="fw-semibold">{p.name}</div>
                      <span
                        className={`badge ${
                          p.status === "approved"
                            ? "text-bg-success"
                            : p.status === "rejected"
                            ? "text-bg-danger"
                            : "text-bg-warning"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-muted small">{(p.tags || []).join(", ") || "—"}</div>
                    {p.status === "rejected" && p.rejectionReason ? (
                      <div className="text-danger small mt-1">Reason: {p.rejectionReason}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


