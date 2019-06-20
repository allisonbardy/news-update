var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsScraper";

mongoose.connect(MONGODB_URI);

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/newsScraper", { useNewUrlParser: true });

// Routes

app.get("/removeall", function(req, res){
    db.Note.remove({})
    .then(() => db.Article.remove({}))
    .then(() => res.json("database-empty"))
})

// A GET route for scraping the website
app.get("/scrape", function(req, res) {

    // First, we grab the body of the html with axios
    axios.get("http://www.brooklynblonde.com/").then(function(response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        // Now, we grab every h2 within an article tag, and do the following:
        $("h2").each(function(i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("a")
                .text();            
            result.link = $(this)
                .children("a")
                .attr("href");

            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function(dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function(err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });

        // Send a message to the client
        res.send("Scrape Complete");
    });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
    db.Article.find({})
        .populate("note")
        .then(function(dbLibrary) {
            res.json(dbLibrary);
        })
        .catch(function(err) {
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
    var getid = req.params.id
    console.log("GET FUNCTION ID IS: " + getid)

    db.Article.find({ _id: getid })
        .then(function(dbLibrary) {
            res.json(dbLibrary);
        })
        .catch(function(err) {
            res.json(err);
        });
});

app.patch("/articles/:id", function(req, res) {
    var getid = req.params.id
    console.log("GET FUNCTION ID IS: " + getid)

    db.Article.findOneAndUpdate({ _id: getid }, { saved: req.body.saved })
        .then(function(dbLibrary) {
            res.json(dbLibrary);
        })
        .catch(function(err) {
            res.json(err);
        });
});

// app.get("/listnotes", function(req, res) {
    db.Note.find({})
        .then(function(dbLibrary) {
            res.json(dbLibrary);
        })
        .catch(function(err) {
            res.json(err);
        });

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {

    let localID = req.params.id;
    db.Note.create(req.body)
        .then(function(newNote) {
            return db.Article.findOneAndUpdate({ _id: localID }, { $push: { note: newNote._id } })
        });
});


// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
});