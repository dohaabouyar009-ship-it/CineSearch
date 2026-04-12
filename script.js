const apiKey = "de78d773b36e035ae311fb891704fbfa";

// 🔍 MOSTRAR PELIS
function mostrarPeliculas(peliculas) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

    peliculas.forEach(peli => {
        let poster = peli.poster_path
            ? `https://image.tmdb.org/t/p/w500${peli.poster_path}`
            : "https://via.placeholder.com/200x300";

        let estrellas = "⭐".repeat(Math.round(peli.vote_average / 2));

        contenedor.innerHTML += `
            <div class="pelicula" onclick="verDetalle(${peli.id})">
                <img src="${poster}">
                <h3>${peli.title}</h3>
                <p>${estrellas}</p>
            </div>
        `;
    });
}

// 🔎 BUSCAR
function buscar() {
    const query = document.getElementById("search").value;
    if(!query) return;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
}

// 🎬 DETALLE COMPLETO + TRAILER
function verDetalle(id) {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits,videos`)
        .then(res => res.json())
        .then(peli => {

            let director = peli.credits.crew.find(p => p.job === "Director");
            let actores = peli.credits.cast.slice(0, 5).map(a => a.name).join(", ");

            // 🎥 TRAILER
            let trailer = peli.videos.results.find(
                v => v.type === "Trailer" && v.site === "YouTube"
            );

            let trailerHTML = trailer
                ? `<iframe width="100%" height="315"
                    src="https://www.youtube.com/embed/${trailer.key}"
                    frameborder="0" allowfullscreen></iframe>`
                : "<p>Trailer no disponible</p>";

            document.getElementById("detalle").innerHTML = `
                <h2>${peli.title}</h2>
                <p><strong>📅 Año:</strong> ${peli.release_date}</p>
                <p><strong>🎬 Director:</strong> ${director ? director.name : "No disponible"}</p>
                <p><strong>🎭 Actores:</strong> ${actores}</p>
                <p><strong>⭐ Nota:</strong> ${peli.vote_average}</p>
                <p><strong>📝 Sinopsis:</strong> ${peli.overview}</p>
                <h3>🎥 Trailer</h3>
                ${trailerHTML}
            `;

            document.getElementById("modal").style.display = "block";
        });
}

// ❌ CERRAR
function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}

// 🎥 INICIO
window.onload = function () {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
};