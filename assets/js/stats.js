document.addEventListener('DOMContentLoaded', () => {
    calculateAndRenderStats();
});

function calculateAndRenderStats() {
    const statsGrid = document.getElementById('stats-grid');
    const genreContainer = document.getElementById('genre-container');

    if (!statsGrid) {
        console.warn("stats-grid bulunamadı");
        return;
    }

  
    let watchedList = [];
    try {
        watchedList = JSON.parse(localStorage.getItem('myWatchedList')) || [];
    } catch (e) {
        console.error("WatchedList parse hatası:", e);
        watchedList = [];
    }

    console.log("📊 İstatistik için okunan veri:", watchedList);

 
    if (!Array.isArray(watchedList) || watchedList.length === 0) {
        statsGrid.innerHTML = `
            <p class="col-span-full text-center text-slate-500 italic">
                Henüz izlenmiş film verisi yok.
            </p>
        `;
        if (genreContainer) genreContainer.innerHTML = '';
        return;
    }

    const totalCount = watchedList.length;

    const avgScore = (
        watchedList.reduce(
            (acc, m) => acc + (parseFloat(m.vote_average) || 0),
            0
        ) / totalCount
    ).toFixed(1);

  
    const genreMap = {};

    watchedList.forEach(movie => {
        const genres =
            Array.isArray(movie.genres) && movie.genres.length > 0
                ? movie.genres
                : [{ name: "Genel" }];

        genres.forEach(g => {
            const genreName =
                typeof g === 'string'
                    ? g
                    : (g.name || "Genel");

            genreMap[genreName] = (genreMap[genreName] || 0) + 1;
        });
    });

    const sortedGenres = Object.entries(genreMap)
        .sort((a, b) => b[1] - a[1]);

    const topGenre = sortedGenres.length > 0
        ? sortedGenres[0][0]
        : "Belirsiz";

    statsGrid.innerHTML = `
        ${createStatCard("Toplam İzlenen", totalCount, "fa-video", "text-indigo-500")}
        ${createStatCard("Ortalama Puan", avgScore, "fa-star", "text-amber-500")}
        ${createStatCard("Favori Tür", topGenre, "fa-bolt", "text-rose-500")}
        ${createStatCard("Sinefil Skor", totalCount * 10, "fa-award", "text-emerald-500")}
    `;

    if (genreContainer) {
        genreContainer.innerHTML = sortedGenres.map(([name, count]) => {
            const percent = Math.round((count / totalCount) * 100);
            return `
                <div class="mb-4">
                    <div class="flex justify-between text-[10px] font-bold uppercase mb-1">
                        <span>${name}</span>
                        <span>${count} Film</span>
                    </div>
                    <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-600 transition-all duration-700"
                             style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function createStatCard(title, value, icon, colorClass) {
    return `
        <div class="glass p-6 rounded-[2rem] border border-white/5 shadow-xl">
            <div class="flex justify-between items-start mb-2">
                <i class="fas ${icon} ${colorClass}"></i>
                <span class="text-[9px] font-black text-slate-500 uppercase">${title}</span>
            </div>
            <div class="text-2xl font-black text-white italic">${value}</div>
        </div>
    `;
}
