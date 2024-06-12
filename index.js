const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://pet-adoption-a621f.web.app", "https://pet-adoption-a621f.firebaseapp.com"],
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
    const donationCollection = client.db("petAdoptionDb").collection("donations");
    const AdoptionRequestCollection = client.db("petAdoptionDb").collection("AdoptionRequest");
    const DonatedListCollection = client.db("petAdoptionDb").collection("DonatedList");



    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers);
      if (!req.headers.authorization) {
        return req.status(401).send({ message: 'forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      // next();
    }

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

    // get route to add a donation campaign
    app.get('/donations', async (req, res) => {
      const cursor = donationCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Post route to add a donation campaign
    app.post('/donations', async (req, res) => {
      try {
        const newDonationCampaign = req.body;
        const result = await donationCollection.insertOne(newDonationCampaign);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error inserting donation campaign:', error);
        res.status(500).send({ error: 'An error occurred while creating the donation campaign' });
      }
    });

    app.post('/User', verifyToken, async (req, res) => {
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
        res.status(500).send({ message: 'Internal server error' })
      }
    });

    //  get user
    app.get('/user', async (req, res) => {
      const result = await UserCollection.find().toArray();
      res.send(result);
    });

    //  Get user by Email
    app.get('/userDetails/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = UserCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get('/petDetails/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.findOne(query);
      res.send(result);
    });

    app.get('/donationCampaignDetailsById/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationCollection.findOne(query);
      res.send(result);
    });

    // update part
    app.put('/updatePet/:id', async (req, res) => {
      const id = req.params.id;
      const updatedPet = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedPet,
      };

      try {
        const result = await petCollection.updateOne(filter, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Pet not found' });
        }
        res.send(result);
      } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    // myPet part
    app.get('/myPet/:ownerEmail', async (req, res) => {
      const ownerEmail = req.params.ownerEmail;
      const query = { ownerEmail: ownerEmail };
      const cursor = petCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.put('/petUpdateAdoptedStatus/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const status = req.body;
      console.log(status);
      const pet = {
        $set: {
          adopted: status.adopted,
        }
      }
      const result = await petCollection.updateOne(filter, pet, options);
      res.send(result);
    });


    app.get('/userDetails/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = UserCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    })

    app.post('/addAdoptionRequest', async (req, res) => {
      const adoptionRequest = req.body;
      console.log('new adoption request', adoptionRequest);
      const result = await AdoptionRequestCollection.insertOne(adoptionRequest);
      res.send(result);
    });

    app.get('/myAdoptionRequest/:ownerEmail', async (req, res) => {
      const ownerEmail = req.params.ownerEmail;
      const query = { ownerEmail: ownerEmail };
      const cursor = AdoptionRequestCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });
    app.put('/petUpdateAdoptedStatus/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const status = req.body;
      console.log(status);
      const pet = {
        $set: {
          adopted: status.adopted,
        }
      }
      const result = await petCollection.updateOne(filter, pet, options);
      res.send(result);
    });

    app.put('/acceptRejectAdoptionRequest/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const status = req.body;
      console.log(status);
      const pet = {
        $set: {
          isAcceptedRequest: status.isAcceptedRequest,
        }
      }
      const result = await AdoptionRequestCollection.updateOne(filter, pet, options);
      res.send(result);
    });

    app.delete('/petDelete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petCollection.deleteOne(query);
      res.send(result);
    });


    app.get('/user', async (req, res) => {
      console.log(req.headers);
      const result = await UserCollection.find().toArray();
      res.send(result);
    });

    // * Get user by Email
    app.get('/userDetails/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = UserCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    // POST /User - Create a new user
    app.post('/User', async (req, res) => {
      const { email, name, role, image } = req.body;

      if (!email || !name || !role || !image) {
        return res.status(400).send({ message: 'Email, name and role are required' });
      }

      try {
        const query = { email: email };
        const existingUser = await UserCollection.findOne(query);

        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }
        // console.log(req.headers);
        const result = await UserCollection.insertOne({ email, name, role, image });
        res.send(result);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });





    app.get('/myPet/:ownerEmail', async (req, res) => {
      const ownerEmail = req.params.ownerEmail;
      const query = { ownerEmail: ownerEmail };
      const cursor = petCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });
    app.put('/makeAdmin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateUser = req.body;
      const updateRole = {
        $set: {
          role: updateUser.role,
        }
      }
      const result = await UserCollection.updateOne(filter, updateRole, options);
      res.send(result);
    });
    app.put('/addDonatedAmount/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedDonationCampaign = req.body;
      const donationCampaign = {
        $set: {
          donatedAmount: updatedDonationCampaign.donatedAmount,
        }
      }
      const result = await donationCollection.updateOne(filter, donationCampaign, options);
      res.send(result);
    });
    app.post('/addDonatedList', async (req, res) => {
      const donation = req.body;
      console.log('new pet', donation);
      const result = await DonatedListCollection.insertOne(donation);
      res.send(result);
    });
    app.post('/addDonationCampaign', async (req, res) => {
      const donationCampaign = req.body;
      console.log('new donation campaign', donationCampaign);
      const result = await donationCollection.insertOne(donationCampaign);
      res.send(result);
    });
    app.post('/addAdoptionRequest', async (req, res) => {
      const adoptionRequest = req.body;
      console.log('new adoption request', adoptionRequest);
      const result = await AdoptionRequestCollection.insertOne(adoptionRequest);
      res.send(result);
    });
    app.post('/addPet', async (req, res) => {
      const pet = req.body;
      console.log('new pet', pet);
      const result = await petCollection.insertOne(pet);
      res.send(result);
    });
    app.put('/updateDonationCampaign/:id', async (req, res) => {
      const id = req.params.id;
      const updatedDonationCampaign = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedDonationCampaign,
      };
      try {
        const result = await donationCollection.updateOne(filter, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Pet not found' });
        }
        res.send(result);
      }
      catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });
    app.put('/updatePet/:id', async (req, res) => {
      const id = req.params.id;
      const updatedPet = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedPet,
      };
      try {
        const result = await petCollection.updateOne(filter, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Pet not found' });
        }
        res.send(result);
      } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });
    app.post('/User', async (req, res) => {
      const { email, name, role, image } = req.body;

      if (!email || !name || !role || !image) {
        return res.status(400).send({ message: 'Email, name and role are required' });
      }

      try {
        const query = { email: email };
        const existingUser = await UserCollection.findOne(query);

        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }

        const result = await UserCollection.insertOne({ email, name, role, image });
        res.send(result);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.get('/userDetails/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = UserCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });
    app.get('/user', verifyToken, async (req, res) => {
      console.log(req.headers);
      const result = await UserCollection.find().toArray();
      res.send(result);
    });


    app.get('/myDonation/:donatorEmail', async (req, res) => {
      const donatorEmail = req.params.donatorEmail;
      const query = { donatorEmail: donatorEmail };
      const cursor = DonatedListCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get('/myDonationCampaign/:ownerEmail', async (req, res) => {
      const ownerEmail = req.params.ownerEmail;
      const query = { ownerEmail: ownerEmail };
      const cursor = donationCollection.find(query);
      const results = await cursor.toArray();
      res.send(results);
    });

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;

      if (!price) {
        return res.status(400).send({ message: 'Price is required' });
      }
      try {
        const amount = parseInt(price * 100);
        console.log(`Creating payment intent for amount: ${amount}`);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });



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