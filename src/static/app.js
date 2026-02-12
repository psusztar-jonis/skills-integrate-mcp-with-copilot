document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Auth elements
  const authBtn = document.getElementById("auth-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeModal = document.getElementById("close-modal");
  const cancelBtn = document.getElementById("cancel-btn");
  const loginMessage = document.getElementById("login-message");
  const logoutBtn = document.getElementById("logout-btn");
  const logoutInfo = document.getElementById("logout-info");
  const teacherUsername = document.getElementById("teacher-username");
  const authNotice = document.getElementById("auth-notice");
  
  let currentToken = null;

  // Check for existing session on page load
  checkSession();

  // Function to check if teacher session exists
  async function checkSession() {
    const savedToken = localStorage.getItem("teacherToken");
    if (savedToken) {
      try {
        const response = await fetch(`/auth/verify?token=${encodeURIComponent(savedToken)}`);
        const result = await response.json();
        if (result.authenticated) {
          currentToken = savedToken;
          updateAuthUI(result.username);
        } else {
          localStorage.removeItem("teacherToken");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    }
    fetchActivities();
  }

  // Update UI based on authentication status
  function updateAuthUI(username) {
    if (currentToken) {
      authBtn.textContent = "Logout";
      logoutInfo.style.display = "block";
      teacherUsername.textContent = username;
      signupForm.style.display = "block";
      authNotice.style.display = "none";
    } else {
      authBtn.textContent = "Login";
      logoutInfo.style.display = "none";
      signupForm.style.display = "none";
      authNotice.style.display = "block";
    }
  }

  // Auth button click handler
  authBtn.addEventListener("click", () => {
    if (currentToken) {
      // Logout
      logout();
    } else {
      // Show login modal
      loginModal.style.display = "block";
    }
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    loginModal.style.display = "none";
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Cancel button
  cancelBtn.addEventListener("click", () => {
    loginModal.style.display = "none";
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.style.display = "none";
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });

  // Logout button
  logoutBtn.addEventListener("click", logout);

  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        currentToken = result.token;
        localStorage.setItem("teacherToken", currentToken);
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");
        
        setTimeout(() => {
          loginModal.style.display = "none";
          loginForm.reset();
          loginMessage.classList.add("hidden");
          updateAuthUI(username);
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Error during login";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Logout function
  async function logout() {
    if (!currentToken) return;

    try {
      await fetch(`/auth/logout?token=${encodeURIComponent(currentToken)}`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    currentToken = null;
    localStorage.removeItem("teacherToken");
    updateAuthUI(null);
    fetchActivities();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML - only show delete buttons if teacher is logged in
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        currentToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentToken) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(currentToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!currentToken) {
      messageDiv.textContent = "You must be logged in as a teacher to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(currentToken)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });
});
