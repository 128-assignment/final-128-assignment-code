// ===== Apply Page Functions =====

async function prefillUserProfile() {
  try {
    const res = await fetch('/getProfile', { credentials: 'include' });
    const data = await res.json();

    if (data.success) {
      document.getElementById('fullname').value = data.name;
      document.getElementById('email').value = data.email;
    } else {
      alert("Session expired or profile not found.");
    }
  } catch {
    alert("Failed to fetch profile.");
  }
}

async function fetchInternshipId() {
  try {
    const res = await fetch('/get-selected-internship', { credentials: 'include' });
    const data = await res.json();

    if (data.success && data.internship?.id) {
      document.getElementById('internship_id').value = data.internship.id;
    } else {
      alert("No internship selected.");
    }
  } catch {
    console.error("Error fetching internship ID.");
  }
}

async function submitApplication(e) {
  e.preventDefault();

  const formData = {
    internship_id: document.getElementById('internship_id').value,
    fullname: document.getElementById('fullname').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    bio: document.getElementById('bio').value,
    resume_link: document.getElementById('resume_link').value
  };

  try {
    const res = await fetch('/submit-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      credentials: 'include'
    });
  const result = await res.json();
  if (result.success) {
    alert("Application submitted successfully!");
    window.location.href = '/my-application.html'; // or any relevant page
  } else {
    alert("Error: " + (result.error || "Unknown error occurred."));
  }
} catch (err) {
  alert("Failed to submit application: " + err.message);
}
}

// ===== Internships Page Functions =====

async function fetchInternships() {
  const keyword = document.getElementById('keyword').value.trim();
  const domain = document.getElementById('domain').value;
  const location = document.getElementById('location').value;

  const params = new URLSearchParams();
  if (keyword) params.append('keyword', keyword);
  if (domain) params.append('domain', domain);
  if (location) params.append('location', location);

  try {
    const res = await fetch('/get-internships?' + params.toString());
    const data = await res.json();

    const container = document.getElementById('internshipsContainer');
    container.innerHTML = '';

    if (!data.success || data.internships.length === 0) {
      container.innerHTML = '<p>No internships found.</p>';
      return;
    }

    data.internships.forEach(internship => {
      const card = document.createElement('div');
      card.className = 'internship-card';

    card.innerHTML = `
      <div class="top-row">
        <div class="internship-info">
          <h3>${internship.title}</h3>
          <p><strong>Company:</strong> ${internship.company_name}</p>
          <p><strong>Type:</strong> ${internship.department || 'N/A'}</p>
          <p><strong>Deadline:</strong> ${internship.end_date ? new Date(internship.end_date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div class="details hidden">
          <p><strong>Location:</strong> ${internship.location || 'N/A'}</p>
          <p><strong>Stipend:</strong> ${internship.stipend || 'N/A'}</p>
          <p><strong>Skills Required:</strong> ${internship.requirements || 'N/A'}</p>
          <p><strong>Description:</strong> ${internship.description || 'N/A'}</p>
        </div>
      </div>
      <div class="card-actions">
        <button class="button toggle-details">View Details</button>
      </div>
    `;


      const applyBtn = document.createElement('button');
      applyBtn.textContent = 'Apply';
      applyBtn.className = 'button';

      applyBtn.addEventListener('click', async () => {
        try {
          const formData = new URLSearchParams();
          formData.append('internship_id', internship.id);

          const response = await fetch('/start-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
          });

          if (response.redirected) {
            window.location.href = response.url;
          } else {
            alert('Failed to start application.');
          }
        } catch (error) {
          alert('Error: ' + error.message);
        }
      });

      card.querySelector('.card-actions').appendChild(applyBtn);
      container.appendChild(card);
    });

    document.querySelectorAll('.toggle-details').forEach(button => {
      button.addEventListener('click', () => {
        const details = button.closest('.internship-card').querySelector('.details');
        const isVisible = details.style.display === 'block';
        details.style.display = isVisible ? 'none' : 'block';
        button.textContent = isVisible ? 'View Details' : 'Hide Details';
      });
    });

  } catch (error) {
    console.error('Error fetching internships:', error);
  }
}

