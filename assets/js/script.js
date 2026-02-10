

const API_KEY = (typeof CONFIG !== 'undefined') ? CONFIG.API_KEY : '';
const GEMINI_KEY = (typeof CONFIG !== 'undefined') ? CONFIG.GEMINI_API_KEY : '';


const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';


if (!API_KEY) {
    console.warn("UYARI: API Anahtarı bulunamadı! Lütfen config.js dosyasını kontrol edin.");
}
let watchList = JSON.parse(localStorage.getItem('myWatchList')) || [];
let watchedList = JSON.parse(localStorage.getItem('myWatchedList')) || [];
let currentMovie = null;
let heroMovies = [];
let currentHeroIndex = 0;
let heroInterval;

const BADGE_RULES = [
    { id: 'newbie', name: 'Çaylak', icon: '🍿', criteria: (list) => list.length >= 1 },
    { id: 'buff', name: 'Sinefil', icon: '🎬', criteria: (list) => list.length >= 5 },
    { id: 'master', name: 'Üstad', icon: '👑', criteria: (list) => list.length >= 15 },
    { id: 'horror-fan', name: 'Korku Sever', icon: '👻', criteria: (list) => list.filter(m => m.genres?.includes('Korku')).length >= 3 },
    { id: 'scifi-explorer', name: 'Zaman Yolcusu', icon: '🚀', criteria: (list) => list.filter(m => m.genres?.includes('Bilim Kurgu')).length >= 3 },
    { id: 'oscar-hunter', name: 'Akademi Üyesi', icon: '🏆', criteria: (list) => list.filter(m => m.vote_average >= 8.5).length >= 3 }
];

window.onload = () => {
    renderWatchList();
    renderWatchedList();
    getDailyPick(); 
    setupUniversalSearch();
    setupFilters();      
    setupSlotMachine();
    setupDynamicHero();
    updateBadges();
};

const isInAnyList = (movieId) => {
    return watchList.some(m => m.id === movieId) || watchedList.some(m => m.id === movieId);
};

let lastMovieId = null; 


