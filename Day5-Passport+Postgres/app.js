require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const Client = require('pg').Client;
let cl = undefined;

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:false}));
app.use(flash());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.get("/", checkAuth, (req, res) => {
    req.user.then(function(results) {
        res.render("index", {username: results.username});
    });
});
app.get("/login", checkNotAuth, (req, res) => {
    res.render("login");
});
app.post("/login", checkNotAuth, passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

app.get("/register", checkNotAuth, (req, res) => {
    res.render("register");
});
app.post("/register",checkNotAuth, async (req, res) => {
    try {
        cl = new Client ({
            user: "postgres",
            password: process.env.PGPASSWORD,
            port: 5432,
            database: "innovator1"
        });
        let hashed = await bcrypt.hash(req.body.password, 10);
        await cl.connect();
        await cl.query("INSERT INTO users (username, password) VALUES ($1, $2)", [req.body.username, hashed]);
        await cl.end();
        res.redirect("/login");
    }
    catch (error) {
        console.log(error);
        res.redirect("register");
    }
});
app.delete("/logout", (req, res) => {
    req.logOut(function(err) {
        if (err) return next(err);
        res.redirect('/login');
    });
});

const localStrategy = require("passport-local").Strategy;

async function getUserByName(username) {
    cl = new Client ({
        user: "postgres",
        password: process.env.PGPASSWORD,
        port: 5432,
        database: "innovator1"
    });
    await cl.connect();
    let temp = await cl.query("SELECT * FROM users WHERE username = " + "\'" + username + "\'");
    await cl.end();
    let user = {
        id: temp.rows[0].id,
        username: username,
        password: temp.rows[0].password
    }
    return user;
}
async function getUserById(id) {
    cl = new Client ({
        user: "postgres",
        password: process.env.PGPASSWORD,
        port: 5432,
        database: "innovator1"
    });
    await cl.connect();
    let temp = await cl.query("SELECT * FROM users WHERE id = " + id);
    await cl.end();
    let user = {
        id: id,
        username: temp.rows[0].username,
        password: temp.rows[0].password
    }
    return user;
}
async function authenticateUser(username, password, done) {
    const user = await getUserByName(username);
    if (user.password == undefined) return done(null, false, {message: 'No user found'});
    try {
        if (await bcrypt.compare(password, user.password)) {
            return done(null, user);
        }
        else {
            return done(null, false, {message: 'Wrong password'})
        }
    } catch (error) {
        return done(error)
    }
}
function initialize() {
    passport.use(new localStrategy(authenticateUser));
    passport.serializeUser((user, done) => {
        done(null, user.id)
    });
    passport.deserializeUser((id, done) => done(null, getUserById(id)));
}
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}
function checkNotAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect("/");
}

initialize();

app.listen(port);