const express = require('express');
const path = require('path');
const { Sequelize } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

// Initialize model
const Task = require('./models/Task')(sequelize);

// Initialize routes
const taskRoutes = require('./routes/tasks')(Task);
app.use('/api/task', taskRoutes);

// Serve API documentation
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Sync database and start server
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Unable to connect to the database:', error);
});