function setupFilters() {
    const searchBtn = document.getElementById('btn');
    if (!searchBtn) return;

    searchBtn.onclick = async () => {
        searchBtn.disabled = true;
        searchBtn.innerHTML = `<span class="animate-pulse">TARANIYOR...</span>`;
        
        const genre = document.getElementById('genre-select')?.value;
        const selectedVote = document.getElementById('vote-select')?.value;
        const yearStart = document.getElementById('year-start')?.value;
        const yearEnd = document.getElementById('year-end')?.value;
        
        try {
            
            let maxPage = (selectedVote === "9") ? 3 : 25;
            let randomPage = Math.floor(Math.random() * maxPage) + 1;

            let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=tr-TR&sort_by=popularity.desc&include_adult=false&page=${randomPage}`;
            
            if (genre) url += `&with_genres=${genre}`;
           
            if (selectedVote === "7") url += `&vote_average.gte=7&vote_average.lte=7.9`;
            else if (selectedVote === "8") url += `&vote_average.gte=8&vote_average.lte=8.9`;
            else if (selectedVote === "9") url += `&vote_average.gte=9`;

            if (yearStart) url += `&primary_release_date.gte=${yearStart}-01-01`;
            if (yearEnd) url += `&primary_release_date.lte=${yearEnd}-12-31`;

            let res = await fetch(url);
            let data = await res.json();
            
       
            if (!data.results || data.results.length === 0) {
                url = url.replace(`&page=${randomPage}`, `&page=1`);
                res = await fetch(url);
                data = await res.json();
            }
            
            if (data.results && data.results.length > 0) {
              
                let available = data.results.filter(m => m.overview && m.overview.length > 10 && !isInAnyList(m.id));
                
              
                if (available.length === 0) available = data.results.filter(m => m.overview && m.overview.length > 10);

               
                let finalMovie;
                let attempts = 0;
                do {
                    finalMovie = available[Math.floor(Math.random() * available.length)];
                    attempts++;
                } while (finalMovie && finalMovie.id === lastMovieId && attempts < 10);

                if (finalMovie) {
                    lastMovieId = finalMovie.id;
                    showMovie(finalMovie);
                } else {
                    alert("Uygun açıklama içeren film bulunamadı.");
                }
            } else {
                alert("Kriterlere uygun film bulunamadı.");
            }
        } catch (e) { 
            console.error(e); 
            alert("Bir hata oluştu, lütfen tekrar dene.");
        } finally {
            searchBtn.disabled = false;
            searchBtn.innerText = "FİLTRELEYEREK BUL";
        }
    };
}


async function getDailyPick() {
    try {
        const res = await fetch(`${BASE_URL}/trending/movie/day?api_key=${API_KEY}&language=tr-TR`);
        const data = await res.json();
        
        if (data.results) {
           
            const validMovies = data.results.filter(m => m.overview && m.overview.length > 10);
            const randomIndex = Math.floor(Math.random() * validMovies.length);
            const pick = validMovies[randomIndex];
            
            lastMovieId = pick.id;
            showMovie(pick);
        }
    } catch (e) { console.error(e); }
}

function setupSlotMachine() {
    const slotBtn = document.getElementById('slot-btn');
    if (slotBtn) slotBtn.onclick = startHighRatedSlot;
}

async function startHighRatedSlot() {
    const slotOverlay = document.getElementById('slot-overlay');
    const slotStrip = document.getElementById('slot-strip');
    const countdownEl = document.getElementById('countdown-circle');
    
   
    const cardWidth = 240; 
    const gap = 32; 
    const itemWidth = cardWidth + gap;
    const finalTargetIndex = 40;
    
    try {

        const randomPage = Math.floor(Math.random() * 20) + 1; 
        const res = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=tr-TR&page=${randomPage}`);
        const data = await res.json();
        
      
        let pool = data.results.filter(m => m.poster_path && m.overview && m.overview.length > 10);

    
        const visualPool = Array.from({length: 50}, () => pool[Math.floor(Math.random() * pool.length)]);
        const winnerMovie = visualPool[finalTargetIndex];

        slotStrip.innerHTML = visualPool.map(movie => `
            <div class="flex-shrink-0 group" style="width: ${cardWidth}px; margin-right: ${gap}px;">
                <img src="${IMG_URL + movie.poster_path}" class="w-full h-[360px] rounded-[2rem] shadow-2xl border border-white/10 grayscale group-hover:grayscale-0 transition-all">
            </div>
        `).join('');


        slotOverlay.classList.remove('hidden');
        slotStrip.style.transition = "none";
        slotStrip.style.transform = "translateX(0px)";

   
        setTimeout(() => {
            const targetPos = (window.innerWidth / 2) - (cardWidth / 2) - (finalTargetIndex * itemWidth);
            slotStrip.style.transition = "transform 4s cubic-bezier(0.15, 0, 0.15, 1)";
            slotStrip.style.transform = `translateX(${targetPos}px)`;
        }, 100);

      
        let count = 3;
        countdownEl.innerText = count;
        const timer = setInterval(() => {
            count--;
            countdownEl.innerText = count > 0 ? count : "!";
            if(count <= 0) clearInterval(timer);
        }, 1300);

    
        setTimeout(async () => {
            const detailRes = await fetch(`${BASE_URL}/movie/${winnerMovie.id}?api_key=${API_KEY}&language=tr-TR`);
            const fullDetails = await detailRes.json();
  
            const imgs = slotStrip.querySelectorAll('img');
            imgs[finalTargetIndex].classList.remove('grayscale');
            imgs[finalTargetIndex].classList.add('ring-8', 'ring-indigo-500', 'scale-110');

            setTimeout(() => showWinnerRecommendation(fullDetails), 1000);
        }, 4500);

    } catch (err) { console.error("Slot Hatası:", err); }
}

