import express from "express";
import protectRoute from "../middleware/auth.js";
import {
    getUploadUrl,
    confirmUpload,
    getAllFiles,
    getViewUrl,
    deleteFile,
    renameFile,
} from "../controllers/fileController.js";

const router = express.Router();

// All file routes are protected
router.use(protectRoute);

router.post("/upload-url", getUploadUrl);
router.post("/confirm-upload", confirmUpload);
router.get("/", getAllFiles);
router.get("/view/:id", getViewUrl);
router.delete("/:id", deleteFile);
router.put("/rename", renameFile);

export default router;
