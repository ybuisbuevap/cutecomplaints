document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("messageForm");

  if (!form) {
    console.error("Form not found!");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const message = document.getElementById("message").value.trim();

    if (message === "") {
      alert("Please enter your message.");
      return;
    }

    firebase.database().ref("messages").push({
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