function showWinnerRecommendation(movie) {
    const oldPanel = document.getElementById('recommendation-panel');
    if(oldPanel) oldPanel.remove();

    const recPanel = document.createElement('div');
    recPanel.id = "recommendation-panel";
    recPanel.className = "fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 p-4 animate-hero";
    
    recPanel.innerHTML = `
        <div class="bg-slate-900 border-2 border-indigo-500/50 rounded-[3rem] max-w-2xl w-full p-8 shadow-2xl text-white overflow-hidden relative">
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/20 blur-3xl rounded-full"></div>
            <div class="flex flex-col md:flex-row gap-8 relative z-10">
                <img src="${IMG_URL + movie.poster_path}" class="w-48 h-72 object-cover rounded-[2rem] shadow-2xl border border-white/10">
                <div class="flex-1 text-left">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-3xl font-black leading-tight tracking-tighter uppercase">${movie.title}</h3>
                        <span class="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-black shrink-0">★ ${movie.vote_average.toFixed(1)}</span>
                    </div>
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Şanslı Seçimin • ${(movie.release_date || '').split('-')[0]}</p>
                    <p class="text-slate-300 leading-relaxed mb-8 text-sm line-clamp-4 italic">"${movie.overview || 'Bu film için özel bir açıklama bulunmuyor.'}"</p>
                    <button id="final-accept-btn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20">
                        JACKPOT! FİLMİ YÜKLE
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(recPanel);

    document.getElementById('final-accept-btn').onclick = () => {
        showMovie(movie);
        document.getElementById('slot-overlay').classList.add('hidden');
        recPanel.remove();
        
      
        confetti({
            particleCount: 200,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#f59e0b', '#ffffff']
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}


async function setupDynamicHero() {
    try {
    
        const randomPage = Math.floor(Math.random() * 3) + 1;
        

        const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=tr-TR&sort_by=popularity.desc&vote_average.gte=8.0&vote_average.lte=10&vote_count.gte=1000&page=${randomPage}`);
        const data = await res.json();
      
        heroMovies = data.results.filter(m => m.backdrop_path && m.overview).slice(0, 10); 
        
        renderHero();
        startHeroTimer();
    } catch (e) { 
        console.error("Hero Slider Hatası:", e); 
    }
}

function renderHero() {
    const wrapper = document.getElementById('hero-wrapper');
    const movie = heroMovies[currentHeroIndex];
    if (!movie || !wrapper) return;

    wrapper.style.opacity = '0';
    setTimeout(() => {
        wrapper.innerHTML = `
            <div class="absolute inset-0 animate-hero">
                <img src="https://image.tmdb.org/t/p/original${movie.backdrop_path}" class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                
                <div class="absolute inset-0 p-12 flex flex-col justify-center max-w-3xl">
                    <div class="flex items-center gap-3 mb-6">
                        <span class="bg-amber-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-amber-500/20">
                            🏆 KESİN İZLENMELİ
                        </span>
                        <span class="bg-black/40 backdrop-blur-xl text-white px-4 py-1.5 rounded-full text-xs font-black border border-white/10">
                            ★ ${movie.vote_average.toFixed(1)}
                        </span>
                    </div>
                    
                    <h2 class="text-7xl font-black text-white mb-6 tracking-tighter leading-[0.9] uppercase italic drop-shadow-2xl">${movie.title}</h2>
                    <p class="text-slate-200 text-sm leading-relaxed mb-10 line-clamp-2 font-medium max-w-xl opacity-90 italic">
                        "${movie.overview}"
                    </p>

                    <div class="flex gap-4">
                        <button onclick="loadFromGallery(${movie.id})" class="bg-white text-black px-10 py-5 rounded-[2rem] font-black text-xs hover:bg-indigo-500 hover:text-white transition-all transform hover:scale-105 shadow-2xl">
                            İNCELE
                        </button>
                        <button onclick="openTrailer(${movie.id})" class="bg-slate-900/60 backdrop-blur-md text-white border border-white/10 px-10 py-5 rounded-[2rem] font-black text-xs hover:bg-slate-800 transition-all">
                            FRAGMAN
                        </button>
                    </div>
                </div>
            </div>
        `;
        wrapper.style.opacity = '1';
        updateHeroDots();
    }, 300);
}

function updateHeroDots() {
    const dotsContainer = document.getElementById('hero-dots');
    if(!dotsContainer) return;
    dotsContainer.innerHTML = heroMovies.map((_, i) => `
        <div class="h-1.5 rounded-full transition-all duration-500 ${i === currentHeroIndex ? 'bg-indigo-500 w-10' : 'bg-white/20 w-3'}"></div>
    `).join('');
}

function nextHero() {
    currentHeroIndex = (currentHeroIndex + 1) % heroMovies.length;
    renderHero();
    startHeroTimer();
}

function startHeroTimer() {
    clearInterval(heroInterval);
    heroInterval = setInterval(nextHero, 8000); 
}

