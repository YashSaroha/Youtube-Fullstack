import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token : ", error)
    }
}

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
    // console.log(req)
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

const loginUser = asyncHandler( async (req, res) => {
    // get data from req.body
    // username or name
    // find the given user in db
    // password check
    // generate access and refresh token
    // send tokens via cookies


    // get data from req.body
    const { email, username, password } = req.body

    if (!username && !email) {
        // can also write   if(! (username || email))
        throw new ApiError(400, "Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {user: loggedInUser, accessToken, refreshToken}, 
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler( async (req, res) => {
    // remove refresh token
    // clear the cookies
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200, {}, "User logged out successfully"
        )
    )
})

const refreshAccessToken = asyncHandler( async(req, res) => {
    // this is used to refresh and generate a new access token using the refresh token
    // access the refresh token from cookies
    // decode the token and extract _id from payload
    // search user in db based on _id 
    // match the refresh token from cookie with the refresh token stored in db
    // if valid - generate new access token
    // send the access token via cookies and return

   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
   }

   try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken._id)
        if(!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed successfullly"
            )
        )

   } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
   }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken }