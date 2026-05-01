const apiKey = "de78d773b36e035ae311fb891704fbfa";

// Variable para guardar los favoritos en memoria y saber si están activos
let favoritosCache = [];

// 🔍 MOSTRAR PELIS
function mostrarPeliculas(peliculas) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

    peliculas.forEach(peli => {
        let poster = peli.poster_path
            ? `https://image.tmdb.org/t/p/w500${peli.poster_path}`
            : "https://via.placeholder.com/200x300";

        let estrellas = "⭐".repeat(Math.round(peli.vote_average / 2));
        
        // Verificar si esta peli está en favoritos
        const esFav = favoritosCache.some(f => f.peliculaId === peli.id);
        const corazonClass = esFav ? "corazon activo" : "corazon";
        const corazonIcono = esFav ? "❤️" : "🤍";

        contenedor.innerHTML += `
            <div class="pelicula">
                <span class="${corazonClass}" id="c-${peli.id}"
                onclick="toggleFavorito(event, ${peli.id}, '${peli.title.replace(/'/g, "\\'")}', '${peli.poster_path ? peli.poster_path.replace(/'/g, "\\'") : ''}')">${corazonIcono}</span>

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

// 🎬 DETALLE CON POSTER GRANDE AL LADO
function verDetalle(id) {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`)
        .then(res => res.json())
        .then(peli => {

            let director = peli.credits.crew.find(p => p.job === "Director");
            let actores = peli.credits.cast.slice(0, 5).map(a => a.name).join(", ");
            
            let poster = peli.poster_path
                ? `https://image.tmdb.org/t/p/w500${peli.poster_path}`
                : "https://via.placeholder.com/300x450";

            document.getElementById("detalle").innerHTML = `
                <div class="detalle-contenido">
                    <div class="detalle-poster">
                        <img src="${poster}" alt="${peli.title}">
                    </div>
                    <div class="detalle-info">
                        <h2>${peli.title}</h2>
                        <p>📅 Año: ${peli.release_date}</p>
                        <p>🎬 Director: ${director ? director.name : "No disponible"}</p>
                        <p>🎭 Actores: ${actores}</p>
                        <p>⭐ Nota: ${peli.vote_average}</p>
                        <p>📝 Sinopsis: ${peli.overview}</p>
                    </div>
                </div>
            `;

            document.getElementById("modal").style.display = "block";
        });
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}

// ❤️ FAVORITOS - Guarda también el poster_path
function toggleFavorito(event, id, titulo, posterPath) {
    event.stopPropagation();

    const user = firebase.auth().currentUser;
    if (!user) return alert("Login primero");

    const db = firebase.firestore();
    const corazonElem = document.getElementById(`c-${id}`);

    db.collection("favoritos")
        .where("user", "==", user.uid)
        .where("peliculaId", "==", id)
        .get()
        .then(snapshot => {

            if (!snapshot.empty) {
                // Eliminar de favoritos
                snapshot.forEach(doc => db.collection("favoritos").doc(doc.id).delete());
                
                corazonElem.innerText = "🤍";
                corazonElem.classList.remove("activo");
                
                // Actualizar cache
                favoritosCache = favoritosCache.filter(f => f.peliculaId !== id);
            } else {
                // Añadir a favoritos
                db.collection("favoritos").add({
                    user: user.uid,
                    peliculaId: id,
                    titulo: titulo,
                    posterPath: posterPath
                });
                
                corazonElem.innerText = "❤️";
                corazonElem.classList.add("activo");
                
                // Actualizar cache
                favoritosCache.push({ peliculaId: id, titulo: titulo, posterPath: posterPath });
            }
        });
}

// 📂 VER FAVORITOS - Con portadas
function verFavoritos() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("Login primero");

    const cont = document.getElementById("listaFav");
    cont.innerHTML = "";

    firebase.firestore().collection("favoritos")
        .where("user", "==", user.uid)
        .get()
        .then(snapshot => {
            favoritosCache = []; // Limpiar y reconstruir cache
            
            if (snapshot.empty) {
                cont.innerHTML = "<p>No tienes favoritos aún ❤️</p>";
            } else {
                snapshot.forEach(doc => {
                    let peli = doc.data();
                    favoritosCache.push(peli);
                    
                    let poster = peli.posterPath 
                        ? `https://image.tmdb.org/t/p/w200${peli.posterPath}`
                        : "https://via.placeholder.com/60x90";

                    cont.innerHTML += `
                        <div class="fav-item">
                            <img src="${poster}" alt="${peli.titulo}">
                            <span>${peli.titulo}</span>
                            <button onclick="eliminarFav('${doc.id}')">🗑️</button>
                            <button onclick="compartir('${peli.titulo}')">📤</button>
                        </div>
                    `;
                });
            }
        });

    document.getElementById("favModal").style.display = "block";
}

