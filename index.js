const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000

// middle ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jbxtt4r.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const serviceCollection = client.db('ahsanPhotography').collection('services');
        const reviewCollection = client.db('ahsanPhotography').collection('reviews');

        app.post('/jwt' , (req , res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'})
            res.send({token})
        })

        app.get('/services', async(req, res) => {
            const size = parseInt(req.query.size);
            const query = {}
            const options = {
                sort: {
                    $natural: -1
                }
            } 
            const cursor = serviceCollection.find(query, options);
            const services = await cursor.limit(size).toArray();
            res.send(services);
        })

        app.get('/services/:id' , async(req , res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const service = await serviceCollection.findOne(query)
            res.send(service)
        })

        app.post('/services' , async(req , res)=>{
            const service = req.body;
            const result = await serviceCollection.insertOne(service);
            res.send(result)
        })

        app.get('/reviews/:serviceId', async(req, res) => {
            const query = {
                service: req.params.serviceId
            }
            const options = {
                sort: {
                    time: -1
                }
            }            
            const cursor = reviewCollection.find(query, options);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.get('/reviews', verifyJWT, async(req, res) => {
            const decoded = req.decoded;

            if(decoded.email !== req.query.email){
                res.status(403).send({message: 'unauthorized access'})
            }

            let query = {}
            if(req.query.email){
                query = {
                    email: req.query.email
                }
            }
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.get('/review/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const review = await reviewCollection.findOne(query)
            res.send(review);
        })

        app.post('/reviews', async(req, res) => {
            const review = req.body;
            const date = new Date();
            const result = await reviewCollection.insertOne({...review, time:date});
            res.send(result);
        })

        app.put('/reviews/:id', async(req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const review = req.body;
            const option = { upsert: true }
            const updatedReview = {
                $set: {
                    message: review.message,
                }
            }
            const result = await reviewCollection.updateOne(filter, updatedReview, option);
            res.send(result)
        })

        app.delete('/reviews/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally{

    }
}

run().catch(err => console.error(err))



app.get('/' , (req , res)=>{
   res.send('Ahsan Photography server is running');
})

app.listen(port , () => {
    console.log(`> Ahsan Photography Server running on port : ${port}`)
})
