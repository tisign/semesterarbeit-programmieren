import { datalist } from "./datalist.js";

// Hacky way to get the event data from the DOM without using sessions or cookies - better solution needed
let eventData;
document.body.onload = function () {
	eventData = JSON.parse(document.getElementById("hidden").innerText);
	document.getElementById("hidden").remove();
};

//Get all the elements from the DOM
const form = document.querySelector("form");
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("video");
const uploadButton = document.getElementById("file-upload");
const submitButton = document.getElementById("submit");
const submitText = document.getElementById("submit-text");
const file = document.getElementById("video");
const progress = document.getElementById("progress");
const loader = document.getElementById("loader");

//Check if the browser is Safari
const isSafari =
	/constructor/i.test(window.HTMLElement) ||
	(function (p) {
		return p.toString() === "[object SafariRemoteNotification]";
	})(
		!window["safari"] ||
			(typeof safari !== "undefined" && window["safari"].pushNotification)
	);

// Disable black magic on Safari
if (!isSafari) {
	datalist();
}

// Check if the file is a video file if not, alert the user. If yes, display the file name in the upload button
file.addEventListener("change", function () {
	if (file.files[0].type.startsWith("video/")) {
		uploadButton.innerHTML = file.files[0].name;
	} else {
		alert("Please upload a video file");
		file.value = "";
	}
});

// Add event listeners to the drop area and prevent bubbling
["dragenter", "dragover", "dragleave", "drop"].forEach((e) => {
	dropArea.addEventListener(e, preventDefaults, false);
});

// Prevent default behaviour and bubbling
function preventDefaults(e) {
	e.preventDefault();
	e.stopPropagation();
}

// Add event listeners to the drop area and highlight it when the user drags a file over it
["dragenter", "dragover"].forEach((eventName) => {
	dropArea.addEventListener(eventName, highlight, false);
});

// Add event listeners to the drop area and remove the highlight when the user drags a file out of it
["dragleave", "drop"].forEach((eventName) => {
	dropArea.addEventListener(eventName, unhighlight, false);
});

// Add the highlight class to the drop area
function highlight(e) {
	dropArea.classList.add("highlight");
}

// Remove the highlight class from the drop area
function unhighlight(e) {
	dropArea.classList.remove("highlight");
}

// Add event listener to the drop area and handle the drop event
dropArea.addEventListener("drop", handleDrop, false);

// Handle the drop event
function handleDrop(e) {
	let dt = e.dataTransfer;
	let video = dt.files;
	if (video[0].type.startsWith("video/")) {
		fileInput.files = video;
		uploadButton.innerHTML = video[0].name;
	} else {
		alert("Please upload a video file");
	}
}

// Listen for the form submit event
form.addEventListener("submit", async (event) => {
	event.preventDefault();
	submitButton.disabled = true;
	submitText.innerText = "Wait a sec...";
	const file = video.files[0];
	const fileSize = file.size;
	const filmName = document.getElementById("filmName").value;
	const eventID = document.getElementById("eventInput").value;
	const genre = document.getElementById("genreInput").value;
	const TL = document.getElementById("tlInput").value;

	// Send a POST request to the server to get the upload URL
	const response = await axios.post("https://cinema.filmevent.ch/upload", {
		fileSize: fileSize,
		filmName: filmName,
		eventID: eventID,
		genre: genre,
		TL: TL,
	});

	const uploadUrl = response.data.uploadUrl;
	const videoId = response.data.videoId;

	// Disable the submit button and show the loader
	submitText.style.display = "none";
	loader.classList.add("active");

	// Create a new tus upload
	var upload = new tus.Upload(file, {
		uploadUrl: uploadUrl,
		onError: function (error) {
			// Reset the form and show the error message
			submitButton.disabled = false;
			submitText.style.display = "block";
			loader.classList.remove("active");
			submitText.innerText = "Upload failed!";
			uploadButton.innerHTML = "Choose a file";
			form.reset();
		},
		// Update the progress bar
		onProgress: function (bytesUploaded, bytesTotal) {
			var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
			progress.style.width = percentage + "%";
		},
		// When the upload is finished, send a POST request to the server to update Vimeo Tags
		onSuccess: function () {
			axios
				.post("https://cinema.filmevent.ch/upload", {
					videoId: videoId,
					eventID: eventID,
					tags: true,
				})
				.then(() => {
					//Reset the form and show the success message
					submitButton.disabled = false;
					submitText.style.display = "block";
					loader.classList.remove("active");
					submitText.innerText = "Upload finished!";
					uploadButton.innerHTML = "Choose a file";
					progress.style.width = "0%";
					form.reset();
				})
				.catch(function (error) {
					// Reset the form and show the error message
					submitButton.disabled = false;
					submitText.style.display = "block";
					loader.classList.remove("active");
					submitText.innerText = "Upload failed!";
					uploadButton.innerHTML = "Choose a file";
					form.reset();
				});
		},
	});
	// Start the upload
	upload.start();
});
