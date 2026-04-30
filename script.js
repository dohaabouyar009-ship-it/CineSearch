const apiKey = "de78d773b36e035ae311fb891704fbfa";

// 🔍 MOSTRAR PELIS
function mostrarPeliculas(peliculas) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

    if (!peliculas.length) {
        contenedor.innerHTML = "No hay resultados";
        return;
    }

    peliculas.forEach(peli => {
        let poster = peli.poster_path
            ? `https://image.tmdb.org/t/p/w500${peli.poster_path}`
            : "";

        contenedor.innerHTML += `
            <div class="pelicula">
                <span class="corazon" onclick="toggleFavorito(event, ${peli.id}, '${peli.title}', this)">🤍</span>
                <div onclick="verDetalle(${peli.id})">
                    <img src="${poster}">
                    <h3>${peli.title}</h3>
                </div>
            </div>
        `;
    });
}

// 🔎 BUSCAR (SOLO PELÍCULAS Y EN ESPAÑOL)
function buscar() {
    const query = document.getElementById("search").value;
    if (!query) return;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
}

// 🎬 DETALLE
function verDetalle(id) {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`)
        .then(res => res.json())
        .then(peli => {
            document.getElementById("detalle").innerHTML = `
                <h2>${peli.title}</h2>
                <p>${peli.overview}</p>
            `;
            document.getElementById("modal").style.display = "block";
        });
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}

// 🔐 LOGIN
function registro() {
    firebase.auth().createUserWithEmailAndPassword(
        email.value, password.value
    );
}

function login() {
    firebase.auth().signInWithEmailAndPassword(
        email.value, password.value
    ).then(() => cerrarLogin());
}

function abrirLogin() {
    document.getElementById("loginModal").style.display = "block";
}

function cerrarLogin() {
    document.getElementById("loginModal").style.display = "none";
}

// ❤️ FAVORITOS
function toggleFavorito(event, id, titulo, el) {
    event.stopPropagation();

    const user = firebase.auth().currentUser;
    if (!user) return alert("Haz login");

    const db = firebase.firestore();

    db.collection("favoritos")
    .where("user", "==", user.uid)
    .where("peliculaId", "==", id)
    .get()
    .then(snapshot => {
        if (!snapshot.empty) {
            snapshot.forEach(doc => db.collection("favoritos").doc(doc.id).delete());
            el.innerText = "🤍";
        } else {
            db.collection("favoritos").add({
                user: user.uid,
                peliculaId: id,
                titulo: titulo
            });
            el.innerText = "❤️";
        }
    });
}

// 📂 VER FAVORITOS
function verFavoritos() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Login primero");

    const cont = document.getElementById("listaFavoritos");
    cont.innerHTML = "";

    firebase.firestore().collection("favoritos")
    .where("user", "==", user.uid)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            cont.innerHTML += `
                <p>${doc.data().titulo}
                <button onclick="eliminarFavorito('${doc.id}')">❌</button></p>
            `;
        });
    });

    document.getElementById("favoritosModal").style.display = "block";
}

function cerrarFavoritos() {
    document.getElementById("favoritosModal").style.display = "none";
}

function eliminarFavorito(id) {
    firebase.firestore().collection("favoritos").doc(id).delete();
    verFavoritos();
}

// 🚀 INICIO
window.onload = () => {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
};