// How long a signed-in session lasts. The server signs access tokens with
// SESSION_TTL and every client that stores a session records SESSION_TTL_SECONDS,
// so the advertised lifetime cannot drift from the real one.
export const SESSION_TTL = '30d';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
