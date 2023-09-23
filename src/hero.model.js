const mongoose = require('mongoose');
const heroSchema = new mongoose.Schema({
    name: String,
    desc: String,
    mainCharacteristic: String,
    origin: String,
    birthDate: Date,
    gender: String
});

heroSchema.set('toJSON', {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString()
      delete returnedObject._id
      delete returnedObject.__v
    }
  });

const Hero = mongoose.model('Image', heroSchema);
module.exports = Hero;