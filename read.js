firebase.database().ref("problems").on("value", (snapshot) => {
  const container = document.getElementById("messages");
  container.innerHTML = "";
  const data = snapshot.val();
  if (data) {
    Object.values(data).forEach((entry, index) => {
      const div = document.createElement("div");
      div.className = "message";
      div.innerText = `${index + 1}. ${entry.message}`;
      container.appendChild(div);
    });
  }
});