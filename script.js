const apiKey = "de78d773b36e035ae311fb891704fbfa";
let favoritosCache = [];

// Función para obtener inicial válida (letra, no número)
function getInicial(email) {
    if (!email) return "U";
    // Buscar la primera letra del email (antes del @)
    const nombre = email.split('@')[0];
    // Buscar primera letra válida (a-z, A-Z)
    for (let char of nombre) {
        if (/[a-zA-Z]/.test(char)) {
            return char.toUpperCase();
        }
    }
    // Si no hay letras, usar primera letra del dominio o "U"
    const dominio = email.split('@')[1] || "";
    for (let char of dominio) {
        if (/[a-zA-Z]/.test(char)) {
            return char.toUpperCase();
        }
    }
    return "U";
}

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

// 🎬 DETALLE CON POSTER + PLATAFORMAS (mejorado)
function verDetalle(id) {
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

            // OBTENER PLATAFORMAS - mejorado con más países y fallback
            let plataformasHTML = "";
            const results = providersData.results || {};
            
            // Orden de países a buscar: ES, US, MX, AR, GB, FR, DE, IT
            const paises = ['ES', 'US', 'MX', 'AR', 'GB', 'FR', 'DE', 'IT'];
            let proveedoresEncontrados = null;
            let paisEncontrado = "";
            
            for (let pais of paises) {
                if (results[pais] && results[pais].flatrate && results[pais].flatrate.length > 0) {
                    proveedoresEncontrados = results[pais].flatrate;
                    paisEncontrado = pais;
                    break;
                }
            }
            
            // Si no hay flatrate, buscar buy o rent
            if (!proveedoresEncontrados) {
                for (let pais of paises) {
                    if (results[pais]) {
                        if (results[pais].buy && results[pais].buy.length > 0) {
                            proveedoresEncontrados = results[pais].buy;
                            paisEncontrado = pais + " (compra)";
                            break;
                        } else if (results[pais].rent && results[pais].rent.length > 0) {
                            proveedoresEncontrados = results[pais].rent;
                            paisEncontrado = pais + " (alquiler)";
                            break;
                        }
                    }
                }
            }

            if (proveedoresEncontrados && proveedoresEncontrados.length > 0) {
                const plataformas = proveedoresEncontrados.slice(0, 6);
                plataformasHTML = `
                    <div class="plataformas">
                        <h3>📺 Disponible en ${paisEncontrado ? '(' + paisEncontrado + ')' : ''}:</h3>
                        <div class="plataformas-lista">
                            ${plataformas.map(p => `
                                <div class="plataforma-item">
                                    <img src="https://image.tmdb.org/t/p/original${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}" onerror="this.style.display='none'">
                                    <span>${p.provider_name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Si no hay datos de streaming, mostrar mensaje más útil
                const fechaEstreno = peli.release_date ? new Date(peli.release_date) : null;
                const hoy = new Date();
                const esEstreno = fechaEstreno && fechaEstreno > hoy;
                
                let mensajeExtra = "";
                if (esEstreno) {
                    mensajeExtra = `<br><span style="color: #FFD700;">🎬 Estreno el ${peli.release_date}</span>`;
                } else if (peli.status === "Released") {
                    mensajeExtra = `<br><span style="color: #aaa;">💿 Puede estar disponible en DVD/Blu-ray o plataformas no indexadas</span>`;
                }
                
                plataformasHTML = `
                    <div class="plataformas">
                        <h3>📺 Plataformas:</h3>
                        <p class="plataformas-mensaje">
                            No hay información de streaming disponible para esta película en nuestra base de datos.
                            ${mensajeExtra}
                        </p>
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

// ❤️ FAVORITOS - CORREGIDO
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
                // Añadir - ASEGURAR que posterPath se guarda correctamente
                const posterParaGuardar = posterPath ? String(posterPath).trim() : '';
                
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

// 📂 VER FAVORITOS - CORREGIDO con recuperación de imágenes
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
                document.getElementById("favModal").style.display = "block";
                document.body.style.overflow = "hidden";
                return;
            }

            // Recopilar todos los favoritos
            const favs = [];
            snapshot.forEach(doc => {
                let peli = doc.data();
                peli.docId = doc.id;
                favs.push(peli);
                favoritosCache.push(peli);
            });

            // Renderizar cada favorito
            favs.forEach(peli => {
                renderFavItem(peli, cont);
            });

            document.getElementById("favModal").style.display = "block";
            document.body.style.overflow = "hidden";
        })
        .catch(err => {
            console.error("Error cargando favoritos:", err);
            cont.innerHTML = "<p style='text-align:center; color:red;'>Error al cargar favoritos</p>";
        });
}

// Función para renderizar un item de favorito (con recuperación de imagen si falta)
function renderFavItem(peli, contenedor) {
    // Intentar construir URL de imagen
    let posterUrl = null;
    
    if (peli.posterPath && peli.posterPath.trim() !== "") {
        const path = peli.posterPath.trim();
        if (path.startsWith('/')) {
            posterUrl = `https://image.tmdb.org/t/p/w200${path}`;
        } else {
            posterUrl = `https://image.tmdb.org/t/p/w200/${path}`;
        }
    }
    
    // Si no hay posterPath, intentar recuperar de TMDB
    if (!posterUrl) {
        // Mostrar placeholder temporal y luego intentar recuperar
        contenedor.innerHTML += crearFavHTML(peli, null);
        recuperarPosterFavorito(peli, contenedor);
        return;
    }
    
    contenedor.innerHTML += crearFavHTML(peli, posterUrl);
}

