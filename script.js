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
                <span class="corazon" onclick="toggleFavorito(event, ${peli.id}, '${peli.title.replace(/'/g, "")}', this)">🤍</span>

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
            let director = peli.credits.crew.find(p => p.job === "Director");
            let actores = peli.credits.cast.slice(0, 5).map(a => a.name).join(", ");

            document.getElementById("detalle").innerHTML = `
                <h2>${peli.title}</h2>
                <p><strong>📅 Año:</strong> ${peli.release_date}</p>
                <p><strong>🎬 Director:</strong> ${director ? director.name : "No disponible"}</p>
                <p><strong>🎭 Actores:</strong> ${actores}</p>
                <p><strong>⭐ Nota:</strong> ${peli.vote_average}</p>
                <p><strong>📝 Sinopsis:</strong> ${peli.overview}</p>
            `;

            document.getElementById("modal").style.display = "block";
        });
}

// ❌ MODALES
function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}
function abrirLogin() {
    document.getElementById("loginModal").style.display = "block";
}
function cerrarLogin() {
    document.getElementById("loginModal").style.display = "none";
}
function cerrarFavoritos() {
    document.getElementById("favoritosModal").style.display = "none";
}

// 🔐 LOGIN
function registro() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(() => alert("Registrado ✅"))
        .catch(err => alert(err.message));
}

function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Login correcto 🔥");
            cerrarLogin();
        })
        .catch(err => alert(err.message));
}

// 🔐 SESIÓN
firebase.auth().onAuthStateChanged(user => {
    const btn = document.getElementById("btnLogin");

    if (user) {
        let inicial = user.email.replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase();
        btn.innerText = inicial;
    } else {
        btn.innerText = "Login";
    }
});

// ❤️ TOGGLE FAVORITO
function toggleFavorito(event, id, titulo, el) {
    event.stopPropagation();

    const user = firebase.auth().currentUser;
    if (!user) return alert("Inicia sesión");

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
    if (!user) return alert("Inicia sesión");

    const cont = document.getElementById("listaFavoritos");
    cont.innerHTML = "";

    firebase.firestore().collection("favoritos")
    .where("user", "==", user.uid)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            let peli = doc.data();

            cont.innerHTML += `
                <p>
                    ${peli.titulo}
                    <button onclick="eliminarFavorito('${doc.id}')">🗑️</button>
                </p>
            `;
        });
    });

    document.getElementById("favoritosModal").style.display = "block";
}

// 🗑️ ELIMINAR
function eliminarFavorito(id) {
    firebase.firestore().collection("favoritos").doc(id).delete();
    verFavoritos();
}

// 🎥 INICIO
window.onload = function () {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
};