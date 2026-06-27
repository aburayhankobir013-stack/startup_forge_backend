const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
          message: "Internal server error!",
        });
      }
    });
    app.post("/api/founder/add_opportunity", async (request, response) => {
      try {
        const founder_email = request.body[0].founder_email;
        const startup = await startupCollection.findOne({ founder_email });
        if (!startup) {
          return response.status(404).json({
            success: false,
            message: "No startup found for this founder!",
          });
        } else {
          const startup_id = startup._id;
          const opportunityData = request.body[1];
          const data = {
            startup_id,
            ...opportunityData,
          };
          const result = await opportunityCollection.insertOne(data);
          return response.status(201).json({
            success: true,
            message: "Opportunity successfully added!",
          });
        }
      } catch (error) {
        return response.status(500).json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get("/api/founder/my_startup", async (request, response) => {
      try {
        const founder_email = request.query.founder_email;
        const result = await startupCollection.findOne({ founder_email });
        if (result) {
          return response.status(200).json({
            success: true,
            data: result,
          });
        } else {
          return response.status(200).json({
            success: false,
            message: "Data not found!",
            data: null,
          });
        }
      } catch (error) {
        return response.status(500).json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.delete(
      "/api/founder/delete_startup/:startupId",
      async (request, response) => {
        try {
          const { startupId } = request.params;
          if (!ObjectId.isValid(startupId)) {
            return response.status(400).json({
              success: false,
              message: "Invalid startup ID!",
            });
          }
          const startupObjectId = new ObjectId(startupId);
          const result1 = await startupCollection.deleteOne({
            _id: startupObjectId,
          });
          if (result1.deletedCount === 0) {
            return response.status(404).json({
              success: false,
              message: "Startup not found!",
            });
          }
          const result2 = await opportunityCollection.deleteMany({
            startup_id: startupObjectId,
          });
          return response.status(200).json({
            success: true,
            message: "Startup and related opportunities deleted successfully!",
          });
        } catch (error) {
          return response.status(500).json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    app.put(
      "/api/founder/update_startup/:startupId",
      async (request, response) => {
        try {
          const { startupId } = request.params;
          if (!ObjectId.isValid(startupId)) {
            return response.status(400).json({
              success: false,
              message: "Invalid startup ID!",
            });
          }
          const data = request.body;
          const result = await startupCollection.updateOne(
            { _id: new ObjectId(startupId) },
            {
              $set: data,
            },
          );
          if (result.matchedCount === 0) {
            return response.status(404).json({
              success: false,
              message: "Startup not found!",
            });
          }
          if (result.modifiedCount > 0) {
            return response.status(200).json({
              success: true,
              message: "Updated successfully!",
            });
          }
          return response.status(200).json({
            success: true,
            message: "No changes detected!",
          });
        } catch (error) {
          return response.status(500).json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    app.get("/api/founder/manage_opportunities", async (request, response) => {
      try {
        const result1 = await opportunityCollection.find().toArray();
        if (result1.length === 0) {
          return response.status(200).json({
            data: result1,
          });
        }
        const result2 = await startupCollection.find().toArray();
        const relatedStartup = result2[0];
        const data = {
          relatedStartup,
          opportunities: result1,
        };
        return response.status(200).json({
          success: true,
          data: data,
        });
      } catch (error) {
        return response.status(500).json({
          success: true,
          message: "Internal server error!",
        });
      }
    });
    app.delete(
      "/api/founder/delete_opportunity/:opportunityId",
      async (request, response) => {
        try {
          const { opportunityId } = request.params;
          if (!ObjectId.isValid(opportunityId)) {
            return response.status(400).json({
              success: false,
              message: "Invalid opportunity ID!",
            });
          }
          const opportunityObjectId = new ObjectId(opportunityId);
          const result = await opportunityCollection.deleteOne({
            _id: opportunityObjectId,
          });
          if (result.deletedCount === 0) {
            return response.status(404).json({
              success: false,
              message: "Opportunity not found!",
            });
          }
          return response.status(200).json({
            success: true,
            message: "Opportunity successfully deleted!",
          });
        } catch (error) {
          return response.status(500).json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    app.put(
      "/api/founder/update_opportunity/:opportunityId",
      async (request, response) => {
        try {
          const { opportunityId } = request.params;
          if (!ObjectId.isValid(opportunityId)) {
            return response.status(400).json({
              success: false,
              message: "Invalid opportunity ID!",
            });
          }
          const founder_email = request.body[0].founder_email;
          const startup = await startupCollection.findOne({ founder_email });
          if (!startup) {
            return response.status(404).json({
              success: false,
              message: "No startup found for this founder!",
            });
          } else {
            const startup_id = startup._id;
            const opportunityData = request.body[1];
            const data = {
              startup_id,
              ...opportunityData,
            };
            const opportunityObjectId = new ObjectId(opportunityId);
            const result = await opportunityCollection.updateOne(
              { _id: opportunityObjectId },
              {
                $set: data,
              },
            );
            return response.status(201).json({
              success: true,
              message: "Opportunity successfully updated!",
            });
          }
        } catch (error) {
          return response.status(500).json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
