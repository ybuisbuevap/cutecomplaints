document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("messageForm");
  const recordBtn = document.getElementById("recordBtn");
  const stopBtn = document.getElementById("stopBtn");
  const discardBtn = document.getElementById("discardBtn");
  const recordingStatus = document.getElementById("recordingStatus");
  const audioPreview = document.getElementById("audioPreview");
  const lastSeenEl = document.getElementById("lastSeen");

  if (!form) {
    console.error("Form not found!");
    return;
  }

  const MAX_RECORDING_MS = 60 * 1000; // 1 minute cap, keeps the DB payload sane

  let mediaRecorder = null;
  let audioChunks = [];
  let recordedBlob = null;
  let recordingTimeout = null;

  // ----- Last seen (read-only, no passphrase needed for this one value) -----
  firebase.database().ref("lastSeen").on("value", (snapshot) => {
    const ts = snapshot.val();
    if (!ts) {
      lastSeenEl.textContent = "He hasn't checked your messages yet.";
      return;
    }
    const date = new Date(ts);
    lastSeenEl.textContent = "He last saw your messages: " + date.toLocaleString();
  }, () => {
    lastSeenEl.textContent = "";
  });

  // ----- Recording -----
  recordBtn.addEventListener("click", async function () {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert("Couldn't access your microphone: " + err.message);
      return;
    }

    audioChunks = [];
    recordedBlob = null;
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    });

    mediaRecorder.addEventListener("stop", () => {
      recordedBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      audioPreview.src = URL.createObjectURL(recordedBlob);
      audioPreview.style.display = "block";
      discardBtn.style.display = "inline-block";
      stream.getTracks().forEach((track) => track.stop());
    });

    mediaRecorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    recordingStatus.textContent = "Recording... (max 1 min)";

    recordingTimeout = setTimeout(() => {
      if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    }, MAX_RECORDING_MS);
  });

  stopBtn.addEventListener("click", function () {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    clearTimeout(recordingTimeout);
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    recordingStatus.textContent = "";
  });

  discardBtn.addEventListener("click", function () {
    recordedBlob = null;
    audioPreview.src = "";
    audioPreview.style.display = "none";
    discardBtn.style.display = "none";
  });

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // includes data: prefix
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ----- Submit -----
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const message = document.getElementById("message").value.trim();

    if (message === "" && !recordedBlob) {
      alert("Please type something or record a voice message.");
      return;
    }

    let senderHash;
    try {
      senderHash = await getOrAskHash(
        "cc_sender_hash",
        "Enter your passphrase 💌 (only needed once on this device):"
      );
    } catch (err) {
      alert(err.message);
      return;
    }

    const payload = {
      timestamp: Date.now(),
      senderHash: senderHash
    };

    if (message !== "") {
      payload.message = message;
    }

    if (recordedBlob) {
      // Rough size guard: Base64 inflates ~33%, keep total comfortably small.
      if (recordedBlob.size > 2 * 1024 * 1024) {
        alert("That recording is a bit long — please keep voice messages under a minute.");
        return;
      }
      try {
        payload.audio = await blobToBase64(recordedBlob);
        payload.audioType = recordedBlob.type;
      } catch (err) {
        alert("Couldn't process the recording: " + err.message);
        return;
      }
    }

    firebase.database().ref("messages").push(payload).then(() => {
      alert("Message sent successfully 💌");
      form.reset();
      discardBtn.click();
    }).catch((error) => {
      if (error.message && error.message.toLowerCase().includes("permission")) {
        alert("That passphrase doesn't seem right. Clearing it — please try again.");
        clearSavedPassphrase("cc_sender_hash");
      } else {
        alert("Error: " + error.message);
      }
    });
  });
});
