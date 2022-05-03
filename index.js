import express, { json } from "express";
import chalk from "chalk";
import { MongoClient } from "mongodb";
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
        if (participants.find(participant => participant.name === name) >=0) {
            res.status(409).send("Esse usuário já existe na sala.");
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

app.get("/participants", async (req, res) =>{
    try {
        const participants = await db.collection("participants").find().toArray();
        res.send(participants);
    } catch {
        res.send("Erro ao listar usuários.");
    }
});

app.listen(5000, () => console.log(chalk.bold.cyanBright("Server is running at port 5000 👍")));