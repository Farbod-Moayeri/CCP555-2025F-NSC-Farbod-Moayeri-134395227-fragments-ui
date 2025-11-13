// src/app.js
 
import { signIn, getUser } from './auth';
 
async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
 
  // Wire up event handlers to deal with login and logout.
  loginBtn.onclick = () => {
    console.log("Login button clicked");
    // Sign-in via the Amazon Cognito Hosted UI (requires redirects), see:
    signIn();
  };
 
  // See if we're signed in (i.e., we'll have a `user` object)
  const user = await getUser();
  if (!user) {
    return;
  }
 
  // Update the UI to welcome the user
  userSection.hidden = false;
 
  // Show the user's username
  userSection.querySelector('.username').innerText = user.username;
 
  // Disable the Login button
  loginBtn.disabled = true;
}
 
// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);

// -------------------------------
// ✅ Basic Auth (for API) Section
// -------------------------------
import { getUserFragments, createFragment } from './api';

addEventListener('DOMContentLoaded', () => {
  const emailInput = document.querySelector('#email');
  const passwordInput = document.querySelector('#password');
  const basicLoginBtn = document.querySelector('#basic-login');
  const fragmentsSection = document.querySelector('#fragments-section');
  const fragmentsList = document.querySelector('#fragments-list');
  const createBtn = document.querySelector('#create');

  if (!basicLoginBtn) return; // Only run if Basic Auth UI exists

  basicLoginBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return alert('Please enter email and password.');

    console.log('🔐 Logging in using Basic Auth for Fragments API...');
    const data = await getUserFragments(email, password);
    if (data?.fragments) {
      alert('✅ Logged in and fetched fragments!');
      fragmentsSection.hidden = false;
      renderFragments(data.fragments);
    } else {
      alert('❌ Login failed or no fragments found.');
    }

    // Attach create fragment handler
    createBtn.onclick = async () => {
      const type = document.querySelector('#type').value;
      const content = document.querySelector('#content').value.trim();
      if (!content) return alert('Enter fragment content.');

      await createFragment(email, password, type, content);
      const updated = await getUserFragments(email, password);
      renderFragments(updated.fragments || []);
    };
  };

  function renderFragments(fragments = []) {
    fragmentsList.innerHTML = '';
    fragments.forEach((frag) => {
      const li = document.createElement('li');
      li.textContent = typeof frag === 'string' ? frag : `${frag.id} (${frag.type})`;
      fragmentsList.appendChild(li);
    });
  }
});
