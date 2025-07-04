import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        username: {
            type: String,
            requierd: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            requierd: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            requierd: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinary url stored as string
            requierd: true,
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
    this.password = bcrypt.hash(this.password, 10)
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
        // access token
        process.env.ACCESS_TOKEN_SECRET,
        // access token expiry
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
        // refresh token
        process.env.REFRESH_TOKEN_SECRET,
        // refresh token expiry
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)