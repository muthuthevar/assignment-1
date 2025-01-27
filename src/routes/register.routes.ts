import { Router, Request, Response } from "express";
import { Redis } from "../config/redis.config";
import userModel from "../schemas/user.schema";
import scoreModel from "../schemas/score.schema";

const router = Router();

router.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      res.status(400).json({ msg: `Please enter mobile number` });
      return;
    }
    const redis = Redis();
    await redis.set(`${mobileNumber}`, "1234", { EX: 60 }); // Set OTP with expiration (e.g., 300 seconds)
    res.json({ msg: `OTP sent!` });
    return;
  } catch (err: any) {
    console.error("Error in /send-otp:", err.message);
    res.status(500).json({ msg: `Internal server error`, error: err.message });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { mobileNumber, name, dob, email, otp } = req.body;

    // check otp
    const redis = Redis();
    const redisOtp = await redis.get(`${mobileNumber}`);
    if (redisOtp != otp) {
      res.status(401).json({ msg: `Invalid Otp` });
      return;
    }

    // check existing user
    const checkUser = await userModel.findOne({ mobileNumber });
    if (checkUser) {
      res.status(409).json({ msg: `User already registered` });
      return;
    }
    const user = await userModel.create({ mobileNumber, name, dob, email });
    res.json({ msg: `Register API`, data: user });
  } catch (err: any) {
    console.error("Error in /register:", err.message);
    res.status(500).json({ msg: `Internal server error`, error: err.message });
  }
});

// Function to validate the score
function isValidScore(score: number): boolean {
  return score >= 50 && score <= 500;
}

// Save score API endpoint
router.post("/save-score", async (req: Request, res: Response) => {
  const { _id, score } = req.body;

  try {
    // Validate the score
    if (!isValidScore(score)) {
      res.status(400).json({ msg: "Score must be between 50 and 500" });
      return;
    }

    // Check if the user exists
    const user = await userModel.findOne({ _id });
    if (!user) {
      res.status(404).json({ msg: "User not found" });
      return;
    }

    // Check if the user has reached the daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to start of the day

    const dailyScores = await scoreModel.find({
      user: { _id },
      createdAt: { $gte: today }, // Scores created today
    });

    if (dailyScores.length >= 3) {
      res.status(400).json({ msg: "Reached daily limit" });
      return;
    }

    // Save the score in the database
    await scoreModel.create({
      user: user,
      score,
    });

    res.json({ message: "Score saved successfully" });
    return;
  } catch (err) {
    console.error("Error in /save-score:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

// dashboard api
router.get("/dashboard/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scores = await scoreModel.find({ user: { _id: id } });
    res.json(scores);
  } catch (err) {
    console.log(err);
  }
});

router.get("/dashboard/weekly/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Validate the user
    const user = await userModel.findById(userId);
    if (!user) {
      res.status(404).json({ msg: "User not found" });
      return;
    }

    // Get all scores grouped by week
    const scores = await scoreModel.aggregate([
      {
        $addFields: {
          week: {
            $isoWeek: "$createdAt", // Get the ISO week number of the year
          },
          year: { $year: "$createdAt" }, // Get the year to differentiate scores across years
        },
      },
      {
        $group: {
          _id: { week: "$week", year: "$year", user: "$user" },
          totalScore: { $sum: "$score" }, // Sum up scores for the user for the week
        },
      },
      {
        $sort: { "_id.year": 1, "_id.week": 1 }, // Sort by year and week
      },
    ]);

    // Reorganize data to calculate rankings
    const weeklyScores: Record<string, any[]> = {};
    scores.forEach((entry) => {
      const weekKey = `${entry._id.year}-W${entry._id.week}`;
      if (!weeklyScores[weekKey]) {
        weeklyScores[weekKey] = [];
      }
      weeklyScores[weekKey].push({
        user: entry._id.user.toString(),
        totalScore: entry.totalScore,
      });
    });

    // Calculate weekly ranks
    const userRanks = Object.keys(weeklyScores).map((weekKey, index) => {
      const weekData = weeklyScores[weekKey];

      // Sort users by total score in descending order
      weekData.sort((a, b) => b.totalScore - a.totalScore);

      // Assign ranks
      weekData.forEach((entry, rank) => {
        entry.rank = rank + 1; // Rank starts from 1
      });

      // Find the given user's rank and score for this week
      const userData = weekData.find((entry) => entry.user === userId);
      return {
        weekNo: index + 1, // Start week number from 1
        rank: userData ? userData.rank : null, // Null if the user didn't score that week
        totalScore: userData ? userData.totalScore : 0,
      };
    });

    res.json({ success: true, weeks: userRanks });
  } catch (err) {
    console.error("Error in /dashboard/weekly/:userId:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

export default router;
