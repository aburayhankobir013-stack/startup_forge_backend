const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT;
app.use(cors());
app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

app.get("/", (request, response) => {
  return response.send(`Server running...`);
});

const MONGODB_URI = `${process.env.MONGODB_URI}`;
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = await client.db("startup_forge");
    console.log(`Server successfully connected with mongodb!`);
    const startupCollection = database.collection("startups");
    const opportunityCollection = database.collection("opportunities");
      // CRUD WITH FOUNDER
      app.post("/api/founder/add_startup", async (request, response) => {
        try {
          const startupFormData = request.body;
          const data = {
            ...startupFormData,
            status: "pending",
            createdAt: new Date(),
          };
          const result = await startupCollection.insertOne(data);
          return response.status(201).json({
            success: true,
            message: "Startup created successfully!",
          });
        } catch (error) {
          return response.status(500).json({
            success: false,
            message: error.message,
          });
        }
      });
      app.post("/api/founder/add_opportunity", async (request, response) => {
        const opportunityData = request.body;
        console.log(opportunityData);
      });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
