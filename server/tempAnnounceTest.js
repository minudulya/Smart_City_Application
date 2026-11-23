const fetch = globalThis.fetch;
(async () => {
  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin1', password: 'admin123' }),
    });
    const loginData = await loginRes.text();
    console.log('login status', loginRes.status);
    console.log(loginData);
    if (!loginRes.ok) return;
    const token = JSON.parse(loginData).token;
    const postRes = await fetch('http://localhost:4000/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ title: 'Test Announcement', message: 'Testing announcement', category: 'event' }),
    });
    const postText = await postRes.text();
    console.log('post status', postRes.status);
    console.log(postText);
  } catch (err) {
    console.error(err);
  }
})();
