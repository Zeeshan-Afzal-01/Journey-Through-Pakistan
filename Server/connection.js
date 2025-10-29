import mongoose from 'mongoose';
import {config} from 'dotenv';
config();
const Url = process.env.URL
mongoose.connect(Url)

const db = mongoose.connection

db.on("connected", ()=>{
    console.log("MongoDB is connected");
})

db.on("error", ()=>{
    console.log("MongoDB connection Error!")
})

db.on("disconnected", ()=>{
    console.log("MongoDB is disconnected")
})

export default db;