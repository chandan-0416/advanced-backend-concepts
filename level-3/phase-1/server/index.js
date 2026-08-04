import express from "express"
import dotenv from "dotenv"
import connectDb from "./lib/db.js"
import User from "./model/user.model.js"
import Redis from "ioredis"

dotenv.config()

const port = process.env.PORT || 5000

const app = express()

const redis = new Redis(process.env.REDIS_URL)

app.use(express.json());

app.get("/", (req, res)=>{
    return res.status(200).json({message:`hello from server ${process.env.SERVER_NAME}`});
})

app.post("/create", async (req, res) =>{
    const {name, email, password} = req.body
    await redis.del("user:all")
    const user =await User.create({
      name,email,password 
    })
    return res.json(user);
})

app.get("/get", async (req, res) =>{
    const user = await User.find({})
    return res.json(user);
})

app.get("/get-with-redis", async (req, res)=>{
    const cached = await redis.get("user:all")
    if(cached){
        const user =JSON.parse(cached) // parse
        return res.json(user)
    }

    const user = await User.find({})
    await redis.set("user:all",JSON.stringify(user)) //string
 
    return res.json(user)
})



app.listen(port, ()=>{
    connectDb()
    console.log(`server started ${port}`)
})

// without redis 43 ms and with redis 6 ms