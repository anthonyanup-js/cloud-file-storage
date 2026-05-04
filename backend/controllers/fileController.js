import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/s3.js";
import File from "../models/File.js";

const BUCKET = process.env.AWS_BUCKET_NAME;
// Generate a signed PUT URL for direct browser upload
export const getUploadUrl = async (req, res) => {
    try {
        const { fileName, contentType, size } = req.body;

        if (!fileName || !contentType) {
            return res.status(400).json({ message: "fileName and contentType are required" });
        }

        // Build S3 key: email/filename
        const key = `${req.user.email}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // Save file metadata to MongoDB
        const file = await File.create({
            fileName,
            originalName: fileName,
            key,
            size: size || 0,
            mimeType: contentType,
            userId: req.user._id,
        });

        res.json({ signedUrl, file });
    } catch (error) {
        console.error("getUploadUrl error:", error);
        res.status(500).json({ message: "Failed to generate upload URL" });
    }
};

// Confirm upload completed — update file size if needed
export const confirmUpload = async (req, res) => {
    try {
        const { fileId, size } = req.body;

        const file = await File.findOneAndUpdate(
            { _id: fileId, userId: req.user._id },
            { size },
            { new: true }
        );

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        res.json(file);
    } catch (error) {
        console.error("confirmUpload error:", error.message);
        res.status(500).json({ message: "Failed to confirm upload" });
    }
};

// Get all files for the authenticated user
export const getAllFiles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [files, total] = await Promise.all([
            File.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            File.countDocuments({ userId: req.user._id }),
        ]);

        res.json({
            files,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("getAllFiles error:", error.message);
        res.status(500).json({ message: "Failed to fetch files" });
    }
};

// Generate a signed GET URL for viewing/downloading a file
export const getViewUrl = async (req, res) => {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user._id });

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: file.key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.json({ signedUrl, file });
    } catch (error) {
        console.error("getViewUrl error:", error.message);
        res.status(500).json({ message: "Failed to generate view URL" });
    }
};

// Delete a file from S3 and MongoDB
export const deleteFile = async (req, res) => {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.user._id });

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // Delete from S3
        const command = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: file.key,
        });
        await s3Client.send(command);

        // Delete from MongoDB
        await File.findByIdAndDelete(file._id);

        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("deleteFile error:", error.message);
        res.status(500).json({ message: "Failed to delete file" });
    }
};

// Rename a file — S3 doesn't support rename, so: copy → delete old → update DB
export const renameFile = async (req, res) => {
    try {
        const { fileId, newName } = req.body;

        if (!fileId || !newName) {
            return res.status(400).json({ message: "fileId and newName are required" });
        }

        const file = await File.findOne({ _id: fileId, userId: req.user._id });

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // Build new key with email prefix
        const newKey = `${req.user.email}/${newName}`;

        // Copy object to new key
        const copyCommand = new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/${file.key}`,
            Key: newKey,
        });
        await s3Client.send(copyCommand);

        // Delete old object
        const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: file.key,
        });
        await s3Client.send(deleteCommand);

        // Update MongoDB
        file.fileName = newName;
        file.key = newKey;
        await file.save();

        res.json(file);
    } catch (error) {
        console.error("renameFile error:", error.message);
        res.status(500).json({ message: "Failed to rename file" });
    }
};
