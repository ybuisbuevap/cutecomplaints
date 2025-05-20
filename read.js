document.addEventListener("DOMContentLoaded", function () {
  const messageList = document.getElementById("messageList");

  const dbRef = firebase.database().ref("messages");

  dbRef.on("value", function (snapshot) {
    messageList.innerHTML = "";

    snapshot.forEach(function (childSnapshot) {
      const data = childSnapshot.val();
      const li = document.createElement("li");
      li.textContent = `${data.name}: ${data.message}`;
      messageList.appendChild(li);
    });
  });
});
