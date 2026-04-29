const apiKey = "TU_API_KEY";
const db = () => firebase.firestore();
const auth = () => firebase.auth();

let favoritosIds = new Set();

// AUTH
auth().onAuthStateChanged(user => {
    if (user) {
        cargarFavoritosIds(user.uid);
    } else {
        favoritosIds.clear();
    }
});

// LOGIN
function registro() {
    auth().createUserWithEmailAndPassword(email.value, password.value)
        .catch(e => mostrarError(e.code));
}

function login() {
    auth().signInWithEmailAndPassword(email.value, password.value)
        .then(() => cerrarLogin())
        .catch(e => mostrarError(e.code));
}

function mostrarError(code) {
    authError.style.display = "block";
    authError.textContent = code;
}

// FAVORITOS
function cargarFavoritosIds(uid) {
    db().collection("favoritos").where("user","==",uid)
    .onSnapshot(snap=>{
        favoritosIds.clear();
        snap.forEach(doc=>favoritosIds.add(doc.data().peliculaId));
    });
}

function toggleFavorito(e,id,titulo,poster,el){
    e.stopPropagation();
    const user = auth().currentUser;
    if(!user) return;

    db().collection("favoritos")
    .where("user","==",user.uid)
    .where("peliculaId","==",id)
    .get()
    .then(snap=>{
        if(!snap.empty){
            snap.forEach(doc=>db().collection("favoritos").doc(doc.id).delete());
        }else{
            db().collection("favoritos").add({
                user:user.uid,
                peliculaId:id,
                titulo,
                poster
            });
        }
    });
}

// BUSCAR
function buscar(){
    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${search.value}`)
    .then(r=>r.json())
    .then(d=>mostrarPeliculas(d.results));
}

function mostrarPeliculas(pelis){
    resultados.innerHTML="";
    pelis.forEach(p=>{
        resultados.innerHTML+=`
        <div class="pelicula">
            <span class="corazon" onclick="toggleFavorito(event,${p.id},'${p.title}','${p.poster_path}',this)">🤍</span>
            <img src="https://image.tmdb.org/t/p/w200${p.poster_path}">
            <p>${p.title}</p>
        </div>`;
    });
}