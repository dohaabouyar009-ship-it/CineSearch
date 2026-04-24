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
            <div class="pelicula">
                <span class="corazon" id="c-${peli.id}"
                onclick="toggleFavorito(event, ${peli.id}, '${peli.title.replace(/'/g, "")}')">🤍</span>

                <div onclick="verDetalle(${peli.id})">
                    <img src="${poster}">
                    <h3>${peli.title}</h3>
                    <p>${estrellas}</p>
                </div>
            </div>
        `;
    });
}

// 🔎 BUSCAR
function buscar() {
    const query = document.getElementById("search").value;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
}

// 🎬 DETALLE
function verDetalle(id) {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`)
        .then(res => res.json())
        .then(peli => {

            let director = peli.credits.crew.find(p => p.job === "Director");
            let actores = peli.credits.cast.slice(0, 5).map(a => a.name).join(", ");

            document.getElementById("detalle").innerHTML = `
                <h2>${peli.title}</h2>
                <p>📅 ${peli.release_date}</p>
                <p>🎬 ${director ? director.name : "No disponible"}</p>
                <p>🎭 ${actores}</p>
                <p>⭐ ${peli.vote_average}</p>
                <p>${peli.overview}</p>
            `;

            document.getElementById("modal").style.display = "block";
        });
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}

// ❤️ FAVORITOS
function toggleFavorito(event, id, titulo) {
    event.stopPropagation();

    const user = firebase.auth().currentUser;
    if (!user) return alert("Login primero");

    const db = firebase.firestore();

    db.collection("favoritos")
        .where("user", "==", user.uid)
        .where("peliculaId", "==", id)
        .get()
        .then(snapshot => {

            if (!snapshot.empty) {
                snapshot.forEach(doc => db.collection("favoritos").doc(doc.id).delete());

                document.getElementById(`c-${id}`).innerText = "🤍";
            } else {
                db.collection("favoritos").add({
                    user: user.uid,
                    peliculaId: id,
                    titulo: titulo
                });

                document.getElementById(`c-${id}`).innerText = "❤️";
            }
        });
}

// 📂 VER FAVORITOS
function verFavoritos() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Login primero");

    const cont = document.getElementById("listaFav");
    cont.innerHTML = "";

    firebase.firestore().collection("favoritos")
        .where("user", "==", user.uid)
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                let peli = doc.data();

                cont.innerHTML += `
                    <div>
                        ${peli.titulo}
                        <button onclick="eliminarFav('${doc.id}')">🗑️</button>
                        <button onclick="compartir('${peli.titulo}')">📤</button>
                    </div>
                `;
            });
        });

    document.getElementById("favModal").style.display = "block";
}

function cerrarFav() {
    document.getElementById("favModal").style.display = "none";
}

function eliminarFav(id) {
    firebase.firestore().collection("favoritos").doc(id).delete()
        .then(() => verFavoritos());
}

function compartir(titulo) {
    const link = window.location.href + "?peli=" + titulo;
    navigator.clipboard.writeText(link);
    alert("Link copiado 🔗");
}

// 🔐 LOGIN
function login() {
    const email = email.value;
    const pass = password.value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => alert("Login 🔥"));
}

function registro() {
    const email = email.value;
    const pass = password.value;

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(() => alert("Registrado ✅"));
}

function abrirLogin() {
    document.getElementById("loginModal").style.display = "block";
}

function cerrarLogin() {
    document.getElementById("loginModal").style.display = "none";
}

firebase.auth().onAuthStateChanged(user => {
    const btn = document.getElementById("btnLogin");

    if (user) {
        let inicial = user.email.charAt(0).toUpperCase();
        btn.innerText = inicial;
    } else {
        btn.innerText = "Login";
    }
});

// INICIO
window.onload = () => {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
};