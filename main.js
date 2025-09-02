   import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
    import { 
      getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
      signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup 
    } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
    import { getDatabase, ref, push, set, onChildAdded, onValue } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js';

    // Config Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyCQLvTVYek9q_4qGNG_DXQhVghhP3cu0s8",
      authDomain: "more-475ac.firebaseapp.com",
      databaseURL: "https://more-475ac-default-rtdb.firebaseio.com",
      projectId: "more-475ac",
      storageBucket: "more-475ac.appspot.com",
      messagingSenderId: "518653676423",
      appId: "1:518653676423:web:29dbeadaad7426ab36a122"
    };

    // Inicializa Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);

    // DOM Elements
    const loginModal = document.getElementById('login-modal');
    const btnSignup = document.getElementById('btn-signup');
    const btnSignin = document.getElementById('btn-signin');
    const btnGoogle = document.getElementById('btn-google');
    const authEmail = document.getElementById('auth-email');
    const authPass = document.getElementById('auth-pass');
    const btnLogout = document.getElementById('btn-logout');
    const userEmailDiv = document.getElementById('user-email');
    const messagesDiv = document.getElementById('messages');
    const form = document.getElementById('send-form');
    const txtMessage = document.getElementById('txt-message');
    const fileInput = document.getElementById('file-input');
    const eventForm = document.getElementById('event-form');
    const eventText = document.getElementById('event-text');
    const eventDate = document.getElementById('event-date');
    const eventsDiv = document.getElementById('events');
    const btnShareLoc = document.getElementById('btn-share-loc');
    const btnStopLoc = document.getElementById('btn-stop-loc');
    const btnClearChat = document.getElementById('btn-clear-chat');
    const sendBtn = document.getElementById('send-btn');
    const futureEventsDiv = document.getElementById('future-events');
    const pastEventsDiv = document.getElementById('past-events');

    // Função para formatar data no formato Dia/Mês/Ano
    function formatDateDMY(dateStr) {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // mês começa em 0
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }


    // Cloudinary configs
    const CLOUDINARY_UPLOAD_PRESET = 'yp5soqak';
    const CLOUDINARY_IMAGE_UPLOAD = 'https://api.cloudinary.com/v1_1/djh28wqul/image/upload';
    const CLOUDINARY_RAW_UPLOAD = 'https://api.cloudinary.com/v1_1/djh28wqul/raw/upload';

    // Estado do usuário e localização
    let me = null;
    let watchId = null;
    let myMarker = null;
    const otherMarkers = {};

    // Inicializa mapa
    const map = L.map('map').setView([-15.8, -47.9], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // Controla habilitação do botão Enviar (habilita só se tiver texto ou arquivo selecionado)
    function updateSendButton() {
      sendBtn.disabled = !txtMessage.value.trim() && !fileInput.files.length;
    }
    txtMessage.addEventListener('input', updateSendButton);
    fileInput.addEventListener('change', updateSendButton);

    // Upload arquivo no Cloudinary e retorna URL
    async function uploadFile(file) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const isImage = file.type.startsWith('image/');
      const uploadUrl = isImage ? CLOUDINARY_IMAGE_UPLOAD : CLOUDINARY_RAW_UPLOAD;

      try {
        const resp = await fetch(uploadUrl, { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('Falha no upload');
        const data = await resp.json();
        return data.secure_url;
      } catch(e) {
        alert('Erro ao enviar arquivo: ' + e.message);
        return null;
      }
    }

    // Enviar mensagem para Firebase
    async function sendMessage(text, fileUrl = null) {
      if (!me) return alert('Você precisa estar logado para enviar mensagens.');
      const message = {
        sender: me.email,
        text: text || '',
        timestamp: Date.now(),
        fileUrl: fileUrl || '',
      };
      const messagesRef = ref(db, 'messages');
      await push(messagesRef, message);
    }

    // Renderiza mensagens
let lastMessageDate = '';
  
function renderMessage(data, key) {
  const { sender, text, fileUrl, timestamp } = data;
  const messageDate = new Date(timestamp);

// Formatar data: dd/mm/aaaa
const day = messageDate.getDate().toString().padStart(2, '0');
const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
const year = messageDate.getFullYear();
const formattedDate = `${day}/${month}/${year}`;

// Formatar hora: hh:mm
const hours = messageDate.getHours().toString().padStart(2, '0');
const minutes = messageDate.getMinutes().toString().padStart(2, '0');
const formattedTime = `${hours}:${minutes}`;

// Se for uma nova data, adiciona um separador centralizado
if (formattedDate !== lastMessageDate) {
  const dateDiv = document.createElement('div');
  // Não faça dateDiv.textContent = formattedDate;

  dateDiv.style.display = 'flex';
  dateDiv.style.justifyContent = 'center';
  dateDiv.style.alignItems = 'center';
  dateDiv.style.margin = '16px 0 8px 0';

  const innerSpan = document.createElement('span');
  innerSpan.textContent = formattedDate;
  innerSpan.style.backgroundColor = '#e0e0e0';
  innerSpan.style.padding = '4px 12px';
  innerSpan.style.borderRadius = '12px';
  innerSpan.style.color = '#666';
  innerSpan.style.fontSize = '0.9em';
  innerSpan.style.fontWeight = 'bold';

  dateDiv.appendChild(innerSpan);
  messagesDiv.appendChild(dateDiv);
  lastMessageDate = formattedDate;
}



const div = document.createElement('div');

  div.classList.add('message');
  div.classList.add(sender === me.email ? 'own' : 'other');
  div.dataset.key = key; // guardar a chave da mensagem para exclusão

  const senderSpan = document.createElement('div');
  senderSpan.className = 'sender';
  senderSpan.textContent = sender === me.email ? 'Você' : sender;
  div.appendChild(senderSpan);

  // Botão de três pontinhos
  if (sender === me.email) {
    const optionsBtn = document.createElement('button');
    optionsBtn.textContent = '⋮'; // três pontinhos verticais
    optionsBtn.style.position = 'absolute';
    optionsBtn.style.top = '8px';
    optionsBtn.style.right = '8px';
    optionsBtn.style.background = 'transparent';
    optionsBtn.style.border = 'none';
    optionsBtn.style.cursor = 'pointer';
    optionsBtn.style.fontSize = '1.2rem';
    optionsBtn.title = 'Opções';

    // Criar menu suspenso
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.top = '30px';
    menu.style.right = '8px';
    menu.style.background = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 8px';
    menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    menu.style.display = 'none';
    menu.style.zIndex = '100';

    const deleteOption = document.createElement('div');
    deleteOption.textContent = 'Excluir';
    deleteOption.style.cursor = 'pointer';
    deleteOption.style.color = '#E53935';
    deleteOption.style.fontWeight = '600';

    menu.appendChild(deleteOption);
    div.style.position = 'relative';
    div.appendChild(optionsBtn);
    div.appendChild(menu);

    optionsBtn.addEventListener('click', e => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    // Fecha o menu ao clicar fora
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    // Ação excluir
    deleteOption.addEventListener('click', async () => {
      if (confirm('Quer realmente excluir esta mensagem?')) {
        const msgKey = div.dataset.key;
        if (msgKey) {
          const messageRef = ref(db, `messages/${msgKey}`);
          await set(messageRef, null);
          div.remove();
        }
      }
    });
  }

  if (text) {
    const textSpan = document.createElement('div');
    textSpan.textContent = text;
    div.appendChild(textSpan);
  }

  if (fileUrl) {
    if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(fileUrl)) {
      // Imagem inline clicável
      const img = document.createElement('img');
      img.src = fileUrl;
      img.alt = "Imagem enviada";
      img.title = "Clique para ampliar";
      img.addEventListener('click', () => window.open(fileUrl, '_blank'));
      div.appendChild(img);
    } else {
      // Link arquivo
      const a = document.createElement('a');
      a.href = fileUrl;
      a.target = "_blank";
      a.textContent = 'Arquivo anexado';
      a.className = 'file-link';
      div.appendChild(a);
    }
  }

  const timeSpan = document.createElement('div');
  timeSpan.textContent = formattedTime;
  timeSpan.style.fontSize = '0.75em';
  timeSpan.style.color = '#666';
  timeSpan.style.textAlign = 'right';
  timeSpan.style.marginTop = '6px';
  div.appendChild(timeSpan);

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


    // Ouve mensagens no Firebase
    function listenMessages() {
      const messagesRef = ref(db, 'messages');
      onChildAdded(messagesRef, snapshot => {
        renderMessage(snapshot.val(), snapshot.key);
      });

    }

    // Envia mensagem do formulário
    form.addEventListener('submit', async e => {
      e.preventDefault();
      sendBtn.disabled = true;

      let fileUrl = null;
      if (fileInput.files.length) {
        const file = fileInput.files[0];
        fileUrl = await uploadFile(file);
      }
      const text = txtMessage.value.trim();

      if (!text && !fileUrl) {
        sendBtn.disabled = false;
        return alert('Digite uma mensagem ou escolha um arquivo');
      }

      await sendMessage(text, fileUrl);

      // limpa
      txtMessage.value = '';
      fileInput.value = '';
      updateSendButton();
      sendBtn.disabled = false;
    });

    // Compartilhar localização
    btnShareLoc.addEventListener('click', () => {
      if (!navigator.geolocation) return alert('Geolocalização não suportada');
      btnShareLoc.disabled = true;

      watchId = navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        if (!myMarker) {
          myMarker = L.marker([latitude, longitude], {title: 'Você'});
          myMarker.addTo(map);
          map.setView([latitude, longitude], 15);
        } else {
          myMarker.setLatLng([latitude, longitude]);
        }
        // Envia localização no chat
        sendMessage(`Minha localização: https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`);

      }, err => {
        alert('Erro ao obter localização: ' + err.message);
        btnShareLoc.disabled = false;
      }, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000
      });
    });

    btnStopLoc.addEventListener('click', () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        if (myMarker) {
          map.removeLayer(myMarker);
          myMarker = null;
        }
        btnShareLoc.disabled = false;
      }
    });

    // Apagar conversa
    btnClearChat.addEventListener('click', async () => {
      if (!confirm('Quer realmente apagar toda a conversa?')) return;
      if (!me) return alert('Você precisa estar logado para apagar a conversa.');

      const messagesRef = ref(db, 'messages');
      await set(messagesRef, null);
      messagesDiv.innerHTML = '';
    });

    // Eventos do calendário
    eventForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!me) return alert('Você precisa estar logado para salvar eventos');
      const text = eventText.value.trim();
      const date = eventDate.value;

      if (!text || !date) return alert('Preencha texto e data');
      const eventsRef = ref(db, 'events');
      await push(eventsRef, {
        owner: me.email,
        text,
        date,
        timestamp: Date.now()
      });
      eventText.value = '';
      eventDate.value = '';
    });

    // Renderiza eventos
