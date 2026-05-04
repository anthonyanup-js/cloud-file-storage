import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
    {
        fileName: {
            type: String,
            required: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        key: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Index for fast lookups by userId
fileSchema.index({ userId: 1, createdAt: -1 });

const File = mongoose.model("File", fileSchema);
export default File;