// ===== Manage Internship Programs (minternship.html) Functions =====

let internships = [];

async function loadInternships() {
  try {
    const res = await fetch('/get-company-internships');
    const data = await res.json();
    const table = document.querySelector("#internshipTable tbody");
    table.innerHTML = '';
    internships = data.internships || [];

    if (!data.success || internships.length === 0) {
      table.innerHTML = '<tr><td colspan="6">No internships posted.</td></tr>';
      return;
    }

    internships.forEach((intern, i) => {
      const row = document.createElement('tr');
      const isActive = new Date(intern.end_date) >= new Date() ? 'Active' : 'Inactive';

      row.innerHTML = `
        <td>${i + 1}</td>
        <td class="title">${intern.title}</td>
        <td>${intern.department}</td>
        <td>${intern.start_date}</td>
        <td>${isActive}</td>
        <td class="actions">
          <button class="view-btn">View</button>
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </td>
      `;
      table.appendChild(row);

      row.querySelector('.view-btn').addEventListener('click', () => showInternshipDetails(intern));
      row.querySelector('.edit-btn').addEventListener('click', () => showEditForm(intern));
      row.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm("Are you sure you want to delete this internship?")) {
          await fetch('/delete-internship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${intern.id}`
          });
          alert("Internship deleted!");
          loadInternships();
          document.getElementById("internshipDetails").style.display = "none";
        }
      });
    });
  } catch (error) {
    console.error('Error loading internships:', error);
  }
}

function showInternshipDetails(intern) {
  const isActive = new Date(intern.end_date) >= new Date() ? 'Active' : 'Inactive';
  const detailsDiv = document.getElementById("internshipDetails");
  detailsDiv.style.display = "block";
  detailsDiv.innerHTML = `
    <h3>Internship Details</h3>
    <p><strong>Title:</strong> ${intern.title}</p>
    <p><strong>Department:</strong> ${intern.department}</p>
    <p><strong>Start Date:</strong> ${intern.start_date}</p>
    <p><strong>End Date:</strong> ${intern.end_date}</p>
    <p><strong>Location:</strong> ${intern.location}</p>
    <p><strong>Stipend:</strong> ${intern.stipend}</p>
    <p><strong>Description:</strong> ${intern.description}</p>
    <p><strong>Requirements:</strong> ${intern.requirements}</p>
    <p><strong>Status:</strong> ${isActive}</p>
  `;
}

function showEditForm(intern) {
  const detailsDiv = document.getElementById("internshipDetails");
  detailsDiv.style.display = "block";
  detailsDiv.innerHTML = `
    <div style="max-width: 600px; margin: 20px auto 10px auto; padding: 0;">
      <h3>Edit Internship</h3>
      <form id="editForm" style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0; max-width: 400px; margin: 0 auto;">
        <input type="hidden" name="id" value="${intern.id}">

        <label style="width: 100%;">Title:
          <input type="text" name="title" value="${intern.title}" required style="width: 100%; box-sizing: border-box;">
        </label>

        <label style="width: 100%;">Department:
          <input type="text" name="department" value="${intern.department}" required style="width: 100%; box-sizing: border-box;">
        </label>

        <label style="width: 100%;">Start Date:
          <input type="date" name="start" value="${intern.start_date}" required style="width: 100%; box-sizing: border-box;">
        </label>

        <label style="width: 100%;">End Date:
          <input type="date" name="end" value="${intern.end_date}" required style="width: 100%; box-sizing: border-box;">
        </label>

        <label style="width: 100%;">Location:
          <input type="text" name="location" value="${intern.location}" required style="width: 100%; box-sizing: border-box;">
        </label>

        <label style="width: 100%;">Stipend (AED):
          <input type="text" name="stipend" value="${intern.stipend}" required style="width: 100%; box-sizing: border-box;">
        </label>

        <label style="width: 100%;">Description:
          <textarea name="description" rows="3" required style="width: 100%; box-sizing: border-box;">${intern.description}</textarea>
        </label>

        <label style="width: 100%;">Requirements:
          <textarea name="requirements" rows="3" required style="width: 100%; box-sizing: border-box;">${intern.requirements}</textarea>
        </label>

        <button type="submit" style="width: fit-content; padding: 6px 12px;">Save Changes</button>
      </form>
    </div>
  `;

  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const formParams = new URLSearchParams(formData);
    const res = await fetch("/update-internship", {
      method: "POST",
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formParams
    });
    const result = await res.json();
    if (result.success) {
      alert("Internship updated successfully.");
      loadInternships();
      detailsDiv.style.display = "none";
    } else {
      alert("Update failed.");
    }
  });
}

