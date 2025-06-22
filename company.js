// ===== Internship Creation Page =====
function showMessage() {
  window.alert("Internship created");
}

// ===== Manage Internship Page =====
let internships = [];

async function loadInternships() {
  const res = await fetch('/get-company-internships');
  const data = await res.json();
  const table = document.querySelector("#internshipTable tbody");
  if (!table) return;
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
          <input type="text" name="title" value="${intern.title}" required>
        </label>
        <label style="width: 100%;">Department:
          <input type="text" name="department" value="${intern.department}" required>
        </label>
        <label style="width: 100%;">Start Date:
          <input type="date" name="start" value="${intern.start_date}" required>
        </label>
        <label style="width: 100%;">End Date:
          <input type="date" name="end" value="${intern.end_date}" required>
        </label>
        <label style="width: 100%;">Location:
          <input type="text" name="location" value="${intern.location}" required>
        </label>
        <label style="width: 100%;">Stipend:
          <input type="text" name="stipend" value="${intern.stipend}" required>
        </label>
        <label style="width: 100%;">Description:
          <textarea name="description" required>${intern.description}</textarea>
        </label>
        <label style="width: 100%;">Requirements:
          <textarea name="requirements" required>${intern.requirements}</textarea>
        </label>
        <button type="submit">Save Changes</button>
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

// ===== Application Management Page =====
async function fetchApplications() {
  const tbody = document.getElementById('application_table_body');
  if (!tbody) return;
  const res = await fetch('/get-applications');
  const data = await res.json();

  tbody.innerHTML = '';

  if (!data.success || data.applications.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.style.textAlign = 'center';
    td.textContent = 'No applications found.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  data.applications.forEach(app => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${app.fullname}</td>
      <td>${app.email}</td>
      <td>${app.phone || ''}</td>
      <td>${app.bio || ''}</td>
      <td><a href="${app.resume_link}" target="_blank">View Resume</a></td>
      <td>${app.internship_title}</td>
      <td><strong>${app.status}</strong></td>
      <td>
        <button onclick="updateStatus(${app.id}, 'Accepted', this)">Accept</button>
        <button onclick="updateStatus(${app.id}, 'Rejected', this)">Reject</button>
        <button onclick="updateStatus(${app.id}, 'Pending', this)">Reset</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateStatus(appId, status, btn) {
  btn.disabled = true;
  try {
    const res = await fetch('/update-application-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: appId, status })
    });
    const data = await res.json();
    if (data.success) {
      fetchApplications();
    } else {
      alert('Failed to update status');
    }
  } catch {
    alert('Error updating status');
  } finally {
    btn.disabled = false;
  }
}

// Load company profile details
async function loadCompanyProfile() {
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phonenum');
  const bioInput = document.getElementById('bio');

  if (!nameInput || !emailInput || !phoneInput || !bioInput) return;

  const res = await fetch('/get-company-profile');
  const data = await res.json();

  if (data.success) {
    nameInput.value = data.company.company_name || '';
    emailInput.value = data.company.email || '';
    phoneInput.value = data.company.phone || '';
    bioInput.value = data.company.bio || '';
  }
}

// Handle profile form submission
function saveProfile(e) {
  e.preventDefault();

  const pwd = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;
  if (pwd && pwd !== confirm) {
    alert("Passwords do not match");
    return false;
  }

  const data = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phonenum: document.getElementById('phonenum').value,
    bio: document.getElementById('bio').value,
    password: pwd
  };

  fetch('/update-company-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  })
  .then(res => res.text())
  .then(() => alert("Changes saved"))
  .catch(() => alert("Update failed"));

  return false;
}

// ===== Page Load Initialization =====
window.addEventListener('load', () => {
  if (document.getElementById('internshipTable')) loadInternships();
  if (document.getElementById('application_table_body')) fetchApplications();
  if (document.getElementById('profileForm')) {
    loadCompanyProfile();
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
  }
});
