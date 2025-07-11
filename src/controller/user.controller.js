import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - field not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary : avatar
    // get cloudinary's response url 
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response on successfull creation


    // if data is coming from json or a form (if coming from url, different case)
    const {username, email, fullName, password} = req.body

    // validation
    // if (fullName === "") {
    //     throw new ApiError(400, "Fullname is required")
    // }
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    // check if user already exists
    const existedUser = await User.findOne({
        $or: [{username} , {email}]
    })
    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    // checking images
    const avatarLocalPath = req.files?.avatar[0]?.path
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    let coverImageLocalPath 
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    // uploading on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    // check for avatar
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }


    // creating user object
    const user = await User.create({
        fullName, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })


    // check if user is successfully created or not
    // if created, remove password and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd successfully")
    )


})


export { registerUser }