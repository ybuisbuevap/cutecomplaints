document.addEventListener("DOMContentLoaded", function () {
  const messageList = document.getElementById("messageList");
  const messagesRef = firebase.database().ref("messages");

  messagesRef.orderByChild("timestamp").on("value", (snapshot) => {
    messageList.innerHTML = "";

    // Store in array to reverse later
    const messages = [];

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const key = childSnapshot.key;

      messages.push({ ...data, key });
    });

    // Reverse so latest appears first
    messages.reverse().forEach(({ message, timestamp, key }) => {
      const li = document.createElement("li");

      const date = new Date(timestamp).toLocaleString();
      li.innerHTML = `
        ${message}
        <span class="timestamp">${date}</span>
        <button class="delete-btn" onclick="deleteMessage('${key}')">×</button>
      `;

      messageList.appendChild(li);
    });
  });
});

// Optional delete function
function deleteMessage(id) {
  if (confirm("Delete this message?")) {
    firebase.database().ref("messages").child(id).remove()
      .then(() => alert("Message deleted"))
      .catch(err => alert("Error deleting message: " + err.message));
  }
}
