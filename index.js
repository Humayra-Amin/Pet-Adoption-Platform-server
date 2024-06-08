const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["http://localhost:5173"],
}));
app.use(express.json());



// MongoDB setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9jkswbp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const petCollection = client.db("petAdoptionDb").collection("pets");
    const UserCollection = client.db("petAdoptionDb").collection("User");


    // get route to add a new pet
    app.get('/pets', async (req, res) => {
      const cursor = petCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // post route to add a new pet
    app.post('/pets', async (req, res) => {
      try {
        const newPet = req.body;
        const result = await petCollection.insertOne(newPet);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error inserting pet:', error);
        res.status(500).send({ error: 'An error occurred while adding the pet' });
      }
    });

    app.post('/User', async (req, res) => {
      const { email, name, role } = req.body;
      if (!email || !name || !role) {
        return res.status(400).send({ message: 'Email, name and role are required' });
      }

      try {
        const query = { email: email };
        const existingUser = await UserCollection.findOne(query);

        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }

        const result = await UserCollection.insertOne({ email, name, role });
        res.send(result);
      } catch (error) {
        console.error('Error creating user:', error)
        res.status(500).send({message: 'Internal server error'})
      }
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Pet Adoption Server Started')
})

app.listen(port, () => {
  console.log(`Server started on http://localhost: ${port}`)
})