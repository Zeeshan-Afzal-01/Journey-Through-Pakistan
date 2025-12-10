/**
 * Helper function to extract client IP address from request
 * Handles various scenarios: direct connection, proxy, load balancer
 * 
 * @param {Object} req - Express request object
 * @returns {String} - Client IP address or 'unknown'
 */
export const getClientIP = (req) => {
  if (!req) return 'unknown';

  // Try multiple methods to get IP address
  // 1. X-Forwarded-For header (most common for proxies/load balancers)
  //    Format: "client, proxy1, proxy2" - we want the first one (client)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) {
      return ips[0];
    }
  }

  // 2. X-Real-IP header (used by some proxies/load balancers)
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP) {
    return xRealIP.trim();
  }

  // 3. CF-Connecting-IP header (Cloudflare)
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // 4. req.ip (Express sets this when trust proxy is enabled)
  if (req.ip) {
    return req.ip;
  }

  // 5. req.connection.remoteAddress (fallback for direct connections)
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // 6. req.socket.remoteAddress (another fallback)
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return 'unknown';
};

export default getClientIP;

