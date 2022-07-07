const express = require("express"); //The same website, now with express!
const app = express();
const port = 3000;

app.use(express.static("./public"));
app.use(express.urlencoded({ extended: true}));

app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.render("index");
});
app.post("/", (req, res) => {
    res.render("index", {url: req.body.theurl});
});
app.get("/page", (req, res) => {
    res.render("page");
});

app.listen(port);
