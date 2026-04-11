const apiKey = "de78d773b36e035ae311fb891704fbfa";

function mostrarPeliculas(peliculas) {
    let contenedor = document.getElementById('resultados');
    contenedor.innerHTML = "";

    peliculas.forEach(peli => {
        let poster = peli.poster_path 
            ? `https://image.tmdb.org/t/p/w500${peli.poster_path}` 
            : "https://via.placeholder.com/200x300?text=Sin+Foto";
        
        let estrellas = Math.round(peli.vote_average / 2);
        let rating = "⭐".repeat(estrellas);

        contenedor.innerHTML += `
            <div class="pelicula">
                <img src="${poster}">
                <h3>${peli.title}</h3>
                <p>${rating}</p>
            </div>
        `;
    });
}

function buscar() {
    let query = document.getElementById('search').value;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=es-ES`)
    .then(res => res.json())
    .then(data => {
        mostrarPeliculas(data.results);
    });
}

// Pelis populares al abrir
window.onload = function() {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
    .then(res => res.json())
    .then(data => {
        mostrarPeliculas(data.results);
    });
};