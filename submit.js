document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("messageForm");
  const recordBtn = document.getElementById("recordBtn");
  const stopBtn = document.getElementById("stopBtn");
  const discardBtn = document.getElementById("discardBtn");
  const recordingStatus = document.getElementById("recordingStatus");
  const audioPreview = document.getElementById("audioPreview");
  const lastSeenEl = document.getElementById("lastSeen");
  const photoInput = document.getElementById("photoInput");
  const cameraInput = document.getElementById("cameraInput");
  const photoPreview = document.getElementById("photoPreview");
  const removePhotoBtn = document.getElementById("removePhotoBtn");

  if (!form) {
    console.error("Form not found!");
    return;
  }

  const MAX_RECORDING_MS = 60 * 1000; // 1 minute cap, keeps the DB payload sane
  const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // target ~1.5MB after compression
  const MAX_PHOTO_DIMENSION = 2048; // longest side, px

  let mediaRecorder = null;
  let audioChunks = [];
  let recordedBlob = null;
  let recordingTimeout = null;
  let photoDataUrl = null; // already a Base64 data URL once compressed

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

  // ----- Photo -----
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function compressImage(img) {
    let { width, height } = img;
    if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
      if (width > height) {
        height = Math.round(height * (MAX_PHOTO_DIMENSION / width));
        width = MAX_PHOTO_DIMENSION;
      } else {
        width = Math.round(width * (MAX_PHOTO_DIMENSION / height));
        height = MAX_PHOTO_DIMENSION;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    // Step quality down until we're under the target size, or give up at a sane floor.
    let quality = 0.92;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrl.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.4) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    return dataUrl;
  }

  async function handlePhotoFile(file) {
    if (!file) return;

    try {
      const img = await loadImage(file);
      photoDataUrl = compressImage(img);
      photoPreview.src = photoDataUrl;
      photoPreview.style.display = "block";
      removePhotoBtn.style.display = "inline-block";
    } catch (err) {
      alert("Couldn't process that photo: " + err.message);
      photoDataUrl = null;
    }
  }

  photoInput.addEventListener("change", function () {
    handlePhotoFile(photoInput.files[0]);
  });

  cameraInput.addEventListener("change", function () {
    handlePhotoFile(cameraInput.files[0]);
  });

  removePhotoBtn.addEventListener("click", function () {
    photoDataUrl = null;
    photoPreview.src = "";
    photoPreview.style.display = "none";
    removePhotoBtn.style.display = "none";
    photoInput.value = "";
    cameraInput.value = "";
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

    if (message === "" && !recordedBlob && !photoDataUrl) {
      alert("Please type something, record a voice message, or add a photo.");
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

    if (photoDataUrl) {
      payload.photo = photoDataUrl;
    }

    firebase.database().ref("messages").push(payload).then(() => {
      alert("Message sent successfully 💌");
      form.reset();
      discardBtn.click();
      removePhotoBtn.click();
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