function renderEvents(events) {
  futureEventsDiv.innerHTML = '<h3 style="font-weight:bold;">Eventos Futuros</h3>';
  pastEventsDiv.innerHTML = '<h3 style="font-weight:bold;">Eventos Passados</h3>';

  const now = new Date();

  const futureEvents = events.filter(e => new Date(e.date) >= now);
  const pastEvents = events.filter(e => new Date(e.date) < now);

  // Eventos futuros com menu suspenso
  futureEvents.forEach(ev => {
    const eventEl = document.createElement('div');
    eventEl.style.border = '1px solid #ddd';
    eventEl.style.padding = '8px';
    eventEl.style.marginBottom = '6px';
    eventEl.style.position = 'relative';

    eventEl.innerHTML = `
      <span><b>${formatDateDMY(ev.date)}</b>: ${ev.text} <span style="font-size:0.8em; color:#666;">(${ev.owner === me.email ? 'Você' : ev.owner})</span></span>
      <button class="menu-btn" style="position:absolute; right:8px; top:8px; background:none; border:none; cursor:pointer; font-size:18px; color:#333;">⋮</button>
      <div class="menu" style="display:none; position:absolute; right:8px; top:30px; background:#fff; border:1px solid #ccc; border-radius:4px; z-index:100; min-width:100px;">
        <button class="edit-btn" style="width:100%; border:none; background:none; padding:6px; text-align:left; cursor:pointer;color:#777;">Editar</button>
        <button class="delete-btn" style="width:100%; border:none; background:none; padding:6px; text-align:left; cursor:pointer; color:#E53935;">Excluir</button>
      </div>
    `;

    const menuBtn = eventEl.querySelector('.menu-btn');
    const menu = eventEl.querySelector('.menu');

    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('#future-events .menu').forEach(m => { if(m !== menu) m.style.display = 'none'; });
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

eventEl.querySelector('.edit-btn').addEventListener('click', () => {
  eventText.value = ev.text;
  eventDate.value = ev.date;

  if (ev.key) {
    const eventRef = ref(db, 'events/' + ev.key);
    set(eventRef, null);
  }
  menu.style.display = 'none';

  const calendarDiv = document.querySelector('calendar-container'); // selecione seu div do calendário de forma específica, veja abaixo
  calendarDiv.classList.add('blink-border');

  // Remove a classe após a animação (2 piscadas de 1s = 2s)
  setTimeout(() => {
    calendarDiv.classList.remove('blink-border');
  }, 2000);
});


    eventEl.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm('Quer realmente excluir este evento?')) {
        if (ev.key) {
          const eventRef = ref(db, 'events/' + ev.key);
          await set(eventRef, null);
        }
      }
      menu.style.display = 'none';
    });

    futureEventsDiv.appendChild(eventEl);
  });

  // Eventos passados com botão de excluir simples
  pastEvents.forEach(ev => {
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid #eee';
    div.style.padding = '6px 0';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';

    const textSpan = document.createElement('span');
    textSpan.textContent = `${formatDateDMY(ev.date)} - ${ev.text} (${ev.owner === me.email ? 'Você' : ev.owner})`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Excluir';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.border = 'none';
    deleteBtn.style.color = '#E53935';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontWeight = '600';

    deleteBtn.addEventListener('click', async () => {
      if (confirm('Quer realmente excluir este evento?')) {
        if (ev.key) {
          const eventRef = ref(db, 'events/' + ev.key);
          await set(eventRef, null);
        }
      }
    });

    div.appendChild(textSpan);
    div.appendChild(deleteBtn);

    pastEventsDiv.appendChild(div);
  });
}


    // Ouve eventos
