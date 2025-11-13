// src/api.js

/**
 * The base URL for the Fragments API. Reads from environment variables or defaults to localhost.
 */
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Fetches all fragments for the authenticated user, expanding them to include content details.
 * @param {object} user - The authenticated user object containing authorizationHeaders.
 * @returns {Promise<object | undefined>} - The data object containing the list of fragments.
 */
export async function getUserFragments(user) {
  console.log('Requesting user fragments...');
  try {
    const res = await fetch(`${apiUrl}/v1/fragments?expand=1`, {
      headers: user.authorizationHeaders(),
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('✅ Got fragments:', data);
    return data;
  } catch (err) {
    console.error('❌ Unable to get fragments', { err });
    // In a real app, you might re-throw the error or display it to the user
  }
}

/**
 * Creates a new fragment for the authenticated user.
 * @param {object} user - The authenticated user object containing authorizationHeaders.
 * @param {string} type - The Content-Type (MIME type) of the fragment (e.g., 'text/plain').
 * @param {string} content - The raw content of the fragment.
 * @returns {Promise<object | undefined>} - The created fragment data.
 */
export async function createFragment(user, type, content) {
  console.log(`Creating fragment with type ${type}...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      // Pass the fragment type so authorizationHeaders can set the Content-Type
      headers: user.authorizationHeaders(type),
      body: content,
    });

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('✅ Created fragment:', data);
    return data;
  } catch (err) {
    console.error('❌ Error creating fragment', { err });
    // In a real app, you might re-throw the error or display it to the user
  }
}