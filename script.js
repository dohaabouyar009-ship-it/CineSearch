const apiKey = "de78d773b36e035ae311fb891704fbfa";

// Cache de favoritos para saber qué corazones pintar
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

        // Escapar comillas en el título para el onclick
        const tituloEscapado = peli.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const posterPath = peli.poster_path ? peli.poster_path.replace(/'/g, "\\'") : '';

        contenedor.innerHTML += `
            <div class="pelicula">
                <span class="${corazonClass}" id="c-${peli.id}"
                onclick="toggleFavorito(event, ${peli.id}, '${tituloEscapado}', '${posterPath}')">${corazonIcono}</span>

                <div onclick="verDetalle(${peli.id})">
                    <img src="${poster}" alt="${peli.title}">
                    <h3>${peli.title}</h3>
                    <p>${estrellas}</p>
                </div>
            </div>
        `;
    });
}

// 🔎 BUSCAR
function buscar() {
    const query = document.getElementById("search").value.trim();
    if (!query) return;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results || []))
        .catch(err => console.error("Error buscando:", err));
}

// 🎬 DETALLE CON POSTER GRANDE AL LADO
function verDetalle(id) {
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`)
        .then(res => res.json())
        .then(peli => {
            let director = peli.credits?.crew?.find(p => p.job === "Director");
            let actores = peli.credits?.cast?.slice(0, 5).map(a => a.name).join(", ") || "No disponible";
            
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
                        <p><strong>📅 Año:</strong> ${peli.release_date || "No disponible"}</p>
                        <p><strong>🎬 Director:</strong> ${director ? director.name : "No disponible"}</p>
                        <p><strong>🎭 Actores:</strong> ${actores}</p>
                        <p><strong>⭐ Nota:</strong> ${peli.vote_average || "N/A"} / 10</p>
                        <p><strong>📝 Sinopsis:</strong> ${peli.overview || "Sin sinopsis disponible."}</p>
                    </div>
                </div>
            `;

            document.getElementById("modal").style.display = "block";
            document.body.style.overflow = "hidden";
        })
        .catch(err => console.error("Error en detalle:", err));
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
    document.body.style.overflow = "auto";
}

// ❤️ FAVORITOS - Con Firebase Firestore
function toggleFavorito(event, id, titulo, posterPath) {
    event.stopPropagation();

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Debes iniciar sesión primero ❤️");
        abrirLogin();
        return;
    }

    const db = firebase.firestore();
    const corazonElem = document.getElementById(`c-${id}`);

    db.collection("favoritos")
        .where("user", "==", user.uid)
        .where("peliculaId", "==", id)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                // Eliminar de favoritos
                snapshot.forEach(doc => {
                    db.collection("favoritos").doc(doc.id).delete();
                });
                
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
                    posterPath: posterPath,
                    fecha: new Date()
                });
                
                corazonElem.innerText = "❤️";
                corazonElem.classList.add("activo");
                
                // Actualizar cache
                favoritosCache.push({ peliculaId: id, titulo: titulo, posterPath: posterPath });
            }
        })
        .catch(err => {
            console.error("Error en favoritos:", err);
            alert("Error al guardar favorito");
        });
}

// 📂 VER FAVORITOS - Con portadas desde Firebase
function verFavoritos() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Debes iniciar sesión primero ❤️");
        abrirLogin();
        return;
    }

    const cont = document.getElementById("listaFav");
    cont.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    firebase.firestore().collection("favoritos")
        .where("user", "==", user.uid)
        .get()
        .then(snapshot => {
            favoritosCache = [];
            cont.innerHTML = "";

            if (snapshot.empty) {
                cont.innerHTML = "<p style='text-align:center; padding: 20px;'>No tienes favoritos aún ❤️</p>";
            } else {
                snapshot.forEach(doc => {
                    let peli = doc.data();
                    peli.docId = doc.id;
                    favoritosCache.push(peli);
                    
                    let poster = peli.posterPath 
                        ? `https://image.tmdb.org/t/p/w200${peli.posterPath}`
                        : "https://via.placeholder.com/60x90";

                    cont.innerHTML += `
                        <div class="fav-item">
                            <img src="${poster}" alt="${peli.titulo}">
                            <span>${peli.titulo}</span>
                            <button onclick="eliminarFav('${doc.id}')">🗑️</button>
                            <button onclick="compartir('${peli.titulo.replace(/'/g, "\\'")}')">📤</button>
                        </div>
                    `;
                });
            }

            document.getElementById("favModal").style.display = "block";
            document.body.style.overflow = "hidden";
        })
        .catch(err => {
            console.error("Error cargando favoritos:", err);
            alert("Error al cargar favoritos");
        });
}

