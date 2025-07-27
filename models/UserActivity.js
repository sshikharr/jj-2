import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: "Unknown"
  },
  location: {
    type: String,
    default: "Unknown"
  },
  language: {
    type: String,
    default: "EN"
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  activityLogs: [{
    timestamp: Date,
    activityType: String,
    details: String,
    requestData: {
      body: Object,
      query: Object,
      headers: Object,
      method: String,
      url: String,
      userAgent: String,
      ip: String,
      path: String,
      protocol: String,
      responseStatus: Number,
      responseTime: Number,
      errorMessage: String
    }
  }]
}, { timestamps: true });

const UserActivity = mongoose.model('UserActivity', userActivitySchema);
export default UserActivity;
