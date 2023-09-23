const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const heroRouter = require('./src/hero.router');
const app = express();

app.use(express.json());

app.use(heroRouter);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('The app has been connected to database'))
  .catch(() => console.log('Something happened, try again later'));

const PORT = process.env.PORT || '3000';
app.listen(PORT, err => {
    if (err)
        throw err
    console.log(`Server listening on http://localhost:${PORT}`);
});
