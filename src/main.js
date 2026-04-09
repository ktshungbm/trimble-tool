import './style.css';
import * as WorkspaceAPI from '@trimble-oss/trimble-connect-workspace-api';

document.querySelector('#app').innerHTML = `
  <div>
    <h1>DDC Statistics</h1>
    <p>Loading Workspace API...</p>
  </div>
`;

async function init() {
  try {
    const API = await WorkspaceAPI.connect(
      window.parent,
      (event, data) => {
        console.log("Event:", event, data);
      }
    );
    document.querySelector('#app').innerHTML = `
      <div>
        <h1>DDC Statistics</h1>
        <p style="color: #4CAF50;">Connected to Trimble Connect.</p>
      </div>
    `;
    console.log("Connected!", API);
  } catch (error) {
    console.error("Connection failed", error);
  }
}

init();
