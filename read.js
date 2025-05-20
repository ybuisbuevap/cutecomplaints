window.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("messageList");

  firebase.database().ref("messages").on("value", (snapshot) => {
    messageList.innerHTML = ""; // Clear previous messages

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const li = document.createElement("li");
      li.textContent = `${data.name}: ${data.message}`;
      messageList.appendChild(li);
    });
  });
});
