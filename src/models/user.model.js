import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinary url stored as string
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        refreshToken: {
            type: String
        }
    }, {timestamps: true}
)


// ENCRYPTING THE PASSWORD
userSchema.pre("save", async function(next) {
    // if password is not updated, do not run this method
    if( !this.isModified("password")) return next()

    // password changed, encrypt the passsword just before saving the code
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// COMPARING THE PASSWORDS
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}


// METHOD FOR GENERATING ACCESS AND REFRESH TOKEN
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {   // payload
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        // access token secret key
        process.env.ACCESS_TOKEN_SECRET,
        // options: access token expiry
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {   // payload
            _id: this._id,
        },
        // refresh token secret key
        process.env.REFRESH_TOKEN_SECRET,
        // options: refresh token expiry
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)