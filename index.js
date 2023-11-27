const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

// middleware

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.raw2hqu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // DATA COLLECTION

    const userCollection = client.db("PawPalDB").collection("users");

    //JWT Token Genaretor
    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    // Create user
    app.post("/api/v1/users", async (req, res) => {
        const user = req.body;
        
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "User already exiests.", insertedId: null });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      });
  

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("PawPal server is running.....");
});

app.listen(port, () => {
  console.log("Pawpal server is running on port :", port);
});
