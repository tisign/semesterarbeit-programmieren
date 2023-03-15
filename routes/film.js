const express = require("express");
const router = express.Router();
const app = express();
app.use("/", router);
const Vimeo = require("vimeo").Vimeo;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const access_token = process.env.ACCESS_TOKEN;

//Get route params for date and name
router.get("/:date/:name", (req, res, next) => {
	//Set tags to be used in the filter
	const nameCannonical = req.params.name;
	const dateCannonical = req.params.date;
	const tags = req.params.date + ", " + req.params.name;
	req.err = "";
	req.year = req.params.date.slice(-4);
	req.filteredVideos = [];
	req.eventName = "";

	//Create new Vimeo client
	const vimeo = new Vimeo(client_id, client_secret, access_token);

	//Check if params are set
	if (!req.params.name || !req.params.date) {
		req.err = "Dein Link scheint nicht korrekt zu sein.";
		next();
		return;
	}

	//Get videos matching either tag from Vimeo
	vimeo.request(
		{
			method: "GET",
			path: `/me/videos?fields=uri,name,description,duration,created_time,modified_time,player_embed_url,tags,pictures.base_link,privacy,link,animated_thumbsets`,
			query: {
				filter_tag: tags,
			},
		},
		(error, body) => {
			if (error) {
				req.err = `Es ist ein Fehler aufgetreten: ${error}`;
				next();
				return;
			}
			//Check if any videos are found
			if (
				body.data.length == 0 ||
				body.data == undefined ||
				body.data == null ||
				body.data == []
			) {
				req.err = "Keine Videos gefunden.";
				next();
				return;
			}
			//Filter videos with exactly the same tags
			req.filteredVideos = body.data.filter((video) => {
				return (
					video.tags.some((tag) => tag.canonical == nameCannonical) &&
					video.tags.some((tag) => tag.canonical === dateCannonical)
				);
			});
			//Check if any videos have both tags
			if (
				req.filteredVideos.length == 0 ||
				req.filteredVideos == undefined ||
				req.filteredVideos == null ||
				req.filteredVideos == []
			) {
				req.err = "Keine Videos zu diesem Event gefunden.";
				next();
				return;
			}
			//Get event name from description
			if (req.filteredVideos[0].description.split("|").length > 3) {
				req.eventName = req.filteredVideos[0].description.split("|")[3].trim();
				//Remove event name from all descriptions
				req.filteredVideos.forEach((vid) => {
					let descriptors = vid.description.split("|");
					descriptors.forEach((desc) => {
						desc.trim();
					});
					vid.description = descriptors.slice(0, -1).join("|");
				});
			} else {
				let nameTag = req.filteredVideos[0].tags.find(
					(tag) => tag.canonical == nameCannonical
				);
				req.eventName = nameTag.name;
			}
			next();
		}
	);
});

//Render films page
router.get("/:date/:name", (req, res) => {
	res.render("films", {
		videos: req.filteredVideos,
		year: req.year,
		err: req.err,
		eventName: req.eventName,
	});
});

module.exports = router;
