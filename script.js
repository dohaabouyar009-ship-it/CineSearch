const apiKey = "de78d773b36e035ae311fb891704fbfa";
let favoritosCache = [];
let generoActual = 0;
let peliculaParaRecomendar = null;

function getInicial(email) {
    if (!email) return "U";
    const nombre = email.split('@')[0];
    for (let char of nombre) {
        if (/[a-zA-Z]/.test(char)) {
            return char.toUpperCase();
        }
    }
    const dominio = email.split('@')[1] || "";
    for (let char of dominio) {
        if (/[a-zA-Z]/.test(char)) {
            return char.toUpperCase();
        }
    }
    return "U";
}

function filtrarPorGenero(generoId) {
    document.querySelectorAll('.genero-btn').forEach(btn => {
        btn.classList.remove('activo');
    });
    event.target.classList.add('activo');
    
    generoActual = generoId;
    
    if (generoId === 0) {
        cargarPopulares();
    } else {
        fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_genres=${generoId}&language=es-ES&sort_by=popularity.desc`)
            .then(res => res.json())
            .then(data => mostrarPeliculas(data.results || []))
            .catch(err => {
                console.error("Error filtrando género:", err);
                alert("Error al cargar películas de este género");
            });
    }
}

function mostrarPeliculas(peliculas) {
    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "";

    if (!peliculas || peliculas.length === 0) {
        contenedor.innerHTML = "<p style='width:100%; padding: 40px; font-size: 18px; color: #888;'>No se encontraron películas 😕</p>";
        return;
    }

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

function buscar() {
    const query = document.getElementById("search").value.trim();
    if (!query) return;

    document.querySelectorAll('.genero-btn').forEach(btn => {
        btn.classList.remove('activo');
    });

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-ES`)
        .then(res => res.json())
        .then(data => mostrarPeliculas(data.results || []))
        .catch(err => console.error("Error buscando:", err));
}

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

            // Guardar para recomendar
            peliculaParaRecomendar = {
                id: peli.id,
                title: peli.title,
                posterPath: peli.poster_path || ''
            };

            let plataformasHTML = "";
            const results = providersData.results || {};
            
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

            // Botón recomendar solo si está logueado
            const user = firebase.auth().currentUser;
            const btnRecomendar = user ? 
                `<button onclick="abrirRecomendar()" style="margin-top:15px; background:#ff6b6b; color:white;">🎬 Recomendar a un amigo</button>` : '';

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
                        ${btnRecomendar}
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
    peliculaParaRecomendar = null;
}

