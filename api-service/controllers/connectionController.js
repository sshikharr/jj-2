// controllers/connectionController.js
import User from "../../models/User.js";

const connectionDetails = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;

    // Check both the legacy apiKey field and the new apiKeys array
    const user = await User.findOne({
      $or: [
        { apiKey },
        { "apiKeys.key": apiKey, "apiKeys.active": true }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if key has expired when using the new model
    if (user.apiKeys && user.apiKeys.length > 0) {
      const keyEntry = user.apiKeys.find(k => k.key === apiKey && k.active);
      if (keyEntry && keyEntry.expires && new Date() > keyEntry.expires) {
        return res.status(401).json({ message: "API key has expired" });
      }
    }

    res.json({
      name: user.name, 
      userId: user.userId,
      subscription: user.subscription, 
    });
  } catch (error) {
    console.error("Error fetching connection details:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default connectionDetails;
