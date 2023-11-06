const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
// const authenticateJWT = require("./jwtMiddleware");
const jwt = require("jsonwebtoken");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dhw1j4v.mongodb.net/?retryWrites=true&w=majority`;
// console.log(process.env.SECRET_KEY);
// console.log(authenticateJWT);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  // console.log("token inside jwt", token);
  jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
    if (error) {
      res.status(403).send({ error: true, message: "unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const taskscollection = client.db("taskmgcrud").collection("tasks");

    //jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });
    //to get all the tasks by user who logged in only
    // app.get("/tasks", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { author: email };
    //   const cursor = taskscollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    //to get all the tasks by user who logged in only with filtering option
    // app.get("/tasks", async (req, res) => {
    //   const { email, searchText, priority, status, sortBy, sortOrder } =
    //     req.query;
    //   //   console.log(email, searchText, priority, status);
    //   // Define filters based on the query parameters
    //   const filters = { author: email };
    //   if (searchText) {
    //     filters.tasktitle = { $regex: new RegExp(searchText, "i") };
    //   }
    //   if (priority && priority !== "All") {
    //     filters.priority = parseInt(priority);
    //   }
    //   if (status && status !== "All") {
    //     filters.status = status;
    //   }
    //   //   console.log(filters);

    //   const sort = {};

    //   if (sortBy && sortOrder) {
    //     sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    //   }

    //   console.log(sort);

    //   // Fetch tasks from MongoDB based on the filters
    //   const result = await taskscollection.find(filters).sort(sort).toArray();
    //   res.json(result);
    // });

    app.get("/tasks", verifyJWT, async (req, res) => {
      const {
        email,
        searchText,
        priority,
        status,
        sortBy,
        sortOrder,
        page,
        perPage,
      } = req.query;

      const decoded = req.decoded;

      // if (decoded.email !== req.query.email) {
      //   return res.send({ error: 1, message: "access denied" });
      // }

      // console.log(decoded);
      // console.log(req.headers.authorization);
      const filters = { author: email };
      if (searchText) {
        filters.tasktitle = { $regex: new RegExp(searchText, "i") };
      }
      if (priority && priority !== "All") {
        filters.priority = parseInt(priority);
      }
      if (status && status !== "All") {
        filters.status = status;
      }

      const sort = {};

      // Check if sortBy is provided (e.g., "createdAt") and sortOrder (e.g., "asc" or "desc")
      if (sortBy && sortOrder) {
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        // If no specific sorting criteria is provided, sort by creation time in descending order
        sort.createdAt = -1; // -1 for descending order
      }

      delete sort[null];

      // console.log(sort);
      // Calculate skip based on page and perPage
      const skip = (page - 1) * perPage;

      try {
        const result = await taskscollection
          .find(filters)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(perPage))
          .toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Server error" });
      }
    });

    // app.post("/login", async (req, res) => {
    //   // Check user credentials (e.g., email and password)
    //   const { email, password } = req.body;

    //   // Perform user authentication, validate credentials, and check if the user is authorized.

    //   if (userAuthenticated) {
    //     // Generate a JWT token with user information
    //     const token = generateToken({
    //       email: user.email /* other user info */,
    //     });

    //     // Send the token as a response
    //     res.json({ token });
    //   } else {
    //     // Authentication failed
    //     res.status(401).json({ error: "Authentication failed" });
    //   }
    // });

    //view a single task details
    app.get("/tasks/view/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      //   console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await taskscollection.findOne(query);
      res.send(result);
      //   console.log(result);
    });

    //Delete a single task
    app.delete("/tasks/view/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      //   console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await taskscollection.deleteOne(query);
      res.send(result);
      //   console.log(result);
    });

    //Post new Task
    app.post("/tasks/create", verifyJWT, async (req, res) => {
      const newTask = req.body;
      //   console.log(newTask);
      const result = await taskscollection.insertOne(newTask);
      res.send(result);
    });

    //Edit Task
    app.put("/tasks/edit/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const updatedTask = req.body;

      const query = { _id: new ObjectId(id) };

      const result = await taskscollection.replaceOne(query, updatedTask);
      //   console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("taskmanagement crud server is running");
});

app.listen(port, () => {
  console.log(`taskmanagement crud server is running on port: ${port}`);
});