function updateBadges() {
    const watchedMovies = JSON.parse(localStorage.getItem('myWatchedList') || '[]');
    const shelf = document.getElementById('badge-shelf');
    const badgeCountEl = document.getElementById('badge-count');
    if (!shelf) return;

    let earnedBadges = BADGE_RULES.filter(badge => badge.criteria(watchedMovies));
    shelf.innerHTML = '';
    
    if (earnedBadges.length > 0) {
        earnedBadges.forEach(badge => {
            const badgeEl = document.createElement('div');
            badgeEl.className = "group relative cursor-help flex items-center justify-center w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xl hover:scale-110 transition-all";
            badgeEl.innerHTML = `${badge.icon}<span class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">${badge.name}</span>`;
            shelf.appendChild(badgeEl);
        });
        if(badgeCountEl) badgeCountEl.textContent = `${earnedBadges.length} Rozet`;
    } else {
        shelf.innerHTML = `<p class="text-[8px] text-slate-600 uppercase w-full text-center">Henüz rozet yok</p>`;
    }
}

async function showMovie(movie) {
    if (!movie) return;
    currentMovie = movie;

    document.getElementById('placeholder').classList.add('hidden');
    const movieContent = document.getElementById('movie-content');
    movieContent.classList.remove('hidden');

    const res = await fetch(`${BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    const cast = credits.cast ? credits.cast.slice(0, 5) : [];

    let titleElement = document.getElementById('title');
    titleElement.innerHTML = movie.title;
    if (movie.vote_average >= 8.1) titleElement.innerHTML += ` <span class="text-amber-500">🏆</span>`;

    document.getElementById('rating').innerText = `⭐ ${movie.vote_average.toFixed(1)}`;
    document.getElementById('poster').src = movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/500x750';
    document.getElementById('overview').innerText = movie.overview || "Açıklama bulunmuyor.";
    
    document.getElementById('cast-container').innerHTML = cast.map(c => `
        <div class="flex-shrink-0 text-center w-12">
            <img src="${c.profile_path ? IMG_URL + c.profile_path : 'https://via.placeholder.com/100'}" class="w-10 h-10 rounded-full object-cover mx-auto border border-indigo-500/30">
            <p class="text-[6px] mt-1 text-slate-400 truncate uppercase">${c.name.split(' ')[0]}</p>
        </div>
    `).join('');

 

    document.getElementById('trailer-btn').onclick = () => openTrailer(movie.id);

    
    const shareBtn = document.getElementById('share-card-btn'); 
    if(shareBtn) {
        shareBtn.onclick = () => downloadShareCard(movie);
    }

    movieContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadFromGallery(movieId, mediaType = 'movie') {
    try {
     
        const type = (mediaType === 'tv') ? 'tv' : 'movie';
        
        const res = await fetch(`${BASE_URL}/${type}/${movieId}?api_key=${API_KEY}&language=tr-TR`);
        const data = await res.json();

       
        if (!data || data.success === false) {
            console.error("Veri bulunamadı!");
            return;
        }

    
        showMovie(data);

    } catch (err) {
        console.error("Bağlantı ve veri çekme hatası:", err);
    }
}



function setupUniversalSearch() {
    const searchInput = document.getElementById('universal-search');
    const spinner = document.getElementById('search-spinner');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.oninput = () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        
        if (query.length === 0) {
            document.getElementById('artist-gallery').classList.add('hidden');
            return;
        }

        if (query.length < 3) return;

        spinner?.classList.remove('hidden');
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=tr-TR`);
                const data = await res.json();
                
                if (data.results && data.results.length > 0) {
                   
                    const movies = data.results.filter(m => (m.media_type === 'movie' || m.media_type === 'tv') && m.poster_path);
                    
                
                    if (movies.length > 0 && query.toLowerCase().includes('batman')) {
                        showGeneralResults(movies, query);
                    } else {
                     
                        const persons = data.results.filter(r => r.media_type === 'person');
                        if (persons.length > 0) {
                            showArtistGallery(persons[0]);
                        } else if (movies.length > 0) {
                            showGeneralResults(movies, query);
                        } else {
                            showNoResultsFound(query);
                        }
                    }
                } else {
                    showNoResultsFound(query);
                }
            } catch (e) { 
                console.error(e); 
            } finally { 
                spinner?.classList.add('hidden'); 
            }
        }, 600);
    };
}


