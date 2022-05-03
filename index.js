import express, { json } from "express";
import chalk from "chalk";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
import cors from "cors";

const app = express();
app.use(json());
dotenv.config();
app.use(cors());

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
mongoClient.connect().then(() => {
    db = mongoClient.db("bate_papo_uol");
    console.log(chalk.bold.blue("Banco de dados MongoDB conectado com Bate Papo UOL!"));
});

app.post("/participants", async (req, res) =>{
    const {name} = req.body;
    const nameSchema = joi.object({ name: joi.string().required()});
    const validation = nameSchema.validate(req.body, {abortEarly: false});

    if (validation.error) {
        res.status(422).send("Todos os campos são obrigatórios.");
        return;
    }

    try {
        const participants = await db.collection("participants").find().toArray();
        if (participants.find(participant => participant.name === name)) {
            res.sendStatus(409);
            return;
        }
        await db.collection("participants").insertOne(
            {name: name, 
            lastStatus: Date.now()}
            );
        await db.collection("messages").insertOne(
            {from: name, 
            to: "Todos",
            text: "entra na sala...", 
            type: "status",
            time: dayjs().format("HH:mm:ss")
        });
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.get("/participants", async (_req, res) =>{
    try {
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
    } catch {
        res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) =>{
    const { user } = req.headers;
    const { to, text, type } = req.body;
    const messageSchema = joi.object(
        {to: joi.string().required(),
        text: joi.string().required(),
        type:  joi.string().valid("message", "private_message").required()
    });
    const userSchema = joi.object({user:  joi.string().required()});
    const validationMessage = messageSchema.validate(req.body, {abortEarly: true});
    const validationUser = userSchema.validate(req.headers, {abortEarly: false});

    if (validationMessage.error || validationUser.error) {
        res.sendStatus(422);
        return;
    }
    try {
        const participants = await db.collection("participants").find().toArray();
        if (participants.find(participant => participant.name === user)) {
            res.sendStatus(422);
            return;
        }
        await db.collection("messages").insertOne(
            {from: user, 
            to, text, type,
            time: dayjs().format("HH:mm:ss")
        });
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.get("/messages", async (_req, res) => {
    const messages = await db.collection("messages").find().toArray();
    res.send(messages);
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    try {
        const participants = await db.collection("participants").find().toArray();
        if (!participants.find(participant => participant.name === user)) {
            res.sendStatus(404);
            return;
        }
        await db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
})

setInterval(async () => {
    const participants = await db.collection("participants").find().toArray();
    for (let i=0; i < participants.length; i++){
        const participant = participants[i];
        if ((Date.now() - participant.lastStatus) > 10000) {
            await db.collection("participants").deleteOne({_id: new ObjectId(participant._id)});
            await db.collection("messages").insertOne(
                {from: participant.name, 
                to: "Todos",
                text: "sai da sala...", 
                type: "status",
                time: dayjs().format("HH:mm:ss")
            });
        }
    };
}, 15000);

app.listen(5000, () => console.log(chalk.bold.cyanBright("Server is running at port 5000 👍")));