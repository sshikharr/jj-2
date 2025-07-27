import User from "../../models/User.js";

const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey; 

  if (!apiKey) {
    return res.status(400).json({ message: "Missing Juristo API key" });
  }

  try {
    // Check both the legacy apiKey field and the new apiKeys array
    const user = await User.findOne({
      $or: [
        { apiKey },
        { "apiKeys.key": apiKey, "apiKeys.active": true }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid juristo API key." });
    }

    // If using the new apiKeys array, verify the key hasn't expired
    if (user.apiKeys && user.apiKeys.length > 0) {
      const keyEntry = user.apiKeys.find(k => k.key === apiKey && k.active);
      if (keyEntry && keyEntry.expires && new Date() > keyEntry.expires) {
        return res.status(401).json({ message: "API key has expired" });
      }
    }

    req.userId = user.userId;
    req.body.userId = user.userId; 

    next(); 
  } catch (error) {
    console.error("Error validating API key:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default validateApiKey;