// ===== My Applications Page Functions =====
async function loadApplications() {
  try {
    const res = await fetch('/get-my-applications');
    const data = await res.json();
    const table = document.getElementById('applicationTable');
    table.innerHTML = '';

    if (!data.success || data.applications.length === 0) {
      table.innerHTML = '<tr><td colspan="6">No applications found.</td></tr>';
      return;
    }

    data.applications.forEach(app => {
      // Create main row with application summary
      const mainRow = document.createElement('tr');
      mainRow.innerHTML = `
        <td>${app.title}</td>
        <td>${app.company_name}</td>
        <td>${app.department || 'N/A'}</td>
        <td>${app.start_date || 'N/A'}</td>
        <td>${app.status}</td>
        <td>
          <button class="view">View</button>
          <button class="withdraw" data-id="${app.id}">Withdraw</button>
        </td>
      `;

      // Create hidden details row with full info
      const detailsRow = document.createElement('tr');
      detailsRow.className = 'details-row';
      detailsRow.innerHTML = `
        <td colspan="6" class="details-cell">
          <strong>Description:</strong> ${app.description || 'N/A'}<br>
          <strong>Requirements:</strong> ${app.requirements || 'N/A'}<br>
          <strong>Location:</strong> ${app.location || 'N/A'}<br>
          <strong>Stipend:</strong> ${app.stipend || 'N/A'}<br>
          <strong>Resume:</strong> <a href="${app.resume_link}" target="_blank">View</a>
        </td>
      `;

      table.appendChild(mainRow);
      table.appendChild(detailsRow);
    });

    // Add toggle for details view
    const viewButtons = table.querySelectorAll('.view');
    viewButtons.forEach(btn => {
      btn.onclick = function() {
        const details = btn.closest('tr').nextElementSibling;
        if (details.style.display === 'table-row') {
          details.style.display = 'none';
        } else {
          details.style.display = 'table-row';
        }
      };
    });

    // Add withdraw button handlers
    const withdrawButtons = table.querySelectorAll('.withdraw');
    withdrawButtons.forEach(btn => {
      btn.onclick = async function() {
        if (confirm("Are you sure you want to withdraw your application?")) {
          const id = btn.getAttribute('data-id');
          const res = await fetch('/withdraw-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${id}`
          });
          const result = await res.json();
          if (result.success) {
            alert("Application withdrawn.");
            loadApplications();
          } else {
            alert("Failed to withdraw application.");
          }
        }
      };
    });

  } catch (err) {
    console.error('Error loading applications:', err);
  }
}


// ===== Initialization on Page Load =====

window.onload = () => {
  // Apply page
  if (document.getElementById('applicationForm')) {
    prefillUserProfile();
    fetchInternshipId();
    document.getElementById('applicationForm').onsubmit = submitApplication;
  }

  // Internships page
  if (document.getElementById('searchBtn')) {
    fetchInternships();
    document.getElementById('searchBtn').addEventListener('click', fetchInternships);
  }

  // Manage internships page
  if (document.getElementById('internshipTable')) {
    loadInternships();
  }

  // My-Application page
  if (document.getElementById('applicationTable')) {
    loadApplications();
  }

    //Profile page
  if (document.getElementById('edit-btn')) {
    attachProfileListeners();
  }

};

