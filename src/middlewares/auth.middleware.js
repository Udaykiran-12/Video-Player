import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler( async ( req , _ , next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            throw new ApiError(401, "Unauthorized: No token provided");
        };
    
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decoded?._id).select("-password -refreshTokens");
    
        if(!user){
            //Todo discuss about frontend handling
            throw new ApiError(401, "Invalid access token");
        }
    
        req.user = user;
    
        next();
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid access token");
    }


});