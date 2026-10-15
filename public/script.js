const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const message = document.querySelector('#message');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const formHeading = document.querySelector('#form-heading');

const STORAGE_KEY = 'workshop-projects-v1';

let projects = [];
let editingId = null;
let storageReady = false;

const validStatuses = [
  'Not Started',
  'In Progress',
  'Completed'
];

function isValidProjects(data) {
  return Array.isArray(data) &&
    data.every(function (project) {
      return project !== null &&
        typeof project === 'object' &&
        !Array.isArray(project) &&
        typeof project.id === 'string' &&
        project.id.length > 0 &&
        typeof project.name === 'string' &&
        project.name.trim() !== '' &&
        typeof project.status === 'string' &&
        validStatuses.includes(project.status);
    }) &&
    new Set(data.map(function (project) {
      return project.id;
    })).size === data.length;
}

function loadProjects() {
  let savedText;

  try {
    savedText = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    message.textContent =
      'Could not read browser storage. Projects could not be loaded.';
    return;
  }

  if (savedText === null) {
    projects = [];
    storageReady = true;
    return;
  }

  try {
    const savedProjects = JSON.parse(savedText);

    if (!isValidProjects(savedProjects)) {
      message.textContent =
        'Saved project data is invalid. Your stored data was not changed. Ask your instructor for help.';
      return;
    }

    projects = savedProjects;
    storageReady = true;
  } catch (error) {
    message.textContent =
      'Saved project data could not be read. Your stored data was not changed. Ask your instructor for help.';
  }
}

function saveProjects() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(projects)
    );
    return true;
  } catch (error) {
    message.textContent =
      'Changes could not be saved to browser storage.';
    return false;
  }
}

function resetFormMode() {
  editingId = null;
  form.reset();

  saveButton.textContent = 'Add Project';
  cancelButton.hidden = true;
  formHeading.textContent = 'Add a project';
}

function renderProjects() {
  projectList.textContent = '';
  emptyState.hidden = projects.length > 0;

  for (const project of projects) {
    const item = document.createElement('li');

    const details = document.createElement('span');
    details.textContent = `${project.name} — ${project.status} `;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.setAttribute('data-project-id', project.id);

    editButton.addEventListener('click', function () {
      if (!storageReady) {
        message.textContent =
          'Storage is not ready. Changes are disabled until the stored data issue is resolved.';
        return;
      }

      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = project.status;

      saveButton.textContent = 'Save changes';
      cancelButton.hidden = false;
      formHeading.textContent = 'Edit a project';
      message.textContent = `Editing "${project.name}".`;

      nameInput.focus();
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('data-project-id', project.id);

    deleteButton.addEventListener('click', function () {
      if (!storageReady) {
        message.textContent =
          'Storage is not ready. Deletion is disabled until the stored data issue is resolved.';
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete "${project.name}"?`
      );

      if (!confirmed) {
        message.textContent =
          'Deletion cancelled. No changes were made.';
        return;
      }

      const index = projects.findIndex(function (item) {
        return item.id === project.id;
      });

      if (index === -1) {
        message.textContent = 'Project not found.';
        return;
      }

      const deletedProject = projects[index];
      projects.splice(index, 1);

      if (!saveProjects()) {
        projects.splice(index, 0, deletedProject);
        renderProjects();
        return;
      }

      if (editingId === project.id) {
        resetFormMode();
      }

      renderProjects();
      message.textContent = `Deleted "${project.name}".`;
    });

    item.appendChild(details);
    item.appendChild(editButton);
    item.appendChild(deleteButton);
    projectList.appendChild(item);
  }
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  if (!storageReady) {
    message.textContent =
      'Projects cannot be changed until browser storage is available and saved data is valid.';
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (name === '') {
    message.textContent = 'Please enter a project name.';
    nameInput.focus();
    return;
  }

  if (!validStatuses.includes(status)) {
    message.textContent = 'Please select a valid project status.';
    return;
  }

  if (editingId !== null) {
    const project = projects.find(function (item) {
      return item.id === editingId;
    });

    if (!project) {
      message.textContent = 'Project not found. Please try again.';
      resetFormMode();
      return;
    }

    const oldName = project.name;
    const oldStatus = project.status;

    project.name = name;
    project.status = status;

    if (!saveProjects()) {
      project.name = oldName;
      project.status = oldStatus;
      renderProjects();
      return;
    }

    resetFormMode();
    renderProjects();
    message.textContent = `Updated "${name}".`;
  } else {
    const project = {
      id: crypto.randomUUID(),
      name: name,
      status: status
    };

    projects.push(project);

    if (!saveProjects()) {
      projects.pop();
      renderProjects();
      return;
    }

    resetFormMode();
    renderProjects();
    message.textContent = `Added "${name}".`;
  }
});

cancelButton.addEventListener('click', function () {
  resetFormMode();
  message.textContent = 'Edit cancelled. No changes were saved.';
});

loadProjects();
renderProjects();