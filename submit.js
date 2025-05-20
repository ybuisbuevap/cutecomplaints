document.getElementById("messageForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // Get input values
  const name = document.getElementById("name").value.trim();
  const message = document.getElementById("message").value.trim();

  if (name === "" || message === "") {
    alert("Please fill out both fields.");
    return;
  }

  // Save to Firebase
  firebase.database().ref("messages").push({
    name: name,
    message: message,
    timestamp: Date.now()
  }).then(() => {
    alert("Message sent successfully 💌");
    document.getElementById("messageForm").reset();
  }).catch((error) => {
    alert("Error: " + error.message);
  });
});
