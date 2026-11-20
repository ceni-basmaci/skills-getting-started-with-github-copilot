document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(participant, activityName) {
    const participantItem = document.createElement("li");
    participantItem.className = "participants-item";
    participantItem.dataset.email = participant;

    const participantEmail = document.createElement("span");
    participantEmail.textContent = participant;
    participantItem.appendChild(participantEmail);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "participant-remove";
    removeButton.setAttribute("aria-label", `Unregister ${participant} from ${activityName}`);
    removeButton.title = "Unregister participant";
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    `;
    participantItem.appendChild(removeButton);

    return participantItem;
  }

  function updateActivityAvailability(activityCard) {
    const participantCount = activityCard.querySelectorAll(".participants-item").length;
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    activityCard.querySelector(".availability span").textContent = `${spotsLeft} spots left`;
  }

  function addParticipantToCard(activityCard, participant) {
    const participantsSection = activityCard.querySelector(".participants-section");
    let participantsList = participantsSection.querySelector(".participants-list");

    if (!participantsList) {
      participantsSection.querySelector(".no-participants")?.remove();
      participantsList = document.createElement("ul");
      participantsList.className = "participants-list";
      participantsSection.appendChild(participantsList);
    }

    participantsList.appendChild(
      createParticipantItem(participant, activityCard.dataset.activityName)
    );
    updateActivityAvailability(activityCard);
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
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span>${spotsLeft} spots left</span></p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "no-participants";
          emptyMessage.textContent = "No participants yet.";
          participantsSection.appendChild(emptyMessage);
        } else {
          details.participants.forEach((participant) => {
            participantsList.appendChild(createParticipantItem(participant, name));
          });
          participantsSection.appendChild(participantsList);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        const activityCard = [...activitiesList.querySelectorAll(".activity-card")]
          .find((card) => card.dataset.activityName === activity);
        if (activityCard) {
          addParticipantToCard(activityCard, email);
        }
        signupForm.reset();
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
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".participant-remove");
    if (!removeButton) {
      return;
    }

    const participantItem = removeButton.closest(".participants-item");
    const activityCard = removeButton.closest(".activity-card");
    const activity = activityCard.dataset.activityName;
    const email = participantItem.dataset.email;
    removeButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to unregister participant.");
      }

      participantItem.remove();
      const participantsList = activityCard.querySelector(".participants-list");
      if (participantsList.children.length === 0) {
        participantsList.remove();
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "no-participants";
        emptyMessage.textContent = "No participants yet.";
        activityCard.querySelector(".participants-section").appendChild(emptyMessage);
      }
      updateActivityAvailability(activityCard);

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = error instanceof Error
        ? error.message
        : "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    } finally {
      removeButton.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
