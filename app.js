const publicKey = 'd644966946fb45cd365ff6530a0ff43e';
const privateKey = '6cc353154b41f9e0a82dd5ae30dc99ad9e700547';
const apiUrl = 'https://gateway.marvel.com:443/v1/public/characters';
const cache = new Map();

function generateHash(ts, privateKey, publicKey) {
    return CryptoJS.MD5(ts + privateKey + publicKey).toString();
}
function search(){
    let debounceTimeout;
    document.getElementById('searchBar').addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => fetchSuperheroes(e.target.value), 200);
    });
}

function showLoader() {
    document.getElementById('loader').style.display = 'block';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

async function fetchSuperheroes(query = 'a', limit = 10, offset = 0) {
    const cacheKey = `${query}-${limit}-${offset}`;
    if (cache.has(cacheKey)) {
        displaySuperheroes(cache.get(cacheKey));
        return;
    }

    const ts = new Date().getTime();
    const hash = generateHash(ts, privateKey, publicKey);
    const url = `${apiUrl}?ts=${ts}&apikey=${publicKey}&hash=${hash}&nameStartsWith=${query}&limit=${limit}&offset=${offset}`;
    
    showLoader();
    try {
        const response = await fetch(url);
        const data = await response.json();
        cache.set(cacheKey, data.data.results);
        displaySuperheroes(data.data.results);
    } catch (error) {
        console.error('Error fetching superheroes:', error);
    } finally {
        hideLoader();
    }
}

function displaySuperheroes(superheroes) {
    const superheroList = document.getElementById('superheroList');
    const htmlString = superheroes.map(hero => `
        <div class="col-md-4 mb-4">
            <div class="card">
                <img data-src="${hero.thumbnail.path}.${hero.thumbnail.extension}" class="card-img-top lazy-load" alt="${hero.name}">
                <div class="card-body">
                    <h5 class="card-title">${hero.name}</h5>
                    <button class="btn btn-primary" onclick="showSuperheroDetails(${hero.id})">View Details</button>
                    <button class="btn btn-secondary" onclick="addFavorite(${hero.id})">Add to Favorites</button>
                </div>
            </div>
        </div>`).join('');
    superheroList.innerHTML = htmlString;
    lazyLoadImages();
}

function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('.lazy-load');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.classList.remove('lazy-load');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => {
        observer.observe(img);
    });
}

async function showSuperheroDetails(heroId) {
    const ts = new Date().getTime();
    const hash = generateHash(ts, privateKey, publicKey);
    const url = `${apiUrl}/${heroId}?ts=${ts}&apikey=${publicKey}&hash=${hash}`;
    
    showLoader();
    try {
        const response = await fetch(url);
        const data = await response.json();
        const hero = data.data.results[0];
        const modal = document.getElementById('heroDetailsModal');
        modal.querySelector('.modal-title').textContent = hero.name;
        modal.querySelector('.modal-body').innerHTML = `
            <img src="${hero.thumbnail.path}.${hero.thumbnail.extension}" class="img-fluid mb-3" alt="${hero.name}">
            <p>${hero.description || 'No description available.'}</p>
            <h5>Comics:</h5>
            <ul>${hero.comics.items.map(comic => `<li>${comic.name}</li>`).join('')}</ul>
            <h5>Series:</h5>
            <ul>${hero.series.items.map(series => `<li>${series.name}</li>`).join('')}</ul>
            <h5>Stories:</h5>
            <ul>${hero.stories.items.map(story => `<li>${story.name}</li>`).join('')}</ul>
            <h5>Events:</h5>
            <ul>${hero.events.items.map(event => `<li>${event.name}</li>`).join('')}</ul>
        `;
        $('#heroDetailsModal').modal('show');
    } catch (error) {
        console.error('Error fetching superhero details:', error);
    } finally {
        hideLoader();
    }
}

function addFavorite(heroId) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (!favorites.includes(heroId)) {
        favorites.push(heroId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
}

function removeFavorite(heroId) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favorites = favorites.filter(id => id !== heroId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    displayFavorites();
}

async function displayFavorites() {
    const favoriteList = document.getElementById('favoriteList');
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    
    favoriteList.innerHTML = '';

    const heroDataPromises = favorites.map(heroId => {
        const ts = new Date().getTime();
        const hash = generateHash(ts, privateKey, publicKey);
        const url = `${apiUrl}/${heroId}?ts=${ts}&apikey=${publicKey}&hash=${hash}`;
        return fetch(url).then(response => response.json());
    });

    showLoader();
    try {
        const heroDataResponses = await Promise.all(heroDataPromises);
        const htmlString = heroDataResponses.map(data => {
            const hero = data.data.results[0];
            return `
                <div class="col-md-4 mb-4">
                    <div class="card">
                        <img data-src="${hero.thumbnail.path}.${hero.thumbnail.extension}" class="card-img-top lazy-load" alt="${hero.name}">
                        <div class="card-body">
                            <h5 class="card-title">${hero.name}</h5>
                            <button class="btn btn-danger" onclick="removeFavorite(${hero.id})">Remove</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
        favoriteList.innerHTML = htmlString;
        lazyLoadImages();
    } catch (error) {
        console.error('Error fetching favorite superhero:', error);
    } finally {
        hideLoader();
    }
}

window.onload = function() {
    if (window.location.pathname.endsWith('favorites.html')) {
        displayFavorites();
    } else {
        search();
        fetchSuperheroes();
    }
};
