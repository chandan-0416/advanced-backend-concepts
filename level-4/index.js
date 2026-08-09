import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq"
import { Annotation, MessagesAnnotation, StateGraph} from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import {ToolNode} from "@langchain/langgraph/prebuilt"

dotenv.config();
const app = express();
const port = 5000;
app.use(express.json());


//without LangChain
// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// //How to use in api to generate the response
// app.post("/ai", async (req, res) => {
//   const { input } = req.body;
//   const response = await ai.models.generateContent({
//     model: "gemini-3.6-flash",
//      config: {
//     systemInstruction: `
//       You are a helpful and accurate AI assistant.
//       If you do not know the answer, clearly say that you don't know.
//       Do not make up or hallucinate information.
//       If the question requires information you cannot verify, say so.
//     `,
//   },
//     contents: [  
//           {
//             role: "user",
//             parts: [{ text: input }],
//           },
//     ],
//   });
//   return res.status(200).json({ "ai:": response.text });
// });

//with LangChain
const llm= new ChatGroq({
  model:"openai/gpt-oss-120b",
  temperature:2,
  maxTokens:150,
  maxRetries:2,
})

//custom state
// const State = Annotation.Root({
//   prompt:Annotation,
//   AIMessage:Annotation
// });

//toolNodes
const tools = [];
const toolNode= new ToolNode(tools);

const callLLM = async (state)=>{

  console.log("state:", state)
  const response = await llm.invoke([
    {
      role:"system",
      content:"you are AI"
    },
    {
      role:"human",
      content:state.messages[0].content
    }
  ])

  return {messages:[response]}
}

const shouldContinue = async (state) =>{

}

//Nodes and Edges
const graph = new StateGraph(MessagesAnnotation)
.addNode("agent",callLLM)
.addNode("tools",toolNode)
.addEdge("__start__","agent")
.addEdge("tools","agent")
.addConditionalEdges("agent",shouldContinue)
// .addEdge("agent","__end__")
.compile()

app.post("/ai", async (req, res) => {
  const { input } = req.body

  const response= await graph.invoke({messages:[
      {  
       role:"user",
        content:input
      }
  ]})
  console.log(response)
   
  return res.status(200).json({ "ai:": response.messages[response.messages.length-1].content});
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from level-4" });
});

app.listen(port, () => {
  console.log("server started");
});
