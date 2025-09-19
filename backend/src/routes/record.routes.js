import {getExportRecordController, getRecordByDeptIdController} from "../controllers/record.controller.js";
import express from "express";

const router = express.Router();

router.get('/export-record', getExportRecordController);
router.get('/record-by-dept', getRecordByDeptIdController);

export default router;