// ❤️ FAVORITOS
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
                snapshot.forEach(doc => {
                    db.collection("favoritos").doc(doc.id).delete();
                });
                
                corazonElem.innerText = "🤍";
                corazonElem.classList.remove("activo");
                favoritosCache = favoritosCache.filter(f => f.peliculaId !== id);
            } else {
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

            const favs = [];
            snapshot.forEach(doc => {
                let peli = doc.data();
                peli.docId = doc.id;
                favs.push(peli);
                favoritosCache.push(peli);
            });

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

function renderFavItem(peli, contenedor) {
    let posterUrl = null;
    
    if (peli.posterPath && peli.posterPath.trim() !== "") {
        const path = peli.posterPath.trim();
        if (path.startsWith('/')) {
            posterUrl = `https://image.tmdb.org/t/p/w200${path}`;
        } else {
            posterUrl = `https://image.tmdb.org/t/p/w200/${path}`;
        }
    }
    
    if (!posterUrl) {
        contenedor.innerHTML += crearFavHTML(peli, null);
        recuperarPosterFavorito(peli, contenedor);
        return;
    }
    
    contenedor.innerHTML += crearFavHTML(peli, posterUrl);
}

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

function recuperarPosterFavorito(peli, contenedor) {
    fetch(`https://api.themoviedb.org/3/movie/${peli.peliculaId}?api_key=${apiKey}&language=es-ES`)
        .then(res => res.json())
        .then(data => {
            if (data.poster_path) {
                const db = firebase.firestore();
                db.collection("favoritos").doc(peli.docId).update({
                    posterPath: data.poster_path
                });
                
                const favEnCache = favoritosCache.find(f => f.docId === peli.docId);
                if (favEnCache) favEnCache.posterPath = data.poster_path;
                
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
            else if (generoActual === 0) cargarPopulares();
            else filtrarPorGenero(generoActual);
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

// ========== SISTEMA DE AMIGOS ==========

// Buscar usuario por email para añadir como amigo
function buscarUsuario() {
    const email = document.getElementById("buscarAmigo").value.trim();
    const user = firebase.auth().currentUser;
    
    if (!user) {
        alert("Debes iniciar sesión");
        return;
    }
    
    if (!email || email === user.email) {
        alert("Introduce un email válido diferente al tuyo");
        return;
    }

    const resultadoDiv = document.getElementById("resultadoBusqueda");
    resultadoDiv.innerHTML = "<p>Buscando...</p>";

    // Buscar en Firebase Auth no es posible directamente, así que buscamos en una colección de usuarios
    // Primero verificar si ya existe en amigos
    firebase.firestore().collection("amigos")
        .where("user", "==", user.uid)
        .where("amigoEmail", "==", email)
        .get()
        .then(snapshot => {
            if (!snapshot.empty) {
                resultadoDiv.innerHTML = "<p style='color: #FFD700;'>✅ Ya sois amigos</p>";
                return;
            }
            
            // Buscar si el usuario existe en nuestra base de datos de usuarios
            firebase.firestore().collection("usuarios").where("email", "==", email).get()
                .then(userSnapshot => {
                    if (userSnapshot.empty) {
                        resultadoDiv.innerHTML = "<p style='color: #ff6b6b;'>❌ Usuario no encontrado. Asegúrate de que tu amigo ya se ha registrado en CineSearch.</p>";
                        return;
                    }
                    
                    const usuarioEncontrado = userSnapshot.docs[0].data();
                    const uidAmigo = userSnapshot.docs[0].id;
                    
                    resultadoDiv.innerHTML = `
                        <div class="amigo-item">
                            <img class="amigo-avatar" src="https://ui-avatars.com/api/?name=${getInicial(email)}&background=FFD700&color=000&size=128" alt="${email}">
                            <div class="amigo-info">
                                <strong>${email}</strong>
                            </div>
                            <button onclick="enviarSolicitud('${uidAmigo}', '${email}')">➕ Añadir</button>
                        </div>
                    `;
                });
        })
        .catch(err => {
            console.error("Error buscando usuario:", err);
            resultadoDiv.innerHTML = "<p style='color: red;'>Error al buscar</p>";
        });
}

// Enviar solicitud de amistad (o añadir directamente)
function enviarSolicitud(uidAmigo, emailAmigo) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const db = firebase.firestore();
    
    // Añadir amigo para el usuario actual
    db.collection("amigos").add({
        user: user.uid,
        amigoId: uidAmigo,
        amigoEmail: emailAmigo,
        fecha: new Date()
    }).then(() => {
        // Añadir amigo para el otro usuario (bidireccional)
        db.collection("amigos").add({
            user: uidAmigo,
            amigoId: user.uid,
            amigoEmail: user.email,
            fecha: new Date()
        }).then(() => {
            alert("✅ ¡Amigo añadido correctamente!");
            document.getElementById("resultadoBusqueda").innerHTML = "";
            document.getElementById("buscarAmigo").value = "";
            cargarAmigos();
        });
    }).catch(err => {
        console.error("Error añadiendo amigo:", err);
        alert("Error al añadir amigo");
    });
}

// Cargar lista de amigos
function cargarAmigos() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const lista = document.getElementById("listaAmigos");
    lista.innerHTML = "<p>Cargando amigos...</p>";

    firebase.firestore().collection("amigos")
        .where("user", "==", user.uid)
        .get()
        .then(snapshot => {
            lista.innerHTML = "";
            
            if (snapshot.empty) {
                lista.innerHTML = "<p style='color: #888;'>No tienes amigos aún. Busca usuarios por email para añadirlos.</p>";
                return;
            }

            snapshot.forEach(doc => {
                const amigo = doc.data();
                const inicial = getInicial(amigo.amigoEmail);
                
                lista.innerHTML += `
                    <div class="amigo-item">
                        <img class="amigo-avatar" src="https://ui-avatars.com/api/?name=${inicial}&background=FFD700&color=000&size=128" alt="${amigo.amigoEmail}">
                        <div class="amigo-info">
                            <strong>${amigo.amigoEmail}</strong>
                            <span>Amigo desde ${amigo.fecha ? new Date(amigo.fecha.toDate()).toLocaleDateString() : 'recientemente'}</span>
                        </div>
                        <button onclick="eliminarAmigo('${doc.id}')" style="background:#ff4444; color:white;">🗑️</button>
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error("Error cargando amigos:", err);
            lista.innerHTML = "<p style='color: red;'>Error al cargar amigos</p>";
        });
}

function eliminarAmigo(docId) {
    if (!confirm("¿Seguro que quieres eliminar este amigo?")) return;
    
    firebase.firestore().collection("amigos").doc(docId).delete()
        .then(() => {
            alert("Amigo eliminado");
            cargarAmigos();
        })
        .catch(err => {
            console.error("Error eliminando amigo:", err);
            alert("Error al eliminar amigo");
        });
}

// ========== RECOMENDACIONES ==========

function abrirRecomendar() {
    if (!peliculaParaRecomendar) return;
    
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Debes iniciar sesión");
        return;
    }

    document.getElementById("peliRecomendar").innerHTML = `
        <strong style="color: #FFD700; font-size: 18px;">${peliculaParaRecomendar.title}</strong>
    `;
    
    // Cargar amigos para recomendar
    const lista = document.getElementById("listaAmigosRecomendar");
    lista.innerHTML = "<p>Cargando amigos...</p>";

    firebase.firestore().collection("amigos")
        .where("user", "==", user.uid)
        .get()
        .then(snapshot => {
            lista.innerHTML = "";
            
            if (snapshot.empty) {
                lista.innerHTML = "<p style='color: #888;'>No tienes amigos para recomendar. Añade amigos primero.</p>";
            } else {
                snapshot.forEach(doc => {
                    const amigo = doc.data();
                    const inicial = getInicial(amigo.amigoEmail);
                    
                    lista.innerHTML += `
                        <div class="amigo-item" style="cursor: pointer;" onclick="enviarRecomendacion('${amigo.amigoId}', '${amigo.amigoEmail}')">
                            <img class="amigo-avatar" src="https://ui-avatars.com/api/?name=${inicial}&background=FFD700&color=000&size=128" alt="${amigo.amigoEmail}">
                            <div class="amigo-info">
                                <strong>${amigo.amigoEmail}</strong>
                            </div>
                            <button>📤 Enviar</button>
                        </div>
                    `;
                });
            }
            
            document.getElementById("recomendarModal").style.display = "block";
        })
        .catch(err => {
            console.error("Error cargando amigos:", err);
            lista.innerHTML = "<p style='color: red;'>Error</p>";
        });
}

function enviarRecomendacion(amigoId, amigoEmail) {
    const user = firebase.auth().currentUser;
    if (!user || !peliculaParaRecomendar) return;

    const db = firebase.firestore();
    
    // Guardar recomendación
    db.collection("recomendaciones").add({
        de: user.uid,
        deEmail: user.email,
        para: amigoId,
        paraEmail: amigoEmail,
        peliculaId: peliculaParaRecomendar.id,
        peliculaTitulo: peliculaParaRecomendar.title,
        peliculaPoster: peliculaParaRecomendar.posterPath,
        fecha: new Date(),
        visto: false
    }).then(() => {
        alert(`✅ ¡Recomendación enviada a ${amigoEmail}!`);
        cerrarRecomendar();
    }).catch(err => {
        console.error("Error enviando recomendación:", err);
        alert("Error al enviar recomendación");
    });
}

function cerrarRecomendar() {
    document.getElementById("recomendarModal").style.display = "none";
}

// Cargar recomendaciones recibidas
function cargarRecomendaciones() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const lista = document.getElementById("listaRecomendaciones");
    lista.innerHTML = "<p>Cargando...</p>";

    firebase.firestore().collection("recomendaciones")
        .where("para", "==", user.uid)
        .orderBy("fecha", "desc")
        .get()
        .then(snapshot => {
            lista.innerHTML = "";
            
            if (snapshot.empty) {
                lista.innerHTML = "<p style='color: #888;'>No tienes recomendaciones pendientes.</p>";
                return;
            }

            snapshot.forEach(doc => {
                const rec = doc.data();
                const poster = rec.peliculaPoster ? 
                    `https://image.tmdb.org/t/p/w200${rec.peliculaPoster}` : 
                    "https://via.placeholder.com/50x75?text=🎬";
                
                lista.innerHTML += `
                    <div class="recomendacion-item" id="rec-${doc.id}">
                        <img src="${poster}" alt="${rec.peliculaTitulo}" onerror="this.src='https://via.placeholder.com/50x75?text=🎬'">
                        <div class="recomendacion-info">
                            <strong>${rec.peliculaTitulo}</strong>
                            <small>Recomendada por: ${rec.deEmail}</small>
                            <small>${rec.fecha ? new Date(rec.fecha.toDate()).toLocaleDateString() : ''}</small>
                        </div>
                        <button onclick="verDetalle(${rec.peliculaId}); marcarVisto('${doc.id}')" style="background:#FFD700; color:#000;">👁️ Ver</button>
                        <button onclick="eliminarRecomendacion('${doc.id}')" style="background:#ff4444; color:white;">🗑️</button>
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error("Error cargando recomendaciones:", err);
            lista.innerHTML = "<p style='color: red;'>Error al cargar recomendaciones</p>";
        });
}

function marcarVisto(docId) {
    firebase.firestore().collection("recomendaciones").doc(docId).update({
        visto: true
    }).catch(err => console.error("Error marcando visto:", err));
}

function eliminarRecomendacion(docId) {
    firebase.firestore().collection("recomendaciones").doc(docId).delete()
        .then(() => {
            const elem = document.getElementById(`rec-${docId}`);
            if (elem) elem.remove();
        })
        .catch(err => console.error("Error eliminando recomendación:", err));
}

// ========== MODALES AMIGOS ==========

function verAmigos() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Debes iniciar sesión primero 👥");
        abrirLogin();
        return;
    }

    cargarAmigos();
    cargarRecomendaciones();
    document.getElementById("amigosModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function cerrarAmigos() {
    document.getElementById("amigosModal").style.display = "none";
    document.body.style.overflow = "auto";
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
        .then((userCredential) => {
            // Guardar usuario en colección de usuarios para poder buscarlo
            const db = firebase.firestore();
            db.collection("usuarios").doc(userCredential.user.uid).set({
                email: email,
                uid: userCredential.user.uid,
                fechaRegistro: new Date()
            }, { merge: true });
            
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
        .then((userCredential) => {
            // Guardar nuevo usuario en colección
            const db = firebase.firestore();
            db.collection("usuarios").doc(userCredential.user.uid).set({
                email: email,
                uid: userCredential.user.uid,
                fechaRegistro: new Date()
            });
            
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
        const inicial = getInicial(user.email);
        const photoURL = user.photoURL;
        
        if (photoURL) {
            btn.innerHTML = `<img src="${photoURL}" alt="Perfil">`;
            dropdownAvatar.src = photoURL;
        } else {
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
            else if (generoActual === 0) cargarPopulares();
            else {
                fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_genres=${generoActual}&language=es-ES&sort_by=popularity.desc`)
                    .then(res => res.json())
                    .then(data => mostrarPeliculas(data.results || []));
            }
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