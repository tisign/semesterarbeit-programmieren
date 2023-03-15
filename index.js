const express = require("express");
const app = express();

//Add cors helmet and rate limit
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

//Add dotenv
require("dotenv").config();
const PORT = process.env.PORT || 3000;

//Trust proxy because of Heroku
app.set("trust proxy", 1);

//Define rate limit
const limiter = rateLimit({
	windowMs: 60 * 1000, // 10 Minute window
	max: 20, // start blocking after 50 requests
	message:
		"Zu viele Anfragen von dieser IP, bitte versuchen Sie es später noch einmal.",
});

//Define helmet options
app.use(
	helmet({
		crossOriginEmbedderPolicy: false,
		contentSecurityPolicy: {
			directives: {
				defaultSrc: [
					"'self'",
					"*.tus.vimeo.com",
					"planning.filmevent.ch",
					"filmevent.ch",
					"https://cdn.jsdelivr.net",
					"https://player.vimeo.com/",
					"googleapis.com",
					"gstatic.com",
				],
				scriptSrc: [
					"'self'",
					"'unsafe-eval'",
					"https://cdnjs.cloudflare.com",
					"https://player.vimeo.com/",
					"https://cdn.jsdelivr.net",
					"*.gstatic.com",
					"googleapis.com",
					"gstatic.com",
					"trusted-cdn.com",
					"https://i.vimeocdn.com",
				],
				imgSrc: [
					"'self'",
					"data:",
					"*.googleapis.com",
					"*.gstatic.com",
					"googleapis.com",
					"gstatic.com",
					"planning.filmevent.ch",
					"filmevent.ch",
					"https://i.vimeocdn.com",
				],
				frameSrc: [
					"'self'",
					"https://player.vimeo.com/",
				],					
			},
		},
	})
);
//Use cors
app.use(cors());

//Redirect to https on production on every route
app.use(function (request, response, next) {
	if (PORT != 3000 && !request.secure) {
		return response.redirect("https://" + request.headers.host + request.url);
	}
	next();
});
//Add body parser
app.use(express.json());

//Add pug as view engine
app.set("view engine", "pug");

//Add views folder
app.set("views", "./views");

//Add public folder
app.use(express.static("public"));

//Add routes and rate limit
app.use("/upload", require("./routes/upload"));
app.use("/", require("./routes/film"));

//Add 404 error handler
app.use(function (req, res, next) {
	if (!req.route) return next(new Error("404"));
	next();
});

app.use(function (err, req, res, next) {
	res.render("404", { err: err });
});

app.listen(PORT, () => {});
