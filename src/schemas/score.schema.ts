import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Score", scoreSchema);
