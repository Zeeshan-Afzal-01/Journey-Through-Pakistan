import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiMessageSquare, FiBookmark, FiMapPin, FiStar, FiShare2, FiCopy, FiChevronDown, FiChevronUp, FiImage } from "react-icons/fi";
import { toast } from "react-toastify";
import { getPlacePhotos, getNearbyPlacesForLandmark } from "../api/landmarkApi";
import { generateGeminiContent } from "../api/geminiApi";
import { listPosts } from "../api/postsApi";
import { getProfilePictureUrl, getImageUrl } from "../utils/imageUtils";
import GeminiModal from "../components/GeminiModal";
import "../assests/css/landmark-result.css";

export default function LandmarkResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingNearbyPlaces, setLoadingNearbyPlaces] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceFromCurrentLocation, setDistanceFromCurrentLocation] = useState(null);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [autoDescription, setAutoDescription] = useState('');
  const [loadingAutoDescription, setLoadingAutoDescription] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loadingRelatedPosts, setLoadingRelatedPosts] = useState(false);

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

  // Get current location when component loads
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Error getting current location:", error);
          // Don't show error toast, just log it
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Calculate distance from current location to landmark
  useEffect(() => {
    if (currentLocation && result?.location?.lat && result?.location?.lng) {
      const distance = calculateDistanceBetweenPoints(
        currentLocation.lat,
        currentLocation.lng,
        result.location.lat,
        result.location.lng
      );
      setDistanceFromCurrentLocation(distance);
    }
  }, [currentLocation, result]);

  // Fetch photos when place_id is available (only if not already in result)
  useEffect(() => {
    const fetchPhotos = async () => {
      // If photos are already in result, use them
      if (result?.photos && result.photos.length > 0) {
        console.log('Using photos from result:', result.photos);
        setPhotos(result.photos);
        setLoadingPhotos(false);
        return;
      }
      
      // Otherwise, fetch photos using place_id
      if (result?.place_id) {
        setLoadingPhotos(true);
        try {
          console.log('Fetching photos for place_id:', result.place_id);
          const response = await getPlacePhotos(result.place_id);
          console.log('Photos API response:', response.data);
          if (response.data.success && response.data.photos) {
            console.log('Setting photos:', response.data.photos);
            setPhotos(response.data.photos);
          } else {
            console.warn('No photos in API response');
          }
        } catch (error) {
          console.error("Error fetching photos:", error);
        } finally {
          setLoadingPhotos(false);
        }
      } else {
        console.warn('No place_id available for fetching photos');
        setLoadingPhotos(false);
      }
    };

    if (result) {
      fetchPhotos();
    }
  }, [result]);

  // Fetch nearby places when location is available
  useEffect(() => {
    const fetchNearbyPlaces = async () => {
      if (result?.location?.lat && result?.location?.lng) {
        setLoadingNearbyPlaces(true);
        try {
          const response = await getNearbyPlacesForLandmark(result.location.lat, result.location.lng);
          if (response.data.success && response.data.places) {
            // Filter to only places with photos and limit to 5
            const placesWithPhotos = response.data.places
              .filter(place => place.photo_url)
              .slice(0, 5);
            setNearbyPlaces(placesWithPhotos);
          }
        } catch (error) {
          console.error("Error fetching nearby places:", error);
        } finally {
          setLoadingNearbyPlaces(false);
        }
      }
    };

    if (result) {
      fetchNearbyPlaces();
    }
  }, [result]);

  // Auto-generate description when landmark is found
  useEffect(() => {
    const fetchAutoDescription = async () => {
      if (result?.name && result?.landmark_found && !autoDescription) {
        setLoadingAutoDescription(true);
        try {
          const prompt = `Provide a comprehensive and detailed description of ${result.name}. Include information about its history, architectural significance, cultural importance, notable features, and any interesting facts. Format the response with clear sections and headings.`;
          const res = await generateGeminiContent(prompt, 'gemini-2.5-flash-lite', 0.7);
          
          if (res.data.success && res.data.content) {
            setAutoDescription(res.data.content);
          }
        } catch (error) {
          console.error("Error generating auto description:", error);
          // Don't show error toast, just log it
        } finally {
          setLoadingAutoDescription(false);
        }
      }
    };

    fetchAutoDescription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Extract tags from location name (e.g., "Faisal Mosque" -> "faisalmosque", "faisal", "mosque")
  const extractLocationTags = (locationName) => {
    if (!locationName) return [];
    
    const tags = [];
    // Split by common separators (comma, space, etc.)
    const parts = locationName.toLowerCase()
      .split(/[,\s]+/)
      .filter(part => part.length > 2); // Filter out very short words
    
    parts.forEach(part => {
      // Remove special characters and create tag
      const cleanTag = part.replace(/[^a-z0-9]/g, '');
      if (cleanTag.length > 2) {
        tags.push(cleanTag);
      }
    });
    
    // Also create combined tags (e.g., "faisalmosque" from "Faisal Mosque")
    if (parts.length > 1) {
      const combinedTag = parts.join('').replace(/[^a-z0-9]/g, '');
      if (combinedTag.length > 2) {
        tags.push(combinedTag);
      }
    }
    
    // Remove duplicates
    return [...new Set(tags)];
  };

  // Fetch related posts based on location tags
  useEffect(() => {
    const fetchRelatedPosts = async () => {
      if (!result?.name || !result?.landmark_found) return;
      
      const locationTags = extractLocationTags(result.name);
      if (locationTags.length === 0) return;
      
      setLoadingRelatedPosts(true);
      try {
        const response = await listPosts();
        const allPosts = response.data || [];
        
        // Filter posts that have any of the location tags in their hashtags
        const filtered = allPosts.filter(post => {
          if (!post.hashtags || !Array.isArray(post.hashtags)) return false;
          
          const postTags = post.hashtags.map(tag => tag.toLowerCase());
          return locationTags.some(locationTag => 
            postTags.some(postTag => 
              postTag.includes(locationTag) || locationTag.includes(postTag)
            )
          );
        });
        
        // Sort by likes count (most likes first) and limit to 6
        const sorted = filtered
          .sort((a, b) => {
            const likesA = (a.likes && Array.isArray(a.likes)) ? a.likes.length : 0;
            const likesB = (b.likes && Array.isArray(b.likes)) ? b.likes.length : 0;
            return likesB - likesA; // Sort descending (most likes first)
          })
          .slice(0, 6);
        
        setRelatedPosts(sorted);
      } catch (error) {
        console.error("Error fetching related posts:", error);
      } finally {
        setLoadingRelatedPosts(false);
      }
    };

    fetchRelatedPosts();
  }, [result]);

  // Skeleton Loader Components (defined early to avoid hoisting issues)
  const SkeletonLine = ({ width = "100%", height = "1rem", className = "" }) => (
    <div 
      className={`skeleton-line ${className}`}
      style={{ 
        width, 
        height, 
        borderRadius: '4px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s ease-in-out infinite'
      }}
    />
  );

  const SkeletonBox = ({ width = "100%", height = "200px", className = "" }) => (
    <div 
      className={`skeleton-box ${className}`}
      style={{ 
        width, 
        height, 
        borderRadius: '8px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s ease-in-out infinite'
      }}
    />
  );

  const DescriptionSkeleton = () => (
    <div className="description-skeleton">
      <div className="d-flex align-items-center gap-2 mb-3">
        <SkeletonLine width="40px" height="40px" className="rounded-circle" />
        <SkeletonLine width="200px" height="24px" />
      </div>
      <SkeletonLine width="100%" height="16px" className="mb-2" />
      <SkeletonLine width="100%" height="16px" className="mb-2" />
      <SkeletonLine width="95%" height="16px" className="mb-3" />
      <SkeletonLine width="80%" height="20px" className="mb-2" style={{ fontWeight: 'bold' }} />
      <SkeletonLine width="100%" height="16px" className="mb-2" />
      <SkeletonLine width="100%" height="16px" className="mb-2" />
      <SkeletonLine width="90%" height="16px" className="mb-3" />
      <SkeletonLine width="75%" height="20px" className="mb-2" style={{ fontWeight: 'bold' }} />
      <SkeletonLine width="100%" height="16px" className="mb-2" />
      <SkeletonLine width="98%" height="16px" className="mb-2" />
    </div>
  );

  const PhotoSkeleton = () => (
    <div className="photo-skeleton">
      <SkeletonBox width="100%" height="400px" />
    </div>
  );

  const NearbyPlacesSkeleton = () => (
    <div className="nearby-places-skeleton">
      <SkeletonLine width="150px" height="24px" className="mb-3" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="d-flex align-items-center gap-3 mb-3">
          <SkeletonBox width="60px" height="60px" className="rounded-3" />
          <div className="flex-grow-1">
            <SkeletonLine width="70%" height="16px" className="mb-2" />
            <SkeletonLine width="50%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="container-fluid py-3">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <SkeletonLine width="40px" height="40px" className="rounded-circle" />
              <SkeletonLine width="200px" height="24px" />
            </div>
            <PhotoSkeleton />
            <div className="mt-3">
              <SkeletonLine width="60%" height="32px" className="mb-3" />
              <SkeletonLine width="100%" height="16px" className="mb-2" />
              <SkeletonLine width="95%" height="16px" className="mb-2" />
              <SkeletonLine width="90%" height="16px" />
            </div>
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

  const { landmark_found, name, location, confidence, distance, address, types, rating, nearest_places, labels, landmarkId, place_id, photos: resultPhotos, description } = result;

  // Generate shareable URL
  const shareableUrl = landmarkId 
    ? `${window.location.origin}/landmark/view/${landmarkId}`
    : null;

  const handleCopyLink = () => {
    if (shareableUrl) {
      navigator.clipboard.writeText(shareableUrl).then(() => {
        toast.success("Link copied to clipboard!");
      }).catch(() => {
        toast.error("Failed to copy link");
      });
    }
  };

  // Use photos from result if available, otherwise use fetched photos
  const displayPhotos = resultPhotos && resultPhotos.length > 0 ? resultPhotos : photos;
  
  // Extract photo reference from Google Maps API URL
  const extractPhotoReference = (googleUrl) => {
    if (!googleUrl || typeof googleUrl !== 'string') return null;
    try {
      const url = new URL(googleUrl);
      const photoRef = url.searchParams.get('photoreference');
      return photoRef;
    } catch (e) {
      return null;
    }
  };

  // Convert Google Maps API URL to proxy URL
  const convertToProxyUrl = (url, maxwidth = '1600') => {
    if (!url || typeof url !== 'string') return null;
    
    // If it's already a proxy URL, return as is
    if (url.includes('/landmarks/photo/')) {
      const API_BASE_URL = 'http://localhost:3000';
      return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    }
    
    // If it's a direct Google Maps API URL, extract photo reference and convert
    if (url.includes('maps.googleapis.com/maps/api/place/photo')) {
      const photoRef = extractPhotoReference(url);
      if (photoRef) {
        // Extract maxwidth from original URL if present
        try {
          const originalUrl = new URL(url);
          const originalMaxwidth = originalUrl.searchParams.get('maxwidth') || maxwidth;
          const API_BASE_URL = 'http://localhost:3000';
          return `${API_BASE_URL}/landmarks/photo/${encodeURIComponent(photoRef)}?maxwidth=${originalMaxwidth}`;
        } catch (e) {
          const API_BASE_URL = 'http://localhost:3000';
          return `${API_BASE_URL}/landmarks/photo/${encodeURIComponent(photoRef)}?maxwidth=${maxwidth}`;
        }
      }
    }
    
    // For relative URLs, make them absolute
    if (!url.startsWith('http')) {
      const API_BASE_URL = 'http://localhost:3000';
      return `${API_BASE_URL}${url}`;
    }
    
    // Return as is if it's already a valid URL
    return url;
  };

  // Get main photo (first photo from Google Places or fallback)
  // Handle different photo structures: {url, thumbnail} or direct URL string
  // Convert direct Google URLs to proxy URLs
  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    
    if (typeof photo === 'string') {
      const convertedUrl = convertToProxyUrl(photo);
      console.log('Photo URL (string) converted:', convertedUrl);
      return convertedUrl;
    }
    
    const url = photo.url || photo.thumbnail || null;
    if (!url) {
      console.warn('No URL found in photo object:', photo);
      return null;
    }
    
    const convertedUrl = convertToProxyUrl(url, photo.url ? '1600' : '400');
    console.log('Photo URL (object) converted:', convertedUrl, 'from:', url);
    return convertedUrl;
  };
  
  const mainPhoto = displayPhotos.length > 0 ? getPhotoUrl(displayPhotos[0]) : null;
  
  // Debug logging
  console.log('Display photos:', displayPhotos.length, 'Main photo:', mainPhoto);
  if (displayPhotos.length > 0 && !mainPhoto) {
    console.warn('Photo object structure:', displayPhotos[0]);
  }
  
  // Generate a placeholder image URL based on landmark name
  const getLandmarkPlaceholderImageUrl = (landmarkName) => {
    const encodedName = encodeURIComponent(landmarkName || "landmark");
    return `https://source.unsplash.com/1600x900/?${encodedName},pakistan,monument`;
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistanceBetweenPoints = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  const formatDistance = (dist) => {
    if (!dist) return "Unknown";
    if (dist < 1000) return `${dist}m`;
    return `${(dist / 1000).toFixed(1)} km`;
  };

  // Format auto-generated description with proper styling
  const formatAutoDescription = (text) => {
    if (!text) return '';

    // First, process **text** headings within paragraphs
    const processBoldHeadings = (content) => {
      // Match **text:** at the start of a line or after newline
      const headingRegex = /(?:^|\n)\s*\*\*([^*]+?):?\*\*\s*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = headingRegex.exec(content)) !== null) {
        // Add text before the heading
        if (match.index > lastIndex) {
          const beforeText = content.substring(lastIndex, match.index).trim();
          if (beforeText) {
            parts.push({ type: 'text', content: beforeText });
          }
        }
        
        // Add the heading
        const headingText = match[1].trim();
        parts.push({ type: 'heading', content: headingText });
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < content.length) {
        const remainingText = content.substring(lastIndex).trim();
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText });
        }
      }

      // If no headings found, return original content
      if (parts.length === 0) {
        return [{ type: 'text', content }];
      }

      return parts;
    };

    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, index) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;

      // Check if it's a heading (starts with #)
      if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length;
        const headingText = trimmedPara.replace(/^#+\s*/, '');
        const HeadingTag = `h${Math.min(level + 2, 6)}`; // h3-h6
        return React.createElement(
          HeadingTag,
          { key: index, className: 'fw-bold mb-2 mt-3', style: { color: '#0d6efd' } },
          headingText
        );
      }

      // Check if it's a list item
      if (trimmedPara.match(/^[-*•]\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <ul key={index} className="mb-3 ps-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-1">{item.replace(/^[-*•]\s/, '')}</li>
            ))}
          </ul>
        );
      }

      // Check if it's a numbered list
      if (trimmedPara.match(/^\d+\.\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <ol key={index} className="mb-3 ps-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-1">{item.replace(/^\d+\.\s/, '')}</li>
            ))}
          </ol>
        );
      }

      // Process **text** headings within the paragraph
      const processedParts = processBoldHeadings(trimmedPara);
      
      if (processedParts.length === 1 && processedParts[0].type === 'text') {
        // No headings found, render as regular paragraph
        return (
          <p key={index} className="mb-3" style={{ lineHeight: '1.7', fontSize: '1rem' }}>
            {trimmedPara.split('\n').map((line, lineIndex, array) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < array.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      }

      // Render with headings
      return (
        <div key={index} className="mb-3">
          {processedParts.map((part, partIndex) => {
            if (part.type === 'heading') {
              return (
                <h5 
                  key={partIndex} 
                  className="fw-bold mb-2 mt-3" 
                  style={{ color: '#0d6efd', fontSize: '1.1rem' }}
                >
                  {part.content}
                </h5>
              );
            } else {
              return (
                <p key={partIndex} style={{ lineHeight: '1.7', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {part.content.split('\n').map((line, lineIndex, array) => (
                    <React.Fragment key={lineIndex}>
                      {line}
                      {lineIndex < array.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              );
            }
          })}
        </div>
      );
    }).filter(Boolean);
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
              {/* Main Photo */}
              <div className="ratio ratio-21x9 rounded-top overflow-hidden position-relative">
                {loadingPhotos ? (
                  <div className="position-relative" style={{ minHeight: '400px' }}>
                    <PhotoSkeleton />
                  
                  </div>
                ) : mainPhoto ? (
                  <>
                    <img
                      className="object-fit-cover w-100 h-100"
                      src={mainPhoto}
                      alt={name}
                      onError={(e) => {
                        console.error('Main photo failed to load:', {
                          src: e.target.src,
                          mainPhoto: mainPhoto,
                          error: 'Image load failed'
                        });
                        // Try fallback image only if it's different
                        const fallbackUrl = getLandmarkPlaceholderImageUrl(name);
                        if (e.target.src !== fallbackUrl && e.target.src !== mainPhoto) {
                          console.log('Trying fallback URL:', fallbackUrl);
                          e.target.src = fallbackUrl;
                        } else {
                          // Show error message instead of broken image
                          console.log('All image sources failed, showing placeholder');
                          e.target.style.display = 'none';
                        }
                      }}
                      onLoad={() => {
                        console.log('✅ Main photo loaded successfully:', mainPhoto);
                      }}
                    />
                    <div className="position-absolute top-0 end-0 m-2">
                     
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      className="object-fit-cover w-100 h-100"
                      src={getLandmarkPlaceholderImageUrl(name)}
                      alt={name}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1600&auto=format&fit=crop";
                      }}
                    />
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className="badge bg-secondary">
                        <small>Placeholder Image</small>
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Photo Gallery - Collapsible */}
              {displayPhotos.length > 0 && (
                <div className="card-body border-top">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <button
                      className="btn btn-link text-decoration-none p-0 d-flex align-items-center photo-gallery-toggle"
                      onClick={() => setShowPhotoGallery(!showPhotoGallery)}
                    >
                      <span className="fw-semibold">
                        <FiImage className="me-2" />
                        {displayPhotos.length === 1 ? 'View Photo' : `View All Photos (${displayPhotos.length})`}
                      </span>
                      {showPhotoGallery ? <FiChevronUp className="ms-2" /> : <FiChevronDown className="ms-2" />}
                    </button>
                   
                  </div>
                  
                  {showPhotoGallery && (
                    <div className="mt-3">
                      <div className="row g-2">
                        {displayPhotos.map((photo, index) => {
                          const photoUrl = getPhotoUrl(photo);
                          const thumbnailUrl = typeof photo === 'string'
                            ? getPhotoUrl(photo)
                            : getPhotoUrl(photo?.thumbnail ? { url: photo.thumbnail } : photo);
                          
                          return (
                            <div key={index} className="col-6 col-md-4 col-lg-3">
                              <div 
                                className="ratio ratio-16x9 rounded overflow-hidden cursor-pointer photo-thumbnail"
                                onClick={() => photoUrl && window.open(photoUrl, '_blank')}
                              >
                                {thumbnailUrl ? (
                                  <img
                                    src={thumbnailUrl}
                                    alt={`${name} - Photo ${index + 1}`}
                                    className="object-fit-cover w-100 h-100"
                                    onError={(e) => {
                                      e.target.src = getLandmarkPlaceholderImageUrl(name);
                                    }}
                                  />
                                ) : (
                                  <div className="d-flex align-items-center justify-content-center bg-light">
                                    <FiImage size={24} className="text-muted" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  {distanceFromCurrentLocation !== null ? (
                    <span className="badge bg-primary text-white">
                      <FiMapPin className="me-1" />
                      {formatDistance(distanceFromCurrentLocation)} from your location
                    </span>
                  ) : distance ? (
                    <span className="badge bg-light text-dark">
                      📍 {formatDistance(distance)} away
                    </span>
                  ) : null}
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

                <div className="d-flex gap-2 flex-wrap">
                  {shareableUrl && (
                    <button className="btn btn-outline-primary" onClick={handleCopyLink}>
                      <FiCopy className="me-2" /> Copy Link
                    </button>
                  )}
                  <button className="btn btn-outline-secondary">
                    <FiBookmark className="me-2" /> Save
                  </button>
                  {name && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setGeminiPrompt('');
                        setIsGeminiModalOpen(true);
                      }}
                    >
                      Ask Anything About This Landmark from AI
                    </button>
                  )}
                  <button className="btn btn-outline-primary">
                    <FiMessageSquare className="me-2" /> Discuss
                  </button>
                </div>
                {shareableUrl && (
                  <div className="mt-2">
                    <small className="text-muted">Share this landmark: </small>
                    <code className="small bg-light px-2 py-1 rounded d-block mt-1" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {shareableUrl}
                    </code>
                  </div>
                )}
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

                {/* Auto-Generated Description Section */}
                <div className="mb-4 pb-4 border-bottom">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="badge bg-primary-subtle text-primary p-2 rounded-3">📖</div>
                      <h5 className="fw-bold mb-0">About {name}</h5>
                    </div>
                    {loadingAutoDescription && (
                      <span className="badge bg-warning text-dark">
                        <small>🤖 Getting from AI</small>
                      </span>
                    )}
                    {autoDescription && !loadingAutoDescription && (
                      <span className="badge bg-success">
                        <small>✓ Generated by AI</small>
                      </span>
                    )}
                  </div>
                  
                  {loadingAutoDescription ? (
                    <DescriptionSkeleton />
                  ) : autoDescription ? (
                    <div className="auto-description-content">
                      {formatAutoDescription(autoDescription)}
                    </div>
                  ) : (
                    <div className="text-muted">
                      <p className="mb-0">Description will be generated shortly...</p>
                    </div>
                  )}
                </div>

                {types && (
                  <div className="mb-3 pb-3 border-bottom">
                    <div className="fw-semibold mb-1">Type</div>
                    <p className="text-muted mb-0">
                      {types.map(t => t.replace(/_/g, " ")).join(", ")}
                    </p>
                  </div>
                )}

                {description && (
                  <div className="mb-3 pb-3 border-bottom">
                    <div className="fw-semibold mb-1">Description</div>
                    <p className="text-muted mb-0">{description}</p>
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
          {loadingNearbyPlaces ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <SkeletonLine width="150px" height="24px" />
                  <span className="badge bg-info text-dark">
                    <small>Getting from Places API</small>
                  </span>
                </div>
                <NearbyPlacesSkeleton />
              </div>
            </div>
          ) : nearbyPlaces.length > 0 ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0">Nearby Places</h6>
                  <span className="badge bg-info text-dark">
                    <small>From Places API</small>
                  </span>
                </div>
                <div className="d-flex flex-column gap-3">
                  {nearbyPlaces.map((place, index) => (
                    <div key={place.place_id || index} className="d-flex align-items-center gap-3 border rounded-3 p-2">
                      {place.photo_url && (
                        <img
                          className="rounded-3"
                          src={place.photo_url}
                          alt={place.name}
                          style={{
                            width: "60px",
                            height: "60px",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
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
                      <a
                        className="link-primary small fw-semibold text-decoration-none"
                        href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : nearest_places && nearest_places.length > 0 ? (
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
          ) : null}

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

          {/* Community Posts */}
          {loadingRelatedPosts ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="text-center text-muted small py-3">
                  Loading related posts...
                </div>
              </div>
            </div>
          ) : relatedPosts.length > 0 ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0">Community Posts</h6>
                  <button 
                    className="btn btn-sm btn-link text-primary p-0"
                    onClick={() => navigate('/community')}
                    style={{ fontSize: '0.875rem' }}
                  >
                    View All
                  </button>
                </div>
                <div className="d-flex flex-column gap-3">
                  {relatedPosts.map(post => {
                    const likesCount = (post.likes && Array.isArray(post.likes)) ? post.likes.length : 0;
                    const commentsCount = (post.comments && Array.isArray(post.comments)) ? post.comments.length : 0;
                    
                    return (
                      <div 
                        key={post._id} 
                        className="border rounded p-3"
                        onClick={() => navigate(`/community/post/${post._id}`)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <img 
                            className="rounded-circle" 
                            src={getProfilePictureUrl(post.author?.profilePicture, post.author?.hasProfilePicture)}
                            alt={post.author?.name || "User"}
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <div className="flex-grow-1">
                            <div className="fw-semibold small">{post.author?.name || "Unknown"}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {new Date(post.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                              {post.author?.city && ` • ${post.author.city}`}
                            </div>
                          </div>
                        </div>
                        {post.imageUrl ? (
                          <>
                            <div className="small mb-2" style={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: '1.5'
                            }}>
                              {post.text}
                            </div>
                            <img 
                              src={getImageUrl(post.imageUrl)}
                              alt="Post"
                              className="rounded mb-2"
                              style={{ 
                                width: '100%', 
                                maxHeight: '250px', 
                                objectFit: 'cover',
                                borderRadius: '8px'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                              onLoad={(e) => {
                                // Ensure image displays properly
                                e.target.style.display = 'block';
                              }}
                            />
                          </>
                        ) : (
                          <div className="small mb-2" style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 6,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: '1.5'
                          }}>
                            {post.text}
                          </div>
                        )}
                        <div className="d-flex align-items-center gap-3 mt-2 pt-2 border-top">
                          <div className="d-flex align-items-center gap-1 text-muted small">
                            <FiHeart size={16} />
                            <span>{likesCount}</span>
                          </div>
                          <div className="d-flex align-items-center gap-1 text-muted small">
                            <FiMessageSquare size={16} />
                            <span>{commentsCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
         
        </div>
      </div>

      {/* Gemini Modal */}
      <GeminiModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        prompt={geminiPrompt}
        title={`Ask About ${name || 'This Place'}`}
        model="gemini-2.5-flash-lite"
        temperature={0.7}
        landmarkName={name}
        autoFetch={false}
      />
    </div>
  );
}
