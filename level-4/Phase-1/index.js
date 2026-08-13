import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq"
import { Annotation, MessagesAnnotation, StateGraph, START, END, MemorySaver} from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import { TavilySearch } from "@langchain/tavily";

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

//Tavily Search tools for web Search
const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",
 
});

//Memori Saver in Langchain
const checkPointer = new MemorySaver()

//toolNodes
const tools = [tool];
const toolNode= new ToolNode(tools);

const llm= new ChatGroq({
  model:"openai/gpt-oss-120b",
  temperature:0.7,
  maxTokens:500,
  maxRetries:2,
}).bindTools(tools)

//custom state
// const State = Annotation.Root({
//   prompt:Annotation,
//   AIMessage:Annotation
// });

const callLLM = async (state)=>{
  console.log("state:", state)

  const response = await llm.invoke([
    {
      role:"system",
      content:`You are a helpful and accurate AI assistant.
                If you do not know the answer, clearly say that you don't know the answer then call relevent tools. `
    },
     ...state.messages
  ])
  return {messages:[response]}
}

const shouldContinue =  (state) =>{
  const lastMessage = state.messages[state.messages.length-1 ];
  if(lastMessage.tool_calls?.length > 0){
    return "tools"
  } else {
    return END;
  }
}

//Graph - Nodes and Edges
const graph = new StateGraph(MessagesAnnotation)
.addNode("agent",callLLM) // agent node calls callLLM
.addNode("tools",toolNode) // tools node calls toolNode
.addEdge("__start__","agent") // start connect with agent
.addEdge("tools","agent") // tools connect with agent
.addConditionalEdges("agent",shouldContinue) // two conditional edges - shouldContinue
// .addEdge("agent","__end__")
.compile({checkpointer:checkPointer})

app.post("/ai", async (req, res) => {
  const { input } = req.body

  const response= await graph.invoke(
    {messages:[
      {  
       role:"user",
        content:input
      }
  ]},
  {
    configurable:{thread_id:"user123"}}
)
  console.log(response.messages)
   
  return res.status(200).json({ "ai:": response.messages[response.messages.length-1].content});
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from level-4" });
});

app.listen(port, () => {
  console.log("server started");
});
