const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v16vj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB Client Setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const EventCollection = client.db('EventDB').collection('Events');

    // ✅ Add new event
    app.post('/event', async (req, res) => {
      const newEvent = {
        ...req.body,
        attendeeCount: 0,
        joinedUsers: [], // 🧠 Ensure this field exists
      };

      try {
        const result = await EventCollection.insertOne(newEvent);
        res.send(result);
      } catch (error) {
        console.error("Error inserting event:", error);
        res.status(500).json({ message: "Failed to add event" });
      }
    });

    // ✅ Get all events
    app.get("/event", async (req, res) => {
      try {
        const events = await EventCollection.find().toArray();
        res.json(events);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    // GET /events?user=email
app.get("/events", async (req, res) => {
  const user = req.query.user;
  const events = await EventCollection.find({ user }).toArray();
  res.send(events);
});

// DELETE /event/:id
app.delete("/event/:id", async (req, res) => {
  const id = req.params.id;
  const result = await EventCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// PUT /event/:id
app.put("/event/:id", async (req, res) => {
  const id = req.params.id;
  const update = req.body;

  try {
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    // Optional: Remove fields you don't want to allow to update (like _id)
    if (update._id) delete update._id;

    const result = await EventCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event updated successfully" });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



    // ✅ Join event (only once per email)
    app.patch("/event/join/:id", async (req, res) => {
      const { email } = req.body;
      const { id } = req.params;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      try {
        const event = await EventCollection.findOne({ _id: new ObjectId(id) });

        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }

        if (event.joinedUsers?.includes(email)) {
          return res.status(400).json({ message: "User already joined." });
        }

        // Update event: add attendee
        await EventCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $inc: { attendeeCount: 1 },
            $addToSet: { joinedUsers: email },
          }
        );

        const updated = await EventCollection.findOne({ _id: new ObjectId(id) });

        res.json({
          message: "Joined successfully",
          attendeeCount: updated.attendeeCount,
        });
      } catch (error) {
        console.error("Join event error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // ✅ MongoDB Connection Check
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("🎉 Event Manager Server Running");
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
