import express from "express";
import dotenv from "dotenv";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq"
import fs from "fs"
import { PDFParse } from "pdf-parse";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";


dotenv.config();
const app = express();
const port = 5000;
app.use(express.json());

const llm= new ChatGroq({
  model:"openai/gpt-oss-120b",
  temperature:0.7,
  maxTokens:500,
  maxRetries:2,
})

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "grocery store",
});

const upload = async () =>{
  const pdfPath ="./knowledge.pdf"
  const buffer = fs.readFileSync(pdfPath) 
  //A Buffer in Node.js is a globally available class used to store and manipulate raw binary data.
  const pdfResult= new PDFParse({data:buffer})
  const result = await pdfResult.getText(); //extact data from pdf
  const text = result.text
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize:1000,
    chunkOverlap:200
  })
 const docs = await splitter.createDocuments([text])

  await vectorStore.addDocuments(docs)
  // console.log(docs)
}
// upload();

app.post("/ai", async (req, res) => {
  const { input } = req.body  //prompt

  const docs =await vectorStore.similaritySearch(input,5)
     const context = docs.map((d)=> d.pageContent).join("/n")

     const response = await llm.invoke([
      new SystemMessage(`you are AI assistant.
       
STRICT ROLES;
- Answer Only from context
- Do not outside knowledge
- If answer not found say:
"I don't know from uploaded PDF."

Context:
   ${context}`),
   
new HumanMessage(input)
     ])
     return res.status(200).json({ai:response.content});
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from level-4" });
});

app.listen(port, () => {
  console.log("server started");
});
