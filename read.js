document.addEventListener("DOMContentLoaded", function () {
  const messageList = document.getElementById("messageList");
  const loginBox = document.getElementById("loginBox");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtn");
  const loginError = document.getElementById("loginError");
  const markSeenBtn = document.getElementById("markSeenBtn");

  let unsubscribe = null;

  // Try to use a saved session first; Firebase persists login by default,
  // so after the first successful login you usually won't see this form again
  // on the same browser.
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      loginBox.style.display = "none";
      messageList.style.display = "block";
      markSeenBtn.style.display = "block";
      startListening();
      updateLastSeen(); // mark seen as soon as you open and log into this page
    } else {
      loginBox.style.display = "block";
      messageList.style.display = "none";
      markSeenBtn.style.display = "none";
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    }
  });

  loginBtn.addEventListener("click", function () {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginError.textContent = "";

    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch((error) => {
        loginError.textContent = "Login failed: " + error.message;
      });
  });

  function updateLastSeen() {
    firebase.database().ref("lastSeen").set(Date.now()).catch((err) => {
      console.error("Couldn't update last seen:", err.message);
    });
  }

  markSeenBtn.addEventListener("click", updateLastSeen);

  function renderMessage({ message, audio, audioType, timestamp, key }) {
    const li = document.createElement("li");
    const date = new Date(timestamp).toLocaleString();

    let contentHtml = "";
    if (message) {
      contentHtml += `<div class="message-text">${escapeHtml(message)}</div>`;
    }
    if (audio) {
      contentHtml += `<audio controls src="${audio}" type="${audioType || "audio/webm"}"></audio>`;
    }

    li.innerHTML = `
      ${contentHtml}
      <span class="timestamp">${date}</span>
      <button class="delete-btn" onclick="deleteMessage('${key}')">×</button>
    `;
    return li;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function startListening() {
    const messagesRef = firebase.database().ref("messages");

    const callback = (snapshot) => {
      messageList.innerHTML = "";

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        const key = childSnapshot.key;
        messages.push({ ...data, key });
      });

      messages.reverse().forEach((msg) => {
        messageList.appendChild(renderMessage(msg));
      });
    };

    const errorCallback = (error) => {
      messageList.innerHTML = `<li>Error: ${error.message}</li>`;
    };

    messagesRef.orderByChild("timestamp").on("value", callback, errorCallback);

    unsubscribe = () => messagesRef.off("value", callback);
  }

  window.deleteMessage = function (id) {
    if (confirm("Delete this message?")) {
      firebase.database().ref("messages").child(id).remove()
        .then(() => alert("Message deleted"))
        .catch(err => alert("Error deleting message: " + err.message));
    }
  };
});
