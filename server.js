import { _app, _express } from "./functions/index.js";
const app = _app;
const express = _express;

// Map /s to serve static files from the public directory
app.use("/s", express.static("public/s"));

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
