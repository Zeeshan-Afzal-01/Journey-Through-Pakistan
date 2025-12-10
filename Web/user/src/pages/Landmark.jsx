import React, { useMemo, useState } from "react";
import "../assests/css/landmark.css";

export default function Landmark() {
  const [coords, setCoords] = useState(null);
  const [currentLabel, setCurrentLabel] = useState("Current Location: ");

  const mapSrc = useMemo(() => {
    if (coords?.lat && coords?.lng) {
      return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=k&z=13&output=embed`;
    }
    // Default to Lahore with satellite (t=k)
    return "https://maps.google.com/maps?q=Lahore%2C%20Pakistan&t=k&z=12&output=embed";
  }, [coords]);

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setCurrentLabel(
          `Current Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        );
      },
      () => {
        setCurrentLabel("Current Location: permission denied");
      }
    );
  };

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setFileName(f.name);
  };
  const onBrowse = (e) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };

  return (
    <div className="container-fluid py-3">
      <h3 className="fw-bold mb-3">Landmark Identifier</h3>
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="landmark-map position-relative bg-light rounded-4 overflow-hidden shadow-sm">
            <div className="position-absolute top-0 start-0 p-2">
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
            />
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Identify Landmark</h6>

              <div
                className={`upload-dropzone rounded-3 border border-2 border-dashed text-center p-4 mb-4 ${dragActive ? "active" : ""}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <div className="text-muted">
                  {fileName ? (
                    <span className="fw-semibold">{fileName}</span>
                  ) : (
                    <>
                      <div className="mb-2">Drag & drop image here, or</div>
                      <label className="btn btn-outline-secondary px-3 py-2">
                        Browse Files
                        <input type="file" accept="image/*" className="d-none" onChange={onBrowse} />
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="d-grid">
                <button className="btn btn-primary" onClick={onUseCurrentLocation}>
                  <span className="me-2">📍</span> Use Current Location
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nearest Places */}
      <div className="nearest-wrapper mt-4">
        <div className="card shadow-sm rounded-4">
          <div className="card-body">
            <h6 className="text-center text-muted mb-4 fw-semibold">Nearest Places</h6>

            <div className="row g-3 g-md-4">
              {/* item 1 */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                  <div className="d-flex align-items-center gap-3">
                    <img className="rounded-3 nearest-thumb" src="https://images.unsplash.com/photo-1547721064-da6cfb341d50?q=80&w=400&auto=format&fit=crop" alt="Lahore Fort" />
                    <div>
                      <div className="fw-semibold small">Lahore Fort</div>
                      <div className="text-muted x-small">1.5 km</div>
                    </div>
                  </div>
                  <a className="link-primary small fw-semibold" href="#">View</a>
                </div>
              </div>

              {/* item 2 */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                  <div className="d-flex align-items-center gap-3">
                    <img className="rounded-3 nearest-thumb" src="https://images.unsplash.com/photo-1584627151124-918ba9cb5dce?q=80&w=400&auto=format&fit=crop" alt="Walled City" />
                    <div>
                      <div className="fw-semibold small">Walled City of Lahore</div>
                      <div className="text-muted x-small">0.8 km</div>
                    </div>
                  </div>
                  <a className="link-primary small fw-semibold" href="#">View</a>
                </div>
              </div>

              {/* item 3 */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                  <div className="d-flex align-items-center gap-3">
                    <img className="rounded-3 nearest-thumb" src="https://images.unsplash.com/photo-1612212012202-00fe07d9c8c6?q=80&w=400&auto=format&fit=crop" alt="Shalamar Gardens" />
                    <div>
                      <div className="fw-semibold small">Shalamar Gardens</div>
                      <div className="text-muted x-small">6.2 km</div>
                    </div>
                  </div>
                  <a className="link-primary small fw-semibold" href="#">View</a>
                </div>
              </div>

              {/* item 4 */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                  <div className="d-flex align-items-center gap-3">
                    <img className="rounded-3 nearest-thumb" src="https://images.unsplash.com/photo-1622950833100-ec2c2a94ed3b?q=80&w=400&auto=format&fit=crop" alt="Data Darbar" />
                    <div>
                      <div className="fw-semibold small">Data Darbar</div>
                      <div className="text-muted x-small">2.5 km</div>
                    </div>
                  </div>
                  <a className="link-primary small fw-semibold" href="#">View</a>
                </div>
              </div>

              {/* item 5 */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                  <div className="d-flex align-items-center gap-3">
                    <img className="rounded-3 nearest-thumb" src="https://images.unsplash.com/photo-1623162195493-0a7e79539fce?q=80&w=400&auto=format&fit=crop" alt="Tomb of Jahangir" />
                    <div>
                      <div className="fw-semibold small">Tomb of Jahangir</div>
                      <div className="text-muted x-small">5.1 km</div>
                    </div>
                  </div>
                  <a className="link-primary small fw-semibold" href="#">View</a>
                </div>
              </div>

              {/* item 6 */}
              <div className="col-12 col-md-6 col-xl-4">
                <div className="nearest-item d-flex align-items-center justify-content-between border rounded-3 p-2 px-3">
                  <div className="d-flex align-items-center gap-3">
                    <img className="rounded-3 nearest-thumb" src="https://images.unsplash.com/photo-1574169208507-84376144848c?q=80&w=400&auto=format&fit=crop" alt="Delhi Gate" />
                    <div>
                      <div className="fw-semibold small">Delhi Gate</div>
                      <div className="text-muted x-small">1.1 km</div>
                    </div>
                  </div>
                  <a className="link-primary small fw-semibold" href="#">View</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