function showGeneralResults(movies, query) {
    const gallery = document.getElementById('artist-gallery');
    const content = document.getElementById('gallery-content');
    const title = document.getElementById('gallery-title');

    title.innerHTML = `<span class="text-indigo-400">🔍 "${query.toUpperCase()}"</span> Yapımları`;
    

    const sortedMovies = movies.sort((a, b) => b.popularity - a.popularity);


    content.innerHTML = sortedMovies.map(movie => {
        const mId = movie.id;
        const mType = movie.media_type || 'movie'; 
        
        return `
            <div onclick="loadFromGallery(${mId}, '${mType}')" class="flex-shrink-0 w-36 group cursor-pointer animate-hero">
                <div class="relative overflow-hidden rounded-2xl shadow-lg border border-white/5">
                    <img src="${IMG_URL + movie.poster_path}" class="w-full h-48 object-cover group-hover:scale-110 transition-all duration-500">
                    <div class="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-white shadow-xl">
                        ⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'}
                    </div>
                </div>
                <p class="text-[9px] font-black text-white truncate mt-2 uppercase tracking-tighter">${movie.title || movie.name}</p>
            </div>
        `;
    }).join('');

    gallery.classList.remove('hidden');


    if (sortedMovies.length > 0) {

        loadFromGallery(sortedMovies[0].id, sortedMovies[0].media_type || 'movie');
    }
}


function showNoResultsFound(query) {
    const gallery = document.getElementById('artist-gallery');
    const title = document.getElementById('gallery-title');
    const content = document.getElementById('gallery-content');

    title.innerHTML = `<span class="text-red-500">✕ SONUÇ YOK</span>`;
    content.innerHTML = `<p class="text-slate-500 italic p-10 w-full text-center">"${query}" için bir sonuç bulunamadı.</p>`;
    gallery.classList.remove('hidden');
}

async function showArtistGallery(person) {
    const gallery = document.getElementById('artist-gallery');
    const content = document.getElementById('gallery-content');
    const title = document.getElementById('gallery-title');

    const res = await fetch(`${BASE_URL}/person/${person.id}/movie_credits?api_key=${API_KEY}&language=tr-TR`);
    const data = await res.json();

    const movies = data.cast
        .filter(m => m.poster_path) 
        .sort((a, b) => b.vote_average - a.vote_average);

    title.innerHTML = `<span class="text-indigo-400">👤 ${person.name.toUpperCase()}</span> Tüm Yapımları`;
    
    content.innerHTML = movies.map(movie => `
        <div onclick="loadFromGallery(${movie.id})" class="flex-shrink-0 w-36 group cursor-pointer">
            <div class="relative overflow-hidden rounded-2xl shadow-lg border border-white/5">
                <img src="${IMG_URL + movie.poster_path}" class="w-full h-48 object-cover group-hover:scale-110 transition-all duration-500">
                <div class="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-white shadow-xl">
                    ⭐ ${movie.vote_average.toFixed(1)}
                </div>
            </div>
            <p class="text-[9px] font-black text-white truncate mt-2 uppercase tracking-tighter">${movie.title}</p>
        </div>
    `).join('');

    gallery.classList.remove('hidden');
    gallery.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (movies.length > 0) {
        loadFromGallery(movies[0].id);
    }
}
window.moveToWatched = (id) => {
    const idx = watchList.findIndex(m => m.id === id);
    if (idx > -1) {
        watchedList.push(watchList[idx]);
        watchList.splice(idx, 1);
        saveAll();
        
        confetti({ particleCount: 100, spread: 50 });
    }
};

window.removeFromList = (id, type) => {
    if(type === 'watch') watchList = watchList.filter(m => m.id !== id);
    else watchedList = watchedList.filter(m => m.id !== id);
    saveAll();
};

function saveAll() {

    localStorage.setItem('myWatchList', JSON.stringify(watchList));
    localStorage.setItem('myWatchedList', JSON.stringify(watchedList));
   
    renderWatchList(); 
    renderWatchedList();
    updateBadges();


}


async function openTrailer(movieId) {
    const res = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
        document.getElementById('trailer-container').innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
        document.getElementById('trailer-modal').classList.remove('hidden');
    } else { alert("Fragman bulunamadı."); }
}

window.closeTrailer = () => {
    document.getElementById('trailer-modal').classList.add('hidden');
    document.getElementById('trailer-container').innerHTML = ''; 
};

function renderWatchList() {
    const container = document.getElementById('watch-list');
    if(!container) return;
    container.innerHTML = watchList.map(movie => `
        <div class="flex items-center justify-between bg-slate-800/40 p-2 rounded-xl mb-2 border border-slate-700/30">
            <div class="flex items-center gap-2 overflow-hidden">
                <img src="${IMG_URL + movie.poster_path}" class="w-8 h-10 object-cover rounded-md">
                <p class="text-[10px] font-bold text-white w-24 truncate">${movie.title}</p>
            </div>
            <div class="flex gap-1">
                <button onclick="moveToWatched(${movie.id})" class="text-emerald-500 p-1">✓</button>
                <button onclick="removeFromList(${movie.id}, 'watch')" class="text-slate-500 p-1">✕</button>
            </div>
        </div>
    `).join('');
}