function listenEvents() {
  const eventsRef = ref(db, 'events');
  onValue(eventsRef, snapshot => {
    const data = snapshot.val();
    if (!data) {
      renderEvents([]);
      return;
    }
    // Inclui a chave de cada evento (para editar/excluir)
    const evs = Object.entries(data).map(([key, ev]) => ({ ...ev, key }));
    renderEvents(evs);
  });
}


    // Login e autenticação
    btnSignup.addEventListener('click', () => {
      const email = authEmail.value.trim();
      const pass = authPass.value.trim();
      if (!email || !pass) return alert('Preencha email e senha');
      createUserWithEmailAndPassword(auth, email, pass)
        .then(userCredential => {
          alert('Conta criada com sucesso!');
          authEmail.value = '';
          authPass.value = '';
        })
        .catch(err => alert('Erro: ' + err.message));
    });

    btnSignin.addEventListener('click', () => {
      const email = authEmail.value.trim();
      const pass = authPass.value.trim();
      if (!email || !pass) return alert('Preencha email e senha');
      signInWithEmailAndPassword(auth, email, pass)
        .catch(err => alert('Erro: ' + err.message));
    });

    btnGoogle.addEventListener('click', () => {
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider)
        .catch(err => alert('Erro: ' + err.message));
    });

    btnLogout.addEventListener('click', () => {
      signOut(auth);
    });

    // Escuta o estado de login
    onAuthStateChanged(auth, user => {
      me = user;
      if (user) {
        userEmailDiv.textContent = user.email;
        document.getElementById('user-avatar-container').style.display = 'block';
        loginModal.style.display = 'none';
        listenMessages();
        listenEvents();
      } else {
        me = null;
        userEmailDiv.textContent = '';
        document.getElementById('user-avatar-container').style.display = 'none';
        loginModal.style.display = 'flex';
        messagesDiv.innerHTML = '';
        eventsDiv.innerHTML = '';
      }
    });

//MENU HAMBURGUER
const menuToggle = document.getElementById('menu-toggle');
const aside = document.querySelector('aside');
const body = document.body;

menuToggle.addEventListener('click', () => {
  aside.classList.toggle('open');
  body.classList.toggle('menu-open');
  
  // animação do hambúrguer (opcional)
  menuToggle.classList.toggle('open');
});




//NOVO PARA AVATAR
const userAvatar = document.getElementById('user-avatar');
const userMenu = document.getElementById('user-menu');

// Alterna o menu ao clicar no avatar
userAvatar.addEventListener('click', (e) => {
  e.stopPropagation(); // Evita fechar imediatamente
  userMenu.style.display = userMenu.style.display === 'block' ? 'none' : 'block';
});

// Fecha o menu ao clicar fora
document.addEventListener('click', () => {
  userMenu.style.display = 'none';
});

// Impede o clique dentro do menu de fechá-lo
userMenu.addEventListener('click', (e) => {
  e.stopPropagation();
});
