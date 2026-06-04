import express from "express";
import {
  getSettings,
  updateSettings,
  uploadLogo,
  removeLogo,
} from "../controllers/settings.controller.js";

const router = express.Router();

router.get("/get", getSettings);
router.put("/update", updateSettings);
router.post("/upload-logo", uploadLogo);
router.delete("/remove-logo", removeLogo);

export default router;
