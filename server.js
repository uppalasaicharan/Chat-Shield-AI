// ======================
// Import Libraries
// ======================

const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const Groq = require("groq-sdk");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// HTTP + Socket Server
// ======================

const server = http.createServer(app);

const io = new Server(server,{
    cors:{ origin:"*" }
});


// ======================
// MongoDB Connection
// ======================

mongoose.connect("mongodb://127.0.0.1:27017/chatModerator")
.then(()=>{
    console.log("MongoDB Connected");
})
.catch(err=>{
    console.log("MongoDB Connection Error:",err);
});


// ======================
// Message Schema (logs)
// ======================

const messageSchema = new mongoose.Schema({

text:String,
status:String,
reason:String,

createdAt:{
type:Date,
default:Date.now
}

});

const Message = mongoose.model("Message",messageSchema);


// ======================
// Topic Rules Schema
// ======================

const ruleSchema = new mongoose.Schema({

group:String,
blockedTopics:[String]

});

const Rule = mongoose.model("Rule",ruleSchema,"topicRules");


// ======================
// Groq Setup
// ======================

const groq = new Groq({
apiKey:"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"
});


// ======================
// LLM Moderation Function
// ======================

async function checkMessageWithLLM(message, rules){

try{

const response = await groq.chat.completions.create({
model:"llama-3.1-8b-instant",
messages:[
{
role:"system",
content:`You are an AI moderator for a learning community.

Blocked topics: ${rules.blockedTopics.join(", ")}

Block spam, promotions, social media marketing and blocked topics.

If the message violates any rule reply ONLY with BLOCK.
Otherwise reply ONLY with ALLOW.`
},
{
role:"user",
content: message
}
]
});

return response.choices[0].message.content;

}catch(error){

console.log("Groq Error:",error.message);

return "ALLOW";

}

}
// ======================
// Test Route
// ======================

app.get("/",(req,res)=>{
res.send("Backend server running");
});


// ======================
// Message Moderation API
// ======================

app.post("/validateMessage", async (req,res)=>{

const message = req.body.message.toLowerCase();

try{

// get rules from MongoDB
const rules = await Rule.findOne({group:"FullStackJava"});

let status="allowed";
let reason="";

// ======================
// Layer 1: Keyword Filtering
// ======================

if(rules){

for(let topic of rules.blockedTopics){

if(message.includes(topic.toLowerCase())){

status="blocked";
reason="Topic not allowed in this group";

break;

}

}

}


// ======================
// Layer 2: LLM Moderation
// ======================

if(status==="allowed" && rules){

const result = await checkMessageWithLLM(message,rules);

if(result.toLowerCase().includes("block")){

status="blocked";
reason="AI moderation flagged this message";

}

}


// ======================
// Save moderation log
// ======================

const log = new Message({
text:message,
status:status,
reason:reason
});

await log.save();

res.json({status,reason});

}catch(error){

console.log(error);

res.json({
status:"allowed"
});

}

});


// ======================
// Admin Panel APIs
// ======================

// Add rule

app.post("/addRule", async (req,res)=>{

const { group, blockedTopics } = req.body;

try{

const rule = new Rule({
group: group,
blockedTopics: blockedTopics
});

await rule.save();

res.json({
message:"Rule added successfully"
});

}catch(error){

console.log(error);

res.json({
message:"Error adding rule"
});

}

});


// Get all rules

app.get("/rules", async (req,res)=>{

const rules = await Rule.find();

res.json(rules);

});


// ======================
// Socket.io Chat Server
// ======================

io.on("connection",(socket)=>{

console.log("User connected");

socket.on("chatMessage",(msg)=>{

io.emit("chatMessage",msg);

});

socket.on("disconnect",()=>{

console.log("User disconnected");

});

});


// ======================
// Start Server
// ======================

server.listen(3000,()=>{

console.log("Server running at http://localhost:3000");

});