const apiKey = "de78d773b36e035ae311fb891704fbfa";

// AUTH
firebase.auth().onAuthStateChanged(user => {
    const btn = document.getElementById("btnLogin");
    const avatar = document.getElementById("avatar");

    if(user){
        btn.style.display="none";
        avatar.style.display="flex";
        avatar.innerText = user.email[0].toUpperCase();
        document.getElementById("userEmail").innerText = user.email;
    }else{
        btn.style.display="block";
        avatar.style.display="none";
    }
});

function toggleMenu(){
    const menu = document.getElementById("menuUser");
    menu.style.display = menu.style.display==="block"?"none":"block";
}

function cerrarSesion(){
    firebase.auth().signOut();
}

// LOGIN
function abrirLogin(){ loginModal.style.display="block"; }
function cerrarLogin(){ loginModal.style.display="none"; }

function registro(){
    firebase.auth().createUserWithEmailAndPassword(email.value,password.value)
    .then(()=>cerrarLogin());
}

function login(){
    firebase.auth().signInWithEmailAndPassword(email.value,password.value)
    .then(()=>cerrarLogin());
}

// BUSCAR
function buscar(){
    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${search.value}&language=es-ES`)
    .then(r=>r.json())
    .then(d=>mostrarPeliculas(d.results));
}

// MOSTRAR
function mostrarPeliculas(pelis){
    resultados.innerHTML="";
    pelis.forEach(p=>{
        let poster = p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}`:"";

        resultados.innerHTML+=`
        <div class="pelicula">
            <span class="corazon" onclick="toggleFavorito(event,${p.id},'${p.title}',this)">🤍</span>
            <div onclick="verDetalle(${p.id})">
                <img src="${poster}">
                <p>${p.title}</p>
            </div>
        </div>`;
    });
}

// DETALLE PRO
function verDetalle(id){
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-ES&append_to_response=credits`)
    .then(r=>r.json())
    .then(p=>{
        let actores = p.credits.cast.slice(0,5).map(a=>a.name).join(", ");
        let estrellas = "⭐".repeat(Math.round(p.vote_average/2));

        detalle.innerHTML=`
            <img src="https://image.tmdb.org/t/p/w500${p.poster_path}">
            <div>
                <h2>${p.title}</h2>
                <p><b>Año:</b> ${p.release_date}</p>
                <p><b>Actores:</b> ${actores}</p>
                <p><b>Nota:</b> ${estrellas}</p>
                <p>${p.overview}</p>
            </div>
        `;
        modal.style.display="block";
    });
}

function cerrarModal(){ modal.style.display="none"; }

// FAVORITOS
function toggleFavorito(e,id,titulo,el){
    e.stopPropagation();
    let user=firebase.auth().currentUser;
    if(!user){ abrirLogin(); return; }

    let db=firebase.firestore();

    db.collection("favoritos")
    .where("user","==",user.uid)
    .where("peliculaId","==",id)
    .get()
    .then(s=>{
        if(!s.empty){
            s.forEach(doc=>db.collection("favoritos").doc(doc.id).delete());
            el.innerText="🤍";
        }else{
            db.collection("favoritos").add({user:user.uid,peliculaId:id,titulo});
            el.innerText="❤️";
        }
    });
}

function verFavoritos(){
    let user=firebase.auth().currentUser;
    if(!user){ abrirLogin(); return; }

    listaFavoritos.innerHTML="";

    firebase.firestore().collection("favoritos")
    .where("user","==",user.uid)
    .get()
    .then(s=>{
        s.forEach(doc=>{
            listaFavoritos.innerHTML+=`<p>${doc.data().titulo}</p>`;
        });
    });

    favoritosModal.style.display="block";
}

function cerrarFavoritos(){ favoritosModal.style.display="none"; }

// INICIO
window.onload=()=>{
fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=es-ES`)
.then(r=>r.json())
.then(d=>mostrarPeliculas(d.results));
};