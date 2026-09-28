/**
 * Frontend Static Routes & Error Pages Verification
 */

const { app, request } = require('./testHelper');

describe('Frontend Static Serving Suite', () => {
  it('should serve index.html with HTTP 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Secure Student Grievance & Feedback Portal');
  });

  it('should serve register.html with HTTP 200', async () => {
    const res = await request(app).get('/register.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Create Student Account');
  });

  it('should serve student/dashboard.html with HTTP 200', async () => {
    const res = await request(app).get('/student/dashboard.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Student Portal');
  });

  it('should serve admin/dashboard.html with HTTP 200', async () => {
    const res = await request(app).get('/admin/dashboard.html');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Administration Portal');
  });

  it('should serve 401.html, 403.html, and 404.html properly', async () => {
    const res401 = await request(app).get('/401.html');
    expect(res401.status).toBe(200);
    expect(res401.text).toContain('401');

    const res403 = await request(app).get('/403.html');
    expect(res403.status).toBe(200);
    expect(res403.text).toContain('403');

    const res404 = await request(app).get('/non-existent-page-path');
    expect(res404.status).toBe(404);
    expect(res404.text).toContain('404');
  });

  it('should serve css/style.css with text/css content type', async () => {
    const res = await request(app).get('/css/style.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
    expect(res.text).toContain('--navy-primary');
  });

  it('should serve assets/hero-illustration.svg and favicon.svg', async () => {
    const resHero = await request(app).get('/assets/hero-illustration.svg');
    expect(resHero.status).toBe(200);
    expect(resHero.headers['content-type']).toContain('image/svg');

    const resFav = await request(app).get('/assets/favicon.svg');
    expect(resFav.status).toBe(200);
    expect(resFav.headers['content-type']).toContain('image/svg');
  });
});
