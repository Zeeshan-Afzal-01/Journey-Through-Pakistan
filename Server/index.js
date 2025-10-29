import { config } from 'dotenv';
config({ path: "./.env" });
import express from 'express';
import './connection.js';
import userRouter from './routers/userRouter.js';
import authRouter from './routers/authRouter.js';
import postRouter from './routers/postRouter.js';
import notificationRouter from './routers/notificationRouter.js';
import statusRouter from './routers/statusRouter.js';
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

app.get('/', (req, res) => {
  res.send("Hello WORLD!");
});

// // ✅ Foursquare quick test
// (async () => {
//   try {
//     fsqDevelopers.auth('fsq3JTBta/OZ8D/lCm+fWa7luR6hpSZoM4CXajdghkhxlF4=');

//     // Example: search 20 tourist attractions within 500m of Lahore center
//     const { data } = await fsqDevelopers.placeSearch({
//       ll: '31.5204,74.3587',   // Lahore coordinates
//       radius: 500,
//       categories: '16000',
//       limit: 20
//     });

//     console.log('✅ Foursquare API working, sample result:', data.results[0]);
//   } catch (err) {
//     console.error('❌ Foursquare API error:', err.response?.data || err.message);
//   }
// })();


// const testFoursquare = async () => {
//   try {
//     const res = await axios.get('https://places-api.foursquare.com/places/search', {
//       headers: {
//         Accept: 'application/json',
//         Authorization: `Bearer WAKHGIV3QYAMWGSNIWRWWFSRBCTW5IECINJXQTOGG1C5S3TH`,
//         'X-Places-Api-Version': '2025-06-17'
//       },
//       params: {
//         ll: '31.44873,74.25340',   // Lahore center
//         radius: 500,
//         query: 'tourist attraction',
//         limit: 5
//       }
//     });

//     console.log('✅ Working response:', res.data);
//   } catch (err) {
//     console.error('❌ API Error:', err.response?.data || err.message);
//   }
// };

// testFoursquare();

app.listen(process.env.PORT, () => {
  console.log(`Server is on! Port ${process.env.PORT}`);
});
