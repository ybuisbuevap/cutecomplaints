function sendProblem() {
  const problem = document.getElementById("problem").value;
  if (problem.trim() === "") return;

  const timestamp = Date.now();
  firebase.database().ref("problems/" + timestamp).set({
    message: problem
  }).then(() => {
    document.getElementById("confirmation").innerText = "Message sent!";
    document.getElementById("problem").value = "";
  });
}