import express, { response } from "express";
import dotenv from "dotenv";
import connectDb from "./lib/db.js";
import User from "./model/user.model.js";
import Redis from "ioredis";
import rateLimitter from "./middleware/ratelimit.js";
import sendEmail from "./lib/sendEmail.js";
import emailQueue from "./queue.js";
dotenv.config();

const port = process.env.PORT || 5000;
const app = express(); // here we created express ka instance aur esse express ke ander asre chijo ka access ka sakte hai
export const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({ message: "hello from redis" });
});

app.post("/create", async (req, res) => {
  const { name, email, password } = req.body;
  await redis.del("user:all");
  const user = await User.create({
    name,
    email,
    password,
  });

 await emailQueue.add("send-email",{email})

  return res.json(user);
});

app.get("/get",rateLimitter ,async (req, res) => { // api rate limitter
  const user = await User.find({});
  return res.json(user);
});

//1. use case - API Caching
app.get("/get-with-redis", async (req, res) => {
  const cached = await redis.get("user:all");
  if (cached) {
    const user = JSON.parse(cached); // parse
    return res.json(user);
  }
  const user = await User.find({});
  await redis.set("user:all", JSON.stringify(user)); //string
  return res.json(user);
});

//2. use case - OTP Storage
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); //otp generate
  await redis.set(`otp:${email}`, otp, "EX", 30 );

  return res.json({ otp });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body

  const cachedOtp = await redis.get(`otp:${email}`)
  if (!cachedOtp) {
    return res
      .status(400)
      .json({ "message": "otp not found or hase been expired" });
  }
  if (cachedOtp != otp) {
    return res.status(400).json({ "message": "incorrect otp" });
  }

   await redis.del(`otp:${email}`)
  return res.json({ "message": "otp verified" });
});

app.listen(port, () => {
  connectDb();
  console.log(`server started ${port}`);
});