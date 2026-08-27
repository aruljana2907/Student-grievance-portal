(async function () {
  await seedIfNeeded();

  // if already signed in, go straight to the right dashboard
  const existing = getSession();
  if (existing) {
    window.location.href = existing.role === "admin" ? "admin.html" : "portal.html";
    return;
  }

  const tabStudent = document.getElementById("tabStudent");
  const tabAdmin = document.getElementById("tabAdmin");
  const studentForm = document.getElementById("studentLoginForm");
  const adminForm = document.getElementById("adminLoginForm");
  const errorBox = document.getElementById("loginError");

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add("show");
  }
  function clearError() {
    errorBox.classList.remove("show");
  }

  tabStudent.addEventListener("click", () => {
    tabStudent.classList.add("active");
    tabAdmin.classList.remove("active");
    tabStudent.setAttribute("aria-selected", "true");
    tabAdmin.setAttribute("aria-selected", "false");
    studentForm.style.display = "";
    adminForm.style.display = "none";
    clearError();
  });

  tabAdmin.addEventListener("click", () => {
    tabAdmin.classList.add("active");
    tabStudent.classList.remove("active");
    tabAdmin.setAttribute("aria-selected", "true");
    tabStudent.setAttribute("aria-selected", "false");
    adminForm.style.display = "";
    studentForm.style.display = "none";
    clearError();
  });

  studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const regNo = document.getElementById("s_regno").value.trim();
    const password = document.getElementById("s_password").value;

    const user = findStudent(regNo);
    if (!user) return showError("No student account found with that register number.");

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return showError("Incorrect password. Please try again.");

    setSession({ role: "student", regNo: user.regNo, name: user.name });
    window.location.href = "portal.html";
  });

  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const username = document.getElementById("a_username").value.trim();
    const password = document.getElementById("a_password").value;

    const user = findAdmin(username);
    if (!user) return showError("No admin account found with that username.");

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return showError("Incorrect password. Please try again.");

    setSession({ role: "admin", username: user.username, name: user.name });
    window.location.href = "admin.html";
  });
})();
