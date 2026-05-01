const apiKey = "de78d773b36e035ae311fb891704fbfa";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

/* LOGIN STATE */
auth.onAuthStateChanged(user=>{
    if(user){
        btnLogin.style.display="none";
        avatarBtn.style.display="flex";
        avatarInitial.textContent=user.email[0].toUpperCase();
        menuEmail.textContent=user.email;
    }else{
        btnLogin.style.display="block";
        avatarBtn.style.display="none";
    }
});

/* BUSCAR */
function buscar(){
    const q=document.getElementById("search").value;

    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${q}`)
    .then(r=>r.json())
    .then(d=>mostrarPeliculas(d.results));
}

function mostrarPeliculas(pelis){
    const cont=document.getElementById("resultados");
    cont.innerHTML="";

    pelis.forEach(p=>{
        const div=document.createElement("div");
        div.className="pelicula";

        div.innerHTML=`
        <img src="https://image.tmdb.org/t/p/w200${p.poster_path}">
        <p>${p.title}</p>
        `;

        div.onclick=()=>verDetalle(p.id);

        cont.appendChild(div);
    });
}

/* DETALLE */
function verDetalle(id){
    fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&append_to_response=credits`)
    .then(r=>r.json())
    .then(p=>{

        document.getElementById("detalle").innerHTML=`
        <div class="detalle">
            <img src="https://image.tmdb.org/t/p/w300${p.poster_path}">
            <div>
                <h2>${p.title}</h2>
                <p>⭐ ${p.vote_average}</p>
                <p>${p.overview}</p>
            </div>
        </div>
        `;

        document.getElementById("modal").style.display="block";
    });
}

function cerrarModal(){
    modal.style.display="none";
}

/* LOGIN */
function abrirLogin(){
    loginModal.style.display="block";
}

function cerrarLogin(){
    loginModal.style.display="none";
}

function login(){
    auth.signInWithEmailAndPassword(email.value,password.value)
    .then(()=>cerrarLogin());
}

function registro(){
    auth.createUserWithEmailAndPassword(email.value,password.value)
    .then(()=>cerrarLogin());
}

/* USER MENU */
function toggleUserMenu(){
    userMenu.style.display=
    userMenu.style.display==="block"?"none":"block";
}

function cerrarSesion(){
    auth.signOut();
}

/* FAVORITOS */
function verFavoritos(){
    favoritosModal.style.display="block";

    const user=auth.currentUser;
    if(!user) return;

    db.collection("favoritos")
    .where("user","==",user.uid)
    .get()
    .then(snap=>{
        listaFavoritos.innerHTML="";

        snap.forEach(doc=>{
            const d=doc.data();

            listaFavoritos.innerHTML+=`
            <div>
                ${d.titulo}
                <button onclick="eliminarFavorito('${doc.id}')">🗑</button>
            </div>
            `;
        });
    });
}

function eliminarFavorito(id){
    db.collection("favoritos").doc(id).delete();
}

function cerrarFavoritos(){
    favoritosModal.style.display="none";
}