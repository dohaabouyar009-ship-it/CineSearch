const apiKey = "de78d773b36e035ae311fb891704fbfa"; // Pega aquí los números y letras que te dio la web

function buscar() {
    let query = document.getElementById('search').value;
    let contenedor = document.getElementById('resultados');

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=es-ES`)
    .then(response => response.json())
    .then(data => {
        contenedor.innerHTML = ""; // Limpiar antes de mostrar nuevos
        data.results.forEach(peli => {
            let poster = peli.poster_path ? `https://image.tmdb.org/t/p/w500${peli.poster_path}` : "https://via.placeholder.com/200x300?text=Sin+Foto";
            
            // Sistema de estrellas (dividimos la nota entre 2)
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
    });
}