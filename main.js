import * as WorkspaceAPI from 'https://esm.sh/trimble-connect-workspace-api@latest';

const statusText = document.getElementById('status-text');
const loadingIndicator = document.getElementById('loading-indicator');
const projectInfo = document.getElementById('project-info');
const valProjectName = document.getElementById('val-project-name');
const logBox = document.getElementById('log-box');

const btnGetSelection = document.getElementById('btn-get-selection');
const btnSetColor = document.getElementById('btn-set-color');

let API = null;

function logMessage(msg) {
  const p = document.createElement('p');
  p.className = 'log-entry';
  p.textContent = `> ${msg}`;
  logBox.appendChild(p);
  logBox.scrollTop = logBox.scrollHeight;
}

async function initExtension() {
  try {
    // Connect to Trimble Connect Workspace
    API = await WorkspaceAPI.connect(window.parent, (event, data) => {
      logMessage(`Event received: ${event}`);
    });

    logMessage('Connected successfully!');
    statusText.textContent = 'Connected';
    statusText.style.color = '#4caf50';
    loadingIndicator.style.display = 'none';

    // Fetch current project info
    const project = await API.project.getProject();
    if (project) {
        valProjectName.textContent = project.name || project.id || 'Unknown Project';
        projectInfo.style.display = 'block';
    }

    // Enable buttons
    btnGetSelection.disabled = false;
    btnSetColor.disabled = false;

    // Listeners for interactions
    btnGetSelection.addEventListener('click', async () => {
      try {
        logMessage('Fetching selection...');
        if (API.viewer && API.viewer.getSelection) {
            const selection = await API.viewer.getSelection();
            if (selection && selection.length > 0) {
                logMessage(`Selected ${selection.length} object(s)`);
                console.log("Selection data:", selection);
            } else {
                logMessage('No objects selected.');
            }
        } else {
             logMessage('Viewer selection API not available.');
        }
      } catch (err) {
        logMessage(`Error getting selection: ${err.message}`);
      }
    });

    btnSetColor.addEventListener('click', async () => {
      try {
         if (API.viewer && API.viewer.setSelectionColor) {
             // Example: set selection color to Red. Proper method check needed per API version.
             // Workspace API might also expose object styling API instead.
             logMessage('Attempting to color selection...');
             // It depends on exact API - sometimes it is API.viewer.setColors(objects, color)
             logMessage('See Trimble API docs for precise styling method.');
         } else {
             logMessage('Viewer style API not available or requires permission.');
         }
      } catch (err) {
         logMessage(`Error styling: ${err.message}`);
      }
    });

  } catch (error) {
    console.error('Failed to connect to Trimble Connect Workspace API', error);
    statusText.textContent = 'Connection Failed';
    statusText.style.color = '#f44336';
    loadingIndicator.style.display = 'none';
    logMessage(`Error: ${error.message}`);
  }
}

document.addEventListener('DOMContentLoaded', initExtension);
