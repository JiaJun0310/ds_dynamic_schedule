import mongoose from 'mongoose';

const mongoURI = 'mongodb://localhost:27017/DS_DYNAMIC_SCHEDULE';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected Successfully...');
  } catch (err) {
    console.error('Connection Failed:', err.message);
    
    process.exit(1);
  }
};

export default connectDB;