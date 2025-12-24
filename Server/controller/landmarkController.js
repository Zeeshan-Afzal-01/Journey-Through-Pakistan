import axios from 'axios';
import { getGoogleVisionAPIKey, getGooglePlacesAPIKey } from '../utils/settingsHelper.js';
import { calculateDistance, sortPlacesByDistance, bufferToBase64, POPULAR_LANDMARKS } from '../utils/landmarkHelpers.js';

/**
 * Get nearby places based on GPS coordinates
 */
export const getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    // const lat=31.4521885
    // const lng=74.2907812
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'GPS coordinates required',
        message: 'Please provide latitude (lat) and longitude (lng)' 
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ 
        error: 'Invalid GPS coordinates',
        message: 'Latitude and longitude must be valid numbers' 
      });
    }

    // Get API key
    const placesApiKey = await getGooglePlacesAPIKey();

    if (!placesApiKey) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'Google Places API key is required' 
      });
    }

    // Get nearby places with 100m radius for accurate nearest places
    const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    let allResults = [];
    
    // First request with 100m radius to get the absolute closest places
    const nearbySearchParams = new URLSearchParams({
      location: `${userLat},${userLng}`,
      radius: '100', // 100 meters - very close places only
      key: placesApiKey
    });

    let nearbyResponse = await axios.get(`${nearbySearchUrl}?${nearbySearchParams}`);
    
    if (nearbyResponse.data.results) {
      allResults = [...allResults, ...nearbyResponse.data.results];
    }

    // If we got a next_page_token, fetch more results
    let nextPageToken = nearbyResponse.data.next_page_token;
    if (nextPageToken && allResults.length < 20) {
      // Wait a bit for the token to become valid (Google requires a delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const nextPageParams = new URLSearchParams({
        pagetoken: nextPageToken,
        key: placesApiKey
      });
      
      try {
        const nextPageResponse = await axios.get(`${nearbySearchUrl}?${nextPageParams}`);
        if (nextPageResponse.data.results) {
          allResults = [...allResults, ...nextPageResponse.data.results];
        }
      } catch (error) {
        console.error('Error fetching next page:', error.message);
      }
    }

    // If we don't have enough results (less than 5), expand radius gradually
    if (allResults.length < 10) {
      // Try 500m radius
      const mediumRadiusParams = new URLSearchParams({
        location: `${userLat},${userLng}`,
        radius: '500', // 500 meters
        key: placesApiKey
      });
      
      try {
        const mediumRadiusResponse = await axios.get(`${nearbySearchUrl}?${mediumRadiusParams}`);
        if (mediumRadiusResponse.data.results) {
          // Merge results, avoiding duplicates
          const existingPlaceIds = new Set(allResults.map(p => p.place_id));
          const newResults = mediumRadiusResponse.data.results.filter(
            p => !existingPlaceIds.has(p.place_id)
          );
          allResults = [...allResults, ...newResults];
        }
      } catch (error) {
        console.error('Error fetching medium radius results:', error.message);
      }
    }

    // If still not enough, try 1km radius
    if (allResults.length < 10) {
      const largerRadiusParams = new URLSearchParams({
        location: `${userLat},${userLng}`,
        radius: '1000', // 1km radius
        key: placesApiKey
      });
      
      try {
        const largerRadiusResponse = await axios.get(`${nearbySearchUrl}?${largerRadiusParams}`);
        if (largerRadiusResponse.data.results) {
          // Merge results, avoiding duplicates
          const existingPlaceIds = new Set(allResults.map(p => p.place_id));
          const newResults = largerRadiusResponse.data.results.filter(
            p => !existingPlaceIds.has(p.place_id)
          );
          allResults = [...allResults, ...newResults];
        }
      } catch (error) {
        console.error('Error fetching larger radius results:', error.message);
      }
    }
    
    console.log('Nearby Places API Response:', {
      totalResults: allResults.length,
      status: nearbyResponse.data.status
    });
    
    if (allResults.length > 0) {
      // Log first few results for debugging
      console.log('First 15 results (before sorting):', 
        allResults.slice(0, 15).map(p => ({
          name: p.name,
          types: p.types?.slice(0, 3),
          hasPhoto: !!(p.photos && p.photos.length > 0),
          rating: p.rating
        }))
      );
      
      // First, calculate distances for ALL results, then filter
      const placesWithDistance = sortPlacesByDistance(
        allResults,
        userLat,
        userLng
      )
      .filter(place => {
        const types = place.types || [];
        
        // Exclude administrative/geographic types
        const excludeTypes = [
          'transit_station', 
          'route', 
          'street_address', 
          'subway_station', 
          'bus_station',
          'locality',
          'political',
          'administrative_area_level_1',
          'administrative_area_level_2',
          'country',
          'neighborhood'
        ];
        
        // Exclude if it has any excluded types
        if (excludeTypes.some(type => types.includes(type))) {
          return false;
        }
        
        // Filter out places that ONLY have generic types (point_of_interest, establishment)
        // Keep places that have specific business types (gym, restaurant, pharmacy, store, etc.)
        const genericTypes = ['point_of_interest'];
        const specificTypes = types.filter(type => 
          !genericTypes.includes(type) && !excludeTypes.includes(type)
        );
        
        // Keep if it has at least one specific type (gym, restaurant, pharmacy, etc.)
        // OR if it has a rating (indicates it's a real business/place)
        const hasSpecificType = specificTypes.length > 0;
        const hasRating = place.rating && place.rating > 0;
        
        // Keep places with specific types OR places with ratings
        return hasSpecificType || hasRating;
      });

      // Sort by distance FIRST (most important), then use photos/ratings as tie-breakers
      // Sort: prioritize by user_ratings_total (popularity), then distance, then rating
      const sortedResults = placesWithDistance
      .sort((a, b) => {
        // 1. Most significant: Popularity (number of user ratings)
        const aRatings = a.user_ratings_total || 0;
        const bRatings = b.user_ratings_total || 0;
        if (aRatings !== bRatings) {
          return bRatings - aRatings; // More ratings first
        }
        // 2. Then by distance (closer is better)
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        // 3. Then by rating if ratings and distances are identical
        const aRating = a.rating || 0;
        const bRating = b.rating || 0;
        return bRating - aRating;
      })
      .slice(0, 10); // Top 10

      // Check if "Atif Fitness Club" is in the results
      const atifFitness = allResults.find(p => 
        p.name && p.name.toLowerCase().includes('atif fitness')
      );
      if (atifFitness) {
        const atifDistance = calculateDistance(
          userLat,
          userLng,
          atifFitness.geometry.location.lat,
          atifFitness.geometry.location.lng
        );
        console.log('Atif Fitness Club found:', {
          name: atifFitness.name,
          distance: Math.round(atifDistance),
          hasPhoto: !!(atifFitness.photos && atifFitness.photos.length > 0),
          rating: atifFitness.rating,
          types: atifFitness.types?.slice(0, 3),
          inTop5: sortedResults.some(p => p.place_id === atifFitness.place_id),
          position: sortedResults.findIndex(p => p.place_id === atifFitness.place_id) + 1
        });
      }

      // Log final sorted results for debugging
      console.log('Top 10 places (after sorting):', 
        sortedResults.map(p => ({
          name: p.name,
          distance: Math.round(p.distance),
          hasPhoto: !!(p.photos && p.photos.length > 0),
          rating: p.rating,
          types: p.types?.slice(0, 3)
        }))
      );

      // Format results with photo URLs
      const places = sortedResults.map(place => {
        let photoUrl = null;
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${placesApiKey}`;
        }

        return {
          name: place.name,
          place_id: place.place_id,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          distance: Math.round(place.distance || 0),
          address: place.vicinity || place.formatted_address,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          photo_url: photoUrl
        };
      });

      res.json({
        success: true,
        places
      });
    } else {
      res.json({
        success: true,
        places: []
      });
    }
  } catch (error) {
    console.error('Error getting nearby places:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Main landmark identification endpoint
 * Implements Google Lens-level landmark detection pipeline
 */
export const identifyLandmark = async (req, res) => {
  try {
    // Validate input
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image provided',
        message: 'Please provide an image file' 
      });
    }

    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'GPS coordinates required',
        message: 'Please provide latitude (lat) and longitude (lng)' 
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ 
        error: 'Invalid GPS coordinates',
        message: 'Latitude and longitude must be valid numbers' 
      });
    }

    // Get API keys
    const visionApiKey = await getGoogleVisionAPIKey();
    const placesApiKey = await getGooglePlacesAPIKey();

    if (!visionApiKey || !placesApiKey) {
      return res.status(500).json({ 
        error: 'API keys not configured',
        message: 'Google Vision and Places API keys are required' 
      });
    }

    // Step 1: Convert image to base64
    const imageBase64 = bufferToBase64(req.file.buffer);

    // Step 2: Call Vision API for landmark detection
    const visionResults = await detectLandmarksWithVision(visionApiKey, imageBase64);

    // Step 3: Verify with Places API
    let result;
    
    // Always try to verify, even if no landmarks detected (use labels and text)
    if (visionResults.landmarks && visionResults.landmarks.length > 0) {
      // Vision API found landmarks - verify with Places API
      result = await verifyWithPlacesAPI(
        placesApiKey, 
        visionResults, 
        userLat, 
        userLng
      );
    } else if (visionResults.labels && visionResults.labels.length > 0) {
      // No landmarks but we have labels - try to find places using labels
      result = await verifyWithPlacesAPI(
        placesApiKey, 
        visionResults, 
        userLat, 
        userLng
      );
    } else {
      // No landmarks or labels - use Nearby Search as fallback
      result = await getNearbyPlacesFallback(
        placesApiKey, 
        userLat, 
        userLng,
        [],
        visionResults.labels || []
      );
    }

    // Step 4: Optional - Check against popular landmarks cache
    result = enhanceWithPopularLandmarks(result, userLat, userLng);

    // Log the final result for debugging
    console.log('Final Landmark Result:', {
      landmark_found: result.landmark_found,
      name: result.name,
      distance: result.distance,
      confidence: result.confidence,
      method: result.method || 'unknown'
    });

    res.json(result);
  } catch (error) {
    console.error('Error identifying landmark:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Step 2: Detect landmarks using Google Cloud Vision API
 */
const detectLandmarksWithVision = async (apiKey, imageBase64) => {
  try {
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    
    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64
          },
          features: [
            { type: 'LANDMARK_DETECTION', maxResults: 5 },
            { type: 'LABEL_DETECTION', maxResults: 20 }, // Increased for better context
            { type: 'TEXT_DETECTION', maxResults: 10 } // Detect text in image (signs, names)
          ]
        }
      ]
    };

    const response = await axios.post(visionUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const landmarkAnnotations = response.data.responses[0]?.landmarkAnnotations || [];
    const labelAnnotations = response.data.responses[0]?.labelAnnotations || [];
    const textAnnotations = response.data.responses[0]?.textAnnotations || [];

    // Extract landmark information
    const landmarks = landmarkAnnotations.map(annotation => ({
      name: annotation.description,
      confidence: annotation.score,
      locations: annotation.locations || []
    }));

    // Extract labels for context (prioritize high-confidence labels)
    const labels = labelAnnotations
      .filter(label => label.score > 0.5) // Only high-confidence labels
      .map(annotation => ({
        description: annotation.description,
        score: annotation.score
      }));

    // Extract text from image (could be building names, signs, etc.)
    const detectedText = textAnnotations
      .slice(1) // Skip first element (full text)
      .map(annotation => annotation.description)
      .filter(text => text && text.length > 2);

    console.log('Vision API Results:', {
      landmarks: landmarks.length,
      labels: labels.length,
      text: detectedText.length
    });

    return {
      landmarks,
      labels,
      text: detectedText
    };
  } catch (error) {
    console.error('Vision API error:', error.response?.data || error.message);
    // Return empty results if Vision API fails
    return {
      landmarks: [],
      labels: [],
      text: []
    };
  }
};

/**
 * Step 3: Verify Vision results with Places API
 */
const verifyWithPlacesAPI = async (apiKey, visionResults, userLat, userLng) => {
  const { landmarks, labels, text } = visionResults;
  
  // Search queries to try (in order of priority)
  const searchQueries = [];
  
  // 1. Add landmark names from Vision API
  if (landmarks && landmarks.length > 0) {
    landmarks.forEach(landmark => {
      searchQueries.push(landmark.name);
      // Also try without common suffixes
      const nameWithoutSuffix = landmark.name
        .replace(/\s+(University|College|School|Mosque|Fort|Tower|Monument|Garden|Park)$/i, '');
      if (nameWithoutSuffix !== landmark.name) {
        searchQueries.push(nameWithoutSuffix);
      }
    });
  }

  // 2. Add detected text from image (could be building names)
  if (text && text.length > 0) {
    text.forEach(textItem => {
      if (textItem && textItem.length > 3 && textItem.length < 50) {
        // Clean text (remove special characters, keep words)
        const cleanedText = textItem.replace(/[^\w\s]/g, ' ').trim();
        if (cleanedText.length > 3) {
          searchQueries.push(cleanedText);
        }
      }
    });
  }

  // 3. Add label-based searches (university, mosque, building, etc.)
  if (labels && labels.length > 0) {
    const relevantLabels = labels
      .filter(l => ['university', 'college', 'mosque', 'building', 'monument', 'tower', 'park', 'garden', 'school'].some(
        keyword => l.description.toLowerCase().includes(keyword)
      ))
      .map(l => l.description);
    
    // If we have relevant labels but no other queries, use location + label
    if (relevantLabels.length > 0 && searchQueries.length === 0) {
      relevantLabels.forEach(label => {
        searchQueries.push(`${label} near ${userLat},${userLng}`);
      });
    }
  }

  // If no search queries, fall back to nearby search
  if (searchQueries.length === 0) {
    return await getNearbyPlacesFallback(apiKey, userLat, userLng, landmarks || [], labels || []);
  }

  // Try each search query
  for (const query of searchQueries) {
    try {
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
      const textSearchParams = new URLSearchParams({
        query: query,
        location: `${userLat},${userLng}`,
        radius: '2000', // Increased from 500m to 2km for better coverage
        key: apiKey
      });

      const textSearchResponse = await axios.get(`${textSearchUrl}?${textSearchParams}`);
      
      if (textSearchResponse.data.results && textSearchResponse.data.results.length > 0) {
        // Sort results by distance
        const sortedResults = sortPlacesByDistance(
          textSearchResponse.data.results,
          userLat,
          userLng
        );

        const closestMatch = sortedResults[0];
        const distance = closestMatch.distance;

        // If within 2km, consider it verified (increased from 500m)
        if (distance <= 2000) {
          const matchedLandmark = landmarks.find(l => 
            l.name.toLowerCase().includes(query.toLowerCase()) || 
            query.toLowerCase().includes(l.name.toLowerCase())
          );

          return {
            landmark_found: true,
            name: closestMatch.name,
            place_id: closestMatch.place_id,
            location: {
              lat: closestMatch.geometry.location.lat,
              lng: closestMatch.geometry.location.lng
            },
            confidence: matchedLandmark?.confidence || 0.8,
            distance: Math.round(distance),
            address: closestMatch.formatted_address || closestMatch.vicinity,
            types: closestMatch.types,
            rating: closestMatch.rating,
            labels: labels.map(l => l.description),
            search_query: query
          };
        }
      }
    } catch (error) {
      console.error(`Error verifying query "${query}":`, error.response?.data || error.message);
      continue;
    }
  }

  // If no exact match found, try nearby search with labels
  return await getNearbyPlacesFallback(apiKey, userLat, userLng, landmarks, labels);
};

/**
 * Step 3 Fallback: Get nearby places when Vision API finds nothing or verification fails
 */
const getNearbyPlacesFallback = async (apiKey, userLat, userLng, visionLandmarks = [], labels = []) => {
  try {
    // Try multiple strategies to find the place
    
    // Strategy 1: Nearby Search with increased radius
    const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const nearbySearchParams = new URLSearchParams({
      location: `${userLat},${userLng}`,
      radius: '2000', // Increased from 500m to 2km
      key: apiKey
    });

    const nearbyResponse = await axios.get(`${nearbySearchUrl}?${nearbySearchParams}`);
    
    let allPlaces = [];
    
    if (nearbyResponse.data.results && nearbyResponse.data.results.length > 0) {
      allPlaces = nearbyResponse.data.results;
    }

    // Strategy 2: If we have labels, try searching by type
    if (labels.length > 0 && allPlaces.length === 0) {
      const typeKeywords = {
        'university': 'university',
        'college': 'school',
        'mosque': 'mosque',
        'building': 'establishment',
        'monument': 'tourist_attraction',
        'park': 'park',
        'garden': 'park'
      };

      for (const label of labels) {
        const labelLower = label.description.toLowerCase();
        for (const [keyword, placeType] of Object.entries(typeKeywords)) {
          if (labelLower.includes(keyword)) {
            try {
              const typeSearchParams = new URLSearchParams({
                location: `${userLat},${userLng}`,
                radius: '2000',
                type: placeType,
                key: apiKey
              });
              const typeResponse = await axios.get(`${nearbySearchUrl}?${typeSearchParams}`);
              if (typeResponse.data.results) {
                allPlaces = [...allPlaces, ...typeResponse.data.results];
              }
            } catch (error) {
              console.error(`Error searching by type ${placeType}:`, error.message);
            }
            break;
          }
        }
      }
    }

    if (allPlaces.length > 0) {
      // Remove duplicates by place_id
      const uniquePlaces = Array.from(
        new Map(allPlaces.map(place => [place.place_id, place])).values()
      );

      // Sort by distance and rating (prioritize places with ratings)
      const sortedResults = sortPlacesByDistance(uniquePlaces, userLat, userLng)
        .sort((a, b) => {
          // Prioritize places with ratings
          if (a.rating && !b.rating) return -1;
          if (!a.rating && b.rating) return 1;
          if (a.rating && b.rating) {
            // If both have ratings, prefer higher rating
            if (Math.abs(a.rating - b.rating) > 0.5) {
              return b.rating - a.rating;
            }
          }
          // Then by distance
          return a.distance - b.distance;
        })
        .slice(0, 10); // Top 10

      // If we have Vision API results but they weren't verified, still show them
      const hasVisionResults = visionLandmarks.length > 0;
      const topResult = sortedResults[0];

      // If the top result is very close (< 100m), consider it a match
      if (topResult && topResult.distance < 100 && hasVisionResults) {
        return {
          landmark_found: true,
          name: topResult.name,
          place_id: topResult.place_id,
          location: {
            lat: topResult.geometry.location.lat,
            lng: topResult.geometry.location.lng
          },
          confidence: visionLandmarks[0].confidence || 0.75,
          distance: Math.round(topResult.distance),
          address: topResult.vicinity || topResult.formatted_address,
          types: topResult.types,
          rating: topResult.rating,
          user_ratings_total: topResult.user_ratings_total,
          labels: labels.map(l => l.description),
          method: 'nearby_search'
        };
      }

      return {
        landmark_found: hasVisionResults,
        name: hasVisionResults ? visionLandmarks[0].name : (topResult ? topResult.name : null),
        confidence: hasVisionResults ? visionLandmarks[0].confidence : (topResult ? 0.7 : null),
        nearest_places: sortedResults.map(place => ({
          name: place.name,
          place_id: place.place_id,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          distance: Math.round(place.distance || 0),
          address: place.vicinity || place.formatted_address,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total
        }))
      };
    }

    return {
      landmark_found: false,
      nearest_places: []
    };
  } catch (error) {
    console.error('Nearby Search API error:', error.response?.data || error.message);
    return {
      landmark_found: false,
      nearest_places: [],
      error: 'Unable to fetch nearby places'
    };
  }
};

/**
 * Step 4: Enhance results with popular landmarks cache
 */
const enhanceWithPopularLandmarks = (result, userLat, userLng) => {
  // Check if user is near any popular landmark
  for (const [popularName, coords] of Object.entries(POPULAR_LANDMARKS)) {
    const distance = calculateDistance(
      userLat, 
      userLng, 
      coords.lat, 
      coords.lng
    );
    
    // If within 500m of a popular landmark
    if (distance <= 500) {
      // If we already found a landmark, check if it matches
      if (result.landmark_found && result.name) {
        const landmarkName = result.name.toLowerCase();
        const popularNameLower = popularName.toLowerCase();
        
        if (landmarkName.includes(popularNameLower) || 
            popularNameLower.includes(landmarkName)) {
          result.confidence = Math.min(0.95, (result.confidence || 0.7) + 0.15);
          result.is_popular_landmark = true;
          break;
        }
      } else if (!result.landmark_found && result.nearest_places && result.nearest_places.length > 0) {
        // Check if any nearby place matches the popular landmark
        const matchingPlace = result.nearest_places.find(place => {
          const placeName = place.name.toLowerCase();
          return placeName.includes(popularNameLower) || 
                 popularNameLower.includes(placeName);
        });
        
        if (matchingPlace) {
          // Promote this place to the main result
          result.landmark_found = true;
          result.name = matchingPlace.name;
          result.place_id = matchingPlace.place_id;
          result.location = matchingPlace.location;
          result.confidence = 0.85;
          result.distance = matchingPlace.distance;
          result.address = matchingPlace.address;
          result.types = matchingPlace.types;
          result.rating = matchingPlace.rating;
          result.is_popular_landmark = true;
          break;
        }
      } else if (!result.landmark_found) {
        // User is near a popular landmark but we didn't find it - create a result
        result.landmark_found = true;
        result.name = popularName;
        result.location = coords;
        result.confidence = 0.8;
        result.distance = Math.round(distance);
        result.is_popular_landmark = true;
        result.method = 'popular_landmark_cache';
        break;
      }
    }
  }
  
  return result;
};
