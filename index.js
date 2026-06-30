const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;
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
    // await client.connect();
    const database = await client.db("startup_forge");
    // console.log(`Server successfully connected with mongodb!`);
    const startupCollection = database.collection("startups");
    const opportunityCollection = database.collection("opportunities");
    const applicationCollection = database.collection("applications");
    const userCollection = database.collection("user");
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
    // Application api
    app.post("/api/apply_opportunity", async (request, response) => {
      try {
        const {
          applicantEmail,
          portfolioLink,
          motivationalMessage,
          opportunity_id,
          status,
          applied_at,
        } = request.body;
        const applicationData = {
          opportunity_id: new ObjectId(opportunity_id),
          applicantEmail,
          portfolioLink,
          motivationalMessage,
          status,
          applied_at,
        };

        const isExist = await applicationCollection.findOne({
          opportunity_id: new ObjectId(opportunity_id),
          applicantEmail: applicantEmail,
        });
        if (!isExist) {
          const result = await applicationCollection.insertOne(applicationData);
          return response.json({
            success: true,
            message: "Application created successfully!",
          });
        } else {
          return response.json({
            success: false,
            message: "Already applied for this application!",
          });
        }
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
    app.get("/api/founder/all_applications", async (request, response) => {
      try {
        const founderEmail = request.query.founderEmail;

        const result = await startupCollection
          .aggregate([
            {
              $match: {
                founder_email: founderEmail,
              },
            },

            {
              $lookup: {
                from: "opportunities",
                localField: "_id",
                foreignField: "startup_id",
                as: "opportunities",
              },
            },

            { $unwind: "$opportunities" },

            {
              $lookup: {
                from: "applications",
                localField: "opportunities._id",
                foreignField: "opportunity_id",
                as: "applications",
              },
            },

            { $unwind: "$applications" },

            {
              $project: {
                _id: 0,

                applicationId: "$applications._id",

                startup_name: "$startup_name",

                role_title: "$opportunities.role_title",

                applicant_email: "$applications.applicantEmail",

                status: "$applications.status",

                appliedAt: "$applications.applied_at",
              },
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
    app.patch(
      "/api/founder/update_application/:application_id",
      async (request, response) => {
        try {
          const { application_id } = request.params;
          const { status } = request.body;
          if (!ObjectId.isValid(application_id)) {
            return response.json({
              success: false,
              message: "Invalid application ID!",
            });
          }
          const result = await applicationCollection.updateOne(
            { _id: new ObjectId(application_id) },
            {
              $set: {
                status,
              },
            },
          );
          return response.json({
            success: true,
            message: "Status updated successfully",
          });
        } catch (error) {
          return response.json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    app.get("/api/founder/overview", async (request, response) => {
      try {
        const { founderEmail } = request.query;
        const result = await startupCollection
          .aggregate([
            {
              $match: {
                founder_email: founderEmail,
              },
            },

            {
              $lookup: {
                from: "opportunities",
                localField: "_id",
                foreignField: "startup_id",
                as: "opportunities",
              },
            },

            {
              $unwind: "$opportunities",
            },

            {
              $lookup: {
                from: "applications",
                localField: "opportunities._id",
                foreignField: "opportunity_id",
                as: "applications",
              },
            },

            {
              $unwind: {
                path: "$applications",
                preserveNullAndEmptyArrays: true,
              },
            },

            {
              $group: {
                _id: null,

                totalOpportunities: {
                  $addToSet: "$opportunities._id",
                },

                totalApplications: {
                  $sum: {
                    $cond: [{ $ifNull: ["$applications._id", false] }, 1, 0],
                  },
                },

                acceptedApplications: {
                  $sum: {
                    $cond: [
                      { $eq: ["$applications.status", "accepted"] },
                      1,
                      0,
                    ],
                  },
                },

                rejectedApplications: {
                  $sum: {
                    $cond: [
                      { $eq: ["$applications.status", "rejected"] },
                      1,
                      0,
                    ],
                  },
                },

                pendingApplications: {
                  $sum: {
                    $cond: [{ $eq: ["$applications.status", "pending"] }, 1, 0],
                  },
                },
              },
            },

            {
              $project: {
                _id: 0,
                totalOpportunities: {
                  $size: "$totalOpportunities",
                },
                totalApplications: 1,
                acceptedApplications: 1,
                rejectedApplications: 1,
                pendingApplications: 1,
              },
            },
          ])
          .toArray();
        response.json({
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
    // CRUD WITH COLLABORATOR
    app.get("/api/collaborator/overview", async (request, response) => {
      try {
        const { applicantEmail } = request.query;
        const result = await applicationCollection
          .aggregate([
            {
              $match: {
                applicantEmail: applicantEmail,
              },
            },

            {
              $group: {
                _id: null,

                totalApplications: {
                  $sum: 1,
                },

                acceptedApplications: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "accepted"] }, 1, 0],
                  },
                },

                rejectedApplications: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
                  },
                },

                pendingApplications: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
                  },
                },
              },
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
    app.get("/api/collaborator/my_applications", async (request, response) => {
      try {
        const { applicantEmail } = request.query;
        const result = await applicationCollection
          .aggregate([
            {
              $match: {
                applicantEmail: applicantEmail,
              },
            },
            {
              $lookup: {
                from: "opportunities",
                localField: "opportunity_id",
                foreignField: "_id",
                as: "opportunity",
              },
            },
            {
              $unwind: "$opportunity",
            },
            {
              $lookup: {
                from: "startups",
                localField: "opportunity.startup_id",
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
                status: 1,
                applied_at: 1,

                opportunity_name: "$opportunity.role_title",
                startup_name: "$startup.startup_name",
              },
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
    // CRUD WITH ADMIN
    app.get("/api/admin/manage_users", async (request, response) => {
      try {
        const result = await userCollection
          .find({
            role: { $ne: "admin" },
          })
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
    app.patch(
      "/api/admin/update_user_status/:userId",
      async (request, response) => {
        try {
          const { userId } = request.params;
          const {isBlocked} = request.body;
          if (!ObjectId.isValid(userId)) {
            return response.json({
              success: false,
              message: "Invalid user ID!",
            });
          }
          const result = await userCollection.updateOne(
            {
              _id: new ObjectId(userId),
            },
            {
              $set: {
                isBlocked,
              }
            },
          );
          return response.json({
            success: true,
            message: "User status successfully updated!",
          });
        } catch (error) {
          return response.json({
            success: false,
            message: "Internal server error!",
          });
        }
      },
    );
    app.get("/api/admin/manage_startups", async (request, response) => {
      try {
        const result = await startupCollection.find().toArray();
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
    app.patch("/api/admin/update_startup_status/:startupId", async (request, response) => {
      try {
        const {startupId} = request.params;
        const { status } = request.body;
        if (!ObjectId.isValid(startupId)) {
          return response.json({
            success: false,
            message: "Invalid startup ID!",
          });
        }
        const result = await startupCollection.updateOne(
          {
            _id: new ObjectId(startupId),
          },
          {
            $set: {
              status
            }
          }
        );
        return response.json({
          success: true,
          message: "Startup status successfully updated!",
        });
      } catch (error) {
        return response.json({
          success: false,
          message: "Internal server error!",
        });
      }
    });
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