function renderWatchedList() {
    const container = document.getElementById('watched-list');
    if(!container) return;
    container.innerHTML = watchedList.map(movie => `
        <div class="flex items-center justify-between bg-emerald-900/5 p-2 rounded-xl mb-2 grayscale">
            <div class="flex items-center gap-2">
                <img src="${IMG_URL + movie.poster_path}" class="w-6 h-8 object-cover rounded opacity-40">
                <p class="text-[9px] truncate w-20 text-slate-500">${movie.title}</p>
            </div>
            <button onclick="removeFromList(${movie.id}, 'watched')" class="text-slate-700 p-1">✕</button>
        </div>
    `).join('');
}

async function getDailyPick() {
    try {
        const res = await fetch(`${BASE_URL}/trending/movie/day?api_key=${API_KEY}&language=tr-TR`);
        const data = await res.json();
        
    } catch (e) { console.error(e); }
}


let isAiProcessing = false; 
window.tempAiMovies = window.tempAiMovies || {};

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;


async function getInstantAiRecommendation(selectedMovieTitle) {
    const aiPanel = document.getElementById('ai-mentor-panel');
    const aiText = document.getElementById('ai-recommendation-text');

    if (!aiPanel || !aiText) return;

    if (isAiProcessing) {
        console.warn("Lütfen bekleyin, öneriler hazırlanıyor...");
        return;
    }

    isAiProcessing = true;
    aiPanel.classList.remove('hidden');

    aiText.innerHTML = `
        <div class="flex flex-col items-center w-full min-h-[300px]">
            <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse mb-8 italic">
                "${selectedMovieTitle}" Seçimine Özel Liste Hazırlanıyor...
            </p>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 w-full px-4">
                ${Array(5).fill(0).map(() => `
                    <div class="bg-slate-800/40 border border-white/5 rounded-2xl p-2 animate-pulse flex flex-col h-[280px]">
                        <div class="bg-slate-700/50 w-full h-40 rounded-xl mb-3"></div>
                        <div class="bg-slate-700/50 h-3 w-3/4 rounded mb-2"></div>
                        <div class="bg-slate-700/50 h-2 w-full rounded mb-1"></div>
                        <div class="bg-slate-700/50 h-8 w-full rounded-xl mt-auto"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    const instantPrompt = `Bana "${selectedMovieTitle}" filmine benzer 5 film önerisi yap. 
    Sadece isim ve kısa bir neden yaz. 
    Format: Film Adı | Kısa Neden # Film Adı | Kısa Neden`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: instantPrompt }] }] })
        });

    
        if (response.status === 429) {
            throw new Error("Limit doldu. Lütfen 1 dakika bekleyin.");
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content.parts[0].text) {
            throw new Error("Yapay zeka şu an meşgul, lütfen tekrar deneyin.");
        }

        let aiResponse = data.candidates[0].content.parts[0].text;
        
    
        aiResponse = aiResponse.replace(/[`]|json|html/g, "").trim();

        const moviesArray = aiResponse.split('#').filter(item => item.includes('|'));

        const moviePromises = moviesArray.slice(0, 5).map(item => {
            const parts = item.split('|');
            return fetchMovieData(parts[0].trim(), parts[1].trim());
        });

        const results = await Promise.all(moviePromises);
        const validResults = results.filter(r => r !== null);

        if (validResults.length === 0) {
            throw new Error("Eşleşen film bulunamadı.");
        }

        aiText.innerHTML = `
            <div class="mb-6 text-center">
                <span class="text-[10px] bg-indigo-500/20 text-indigo-400 py-1.5 px-4 rounded-full font-black uppercase tracking-widest border border-indigo-500/30">
                    "${selectedMovieTitle}" Benzeri Hazineler
                </span>
            </div>
            <div id="ai-results-grid" class="grid grid-cols-2 md:grid-cols-5 gap-4 px-4 animate-hero"></div>
        `;
        
        const grid = document.getElementById('ai-results-grid');
        validResults.forEach(movieObj => renderFinalCard(movieObj, grid));

    } catch (error) {
        console.error("AI Hatası:", error);
        aiText.innerHTML = `
            <div class="p-10 text-center flex flex-col items-center">
                <div class="text-amber-500 mb-2 opacity-50">⚠️</div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">
                    ${error.message}
                </p>
            </div>
        `;
    } finally {
  
        isAiProcessing = false;
    }
}


async function fetchMovieData(title, reason) {
    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=tr-TR`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return { ...data.results[0], aiReason: reason };
        }
    } catch (e) { return null; }
}


