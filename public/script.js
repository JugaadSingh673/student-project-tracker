
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const message = document.querySelector('#message');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formHeading = document.querySelector('#form-heading');

let projects = [];
let editingId = null;
let busy = false;
let loaded = false;

const validStatuses = [
  'Planned',
  'In Progress',
  'Completed'
];

// Match the status options to those accepted by the API.
statusInput.replaceChildren();

for (const status of validStatuses) {
  const option = document.createElement('option');
  option.value = status;
  option.textContent = status;
  statusInput.appendChild(option);
}

function setBusy(value) {
  busy = value;
  saveButton.disabled = value;
  cancelButton.disabled = value;
  nameInput.disabled = value;
  statusInput.disabled = value;

  projectList.querySelectorAll('button').forEach(function (button) {
    button.disabled = value;
  });
}

function resetFormMode() {
  editingId = null;
  form.reset();
  statusInput.value = 'Planned';

  saveButton.textContent = 'Add Project';
  cancelButton.hidden = true;
  formHeading.textContent = 'Add a project';
}

function renderProjects() {
  projectList.replaceChildren();
  emptyState.hidden = true;

  if (!loaded) {
    return;
  }

  if (projects.length === 0) {
    emptyState.textContent = 'No projects yet. Add your first project above.';
    emptyState.hidden = false;
    return;
  }

  for (const project of projects) {
    const item = document.createElement('li');
    const details = document.createElement('span');

    details.textContent = `${project.name} — ${project.status} `;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.dataset.action = 'edit';
    editButton.dataset.projectId = String(project.id);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.projectId = String(project.id);

    item.append(details, editButton, deleteButton);
    projectList.appendChild(item);
  }

  if (busy) {
    projectList.querySelectorAll('button').forEach(function (button) {
      button.disabled = true;
    });
  }
}

async function getError(response) {
  try {
    const data = await response.json();
    return data.error || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

async function loadProjects(showLoading = true) {
  if (showLoading) {
    message.textContent = 'Loading projects...';
  }

  try {
    const response = await fetch('/api/projects');

    if (!response.ok) {
      throw new Error(await getError(response));
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('The server returned an invalid project list.');
    }

    projects = data;
    loaded = true;
    renderProjects();

    return true;
  } catch (error) {
    loaded = false;
    projectList.replaceChildren();
    emptyState.hidden = true;
    message.textContent = error instanceof TypeError
      ? 'Could not connect to the server. Check that it is running and try again.'
      : `Could not load projects: ${error.message}`;

    return false;
  }
}

async function sendRequest(url, method, body) {
  const options = {
    method,
    headers: {}
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(await getError(response));
  }

  // DELETE also returns JSON in this API.
  return response.json();
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();

  if (busy) return;

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    message.textContent = 'Please enter a project name.';
    nameInput.focus();
    return;
  }

  if (name.length > 80 || !validStatuses.includes(status)) {
    message.textContent = 'Use a name of 1–80 characters and a valid status.';
    return;
  }

  if (!loaded) {
    message.textContent = 'Projects have not loaded. Please try again.';
    return;
  }

  const wasEditing = editingId !== null;
  const targetId = editingId;
  const existing = wasEditing
    ? projects.find(project => String(project.id) === String(targetId))
    : null;

  if (wasEditing && !existing) {
    resetFormMode();
    message.textContent = 'Project not found. Please try again.';
    return;
  }

  setBusy(true);
  message.textContent = wasEditing ? 'Saving changes...' : 'Adding project...';

  try {
    if (wasEditing) {
      await sendRequest(
        `/api/projects/${encodeURIComponent(targetId)}`,
        'PUT',
        { name, status }
      );
    } else {
      await sendRequest('/api/projects', 'POST', { name, status });
    }

    // The server is the source of truth.
    const refreshed = await loadProjects(false);

    resetFormMode();

    if (refreshed) {
      message.textContent = wasEditing
        ? `Updated "${name}".`
        : `Added "${name}".`;
    } else {
      message.textContent =
        'The change was saved, but the project list could not be refreshed. Reload the page to try again.';
    }
  } catch (error) {
    message.textContent = error instanceof TypeError
      ? 'Could not connect to the server. Your changes were not confirmed; please try again.'
      : `Could not save changes: ${error.message}`;
  } finally {
    setBusy(false);
    renderProjects();
  }
});

cancelButton.addEventListener('click', function () {
  if (busy) return;

  resetFormMode();
  message.textContent = 'Edit cancelled. No changes were saved.';
});

projectList.addEventListener('click', async function (event) {
  const button = event.target.closest('button[data-action]');

  if (!button || busy || !loaded) return;

  const id = button.dataset.projectId;
  const project = projects.find(
    item => String(item.id) === String(id)
  );

  if (!project) {
    message.textContent = 'Project not found. Reload the list and try again.';
    return;
  }

  if (button.dataset.action === 'edit') {
    editingId = project.id;
    nameInput.value = project.name;
    statusInput.value = project.status;

    saveButton.textContent = 'Save changes';
    cancelButton.hidden = false;
    formHeading.textContent = 'Edit a project';
    message.textContent = `Editing "${project.name}".`;

    nameInput.focus();
    return;
  }

  if (button.dataset.action === 'delete') {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    );

    if (!confirmed) {
      message.textContent = 'Deletion cancelled. No changes were made.';
      return;
    }

    setBusy(true);
    message.textContent = `Deleting "${project.name}"...`;

    try {
      await sendRequest(
        `/api/projects/${encodeURIComponent(project.id)}`,
        'DELETE'
      );

      if (String(editingId) === String(project.id)) {
        resetFormMode();
      }

      const refreshed = await loadProjects(false);

      message.textContent = refreshed
        ? `Deleted "${project.name}".`
        : 'The project was deleted, but the list could not be refreshed.';
    } catch (error) {
      message.textContent = error instanceof TypeError
        ? 'Could not connect to the server. Deletion was not confirmed.'
        : `Could not delete project: ${error.message}`;
    } finally {
      setBusy(false);
      renderProjects();
    }
  }
});

// Initial load from the server, not browser storage.
loadProjects();
