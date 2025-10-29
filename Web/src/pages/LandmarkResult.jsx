import React from "react";
import { FiHeart, FiMessageSquare, FiBookmark } from "react-icons/fi";
import "../assests/css/landmark-result.css";

export default function LandmarkResult() {
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
          <div className="card shadow-sm mb-3">
            <div className="ratio ratio-21x9 rounded-top overflow-hidden">
              <img
                className="object-fit-cover"
                src="https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1600&auto=format&fit=crop"
                alt="Faisal Mosque"
              />
            </div>
            <div className="card-body">
              <h2 className="display-6 fw-bolder mb-1">Faisal Mosque, Islamabad</h2>
              <p className="text-muted mb-3">
                A grand and iconic mosque nestled in the foothills of the Margalla Hills, symbolizing Pakistan's aspiration and architectural innovation.
              </p>
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

          <div className="text-center mb-3">
            <a href="/landmark" className="btn btn-primary px-4">Identify Another Landmark</a>
          </div>

          {/* Description sections */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h4 className="fw-bold mb-3">Faisal Mosque</h4>

              <div className="mb-3 pb-3 border-bottom">
                <div className="fw-semibold mb-1">Historical Significance</div>
                <p className="text-muted mb-0">
                  Commissioned in 1976 and completed in 1986, Faisal Mosque was designed by Turkish architect Vedat Dalokay. Funded primarily by King Faisal bin Abdul-Aziz of Saudi Arabia, it marked a milestone in Islamabad's development as a modern capital.
                </p>
              </div>
              <div className="mb-3 pb-3 border-bottom">
                <div className="fw-semibold mb-1">Cultural Context</div>
                <p className="text-muted mb-0">
                  Beyond a place of worship, Faisal Mosque is a major cultural landmark and tourist attraction. Its design departs from traditional mosque architecture, blending modern aesthetics with Islamic heritage.
                </p>
              </div>
              <div>
                <div className="fw-semibold mb-1">Architectural Marvel</div>
                <p className="text-muted mb-0">
                  Inspired by a Bedouin tent, the mosque features four tall pencil-like minarets. The interior is adorned with intricate calligraphy and a magnificent chandelier, while the absence of a traditional dome sets it apart.
                </p>
              </div>
            </div>
          </div>

          {/* About accordion (UI only) */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-2">About This Landmark</h6>
              <div className="accordion" id="aboutAccordion">
                {[
                  { h: "Construction & Design", b: "Details about construction phases, materials used, and key design choices." },
                  { h: "Purpose & Evolution", b: "How the landmark's role evolved over time and its significance today." },
                  { h: "Cultural Impact", b: "Influence on local culture, tourism, and identity." },
                ].map((item, i) => (
                  <div className="accordion-item" key={i}>
                    <h2 className="accordion-header" id={`head${i}`}>
                      <button className={`accordion-button ${i !== 0 ? "collapsed" : ""}`} type="button" data-bs-toggle="collapse" data-bs-target={`#col${i}`} aria-expanded={i === 0} aria-controls={`col${i}`}>
                        {item.h}
                      </button>
                    </h2>
                    <div id={`col${i}`} className={`accordion-collapse collapse ${i === 0 ? "show" : ""}`} data-bs-parent="#aboutAccordion">
                      <div className="accordion-body text-muted">{item.b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-lg-4">
          {/* Nearby Places */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Nearby Places</h6>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr className="text-muted small">
                      <th scope="col">Name</th>
                      <th scope="col">Type</th>
                      <th scope="col">Rating</th>
                      <th scope="col">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Savour Foods", "Restaurant", "4.5", "1.2 km"],
                      ["Serena Hotel", "Hotel", "4.8", "3.5 km"],
                      ["Pakistan Monument", "Attraction", "4.7", "2.8 km"],
                      ["Monal Restaurant", "Restaurant", "4.3", "7.0 km"],
                      ["Centaurus Mall", "Shopping", "4.4", "5.1 km"],
                    ].map((r, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{r[0]}</td>
                        <td className="text-muted">{r[1]}</td>
                        <td className="text-danger fw-semibold">{r[2]}</td>
                        <td className="text-muted">{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Community Posts */}
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Community Posts</h6>
                <a className="small" href="#">View All</a>
              </div>
              <div className="d-flex flex-column gap-3">
                {[
                  {
                    name: "Ayesha Khan",
                    text: "The serene morning prayers at Faisal Mosque are truly an experience. The architecture is breathtaking!",
                    img: "https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1200&auto=format&fit=crop",
                  },
                  {
                    name: "Usman Ali",
                    text: "Visited Faisal Mosque again, and it never ceases to amaze me. The sheer scale and modern design are incredible! Highly recommend the sunset view!",
                    img: "https://images.unsplash.com/photo-1605099256177-3b1b43b77fff?q=80&w=1200&auto=format&fit=crop",
                  },
                  {
                    name: "Zara Tariq",
                    text: "Found a quiet spot near the fountains at Faisal Mosque. Perfect for reflection and photography. Islamabad is beautiful!",
                    img: "https://images.unsplash.com/photo-1648068819712-ffb8d3e6e63b?q=80&w=1200&auto=format&fit=crop",
                  },
                  {
                    name: "Bilal Ahmed",
                    text: "Just learned about the unique Bedouin tent design inspiration behind Faisal Mosque. So fascinating!",
                    img: "https://images.unsplash.com/photo-1520763185298-1b434c919102?q=80&w=1200&auto=format&fit=crop",
                  },
                ].map((p, i) => (
                  <div className="card border-0 shadow-sm" key={i}>
                    <div className="card-body">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="avatar-circle bg-primary-subtle text-primary">{p.name[0]}</div>
                        <div className="fw-semibold small">{p.name}</div>
                      </div>
                      <p className="text-muted small mb-2">{p.text}</p>
                      <div className="ratio ratio-16x9 rounded overflow-hidden mb-2">
                        <img className="object-fit-cover" src={p.img} alt={p.name} />
                      </div>
                      <div className="d-flex align-items-center gap-3 text-muted small">
                        <span className="d-inline-flex align-items-center gap-1"><FiHeart />24</span>
                        <span className="d-inline-flex align-items-center gap-1"><FiMessageSquare />8</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mini footer */}
          <div className="card shadow-sm mt-3">
            <div className="card-body text-center">
              <div className="fw-semibold mb-2">Landmark Explorer</div>
              <div className="text-muted small mb-3">Explore more with us!</div>
              <div className="input-group">
                <span className="input-group-text">📧</span>
                <input className="form-control" placeholder="Your email" />
                <button className="btn btn-primary">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


