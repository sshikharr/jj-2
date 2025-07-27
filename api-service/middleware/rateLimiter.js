import User from '../../models/User.js';

const rateLimits = {
  free: { points: 10, duration: Number.MAX_SAFE_INTEGER },
  pro: { points: 100, duration: Number.MAX_SAFE_INTEGER },
  premium: { points: Number.MAX_SAFE_INTEGER, duration: Number.MAX_SAFE_INTEGER },
};

const extractApiKey = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7); 
  }
  
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }
  
  if (req.query.apiKey) {
    return req.query.apiKey;
  }
  
  return null;
};

const resetRequestCountIfNeeded = async (user) => {
  const now = new Date();
  const timeSinceLastReset = now - user.requestCount.lastReset;
  const plan = user.subscription;
  
  if (timeSinceLastReset >= rateLimits[plan].duration) {
    user.requestCount.count = 0;
    user.requestCount.lastReset = now;
    await user.save();
  }
};

export const rateLimiterMiddleware = async (req, res, next) => {
  if (req.originalUrl.startsWith('/chat')) return next();

  try {
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key is required. Please provide it in Authorization header as Bearer token, X-API-Key header, or apiKey query parameter'
      });
    }

    // Check both the legacy apiKey field and the new apiKeys array
    const user = await User.findOne({
      $or: [
        { apiKey },
        { "apiKeys.key": apiKey, "apiKeys.active": true }
      ]
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if key has expired when using the new model
    if (user.apiKeys && user.apiKeys.length > 0) {
      const keyEntry = user.apiKeys.find(k => k.key === apiKey && k.active);
      if (keyEntry && keyEntry.expires && new Date() > keyEntry.expires) {
        return res.status(401).json({ message: "API key has expired" });
      }
    }

    const plan = user.subscription;
    if (plan === 'premium') return next();

    await resetRequestCountIfNeeded(user);

    const limits = rateLimits[plan] || rateLimits.free;
    
    if (user.requestCount.count >= limits.points) {
      let retryAfter = "Please contact support";
      
      // Only calculate time if there's a finite duration
      if (limits.duration && limits.duration !== Number.MAX_SAFE_INTEGER && limits.duration > 0) {
        const resetTime = new Date(user.requestCount.lastReset.getTime() + limits.duration);
        const timeLeft = Math.max(0, resetTime - new Date());
        
        // Format the time left in a readable format
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          retryAfter = `${minutes}m ${seconds}s`;
        } else {
          // If time has already passed, suggest refreshing
          retryAfter = "Try refreshing";
        }
      }

      return res.status(429).json({
        error: 'Usage limit exceeded, please update to a better plan or wait for the limit to reset.',
        retryAfter: retryAfter,
        plan: plan,
      });
    }

    user.requestCount.count += 1;
    await user.save();
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    return res.status(500).json({
      error: 'Internal server error while checking rate limits',
    });
  }
};