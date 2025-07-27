// middleware/updateDb.js
import User from "../../models/User.js";
import UserActivity from "../../models/UserActivity.js";

const updateDb = async (req, res, next) => {
    const startTime = Date.now();
    try {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        const user = await User.findOne({ apiKey });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const location = user.country?.label || "Unknown";
        const language = user.language?.label || "EN";

        let activity = await UserActivity.findOne({ userId: user.userId });

        if (activity) {
            activity.totalRequests += 1;
            activity.location = location;
            activity.language = language;
        } else {
            activity = new UserActivity({
                userId: user.userId,
                apiKey: user.apiKey,
                name: user.name || "Unknown",
                location,
                language,
                totalRequests: 1,
                activityLogs: []
            });
        }

        const logEntry = {
            timestamp: new Date(),
            activityType: "request",
            details: "User sent a request to the API",
            requestData: {
                body: req.body,
                query: req.query,
                headers: req.headers,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                path: req.path,
                protocol: req.protocol,
                responseTime: Date.now() - startTime,
                responseStatus: res.statusCode,
                errorMessage: null
            }
        };

        console.log("Request Data to Store:", logEntry);  

        activity.activityLogs.push(logEntry);
        await activity.save();

        // Add response listener to capture final status
        res.on('finish', async () => {
            const finalLog = activity.activityLogs[activity.activityLogs.length - 1];
            finalLog.requestData.responseStatus = res.statusCode;
            finalLog.requestData.responseTime = Date.now() - startTime;
            await activity.save();
        });

        next();
    } catch (err) {
        console.error("Error updating activity:", err);
        next(err);
    }
};

export default updateDb;
