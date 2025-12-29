import User from "../models/user.models.js";
import Place from "../models/place.models.js";

/**
 * Personalized recommendation engine (rule-based; no ML).
 *
 * Scoring weights:
 * - Interest match: +40
 * - Distance: up to +30 (closer => higher; linear decay)
 * - Rating: +20 if rating >= 4
 * - Popularity: up to +10 (scaled from popularityScore)
 *
 * Performance notes:
 * - Uses $geoNear (2dsphere) when userLocation is provided.
 * - Limits the candidate pool before doing heavier computed scoring.
 * - Excludes already visited places at query-time.
 */

const WEIGHTS = Object.freeze({
  interest: 40,
  distance: 30,
  rating: 20,
  popularity: 10,
});

// Tunables (tradeoff between coverage and speed)
const MAX_DISTANCE_METERS = 2_000_000; // ~2000km (covers Pakistan comfortably)
const CANDIDATE_LIMIT = 600; // keep scoring work bounded
const RESULT_LIMIT = 10;

function isValidUserLocation(userLocation) {
  if (!userLocation || typeof userLocation !== "object") return false;
  const { latitude, longitude } = userLocation;
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {{latitude:number, longitude:number}|null} userLocation
 * @returns {Promise<Array<object>>} Top recommended places (lean objects) with `score` and `distanceMeters`.
 */
export async function getPersonalizedRecommendations(userId, userLocation) {
  // Pull only what we need from the user document (keeps payload small and fast).
  const user = await User.findById(userId)
    .select("interests travelTime visitedPlaces budget")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const interests = Array.isArray(user.interests) ? user.interests : [];
  const visitedPlaces = Array.isArray(user.visitedPlaces)
    ? user.visitedPlaces
    : [];

  // "budget" is included per spec; if your data model adds it later, this function is ready.
  // Currently, Place has no cost fields, so we do not filter on budget here.
  // eslint-disable-next-line no-unused-vars
  const budget = user.budget ?? null;

  const hasGeo = isValidUserLocation(userLocation);

  // Only recommend approved places (backward compatible: missing status is treated as approved)
  const baseQuery = {
    $and: [
      visitedPlaces.length ? { _id: { $nin: visitedPlaces } } : {},
      { $or: [{ status: "approved" }, { status: { $exists: false } }, { status: null }] },
    ],
  };

  /**
   * Distance scoring:
   * distanceScore = WEIGHTS.distance * (1 - min(distance / MAX_DISTANCE_METERS, 1))
   * => ranges from 0..WEIGHTS.distance
   */

  const pipeline = [];

  if (hasGeo) {
    pipeline.push({
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [userLocation.longitude, userLocation.latitude],
        },
        key: "location",
        distanceField: "distanceMeters",
        spherical: true,
        maxDistance: MAX_DISTANCE_METERS,
        query: baseQuery,
      },
    });
  } else {
    // Fallback when location is missing/invalid: skip distance scoring and just rely on other signals.
    pipeline.push({ $match: baseQuery });
    pipeline.push({ $set: { distanceMeters: null } });
  }

  // Keep scoring bounded for performance, especially if there are many nearby places.
  pipeline.push({ $limit: CANDIDATE_LIMIT });

  // Compute scoring components in the DB (faster than pulling lots of docs and scoring in JS).
  pipeline.push({
    $addFields: {
      // Interest match: any overlap between user interests and place tags.
      _interestMatchCount: {
        $size: {
          $setIntersection: [
            interests,
            { $ifNull: ["$tags", []] },
          ],
        },
      },
      _distanceRatio: hasGeo
        ? {
            $min: [
              {
                $divide: [
                  { $ifNull: ["$distanceMeters", MAX_DISTANCE_METERS] },
                  MAX_DISTANCE_METERS,
                ],
              },
              1,
            ],
          }
        : 1,
      _popularityRatio: {
        $min: [{ $divide: [{ $ifNull: ["$popularityScore", 0] }, 100] }, 1],
      },
      _ratingValue: { $ifNull: ["$rating", 0] },
    },
  });

  pipeline.push({
    $addFields: {
      interestScore: {
        $cond: [{ $gt: ["$_interestMatchCount", 0] }, WEIGHTS.interest, 0],
      },
      distanceScore: hasGeo
        ? { $multiply: [WEIGHTS.distance, { $subtract: [1, "$_distanceRatio"] }] }
        : 0,
      ratingScore: {
        $cond: [{ $gte: ["$_ratingValue", 4] }, WEIGHTS.rating, 0],
      },
      popularityScoreBoost: {
        $multiply: [WEIGHTS.popularity, "$_popularityRatio"],
      },
    },
  });

  pipeline.push({
    $addFields: {
      score: {
        $add: ["$interestScore", "$distanceScore", "$ratingScore", "$popularityScoreBoost"],
      },
    },
  });

  pipeline.push({ $sort: { score: -1, _id: 1 } });
  pipeline.push({ $limit: RESULT_LIMIT });

  // Clean up internal fields
  pipeline.push({
    $project: {
      _interestMatchCount: 0,
      _distanceRatio: 0,
      _popularityRatio: 0,
      _ratingValue: 0,
    },
  });

  return Place.aggregate(pipeline).allowDiskUse(false);
}


