const express = require('express');
const redis = require('redis');
const Hero = require('./hero.model');

const heroRouter = express.Router();

let redisClient;

(async () => {
  redisClient = redis.createClient();

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect();
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
      results = await Hero.findOne({ _id: id }) || {};

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

  const hero = new Hero(body);
  await hero.save();

  res.json(hero);
});

module.exports = heroRouter;