window.tempAiMovies = window.tempAiMovies || {};

function renderFinalCard(movie, container) {

    window.tempAiMovies[movie.id] = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average
    };

    const posterPath = movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/500x750?text=Afiş+Yok';
    const isAlreadyInList = isInAnyList(movie.id);

    const card = document.createElement('div');
    card.className = "bg-slate-900/60 border border-white/5 rounded-2xl p-2 group hover:border-indigo-500/50 transition-all duration-500 flex flex-col scale-in-center";
    card.innerHTML = `
        <div class="relative overflow-hidden rounded-xl mb-2 h-36 md:h-44">
            <img src="${posterPath}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
        </div>
        <h4 class="text-[10px] font-black text-white truncate px-1 uppercase tracking-tighter">${movie.title}</h4>
        <p class="text-[8px] text-slate-400 mt-1 line-clamp-3 italic px-1 mb-3 leading-tight">"${movie.aiReason}"</p>
        
        <button 
            id="btn-ai-${movie.id}"
            onclick="addAiMovieToList(${movie.id})"
            class="mt-auto w-full py-2 rounded-xl text-[9px] font-black transition-all ${isAlreadyInList ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-600 hover:bg-white hover:text-black text-white shadow-lg shadow-indigo-500/20'}"
            ${isAlreadyInList ? 'disabled' : ''}
        >
            ${isAlreadyInList ? '✓ LİSTEDE' : '+ EKLE'}
        </button>
    `;
    container.appendChild(card);
}


window.addAiMovieToList = (id) => {
    const movie = window.tempAiMovies[id];
    if (!movie || isInAnyList(id)) return;

  
    watchList.push(movie);
    
    
    saveAll();

    
    const btn = document.getElementById(`btn-ai-${id}`);
    if (btn) {
        btn.innerText = "✓ EKLENDİ";
        btn.className = "mt-auto w-full py-2 rounded-xl text-[9px] font-black bg-emerald-500/10 text-emerald-500 cursor-default";
        btn.disabled = true;
    }

   
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
};
async function downloadShareCard(movie) {
    if (!movie) return;

    const template = document.getElementById('share-card-template');
    const cardTitle = document.getElementById('card-title');
    const cardPoster = document.getElementById('card-poster');
    const cardStars = document.getElementById('card-stars');
    const shareBtn = document.getElementById('share-card-btn');

    const originalBtnText = shareBtn.innerHTML;
    shareBtn.innerHTML = "⌛ Hazırlanıyor...";
    shareBtn.disabled = true;

    try {
       
        cardTitle.innerText = movie.title.toUpperCase();
        cardStars.innerHTML = "⭐".repeat(Math.round(movie.vote_average / 2));
        
        const proxyUrl = `https://images.weserv.nl/?url=https://image.tmdb.org/t/p/w500${movie.poster_path}&w=500&h=750&fit=cover`;
        
        
        template.style.left = "0";
        template.style.opacity = "1";
        template.style.zIndex = "-100";

        await new Promise((resolve, reject) => {
            cardPoster.onload = resolve;
            cardPoster.onerror = reject;
            cardPoster.src = proxyUrl;
        });

    
        await new Promise(r => setTimeout(r, 600));

        const canvas = await html2canvas(template, {
            useCORS: true,
            scale: 2, 
            backgroundColor: "#020617", 
            logging: false
        });

  
        const image = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement('a');
        link.download = `${movie.title.replace(/\s+/g, '_')}_SineRasgele.png`;
        link.href = image;
        link.click();
        
        confetti({ particleCount: 100, spread: 70 });

    } catch (error) {
        console.error("Kart Hatası:", error);
        alert("Görsel oluşturma başarısız oldu.");
    } finally {
        template.style.left = "-9999px";
        shareBtn.innerHTML = originalBtnText;
        shareBtn.disabled = false;
    }
}

window.closeGallery = () => document.getElementById('artist-gallery').classList.add('hidden');
