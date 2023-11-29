const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const categoryCollection = client.db("PawPalDB").collection("categorys");
    const petCollection = client.db("PawPalDB").collection("pets");
    const donationCollection = client.db("PawPalDB").collection("donations");

    //JWT Token Genaretor
    app.post("/api/v1/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "24hr",
      });
      res.send({ token });
    });

    // middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    //  check admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // get users
    app.get("/api/v1/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // admin network request

    app.get("/api/v1/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
        res.send({ admin });
      }
      const isAdmin = user;
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

    // make user admin
    app.patch(
      "/api/v1/toAdmin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    // get categorys
    app.get("/api/v1/categorys", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });
    // get all pets
    app.get("/api/v1/allPets", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });
    // get single pet
    app.get("/api/v1/pet/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.send(result);
    });
    // get single donation
    app.get("/api/v1/singleDonation/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(query);
      res.send(result);
    });

    // post pet

    app.post("/api/v1/addPets", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await petCollection.insertOne(item);
      res.send(result);
    });

    // post donation

    app.post("/api/v1/createDonation", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await donationCollection.insertOne(item);
      res.send(result);
    });
    // delete pet
    app.delete("/api/v1/delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });

    // update status

    app.patch("/api/v1/status/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          adopted: true,
        },
      };
      const result = await petCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.patch("/api/v1/statusAdmin/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          adopted: query.adopted,
        },
      };
      const result = await petCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // update donation status
    app.patch("/api/v1/donationStatus/:id", verifyToken, async (req, res) => {
      const item = req.body;

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: item?.status,
        },
      };
      const result = await donationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // update pet
    app.patch("/api/v1/update/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          age: item.age,
          category: item.category,
          location: item.location,
          shortDescription: item.shortDescription,
          longDescription: item.longDescription,
          image: item.image,
        },
      };
      const result = await petCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // update donation
    app.patch("/api/v1/updateDonation/:id", verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          maxAmount: item.maxAmount,
          lastDate: item.lastDate,
          shortDescription: item.shortDescription,
          longDescription: item.longDescription,
          image: item.image,
        },
      };
      const result = await donationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // get pet for indivisual user
    app.get("/api/v1/myAddedPets", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/myAddedCampaigns", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await donationCollection.find(query).toArray();
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
