import express from "express";
import cors from "cors";
import chalk from "chalk";


const app = express();
app.use(cors());
app.use(express.json());

app.get("/participants", (_req, res) => {
    res.send("Ok");
});

app.listen(5000, () => console.log(chalk.bold.cyanBright("Server is running at port 5000 👍")));