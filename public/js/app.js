const mostRecentMediaRes = await fetch('http://localhost:3500/recent')
const recentData = await mostRecentMediaRes.json()
const removeExtension = /\.mp[34]$/g
const scrubbedTitles = recentData.map(title => title.file.replace(removeExtension, ""))
const [podcast, video] = scrubbedTitles
const titles = document.querySelectorAll('.recent-media')
const [videoTitle, podcastTitle] = titles
videoTitle.textContent = video
podcastTitle.textContent = podcast


// Selectors
const navForm = document.querySelector('#nav-form')
const searchResults = document.querySelector('#search-results')


// Listeners
navForm.addEventListener('submit', handleForm)
// Functions
async function handleForm(e) {
    e.preventDefault()
    console.log(e);
    const formData = Object.fromEntries(new FormData(e.target))
    if (!formData.content) {
        formData.content = 'videos'
    }
    const { content, search } = formData
    const slug = search.length ? `${content}?search=${search}` : content

    const res = await fetch(`http://localhost:3500/api/media/${slug}`)
    const data = await res.json()
    const cards = createCards(data)
    searchResults.append(...cards)
}

function createCard(data) {
    const { filePath, title } = data;
    const container = document.createElement('div');
    container.classList.add('pointer','media')
    container.dataset.path = filePath
    const titleEle = document.createElement('h3');
    titleEle.textContent = title.replace(removeExtension, '')
    const thumbnail = document.createElement('img');
    thumbnail.src = `http://localhost:3500/media/image/${data.title.replace(removeExtension, ".png")}`
    container.append(titleEle, thumbnail)
    return container
}

function createCards(arr) {
    searchResults.textContent = ''
    return arr.map(card => createCard(card))
}