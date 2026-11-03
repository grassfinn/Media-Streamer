const mostRecentMediaRes = await fetch("/recent");
const recentData = await mostRecentMediaRes.json();
const removeExtension = /\.([^.]+)$/;
const scrubbedTitles = recentData.map((title) =>
  title.file.replace(removeExtension, ""),
);
const [podcast, video, lecture] = scrubbedTitles;
const titles = document.querySelectorAll(".recent-media");
const [videoTitle, lectureTitle, podcastTitle] = titles;
videoTitle.textContent = video;
podcastTitle.textContent = podcast;
lectureTitle.textContent = lecture;

// Selectors
const navForm = document.querySelector("#nav-form");
const searchResults = document.querySelector("#search-results");
const videoDialog = document.querySelector("#video-search");
const videoSrc = document.querySelector("#video-src");
const videoSearch = document.querySelector("#video-search-results");

// Listeners
navForm.addEventListener("submit", handleForm);
searchResults.addEventListener("click", handleVideos);
// Functions

async function handleVideos(e) {
  videoDialog.showModal();
  const mediaContainer = e.target.closest(".media");
  const path = mediaContainer.dataset.path;
  const title = mediaContainer.dataset.title;
  videoSrc.src = `/api/watch/${title}`;

  videoSearch.load();
  // cancel src on leave?
}

async function handleForm(e) {
  e.preventDefault();
  console.log(e);
  const formData = Object.fromEntries(new FormData(e.target));
  if (!formData.content) {
    formData.content = "lectures";
  }
  const { content, search } = formData;
  const slug = search.length ? `${content}?search=${search}` : content;

  const res = await fetch(`/api/media/${slug}`);
  const data = await res.json();
  const cards = createCards(data);
  searchResults.append(...cards);
}

function createCard(data) {
  const { filepath, title, relativePath } = data;
  const container = document.createElement("div");
  container.classList.add("pointer", "media");
  container.dataset.path = filepath;
  container.dataset.title = title;
  const titleEle = document.createElement("h3");
  titleEle.textContent = title.replace(removeExtension, "");
  const thumbnail = document.createElement("img");
  thumbnail.src = `/media/image/${data.title.replace(removeExtension, ".png")}`;
  container.append(titleEle, thumbnail);
  return container;
}

function createCards(arr) {
  searchResults.textContent = "";
  return arr.map((card) => createCard(card));
}
