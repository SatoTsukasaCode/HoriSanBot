const { DateTime } = require('luxon');
const Log = require("../models/Log");
const User = require("../models/User");

const calculateStreak = async (userId, isCurrentStreak) => {
    try {
        const user = await User.findOne({ userId: userId });
        if (!user) {
            return 0; // If user not found, return 0 streak
        }

        const userTimezone = user.timezone || 'UTC'; // Default to UTC if timezone is not set

        // Exclude logs where isBackLog is true
        const logs = await Log.find({
            userId: userId,
            isBackLog: { $ne: true } // This ensures that isBackLog is not true
        }).sort({ timestamp: -1 });

        if (logs.length === 0) {
            return 0; // No logs mean no streak
        }

        let currentStreak = 0;
        let currectLongestStreak = 0;

        const getAdjustedDay = (timestamp) => {
            const dt = DateTime.fromJSDate(timestamp).setZone(userTimezone);
            if (dt.hour < 4) {
                // Before 4 AM, consider it as part of the previous day
                return dt.minus({ days: 1 }).startOf('day').plus({ hours: 4 });
            } else {
                // On or after 4 AM
                return dt.startOf('day').plus({ hours: 4 });
            }
        };

        const now = DateTime.now().setZone(userTimezone);
        const today = getAdjustedDay(now.toJSDate());
        const yesterday = today.minus({ days: 1 });

        // Adjust the first log's timestamp to the adjusted "day" (4 AM start)
        let mostRecentLogTime = getAdjustedDay(logs[0].timestamp);

        // Check if the most recent log is from today or yesterday
        if (mostRecentLogTime >= yesterday) {
            currentStreak = 1;
        } else {
            return 0; // If the most recent log is older than yesterday, reset streak to 0
        }

        // Loop through the remaining logs to check for consecutive "days"
        for (let i = 1; i < logs.length; i++) {
            let currentLogTime = getAdjustedDay(logs[i].timestamp);
            const daysDifference = mostRecentLogTime.diff(currentLogTime, 'days').days;
        
            // Adjusted comparison to account for floating-point precision
            if (Math.round(daysDifference) === 1) {
                currentStreak++;
            } else if (Math.round(daysDifference) > 1) {
                break;
            }
        
            mostRecentLogTime = currentLogTime;
        }

        // Checks if the longest streak is smaller then the currect streak
        if(currectLongestStreak < currentStreak) {
            currectLongestStreak = currentStreak;
        }

        // isCurretStreak is a boolean variable that decideds which value to return
        if(isCurrentStreak){
            return currentStreak;
        } else if(!isCurrentStreak) {
            return currectLongestStreak;
        }
    } catch (error) {
        console.error("Error calculating streak:", error);
        return 0; // Default to 0 in case of any errors
    }
};

module.exports = { calculateStreak };
