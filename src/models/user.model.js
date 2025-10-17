import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    avatar: {
      type: String, //Cloudinary url
      require: true,
    },

    coverImage: {
      type: String, //Cloudinary url
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],

    refreshTokens: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
};


userSchema.methods.generateAccessToken = function(){
   return jwt.sign({
       _id : this._id,
       email : this.email,
       userName : this.userName,
       fullName : this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
    }
)
}


userSchema.methods.generateRefreshToken = function(){
          return jwt.sign({
          _id : this._id,
        },
       process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn : process.env.REFRESH_TOKEN_EXPIRY
    }
   )
}



export const User = mongoose.model("User", userSchema);
