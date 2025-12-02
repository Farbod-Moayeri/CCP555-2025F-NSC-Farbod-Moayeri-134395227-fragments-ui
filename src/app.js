// src/app.js

import { signIn, getUser } from './auth';
import {
  getUserFragments,
  createFragment,
  getFragmentData,
  updateFragment,
  deleteFragment,
  getConvertedFragmentData,
} from './api';

addEventListener('DOMContentLoaded', async () => {
  // --------------------------------
  // Cognito login (top "Login" button)
  // --------------------------------
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');

  loginBtn.onclick = () => {
    console.log('Login button clicked (Cognito Hosted UI)');
    signIn();
  };

  const cognitoUser = await getUser();
  if (cognitoUser) {
    userSection.hidden = false;
    userSection.querySelector('.username').innerText = cognitoUser.username;
    loginBtn.disabled = true;
  }

  // --------------------------------
  // Basic Auth + Fragments UI
  // --------------------------------
  const emailInput = document.querySelector('#email');
  const passwordInput = document.querySelector('#password');
  const basicLoginBtn = document.querySelector('#basic-login');

  const fragmentsSection = document.querySelector('#fragments-section');
  const fragmentsList = document.querySelector('#fragments-list');
  const createBtn = document.querySelector('#create');
  const typeSelect = document.querySelector('#type');
  const contentInput = document.querySelector('#content');
  const imageInput = document.querySelector('#image-file'); // file <input>

  // Detail view elements
  const detailSection = document.querySelector('#fragment-detail');
  const detailIdSpan = document.querySelector('#detail-id');
  const detailTypeSpan = document.querySelector('#detail-type');
  const detailContent = document.querySelector('#detail-content');
  const detailPreview = document.querySelector('#detail-preview');
  const updateBtn = document.querySelector('#update-fragment');
  const convertMarkdownBtn = document.querySelector('#convert-markdown-html');
  const convertImageJpegBtn = document.querySelector('#convert-image-jpeg');
  const deleteDetailBtn = document.querySelector('#delete-fragment');

  let currentEmail = null;
  let currentPassword = null;
  let currentFragmentMeta = null;

  // Switch between text input and file upload depending on fragment type
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value.startsWith('image/')) {
      contentInput.style.display = 'none';
      imageInput.style.display = 'block';
    } else {
      contentInput.style.display = 'block';
      imageInput.style.display = 'none';
    }
  });

  if (!basicLoginBtn) return;

  // Normalize fragment from API (ID string OR metadata object)
  function normalizeFragment(frag) {
    if (!frag) return null;
    if (typeof frag === 'string') {
      return { id: frag, type: null };
    }
    return frag;
  }

  // Helper: render list of fragments (metadata)
  async function renderFragments(fragments = []) {
    fragmentsList.innerHTML = '';

    for (const frag of fragments) {
      const meta = typeof frag === 'string' ? { id: frag, type: null } : frag;

      // If type is missing, get the type via getFragmentData()
      if (!meta.type) {
        try {
          const info = await getFragmentData(currentEmail, currentPassword, meta.id);
          if (info?.contentType) {
            meta.type = info.contentType.split(";")[0];  // Remove charset if present
          }
        } catch (e) {
          console.error("Unable to resolve fragment type", e);
        }
      }

      const li = document.createElement('li');
      li.className = 'fragment-item';

      const label = document.createElement('span');
      label.textContent = `${meta.id} (${meta.type || 'unknown'})`;

      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View';
      viewBtn.onclick = () => openFragmentDetail(meta);

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this fragment?')) return;
        await deleteFragment(currentEmail, currentPassword, meta.id);
        await refreshFragments();
        if (currentFragmentMeta && currentFragmentMeta.id === meta.id) {
          detailSection.hidden = true;
        }
      };

      li.append(label, viewBtn, delBtn);
      fragmentsList.appendChild(li);
    }
  }



  // Helper: refresh list from API
  async function refreshFragments() {
    const data = await getUserFragments(currentEmail, currentPassword);
    const fragments = data?.fragments || [];
    renderFragments(fragments);
  }

  // Open fragment detail view (fetch data + fill fields)
  async function openFragmentDetail(meta) {
    // Make a copy and initialize exactType from metadata (if present)
    currentFragmentMeta = { ...normalizeFragment(meta) };
    currentFragmentMeta.exactType = currentFragmentMeta.type || null;

    detailIdSpan.textContent = currentFragmentMeta.id;
    detailTypeSpan.textContent = currentFragmentMeta.type || 'unknown';
    detailContent.value = '';
    detailPreview.innerHTML = '';

    // Default visibility before we know exact type from server:
    convertMarkdownBtn.hidden = true;
    convertImageJpegBtn.hidden = true;

    const data = await getFragmentData(currentEmail, currentPassword, currentFragmentMeta.id);
    if (!data) {
      alert('Fragment not found or could not be loaded.');
      return;
    }

    const { contentType, text, blob } = data;

    // Store the *actual* content-type from server (no charset)
    if (contentType) {
      currentFragmentMeta.exactType = contentType.split(';')[0];
    }

    const effectiveType = currentFragmentMeta.exactType || currentFragmentMeta.type || '';

    detailTypeSpan.textContent = effectiveType || 'unknown';

    // Show/hide conversion buttons depending on actual type
    convertMarkdownBtn.hidden = effectiveType !== 'text/markdown';
    convertImageJpegBtn.hidden = !effectiveType.startsWith('image/');

    // Text-like types
    if (text !== undefined) {
      if (effectiveType === 'application/json') {
        try {
          const parsed = JSON.parse(text);
          detailContent.value = JSON.stringify(parsed, null, 2);
        } catch {
          detailContent.value = text;
        }
      } else {
        detailContent.value = text;
      }
      detailPreview.textContent = detailContent.value;
    }

    // Image types
    if (blob) {
      const url = URL.createObjectURL(blob);
      detailPreview.innerHTML = `<img src="${url}" alt="fragment image" style="max-width: 300px; max-height: 300px;">`;
      detailContent.value = '[binary image data] (editing not supported in UI)';
    }

    detailSection.hidden = false;
  }

  // Basic Auth login button
  basicLoginBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return alert('Please enter email and password.');

    currentEmail = email;
    currentPassword = password;

    const data = await getUserFragments(currentEmail, currentPassword);
    if (data?.fragments) {
      fragmentsSection.hidden = false;
      await refreshFragments();
    } else {
      alert('Login failed or no fragments found.');
    }
  };

  // Create fragment button
  createBtn.onclick = async () => {
    if (!currentEmail || !currentPassword) {
      return alert('Log in first using Basic Auth.');
    }

    const type = typeSelect.value;
    let body;

    // IMAGE MODE
    if (type.startsWith('image/')) {
      const file = imageInput.files[0];
      if (!file) return alert('Please choose an image file.');
      body = file; // send binary directly
    } else {
      // TEXT / JSON MODE
      body = contentInput.value.trim();
      if (!body) return alert('Enter fragment content.');

      if (type === 'application/json') {
        try {
          const parsed = JSON.parse(body);
          body = JSON.stringify(parsed);
        } catch {
          return alert('Invalid JSON.');
        }
      }
    }

    const result = await createFragment(currentEmail, currentPassword, type, body);

    if (result?.fragment) {
      alert('Fragment created.');
    }

    // reset form
    contentInput.value = '';
    imageInput.value = '';

    await refreshFragments();
  };

  // Update fragment button in detail view
  updateBtn.onclick = async () => {
    if (!currentEmail || !currentPassword) {
      return alert('Log in first using Basic Auth.');
    }
    if (!currentFragmentMeta) {
      return alert('No fragment selected.');
    }

    const id = currentFragmentMeta.id;
    const originalType =
      (currentFragmentMeta.exactType || currentFragmentMeta.type || '').toString();

    if (!originalType) {
      return alert('Cannot determine fragment type for update.');
    }

    // Don't allow editing binary image content from UI text area
    if (originalType.startsWith('image/')) {
      return alert(
        'Updating image content from the UI is not supported. Use text/markdown/json fragments.'
      );
    }

    let body = detailContent.value;

    if (originalType === 'application/json') {
      try {
        const parsed = JSON.parse(body);
        body = JSON.stringify(parsed);
      } catch {
        return alert('Fragment type is JSON but the edited content is not valid JSON.');
      }
    }

    const res = await updateFragment(currentEmail, currentPassword, id, originalType, body);
    if (res?.fragment) {
      alert('Fragment updated.');
      await refreshFragments();
    }
  };

  // Convert markdown -> HTML
  convertMarkdownBtn.onclick = async () => {
    if (!currentEmail || !currentPassword || !currentFragmentMeta) return;

    const id = currentFragmentMeta.id;
    const result = await getConvertedFragmentData(currentEmail, currentPassword, id, 'html');
    if (!result || result.errorStatus) {
      return alert('Conversion not supported or failed.');
    }

    if (result.text) {
      detailPreview.innerHTML = result.text;
    }
  };

  // Convert image -> JPEG
  convertImageJpegBtn.onclick = async () => {
    if (!currentEmail || !currentPassword || !currentFragmentMeta) return;

    const id = currentFragmentMeta.id;
    const result = await getConvertedFragmentData(currentEmail, currentPassword, id, 'jpg');
    if (!result || result.errorStatus) {
      return alert('Image conversion to JPEG not supported or failed.');
    }

    if (result.blob) {
      const url = URL.createObjectURL(result.blob);
      detailPreview.innerHTML = `<img src="${url}" alt="JPEG conversion" style="max-width: 300px; max-height: 300px;">`;
    }
  };

  // Delete fragment from detail view
  deleteDetailBtn.onclick = async () => {
    if (!currentEmail || !currentPassword || !currentFragmentMeta) return;
    if (!confirm('Delete this fragment?')) return;

    await deleteFragment(currentEmail, currentPassword, currentFragmentMeta.id);
    await refreshFragments();
    detailSection.hidden = true;
  };
});
