const videos = document.querySelectorAll(".videoimage");
const modal = document.querySelector(".modal");
const cards = document.querySelectorAll(".video");
const preloader = document.querySelector(".preloader");

// Fade out the preloader
function fadeOutEffect(){
  setInterval(() => {
    if (!preloader.style.opacity) {
      preloader.style.opacity = 1;
    }
    if (preloader.style.opacity > 0) {
      preloader.style.opacity -= 0.1;
    } else {
      clearInterval(fadeOutEffect);
      preloader.style.display = "none";
    }
  }, 100);  
}

window.addEventListener('load', fadeOutEffect);

//if cards is less than three, set swiper-wrapper justify-content to to center
if (cards.length < 3) {
	const swiperWrapper = document.querySelector(".swiper-wrapper");
	swiperWrapper.style.justifyContent = "center";
}

// Get the correct iframe using the data-url attribute of the clicked element and show it and the modal background
function displayModal(event) {
	const url = event.target.getAttribute("data-url");
	const iframe = document.getElementById(url);
	iframe.style.display = "block";
	modal.style.display = "block";
}

// Add event listener to each video image
videos.forEach((video) => {
	video.addEventListener("click", displayModal);
});

// Add event listener to each iframe to stop the video when the modal is closed
function closeModal() {
	const iframes = document.querySelectorAll("iframe");
	iframes.forEach((iframe) => {
		let iframeSrc = iframe.src;
		iframe.src = iframeSrc;
		iframe.style.display = "none";
	});
	modal.style.display = "none";
}

// Close the modal when the user clicks on the modal background
modal.addEventListener("click", function (event) {
	closeModal();
});

// Close the modal when the user clicks on the close button
const closeButtons = document.querySelectorAll(".close");
closeButtons.forEach((button) => {
	button.addEventListener("click", function (event) {
		closeModal(event);
	});
});

// Initialize swiper
const swiper = new Swiper(".swiper", {
  // Disable by default
	enabled: false,
	spaceBetween: 10,
	// Navigation arrows
	navigation: {
		nextEl: ".swiper-button-next",
		prevEl: ".swiper-button-prev",
	},
  // Enable swiper on screens greater than 760px and change the number of slides per view according to the screen width
	breakpoints: {
		760: {
			enabled: true,
			slidesPerView: 2,
			spaceBetween: 30,
			loop: false,
			rewind: true,
		},
		1160: {
			enabled: true,
			slidesPerView: 3,
			spaceBetween: 30,
			loop: false,
			rewind: true,
		},
		1560: {
			enabled: true,
			slidesPerView: 4,
			spaceBetween: 30,
			loop: false,
			rewind: true,
		},
		1960: {
			enabled: true,
			slidesPerView: 5,
			spaceBetween: 30,
			loop: false,
			rewind: true,
		},
	},
});

// Add transition class to cards after 300ms to prevent the transition from being applied on page load
setTimeout(function () {
	cards.forEach((card) => {
		card.classList.add("transition");
	});
}, 300);
