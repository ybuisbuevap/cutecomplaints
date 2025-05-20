import { database } from "./firebase-config.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("messageForm");

  if (!form) {
    console.error("Form not found!");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const message = document.getElementById("message").value.trim();

    if (name === "" || message === "") {
      alert("Please fill out both fields.");
      return;
    }

    push(ref(database, "messages"), {
      name: name,
      message: message,
      timestamp: Date.now()
    }).then(() => {
      alert("Message sent successfully 💌");
      form.reset();
    }).catch((error) => {
      alert("Error: " + error.message);
    });
  });
});



