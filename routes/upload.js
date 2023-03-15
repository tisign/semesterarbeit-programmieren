const express = require("express");
const router = express.Router();
const Vimeo = require("vimeo").Vimeo;
const needle = require("needle");

const monday_key = process.env.MONDAY_KEY;

//Basic route authentication -> needs to be changed to a more secure method
router.use("/", (req, res, next) => {
	const reject = () => {
		res.setHeader("www-authenticate", "Basic");
		res.sendStatus(401);
	};

	const authorization = req.headers.authorization;

	if (!authorization) {
		return reject();
	}

	const [username, password] = Buffer.from(
		authorization.replace("Basic ", ""),
		"base64"
	)
		.toString()
		.split(":");


	if (
		!(username === process.env.USERNAME && password === process.env.PASSWORD)
	) {
		return reject();
	}

	next();
});

//Get team members from monday.com
router.get("/", (req, res, next) => {
	req.eventList = [];

	//Get all the team members from board 3034458953 / Kontaktliste 2023 and get their name and status
	const payload = JSON.stringify({
		query: `{ boards(ids: 3034458953) { items { name column_values (ids: ["text0", "status87"]) { text } } } }`,
	});

	needle.post(
		"https://api.monday.com/v2",
		payload,
		{
			headers: {
				Authorization: `${monday_key}`,
				"Content-Type": "application/json",
			},
		},
		(err,resp, body) => {
			if (err) {
				res.status(500).send("Server error Monday");
				return;
			}
			if (body.errors) {
				res.status(404).send("Etwas ist schief gelaufen.");
				return;
			}
      console.log(body.data.boards[0].items)
      console.dir(body.data.boards[0])
			//find all people that are either TL or CoreTeam and add them to the list
			req.body.tlList = body.data.boards[0].items;
			req.body.tlList = req.body.tlList.filter(checkIfTL).map((TL) => {
				return (fullName =
					TL.name + " " + TL.column_values[0].text.replace(/\"/g, ""));
			});
      console.dir(req.body.tlList)
      next();
		}
    );
});
//get all open events from monday.com
router.get("/", (req, res) => {
  console.log('Tllist', req.body.tlList)
	//Get all events from board 3782513357 / Event Vimeo and get the Eventname and Eventdate
	const payload = JSON.stringify({
		query:
			'{ boards(ids: 3782513357) { groups (ids: "topics") { items { id name column_values (ids: ["text", "date4"]) { text } } } } }',
	});

	needle.post(
		"https://api.monday.com/v2",
		payload,
		{
			headers: {
				Authorization: `${monday_key}`,
				"Content-Type": "application/json",
			},
		},
		function (err, resp, body) {
			if (err) {
				res.status(500).send("Server error Monday");
				return;
			}
			if (body.errors) {
				res.status(404).send("Etwas ist schief gelaufen.");
				return;
			}
			//get all the events into one object and stringify it to process further in the frontend
			req.eventList = body.data.boards[0].groups[0].items;
			req.eventData = JSON.stringify(req.eventList);
			res.render("upload", {
				tlList: req.body.tlList,
				eventList: req.eventList,
				eventData: req.eventData,
			});
		}
	);
});

// Route to handle file uploads
router.post("/", (req, res, next) => {
	//get event info from board 3782513357 / Event Vimeo and get the specific event with eventname, date and password
	const query = JSON.stringify({
		query: `{ boards(ids: 3782513357) { groups (ids: "topics") { items (ids: ${req.body.eventID}) { name column_values (ids: ["text", "date4", "text6"]) { text } } } } }`,
	});

	needle.post(
		"https://api.monday.com/v2",
		query,
		{
			headers: {
				Authorization: `${monday_key}`,
				"Content-Type": "application/json",
			},
		},
		function (err, resp, body) {
			if (err) {
				res.status(500).send("Server error Monday");
				return;
			}
			if (body.errors) {
				res.status(404).send("Etwas ist schief gelaufen.");
				return;
			}
			//add the event details to the request object
			req.event = body.data.boards[0].groups[0].items[0];
			next();
		}
	);
});

router.post("/", (req, res, next) => {
  //check if the request contains tags, if not, skip the next middleware
	if (req.body.tags != undefined) {
		next();
		return;
	}
	//make a needle request to vimeo to get the upload link
	needle.post(
		"https://api.vimeo.com/me/videos",
		{
			upload: {
				approach: "tus",
				size: req.body.fileSize,
			},
			name: req.body.filmName,
      //add the event details to the video description, change the date format and add the genre and TL
			description: `${req.event.column_values[1].text
				.split("-")
				.reverse()
				.join(".")} | ${req.body.genre} | ${req.body.TL} | ${
				req.event.column_values[0].text
			}`,
			privacy: {
				view: "password",
				embed: "public",
			},
			password: req.event.column_values[2].text,
		},
		{
			headers: {
				Authorization: `bearer ${process.env.ACCESS_TOKEN}`,
				"Content-Type": "application/json",
				Accept: "application/vnd.vimeo.*+json;version=3.4",
			},
		},
		function (err, resp, body) {
			if (err) {
				//respond with 500 Internal Server Error
				res.status(500).send("Server error Vimeo");
				return;
			} else {
        //parse the response from vimeo and get the upload link and the video id
				const vimeoResponse = JSON.parse(body);
				const vimeoUrl = vimeoResponse.upload.upload_link;
				const videoId = vimeoResponse.uri.split("/").pop();
				res.status(200).send({ uploadUrl: vimeoUrl, videoId: videoId });
			}
		}
	);
});

router.post("/", (req, res) => {
  //generate path to add tags to the video
	let path = `/videos/${parseInt(req.body.videoId)}/tags`;
	//new Vimeo client with client id and secret and access token
	const client = new Vimeo(
		process.env.VIMEO_CLIENT_ID,
		process.env.VIMEO_CLIENT_SECRET,
		process.env.ACCESS_TOKEN
	);
  //create an array with date tag in the format DD-MM-YYYY and the event name without special characters. Also sanitize umlauts
	const data = [
		{ name: req.event.column_values[1].text.split("-").reverse().join("-") },
		{
			name: deUmlaut(req.event.column_values[0].text).replace(/[^a-zA-Z]/g, ""),
		},
	];

  //use the vimeo client to add the tags to the video
	client.request(
		{
			method: "PUT",
			path: `/videos/${parseInt(req.body.videoId)}/tags`,
			query: data,
		},
		(error, body, statusCode, headers) => {
			if (error) {
				res.status(500).send("Internal Server Error");
				return;
			}
			res.status(200).send("Video uploaded");
		}
	);
});

//helper function: check if the TL is a core team member or a team leader
function checkIfTL(TL) {
	if (
		TL.column_values[1].text == "CoreTeam" ||
		TL.column_values[1].text == "Teamleiter"
	) {
		return TL;
	}
}

//helper function: remove umlauts from the event name
function deUmlaut(value) {
	value = value.toLowerCase();
	value = value.replace(/ä/g, "ae");
	value = value.replace(/ö/g, "oe");
	value = value.replace(/ü/g, "ue");
	value = value.replace(/ß/g, "ss");
	return value;
}

module.exports = router;
