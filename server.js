const express = require("express");
const connectDB = require("./db");
const cors = require('cors');

const app = express();

connectDB();