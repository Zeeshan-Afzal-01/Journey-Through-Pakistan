import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { identifyLandmark, getNearbyPlaces } from "../api/landmarkApi";
import "../assests/css/landmark.css";

export default function Landmark() {
  const navigate = useNavigate();
  const [coords, setCoords] = useState(null);
  const [currentLabel, setCurrentLabel] = useState("Current Location: Not set");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [nearestPlaces, setNearestPlaces] = useState([]);

  const mapSrc = useMemo(() => {
    if (coords?.lat && coords?.lng) {
      return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=k&z=13&output=embed`;
    }
    // Default to Lahore with satellite (t=k)
    return "https://maps.google.com/maps?q=Lahore%2C%20Pakistan&t=k&z=12&output=embed";
  }, [coords]);

  // Fetch nearby places when coordinates are set
  useEffect(() => {
    const fetchNearbyPlaces = async () => {
      if (coords?.lat && coords?.lng) {
        setIsLoadingPlaces(true);
        try {
          const response = await getNearbyPlaces(coords.lat, coords.lng);
          if (response.data.success && response.data.places) {
            setNearestPlaces(response.data.places);
          }
        } catch (error) {
          console.error("Error fetching nearby places:", error);
          // Don't show error toast, just log it
        } finally {
          setIsLoadingPlaces(false);
        }
      }
    };

    fetchNearbyPlaces();
  }, [coords]);

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setCurrentLabel(
          `Current Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        );
        setIsLoading(false);
        toast.success("Location captured successfully");
        // Nearby places will be fetched automatically via useEffect
      },
      (error) => {
        setIsLoading(false);
        setCurrentLabel("Current Location: permission denied");
        toast.error("Failed to get location. Please allow location access.");
      }
    );
  };

  const [dragActive, setDragActive] = useState(false);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    } else {
      toast.error("Please select an image file");
    }
  };

  const onBrowse = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    } else {
      toast.error("Please select an image file");
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleIdentify = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    if (!coords || !coords.lat || !coords.lng) {
      toast.error("Please set your location first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await identifyLandmark(selectedFile, coords.lat, coords.lng);
      const result = response.data;

      // Store result in sessionStorage for the result page
      sessionStorage.setItem("landmarkResult", JSON.stringify(result));

      // Navigate to result page
      navigate("/landmark/result");
    } catch (error) {
      console.error("Error identifying landmark:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to identify landmark";
      toast.error(errorMessage);

      // If there are nearest places in error response, show them
      if (error.response?.data?.nearest_places) {
        setNearestPlaces(error.response.data.nearest_places);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="container-fluid py-3">
      <h3 className="fw-bold mb-3">Landmark Identifier</h3>
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="landmark-map position-relative bg-light rounded-4 overflow-hidden shadow-sm" style={{ minHeight: "400px" }}>
            <div className="position-absolute top-0 start-0 p-2 z-1">
              <span className="badge bg-light text-dark border shadow-sm">
                {currentLabel}
              </span>
            </div>
            <iframe
              title="map"
              className="w-100 h-100 border-0"
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ minHeight: "400px" }}
            />
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Identify Landmark</h6>

              {previewUrl && (
                <div className="mb-3">
                  <div className="position-relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="img-fluid rounded-3"
                      style={{ maxHeight: "200px", width: "100%", objectFit: "cover" }}
                    />
                    <button
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                      onClick={clearSelection}
                      style={{ zIndex: 10 }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 text-muted small">
                    {selectedFile?.name}
                  </div>
                </div>
              )}

              {!previewUrl && (
                <div
                  className={`upload-dropzone rounded-3 border border-2 border-dashed text-center p-4 mb-4 ${dragActive ? "active" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <div className="text-muted">
                    <div className="mb-2">📷 Drag & drop image here, or</div>
                    <label className="btn btn-outline-secondary px-3 py-2">
                      Browse Files
                      <input
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={onBrowse}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-primary"
                  onClick={onUseCurrentLocation}
                  disabled={isLoading}
                >
                  <span className="me-2">📍</span> Use Current Location
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleIdentify}
                  disabled={isLoading || !selectedFile || !coords}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Identifying...
                    </>
                  ) : (
                    <>
                      <span className="me-2">🔍</span> Identify Landmark
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nearest Places - Show when location is set */}
      {coords && (
        <div className="nearest-wrapper mt-4">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h6 className="text-center text-muted mb-4 fw-semibold">Nearest Places</h6>
              
              {isLoadingPlaces ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2 small">Loading nearby places...</p>
                </div>
              ) : nearestPlaces.length > 0 ? (
                <div className="row g-3 g-md-4">
                  {nearestPlaces.slice(0, 10).map((place, index) => (
                    <div key={place.place_id || index} className="col-12 col-md-6 col-xl-4">
                      <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                        <div className="d-flex align-items-center gap-3 flex-grow-1">
                          {place.photo_url ? (
                            <img
                              className="rounded-3 nearest-thumb"
                              src={place.photo_url}
                              alt={place.name}
                              style={{
                                width: "60px",
                                height: "60px",
                                objectFit: "cover"
                              }}
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          
                          <div className="flex-grow-1">
                            <div className="fw-semibold small">{place.name}</div>
                            <div className="text-muted x-small">
                              {place.distance ? (
                                place.distance < 1000
                                  ? `${place.distance} m`
                                  : `${(place.distance / 1000).toFixed(1)} km`
                              ) : (
                                "Nearby"
                              )}
                            </div>
                            {place.rating && (
                              <div className="text-muted x-small">⭐ {place.rating}</div>
                            )}
                          </div>
                        </div>
                        <a
                          className="link-primary small fw-semibold text-decoration-none"
                          href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No nearby places found. Try moving to a different location.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