function cerrarFav() {
    document.getElementById("favModal").style.display = "none";
    document.body.style.overflow = "auto";
}

function eliminarFav(docId) {
    firebase.firestore().collection("favoritos").doc(docId).delete()
        .then(() => {
            // Actualizar cache
            favoritosCache = favoritosCache.filter(f => f.docId !== docId);
            verFavoritos(); // Refrescar lista
            
            // Refrescar vista principal para actualizar corazones
            const searchValue = document.getElementById("search").value;
            if (searchValue) {
                buscar();
            } else {
                cargarPopulares();
            }
        })
        .catch(err => {
            console.error("Error eliminando:", err);
            alert("Error al eliminar favorito");
        });
}

function compartir(titulo) {
    const link = window.location.href + "?peli=" + encodeURIComponent(titulo);
    navigator.clipboard.writeText(link).then(() => {
        alert("Link copiado al portapapeles 🔗");
    });
}

// 🔐 LOGIN - Firebase Auth
function login() {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;

    if (!email || !pass) {
        alert("Por favor introduce email y contraseña");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Login correcto 🔥");
            cerrarLogin();
        })
        .catch(err => {
            console.error("Error login:", err);
            alert("Error: " + err.message);
        });
}

function registro() {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;

    if (!email || !pass) {
        alert("Por favor introduce email y contraseña");
        return;
    }

    if (pass.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Registrado correctamente ✅");
            cerrarLogin();
        })
        .catch(err => {
            console.error("Error registro:", err);
            alert("Error: " + err.message);
        });
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            toggleDropdown();
            alert("Sesión cerrada");
        })
        .catch(err => {
            console.error("Error logout:", err);
        });
}

function abrirLogin() {
    const user = firebase.auth().currentUser;
    if (user) {
        toggleDropdown();
    } else {
        document.getElementById("loginModal").style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.classList.toggle("mostrar");
}

function cerrarLogin() {
    document.getElementById("loginModal").style.display = "none";
    document.body.style.overflow = "auto";
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
        let photoURL = user.photoURL;
        
        if (photoURL) {
            btn.innerHTML = `<img src="${photoURL}" alt="Perfil">`;
            dropdownAvatar.src = photoURL;
        } else {
            let avatarUrl = `https://ui-avatars.com/api/?name=${inicial}&background=FFD700&color=000&size=128&bold=true`;
            btn.innerHTML = `<img src="${avatarUrl}" alt="Perfil">`;
            dropdownAvatar.src = avatarUrl;
        }
        
        dropdownEmail.innerText = user.email;
        
        // Cargar favoritos en cache
        cargarFavoritosCache(user.uid);
    } else {
        // No logueado
        btn.innerText = "Login";
        btn.innerHTML = "Login";
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
                data.docId = doc.id;
                favoritosCache.push(data);
            });
            
            // Refrescar la vista actual
            const searchValue = document.getElementById("search").value;
            if (searchValue) {
                buscar();
            } else {
                cargarPopulares();
            }
        })
        .catch(err => console.error("Error cargando cache:", err));
}

// Cargar películas populares
function cargarPopulares() {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results || []))
        .catch(err => console.error("Error cargando populares:", err));
}

// INICIO
window.onload = () => {
    cargarPopulares();
    
    // Buscar al presionar Enter
    document.getElementById("search").addEventListener("keypress", (e) => {
        if (e.key === "Enter") buscar();
    });
};