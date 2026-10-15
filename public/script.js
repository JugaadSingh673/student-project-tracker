
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const message = document.querySelector('#message');

const projects = [];

function renderProjects() {
  projectList.textContent = '';

  for (const project of projects) {
    const item = document.createElement('li');
    item.textContent = `${project.name} — ${project.status}`;
    projectList.appendChild(item);
  }
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (name === '') {
    message.textContent = 'Please enter a project name.';
    nameInput.focus();
    return;
  }

  const project = {
    name: name,
    status: status
  };

  projects.push(project);
  renderProjects();

  message.textContent = `Added "${name}".`;
  form.reset();
});

