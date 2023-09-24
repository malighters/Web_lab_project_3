const express = require('express');
const redis = require('redis');
const amqp = require('amqplib');
const Hero = require('./hero.model');

const heroRouter = express.Router();

let redisClient;
let rabbitmqChannel;

const queueName = 'Hero_adding_queue';

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
  console.log('Connected to Redis');
})();

(async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URI);
    rabbitmqChannel = await connection.createChannel();
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Error while connecting to RabbitMQ:', error);
  }
})();

heroRouter.get('/', async (req, res) => {
  const heroes = await Hero.find({});

  res.json(heroes);
})

heroRouter.get('/:id', async (req, res) => {
  let isCached = false, results;
  const id = req.params.id;

  try{
    const cacheResults = await redisClient.get(id);
    if(cacheResults) {
      isCached = true;
      results = JSON.parse(cacheResults);
    }
    else {
      results = await Hero.findById(id) || {};

      await redisClient.set(id, JSON.stringify(results), {
        EX: 180,
        NX: true,
      });
    }
  }
  catch (error) {
    console.error(error);
    return res.status(404).send("Data unavailable");
  }

  res.json({
    fromCache: isCached, 
    data: results
  });
});

heroRouter.post('/', async (req, res) => {
  const body = req.body;

  if(!body.name || !body.desc || !body.mainCharacteristic || !body.origin || !body.birthDate || !body.gender) {
    return res.status(400).send(`Missing some data, we can't add your hero to a database`);
  }

  try {
    await rabbitmqChannel.assertQueue(queueName);
    rabbitmqChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(body)));

    return res.status(201).send('The message has been sent to a queue successfully');
  }
  catch (error) {
    console.error('Error while sending a message:', error);
    return res.status(500).send('Server error');
  }

  // const hero = new Hero(body);
  // await hero.save();

  // res.json(hero);
});

heroRouter.post('/process', async (req, res) => {
  rabbitmqChannel.consume(queueName, async (message) => {
    if (message !== null) {
      const content = JSON.parse(message.content);
      console.log('Got message:', content);

      const hero = new Hero(content);
      await hero.save();

      rabbitmqChannel.ack(message);
    }
  });

  res.status(200).send('We started processing messages from a queue');
})

module.exports = heroRouter;