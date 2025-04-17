import express from "express";
import * as addressController from "../controllers/addressController";
import { validate } from "../middlewares/validationMiddleware";
import { createAddressValidator, updateAddressValidator } from "../validators/addressValidators";

const router = express.Router();


// Routes cho địa chỉ
router.get("/", addressController.getUserAddresses);
router.get("/default", addressController.getDefaultAddress);
router.post("/", validate(createAddressValidator), addressController.createAddress);
router.put("/:id", validate(updateAddressValidator), addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.put("/:id/default", addressController.setDefaultAddress);

export default router; 