import { config } from 'dotenv';
config({ path: "./.env" });
import express from 'express';
import './connection.js';
import userRouter from './routers/userRouter.js';
import authRouter from './routers/authRouter.js';
import postRouter from './routers/postRouter.js';
import notificationRouter from './routers/notificationRouter.js';
import statusRouter from './routers/statusRouter.js';
import groupRouter from './routers/groupRouter.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
// import fsqDevelopers from '@api/fsq-developers';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use('/uploads', express.static('uploads'));
app.use('/users', userRouter);
app.use("/auth", authRouter);
app.use('/posts', postRouter);
app.use('/notifications', notificationRouter);
app.use('/statuses', statusRouter);
app.use('/groups', groupRouter);

app.get('/', (req, res) => {
  res.send("Hello WORLD!");
});



app.listen(process.env.PORT, () => {
  console.log(`Server is on! Port ${process.env.PORT}`);
});
