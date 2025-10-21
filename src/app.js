import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({
    limit : "30kb"
}));

app.use(express.urlencoded({ extended: true ,limit : "30kb"}));
app.use(express.static("public"));
app.use(cookieParser());



//import user routes

import userRoutes from "./routes/user.routes.js";

//user routes declaration
app.use("/api/v1/users" , userRoutes)


export { app };