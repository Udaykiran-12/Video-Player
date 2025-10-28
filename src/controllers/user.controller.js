import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";



const generateAccessandRefreshToken = async (userId) =>{
    try {
        
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshTokens = refreshToken;
        await user.save({ validateBeforeSave : false });

        return { accessToken , refreshToken };

    } catch (error) {
        throw new ApiError(500, "Error in generating tokens");
    }
}

const registerUser = asyncHandler( async (req ,res) => {
    
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName , userName,  email, password } = req.body;

    if(
          [fullName , userName , email, password].some( (field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({ $or: [ { userName }, { email } ] });

    if(existingUser){
        throw new ApiError(409, "User with given username or email already exists");
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(500, "Error in uploading avatar image");
    }


    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        userName : userName.toLowerCase(),
        email,
        password  
    })


    const createdUser = await User.findById(user._id).select(
        "-password -refreshTokens"
    )

    if(!createdUser){
        throw new ApiError(500, "Unable to create user. Please try again later.");
    }

    return res.status(201).json(
        new ApiResponse(201, "User registered successfully", createdUser)
    )



});


const loginUser = asyncHandler( async( req, res) => {
   
    //Todos
     // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { userName , email , password} = req.body;

    if(!userName && !email){
        throw new ApiError(400, "Username or email is required");
    };

    const user = await User.findOne({ $or: [ { userName }, { email } ] });

    if(!user){
        throw new ApiError(404, "User not found");
    };

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials");
    };


    const { accessToken , refreshToken } = await generateAccessandRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshTokens"
    );

    const options = {
        httpOnly : true,
        secure : true
    }

    res.
    status(200).
    cookie("refreshToken" , refreshToken , options).
    cookie("accessToken" , accessToken , options).
    json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,
                accessToken,
                refreshToken
            }
            ,
            "User logged in successfully"
        )
    )

});


const logoutUser = asyncHandler( async ( req , res) => {

    //finding user from req object
    //clear cookies

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshTokens : ""
            }
        }
        ,
        {
            new : true
        }
    );

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.
    status(200).
    clearCookie("accessToken" , options).
    clearCookie("refreshToken" , options).
    json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully"
        )
    )

})


const refreshAccessToken = asyncHandler( async ( req , res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized: No refresh token provided"); 
    }

    try {
        const decodedToken= jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Unauthorized: Invalid refresh token");
        };
    
        if(user.refreshTokens !== incomingRefreshToken){
            throw new ApiError(401, "Unauthorized: Refresh token mismatch");
        };
    
        const { accessToken , newrefreshToken } = await generateAccessandRefreshToken(user._id);
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        res.status(200).
        cookie("refreshToken" , newrefreshToken , options).
        cookie("accessToken" , accessToken , options).
        json(
            new ApiResponse(
               200 ,
               {
                accessToken , refreshToken : newrefreshToken
                } ,
                "Access token refreshed successfully"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized: Invalid refresh token" );
    }

    

})


export { registerUser , loginUser , logoutUser , refreshAccessToken };