function cerrarFav() {
    document.getElementById("favModal").style.display = "none";
}

function eliminarFav(id) {
    firebase.firestore().collection("favoritos").doc(id).delete()
        .then(() => {
            // Actualizar cache al eliminar
            favoritosCache = favoritosCache.filter(f => f.id !== id);
            verFavoritos();
        });
}

function compartir(titulo) {
    const link = window.location.href + "?peli=" + encodeURIComponent(titulo);
    navigator.clipboard.writeText(link);
    alert("Link copiado 🔗");
}

// 🔐 LOGIN - Corregido el bug de variables
function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Login 🔥");
            cerrarLogin();
        })
        .catch(err => alert("Error: " + err.message));
}

function registro() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Registrado ✅");
            cerrarLogin();
        })
        .catch(err => alert("Error: " + err.message));
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            toggleDropdown(); // Cerrar dropdown
            alert("Sesión cerrada");
        });
}

function abrirLogin() {
    const user = firebase.auth().currentUser;
    if (user) {
        // Si está logueado, mostrar/ocultar dropdown
        toggleDropdown();
    } else {
        // Si no está logueado, abrir modal de login
        document.getElementById("loginModal").style.display = "block";
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.classList.toggle("mostrar");
}

function cerrarLogin() {
    document.getElementById("loginModal").style.display = "none";
}

// Cerrar dropdown al hacer click fuera
document.addEventListener("click", (e) => {
    const container = document.getElementById("profileContainer");
    const dropdown = document.getElementById("profileDropdown");
    if (!container.contains(e.target) && dropdown.classList.contains("mostrar")) {
        dropdown.classList.remove("mostrar");
    }
});

// Estado de autenticación - Actualiza UI con foto de perfil
firebase.auth().onAuthStateChanged(user => {
    const btn = document.getElementById("btnLogin");
    const dropdownEmail = document.getElementById("dropdownEmail");
    const dropdownAvatar = document.getElementById("dropdownAvatar");

    if (user) {
        // Usuario logueado: mostrar avatar circular
        let inicial = user.email.charAt(0).toUpperCase();
        let photoURL = user.photoURL; // Firebase Auth puede tener foto
        
        // Si no tiene foto de perfil, usar inicial o un avatar por defecto
        if (photoURL) {
            btn.innerHTML = `<img src="${photoURL}" alt="Perfil">`;
            dropdownAvatar.src = photoURL;
        } else {
            // Crear avatar con inicial usando UI Avatars
            let avatarUrl = `https://ui-avatars.com/api/?name=${inicial}&background=FFD700&color=000&size=128`;
            btn.innerHTML = `<img src="${avatarUrl}" alt="Perfil">`;
            dropdownAvatar.src = avatarUrl;
        }
        
        dropdownEmail.innerText = user.email;
        
        // Cargar favoritos en cache para mostrar corazones correctos
        cargarFavoritosCache(user.uid);
    } else {
        // No logueado: mostrar botón Login
        btn.innerText = "Login";
        btn.innerHTML = "Login"; // Limpiar imagen si había
        dropdownAvatar.src = "";
        dropdownEmail.innerText = "";
        favoritosCache = [];
    }
});

// Cargar favoritos en memoria para saber qué corazones pintar
function cargarFavoritosCache(userId) {
    firebase.firestore().collection("favoritos")
        .where("user", "==", userId)
        .get()
        .then(snapshot => {
            favoritosCache = [];
            snapshot.forEach(doc => {
                let data = doc.data();
                data.id = doc.id;
                favoritosCache.push(data);
            });
            // Refrescar la vista actual si hay películas mostradas
            const searchValue = document.getElementById("search").value;
            if (searchValue) {
                buscar();
            } else {
                // Recargar populares para actualizar corazones
                fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
                    .then(res => res.json())
                    .then(data => mostrarPeliculas(data.results));
            }
        });
}

// INICIO
window.onload = () => {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results));
};