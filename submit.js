import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig } from './firebase-config.js'; // make sure this is the right path

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const form = document.getElementById('complaintForm');
form.addEventListener('submit', function(e) {
  e.preventDefault();
  const message = document.getElementById('message').value;
  push(ref(database, 'messages'), { text: message })
    .then(() => {
      alert('Message sent!');
      form.reset();
    })
    .catch((err) => {
      alert('Error: ' + err.message);
    });
});




