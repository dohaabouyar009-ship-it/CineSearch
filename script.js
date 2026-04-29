const apiKey = "de78d773b36e035ae311fb891704fbfa";

// MOSTRAR
function mostrarPeliculas(peliculas) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

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

// BUSCAR
function buscar() {
    const query = document.getElementById("search").value;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`)
        .then(r => r.json())
        .then(d => mostrarPeliculas(d.results));
}

// DETALLE
function verDetalle(id) {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`)
        .then(r => r.json())
        .then(peli => {
            document.getElementById("detalle").innerHTML = `<h2>${peli.title}</h2>`;
            document.getElementById("modal").style.display = "block";
        });
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}

// LOGIN
function abrirLogin() {
    document.getElementById("loginModal").style.display = "block";
}
function cerrarLogin() {
    document.getElementById("loginModal").style.display = "none";
}

function registro() {
    firebase.auth().createUserWithEmailAndPassword(email.value, password.value);
}

function login() {
    firebase.auth().signInWithEmailAndPassword(email.value, password.value);
}

// FAVORITOS
function toggleFavorito(e, id, titulo, el) {
    e.stopPropagation();

    const user = firebase.auth().currentUser;
    if (!user) return alert("Login");

    const db = firebase.firestore();

    db.collection("favoritos")
    .where("user", "==", user.uid)
    .where("peliculaId", "==", id)
    .get()
    .then(snap => {
        if (!snap.empty) {
            snap.forEach(doc => db.collection("favoritos").doc(doc.id).delete());
            el.innerText = "🤍";
        } else {
            db.collection("favoritos").add({ user: user.uid, peliculaId: id, titulo });
            el.innerText = "❤️";
        }
    });
}

// VER FAVORITOS
function verFavoritos() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Login");

    const cont = document.getElementById("listaFavoritos");
    cont.innerHTML = "";

    firebase.firestore().collection("favoritos")
    .where("user", "==", user.uid)
    .get()
    .then(snap => {
        snap.forEach(doc => {
            let peli = doc.data();
            cont.innerHTML += `<p>${peli.titulo}</p>`;
        });
    });

    document.getElementById("favoritosModal").style.display = "block";
}

function cerrarFavoritos() {
    document.getElementById("favoritosModal").style.display = "none";
}

// INICIO
window.onload = () => {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}`)
        .then(r => r.json())
        .then(d => mostrarPeliculas(d.results));
};