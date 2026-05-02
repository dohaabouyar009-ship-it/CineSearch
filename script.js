const apiKey = "de78d773b36e035ae311fb891704fbfa";
let favoritosCache = [];

// 🔍 MOSTRAR PELIS
function mostrarPeliculas(peliculas) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

    peliculas.forEach(peli => {
        let poster = peli.poster_path
            ? `https://image.tmdb.org/t/p/w500${peli.poster_path}`
            : "https://via.placeholder.com/200x300?text=Sin+Poster";

        let estrellas = "⭐".repeat(Math.round(peli.vote_average / 2));
        
        const esFav = favoritosCache.some(f => f.peliculaId === peli.id);
        const corazonClass = esFav ? "corazon activo" : "corazon";
        const corazonIcono = esFav ? "❤️" : "🤍";

        const tituloEscapado = peli.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const posterPath = peli.poster_path || '';

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

// 🎬 DETALLE CON POSTER + PLATAFORMAS
function verDetalle(id) {
    // Hacer dos peticiones: detalle + plataformas
    const detallePromise = fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`)
        .then(res => res.json());
    
    const plataformasPromise = fetch(`https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${apiKey}`)
        .then(res => res.json());

    Promise.all([detallePromise, plataformasPromise])
        .then(([peli, providersData]) => {
            let director = peli.credits?.crew?.find(p => p.job === "Director");
            let actores = peli.credits?.cast?.slice(0, 5).map(a => a.name).join(", ") || "No disponible";
            
            let poster = peli.poster_path
                ? `https://image.tmdb.org/t/p/w500${peli.poster_path}`
                : "https://via.placeholder.com/300x450?text=Sin+Poster";

            // Obtener plataformas para España (ES) o streaming general
            let plataformasHTML = "";
            const results = providersData.results || {};
            const esProviders = results.ES || results.US || Object.values(results)[0];
            
            if (esProviders && esProviders.flatrate && esProviders.flatrate.length > 0) {
                const plataformas = esProviders.flatrate.slice(0, 6); // Máximo 6
                plataformasHTML = `
                    <div class="plataformas">
                        <h3>📺 Disponible en:</h3>
                        <div class="plataformas-lista">
                            ${plataformas.map(p => `
                                <div class="plataforma-item">
                                    <img src="https://image.tmdb.org/t/p/original${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">
                                    <span>${p.provider_name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                plataformasHTML = `
                    <div class="plataformas">
                        <h3>📺 Plataformas:</h3>
                        <p class="plataformas-mensaje">No hay información de streaming disponible para esta película.</p>
                    </div>
                `;
            }

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
                        ${plataformasHTML}
                    </div>
                </div>
            `;

            document.getElementById("modal").style.display = "block";
            document.body.style.overflow = "hidden";
        })
        .catch(err => {
            console.error("Error en detalle:", err);
            alert("Error al cargar detalles de la película");
        });
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
    document.body.style.overflow = "auto";
}

// ❤️ FAVORITOS - CORREGIDO: guarda posterPath correctamente
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
                // Eliminar
                snapshot.forEach(doc => {
                    db.collection("favoritos").doc(doc.id).delete();
                });
                
                corazonElem.innerText = "🤍";
                corazonElem.classList.remove("activo");
                favoritosCache = favoritosCache.filter(f => f.peliculaId !== id);
            } else {
                // Añadir - GUARDAR posterPath correctamente
                const posterParaGuardar = posterPath ? posterPath.replace(/\\/g, '') : '';
                
                db.collection("favoritos").add({
                    user: user.uid,
                    peliculaId: id,
                    titulo: titulo,
                    posterPath: posterParaGuardar,
                    fecha: new Date()
                });
                
                corazonElem.innerText = "❤️";
                corazonElem.classList.add("activo");
                favoritosCache.push({ 
                    peliculaId: id, 
                    titulo: titulo, 
                    posterPath: posterParaGuardar 
                });
            }
        })
        .catch(err => {
            console.error("Error en favoritos:", err);
            alert("Error al guardar favorito");
        });
}

// 📂 VER FAVORITOS - CORREGIDO: mejor manejo de imágenes
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
                    
                    // CORRECCIÓN: Construir URL correctamente
                    let posterUrl;
                    if (peli.posterPath && peli.posterPath.startsWith('/')) {
                        posterUrl = `https://image.tmdb.org/t/p/w200${peli.posterPath}`;
                    } else if (peli.posterPath) {
                        posterUrl = `https://image.tmdb.org/t/p/w200/${peli.posterPath}`;
                    } else {
                        posterUrl = "https://via.placeholder.com/60x90?text=No+Img";
                    }

                    cont.innerHTML += `
                        <div class="fav-item">
                            <img class="fav-poster" src="${posterUrl}" alt="${peli.titulo}" onerror="this.src='https://via.placeholder.com/60x90?text=Error'">
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
            cont.innerHTML = "<p style='text-align:center; color:red;'>Error al cargar favoritos</p>";
        });
}

function cerrarFav() {
    document.getElementById("favModal").style.display = "none";
    document.body.style.overflow = "auto";
}

function eliminarFav(docId) {
    firebase.firestore().collection("favoritos").doc(docId).delete()
        .then(() => {
            favoritosCache = favoritosCache.filter(f => f.docId !== docId);
            verFavoritos();
            
            const searchValue = document.getElementById("search").value;
            if (searchValue) buscar();
            else cargarPopulares();
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

// 🔐 LOGIN
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
        .catch(err => console.error("Error logout:", err));
}

function abrirLogin() {
    const user = firebase.auth().currentUser;
    if (user) toggleDropdown();
    else {
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

document.addEventListener("click", (e) => {
    const container = document.getElementById("profileContainer");
    const dropdown = document.getElementById("profileDropdown");
    if (!container.contains(e.target) && dropdown.classList.contains("mostrar")) {
        dropdown.classList.remove("mostrar");
    }
});

// Estado de autenticación
firebase.auth().onAuthStateChanged(user => {
    const btn = document.getElementById("btnLogin");
    const dropdownEmail = document.getElementById("dropdownEmail");
    const dropdownAvatar = document.getElementById("dropdownAvatar");

    if (user) {
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
        cargarFavoritosCache(user.uid);
    } else {
        btn.innerText = "Login";
        btn.innerHTML = "Login";
        dropdownAvatar.src = "";
        dropdownEmail.innerText = "";
        favoritosCache = [];
    }
});

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
            
            const searchValue = document.getElementById("search").value;
            if (searchValue) buscar();
            else cargarPopulares();
        })
        .catch(err => console.error("Error cargando cache:", err));
}

function cargarPopulares() {
    fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results || []))
        .catch(err => console.error("Error cargando populares:", err));
}

window.onload = () => {
    cargarPopulares();
    document.getElementById("search").addEventListener("keypress", (e) => {
        if (e.key === "Enter") buscar();
    });
};