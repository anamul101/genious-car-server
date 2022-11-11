const express = require('express')
const app = express()
const cors= require('cors')
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// middelware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD }@cluster0.apqupzl.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyjwt(req,res,next){
    const authorizeJwt = req.headers.authorization;
    if(!authorizeJwt){
       return res.status(401).send({message: 'Unauthorize access'});
    }
    const token = authorizeJwt.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err,decoded){
        if(err){
           return res.status(403).send({message: 'Unauthorize access'});
        }
        req.decoded = decoded;
        next();
    })
}
async function run(){
    try{
        const servicesCollection = client.db('GeniousCar').collection('services');
        const ordersCollection = client.db('GeniousCar').collection('orders');
        // JWT TOKEN
        app.post('/jwt', (req,res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
            res.send({token});
        });
        app.get('/services', async(req,res)=>{
            const search = req.query.search;
            const query={};
            if(search.length){
                query={
                    $text:{
                        $search:search
                    }
                }
            }
            const order = req.query.order === 'Asc' ? 1:-1;
            const cursor = servicesCollection.find(query).sort({price:order});
            const services = await cursor.toArray();
            res.send(services);
        });
        app.get('/services/:id',async(req,res)=>{
            const id = req.params.id
            const query={_id: ObjectId(id)};
            const serviceId = await servicesCollection.findOne(query);
            res.send(serviceId);
        });

        // order collection
        app.get('/orders',verifyjwt, async(req,res)=>{
            const decoded = req.decoded;
            if(decoded.email !== req.query.email){
                res.status(401).send({message: 'Unauthorize access'})
            }
            let query = {};
            if(req.query.email){
                query ={
                   email: req.query.email
                }
            }
            const cursor = ordersCollection.find(query);
            const order = await cursor.toArray();
            res.send(order);
        });
        app.post('/orders', async(req,res)=>{
            const order=req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });
        app.patch('/orders/:id', async(req,res)=>{
            const id = req.params.id;
            const status = req.body.status;
            const filter = {_id: ObjectId(id)};
            const ubdateDoc={
                $set:{
                    status: status
                }
            };
            const results = await ordersCollection.updateOne(filter, ubdateDoc);
            res.send(results);
        })
        app.delete('/orders/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const results= await ordersCollection.deleteOne(query);
            res.send(results);
        })
    }
    finally{

    }
}
run().catch(error=>console.log(error))


app.get('/', (req, res) => {
  res.send('Genious car server is running!')
})

app.listen(port, () => {
  console.log(`genious car listening on port ${port}`)
})