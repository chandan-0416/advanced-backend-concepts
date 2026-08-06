import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
const port = 5000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(express.json());

//How to use in api to generate the response
app.post("/ai", async (req, res) => {
  const { input } = req.body;
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",


    contents: [      
          {
            role: "user",
            parts: [{ text: input }],
          },
    ],
  });
  return res.status(200).json({ "ai:": response.text });
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from level-4" });
});

app.listen(port, () => {
  console.log("server started");
});