// Crear HTML del favorito
function crearFavHTML(peli, posterUrl) {
    const tituloEscapado = peli.titulo.replace(/'/g, "\\'");
    
    if (posterUrl) {
        return `
            <div class="fav-item" id="fav-${peli.docId}">
                <img class="fav-poster" src="${posterUrl}" alt="${peli.titulo}" onerror="this.onerror=null; this.src='https://via.placeholder.com/60x90?text=No+Img';">
                <span>${peli.titulo}</span>
                <button onclick="eliminarFav('${peli.docId}')">🗑️</button>
                <button onclick="compartir('${tituloEscapado}')">📤</button>
            </div>
        `;
    } else {
        return `
            <div class="fav-item" id="fav-${peli.docId}">
                <div class="fav-poster-placeholder">🎬</div>
                <span>${peli.titulo}</span>
                <button onclick="eliminarFav('${peli.docId}')">🗑️</button>
                <button onclick="compartir('${tituloEscapado}')">📤</button>
            </div>
        `;
    }
}

// Intentar recuperar poster de TMDB si falta
function recuperarPosterFavorito(peli, contenedor) {
    fetch(`https://api.themoviedb.org/3/movie/${peli.peliculaId}?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => {
            if (data.poster_path) {
                // Actualizar en Firestore
                const db = firebase.firestore();
                db.collection("favoritos").doc(peli.docId).update({
                    posterPath: data.poster_path
                });
                
                // Actualizar en cache
                const favEnCache = favoritosCache.find(f => f.docId === peli.docId);
                if (favEnCache) favEnCache.posterPath = data.poster_path;
                
                // Actualizar en la UI si el modal está abierto
                const favElem = document.getElementById(`fav-${peli.docId}`);
                if (favElem) {
                    const placeholder = favElem.querySelector('.fav-poster-placeholder');
                    if (placeholder) {
                        const img = document.createElement('img');
                        img.className = 'fav-poster';
                        img.src = `https://image.tmdb.org/t/p/w200${data.poster_path}`;
                        img.alt = peli.titulo;
                        img.onerror = function() { this.src = 'https://via.placeholder.com/60x90?text=No+Img'; };
                        placeholder.replaceWith(img);
                    }
                }
            }
        })
        .catch(err => console.error("Error recuperando poster:", err));
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

// Estado de autenticación - CORREGIDO: inicial válida
firebase.auth().onAuthStateChanged(user => {
    const btn = document.getElementById("btnLogin");
    const dropdownEmail = document.getElementById("dropdownEmail");
    const dropdownAvatar = document.getElementById("dropdownAvatar");

    if (user) {
        // Usar función getInicial para obtener letra válida
        const inicial = getInicial(user.email);
        const photoURL = user.photoURL;
        
        if (photoURL) {
            btn.innerHTML = `<img src="${photoURL}" alt="Perfil">`;
            dropdownAvatar.src = photoURL;
        } else {
            // Generar avatar con la inicial correcta (no número)
            let avatarUrl = `https://ui-avatars.com/api/?name=${inicial}&background=FFD700&color=000&size=128&bold=true&font-size=0.5`;
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