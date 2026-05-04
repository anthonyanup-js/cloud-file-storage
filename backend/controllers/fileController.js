import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/s3.js";
import File from "../models/File.js";

const BUCKET = process.env.AWS_BUCKET_NAME;
const PART_SIZE = 10 * 1024 * 1024; // 10 MB
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

// ── Multipart Upload ──────────────────────────────────────

// Initiate a multipart upload — returns uploadId + presigned URLs for each part
export const initiateMultipartUpload = async (req, res) => {
    try {
        const { fileName, contentType, size } = req.body;

        if (!fileName || !contentType || !size) {
            return res.status(400).json({ message: "fileName, contentType, and size are required" });
        }

        const key = `${req.user.email}/${fileName}`;
        const totalParts = Math.ceil(size / PART_SIZE);

        // 1. Create the multipart upload in S3
        const createCommand = new CreateMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        });
        const { UploadId } = await s3Client.send(createCommand);

        // 2. Generate a presigned URL for each part
        const partUrls = [];
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
            const uploadPartCommand = new UploadPartCommand({
                Bucket: BUCKET,
                Key: key,
                UploadId,
                PartNumber: partNumber,
            });
            const signedUrl = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 3600 });
            partUrls.push({ partNumber, signedUrl });
        }

        // 3. Save file metadata to MongoDB (size will be confirmed on complete)
        const file = await File.create({
            fileName,
            originalName: fileName,
            key,
            size,
            mimeType: contentType,
            userId: req.user._id,
        });

        res.json({ uploadId: UploadId, fileId: file._id, key, partUrls, totalParts });
    } catch (error) {
        console.error("initiateMultipartUpload error:", error);
        res.status(500).json({ message: "Failed to initiate multipart upload" });
    }
};

// Complete a multipart upload — assembles all parts in S3
export const completeMultipartUpload = async (req, res) => {
    try {
        const { uploadId, key, fileId, parts } = req.body;

        if (!uploadId || !key || !fileId || !parts || !Array.isArray(parts)) {
            return res.status(400).json({ message: "uploadId, key, fileId, and parts[] are required" });
        }

        const command = new CompleteMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts
                    .sort((a, b) => a.PartNumber - b.PartNumber)
                    .map(({ PartNumber, ETag }) => ({ PartNumber, ETag })),
            },
        });

        await s3Client.send(command);

        // Update file in MongoDB
        const file = await File.findById(fileId);
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        res.json(file);
    } catch (error) {
        console.error("completeMultipartUpload error:", error);
        res.status(500).json({ message: "Failed to complete multipart upload" });
    }
};

// Abort a multipart upload — cleans up S3 parts and removes DB record
export const abortMultipartUpload = async (req, res) => {
    try {
        const { uploadId, key, fileId } = req.body;

        if (!uploadId || !key) {
            return res.status(400).json({ message: "uploadId and key are required" });
        }

        // Abort the S3 multipart upload
        const command = new AbortMultipartUploadCommand({
            Bucket: BUCKET,
            Key: key,
            UploadId: uploadId,
        });
        await s3Client.send(command);

        // Remove file metadata from MongoDB
        if (fileId) {
            await File.findByIdAndDelete(fileId);
        }

        res.json({ message: "Multipart upload aborted" });
    } catch (error) {
        console.error("abortMultipartUpload error:", error);
        res.status(500).json({ message: "Failed to abort multipart upload" });
    }
};
