// src/api.js

/**
 * The base URL for the Fragments API.
 * Defaults to localhost:8080 if not set in the environment.
 */
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Helper: Generates Basic Auth headers from username & password.
 * @param {string} email - User email (or username)
 * @param {string} password - User password
 * @param {string} [type='application/json'] - Optional content type for POST/PUT
 */
function basicAuthHeaders(email, password, type = 'application/json') {
  const encoded = btoa(`${email}:${password}`);
  return {
    'Content-Type': type,
    Authorization: `Basic ${encoded}`,
  };
}

/**
 * Fetches all fragments for the authenticated user using Basic Auth.
 * @param {string} email - The user's email or username.
 * @param {string} password - The user's password.
 * @returns {Promise<object | undefined>} - The data object containing the list of fragments.
 */
export async function getUserFragments(email, password) {
  console.log('Requesting user fragments (Basic Auth)...');
  try {
    const res = await fetch(`${apiUrl}/v1/fragments?expand=1`, {
      headers: basicAuthHeaders(email, password),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('✅ Got fragments:', data);
    return data;
  } catch (err) {
    console.error('❌ Unable to get fragments', { err });
    alert('Failed to fetch fragments. Check your credentials or API connection.');
  }
}

/**
 * Creates a new fragment for the authenticated user using Basic Auth.
 * @param {string} email - The user's email or username.
 * @param {string} password - The user's password.
 * @param {string} type - The Content-Type (MIME type) of the fragment (e.g., 'text/plain').
 * @param {string} content - The raw content of the fragment.
 * @returns {Promise<object | undefined>} - The created fragment data.
 */
export async function createFragment(email, password, type, content) {
  console.log(`Creating fragment (Basic Auth, type: ${type})...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: basicAuthHeaders(email, password, type),
      body: content,
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('✅ Created fragment:', data);
    return data;
  } catch (err) {
    console.error('❌ Error creating fragment', { err });
    alert('Failed to create fragment. Check credentials or fragment type.');
  }
}
