const fs = require('fs');
const path = require('path');

const pagesDir = 'd:/NhutANh/webdoantrackingkhoahoc/frontend/src/pages';
const pages = ['Login', 'Register', 'Dashboard', 'Sessions', 'Goals', 'Analytics', 'Profile'];

pages.forEach(p => {
  if (!fs.existsSync(path.join(pagesDir, p))) {
    fs.mkdirSync(path.join(pagesDir, p));
  }
});

function processJsx(file, oldCss, newCss) {
  let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  content = content.replace(/\.\.\/services/g, '../../services');
  content = content.replace(/\.\.\/context/g, '../../context');
  if (oldCss && newCss) {
    content = content.replace(oldCss, newCss);
  }
  return content;
}

// Login
fs.writeFileSync(path.join(pagesDir, 'Login', 'index.jsx'), processJsx('Login.jsx', "./Login.css", "./Login.css"));
fs.renameSync(path.join(pagesDir, 'Login.css'), path.join(pagesDir, 'Login', 'Login.css'));

// Register
fs.writeFileSync(path.join(pagesDir, 'Register', 'index.jsx'), processJsx('Register.jsx', './Login.css', '../Login/Login.css'));

// Dashboard
let dashJsx = processJsx('Dashboard.jsx', "./Dashboard.css", "./Dashboard.css");
dashJsx = dashJsx.replace(/className="bar/g, 'className="dash-bar');
fs.writeFileSync(path.join(pagesDir, 'Dashboard', 'index.jsx'), dashJsx);

let dashCss = fs.readFileSync(path.join(pagesDir, 'Dashboard.css'), 'utf8');
dashCss = dashCss.replace(/\.bar/g, '.dash-bar');
fs.writeFileSync(path.join(pagesDir, 'Dashboard', 'Dashboard.css'), dashCss);
fs.unlinkSync(path.join(pagesDir, 'Dashboard.css'));

// Sessions
fs.writeFileSync(path.join(pagesDir, 'Sessions', 'index.jsx'), processJsx('Sessions.jsx', "./Sessions.css", "./Sessions.css"));
fs.renameSync(path.join(pagesDir, 'Sessions.css'), path.join(pagesDir, 'Sessions', 'Sessions.css'));

// Goals
fs.writeFileSync(path.join(pagesDir, 'Goals', 'index.jsx'), processJsx('Goals.jsx', "./Goals.css", "./Goals.css"));
fs.renameSync(path.join(pagesDir, 'Goals.css'), path.join(pagesDir, 'Goals', 'Goals.css'));

// Analytics
let alyJsx = processJsx('Analytics.jsx', "./Analytics.css", "./Analytics.css");
alyJsx = alyJsx.replace(/"bar /g, '"aly-bar ');
fs.writeFileSync(path.join(pagesDir, 'Analytics', 'index.jsx'), alyJsx);

let alyCss = fs.readFileSync(path.join(pagesDir, 'Analytics.css'), 'utf8');
alyCss = alyCss.replace(/\.bar/g, '.aly-bar');
fs.writeFileSync(path.join(pagesDir, 'Analytics', 'Analytics.css'), alyCss);
fs.unlinkSync(path.join(pagesDir, 'Analytics.css'));

// Profile
fs.writeFileSync(path.join(pagesDir, 'Profile', 'index.jsx'), processJsx('Profile.jsx', "./Profile.css", "./Profile.css"));
fs.renameSync(path.join(pagesDir, 'Profile.css'), path.join(pagesDir, 'Profile', 'Profile.css'));

// Cleanup old
fs.unlinkSync(path.join(pagesDir, 'Login.jsx'));
fs.unlinkSync(path.join(pagesDir, 'Register.jsx'));
fs.unlinkSync(path.join(pagesDir, 'Dashboard.jsx'));
fs.unlinkSync(path.join(pagesDir, 'Sessions.jsx'));
fs.unlinkSync(path.join(pagesDir, 'Goals.jsx'));
fs.unlinkSync(path.join(pagesDir, 'Analytics.jsx'));
fs.unlinkSync(path.join(pagesDir, 'Profile.jsx'));

// App.jsx
const appFile = 'd:/NhutANh/webdoantrackingkhoahoc/frontend/src/App.jsx';
let appJsx = fs.readFileSync(appFile, 'utf8');
appJsx = appJsx.replace(/from '\.\/pages\/([A-Za-z0-9_]+)'/g, "from './pages/$1/index.jsx'");
fs.writeFileSync(appFile, appJsx);

console.log("Successfully migrated files to folders and fixed CSS conflicts.");
