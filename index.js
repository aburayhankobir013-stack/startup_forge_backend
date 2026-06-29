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
    app.get("/api/featured_startups", async (request, response) => {
      try {
        const result = await startupCollection.find().limit(4).toArray();
        return response.json({
          success: true,
          data: result,
        });
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get("/api/all_startups", async (request, response) => {
      try {
        const all_startups = await startupCollection.find().toArray();
        if (all_startups.length === 0) {
          return response.json({
            success: true,
            message: "No startup found!",
            data: all_startups,
          });
        }
        return response.json({
          success: true,
          data: all_startups,
        });
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get("/api/startup_details/:startup_id", async (request, response) => {
      try {
        const { startup_id } = request.params;
        if (!ObjectId.isValid(startup_id)) {
          return response.json({
            success: false,
            message: "Invalid startup ID!",
          });
        }
        const startupObjectId = new ObjectId(startup_id);
        const result = await startupCollection.findOne({
          _id: startupObjectId,
        });
        if (!result) {
          return response.json({
            success: false,
            message: "Start not found!",
          });
        }
        return response.json({
          success: true,
          data: result,
        });
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get("/api/featured_opportunities", async (request, response) => {
      try {
        const result = await opportunityCollection
          .aggregate([
            {
              $lookup: {
                from: "startups",
                localField: "startup_id",
                foreignField: "_id",
                as: "startup",
              },
            },
            {
              $unwind: "$startup",
            },
            {
              $project: {
                _id: 1,
                startup_id: 1,
                role_title: 1,
                required_skills: 1,
                work_type: 1,
                commitment_levels: 1,
                deadline: 1,

                startup_name: "$startup.startup_name",
                imageUrl: "$startup.imageUrl",
                industry: "$startup.industry",
              },
            },
            {
              $limit: 4,
            },
          ])
          .toArray();
        return response.json({
          success: true,
          data: result,
        });
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get("/api/all_opportunities", async (request, response) => {
      try {
        const result = await opportunityCollection
          .aggregate([
            {
              $lookup: {
                from: "startups",
                localField: "startup_id",
                foreignField: "_id",
                as: "startup",
              },
            },
            {
              $unwind: "$startup",
            },
            {
              $project: {
                _id: 1,
                startup_id: 1,
                role_title: 1,
                required_skills: 1,
                work_type: 1,
                commitment_levels: 1,
                deadline: 1,

                startup_name: "$startup.startup_name",
                imageUrl: "$startup.imageUrl",
                industry: "$startup.industry",
              },
            },
          ])
          .toArray();
        return response.json({
          success: false,
          data: result,
        });
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get(
      "/api/opportunity_details/:opportunityId",
      async (request, response) => {
        try {
          const { opportunityId } = request.params;
          if (!ObjectId.isValid(opportunityId)) {
            return response.json({
              success: false,
              message: "Invalid opportunity ID!",
            });
          }
          const result = await opportunityCollection
            .aggregate([
              {
                $match: {
                  _id: new ObjectId(opportunityId),
                },
              },
              {
                $lookup: {
                  from: "startups",
                  localField: "startup_id",
                  foreignField: "_id",
                  as: "startup",
                },
              },
              {
                $unwind: "$startup",
              },
              {
                $project: {
                  _id: 1,
                  startup_id: 1,
                  role_title: 1,
                  required_skills: 1,
                  work_type: 1,
                  commitment_levels: 1,
                  deadline: 1,

                  startup_name: "$startup.startup_name",
                  imageUrl: "$startup.imageUrl",
                  industry: "$startup.industry",
                },
              },
            ])
            .toArray();
            if (!result) {
              return response.json({
                success: false,
                message: "Opportunity not found!",
              });
            }
            return response.json({
              success: true,
              data: result,
            });
        } catch (error) {
          return response.json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    // CRUD WITH FOUNDER
    app.post("/api/founder/add_startup", async (request, response) => {
      try {
        const { founder_email } = request.query;
        const isExist = await startupCollection.findOne({ founder_email });
        if (isExist) {
          return response.json({
            success: false,
            message: "Already created a startup through this email!",
          });
        }
        const startupFormData = request.body;
        const data = {
          ...startupFormData,
          status: "pending",
          createdAt: new Date(),
        };
        const result = await startupCollection.insertOne(data);
        return response.json({
          success: true,
          message: "Startup created successfully!",
        });
      } catch (error) {
        return response.json({
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
          return response.json({
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
          return response.json({
            success: true,
            message: "Opportunity successfully added!",
          });
        }
      } catch (error) {
        return response.json({
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
          return response.json({
            success: true,
            data: result,
          });
        } else {
          return response.json({
            success: false,
            message: "Data not found!",
            data: null,
          });
        }
      } catch (error) {
        return response.json({
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
            return response.json({
              success: false,
              message: "Invalid startup ID!",
            });
          }
          const startupObjectId = new ObjectId(startupId);
          const result1 = await startupCollection.deleteOne({
            _id: startupObjectId,
          });
          if (result1.deletedCount === 0) {
            return response.json({
              success: false,
              message: "Startup not found!",
            });
          }
          const result2 = await opportunityCollection.deleteMany({
            startup_id: startupObjectId,
          });
          return response.json({
            success: true,
            message: "Startup and related opportunities deleted successfully!",
          });
        } catch (error) {
          return response.json({
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
            return response.json({
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
            return response.json({
              success: false,
              message: "Startup not found!",
            });
          }
          if (result.modifiedCount > 0) {
            return response.json({
              success: true,
              message: "Updated successfully!",
            });
          }
          return response.json({
            success: true,
            message: "No changes detected!",
          });
        } catch (error) {
          return response.json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    app.get("/api/founder/manage_opportunities", async (request, response) => {
      try {
        const founder_email = request.query.founder_email;
        const relatedStartup = await startupCollection.findOne({
          founder_email,
        });
        if (!relatedStartup) {
          return response.json({
            success: false,
            message: "Startup not found!",
          });
        }
        const { _id } = relatedStartup;
        const result = await opportunityCollection
          .find({
            startup_id: _id,
          })
          .toArray();
        if (result.length === 0) {
          return response.json({
            success: false,
            message: "Opportunities not found!",
          });
        }
        const data = {
          relatedStartup,
          opportunities: result,
        };
        return response.json({
          success: true,
          data: data,
        });
      } catch (error) {
        return response.json({
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
            return response.json({
              success: false,
              message: "Invalid opportunity ID!",
            });
          }
          const opportunityObjectId = new ObjectId(opportunityId);
          const result = await opportunityCollection.deleteOne({
            _id: opportunityObjectId,
          });
          if (result.deletedCount === 0) {
            return response.json({
              success: false,
              message: "Opportunity not found!",
            });
          }
          return response.json({
            success: true,
            message: "Opportunity successfully deleted!",
          });
        } catch (error) {
          return responses.json({
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
            return response.json({
              success: false,
              message: "Invalid opportunity ID!",
            });
          }
          const founder_email = request.body[0].founder_email;
          const startup = await startupCollection.findOne({ founder_email });
          if (!startup) {
            return response.json({
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
            return response.json({
              success: true,
              message: "Opportunity successfully updated!",
            });
          }
        } catch (error) {
          return response.json({
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
