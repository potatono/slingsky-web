const functions = require('./functions/index');
const app = functions._app;
const express = functions._express;

// Map /s to serve static files from the public directory
app.use('/s', express.static('public/s'));

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});